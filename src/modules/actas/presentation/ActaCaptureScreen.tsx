import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AppIcon from '@/shared/presentation/AppIcon';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Colors } from '@/constants/theme';
import { AppButton, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import SaveCelebrationCard from '@/shared/presentation/SaveCelebrationCard';
import { useMesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import ActaMap from './ActaMap';
import ActaVoteCard from './ActaVoteCard';
import AnalizadorNitidez, { type AnalizadorNitidezHandle } from './AnalizadorNitidez';
import ContourLines from '@/shared/presentation/ContourLines';
import { evidenciaCaptura, registrarActa } from '../actasProvider';
import type { PosicionActa } from '../domain/usecases/leerEvidencia';
import { cargarOrganizaciones } from '@/modules/territorio/mesasProvider';
import type { OrganizacionElectoral } from '@/modules/territorio/domain/usecases/consultarMesas';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { solicitarSincronizacionInmediata } from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { reportOperationalError } from '@/shared/monitoring/sentry';

const voteSchema = z
  .object({
    organizacion1: z.number().int().min(0, 'No puede ser negativo'),
    organizacion2: z.number().int().min(0, 'No puede ser negativo'),
    organizacion3: z.number().int().min(0, 'No puede ser negativo'),
    organizacion4: z.number().int().min(0, 'No puede ser negativo'),
    organizacion5: z.number().int().min(0, 'No puede ser negativo'),
    blancos: z.number().int().min(0, 'No puede ser negativo'),
    nulos: z.number().int().min(0, 'No puede ser negativo'),
    sufragantes: z.number().int().min(0, 'No puede ser negativo'),
  })
  .refine(
    (values) =>
      values.organizacion1 +
        values.organizacion2 +
        values.organizacion3 +
        values.organizacion4 +
        values.organizacion5 +
        values.blancos +
        values.nulos ===
      values.sufragantes,
    {
      message: 'La suma de votos por candidatura, blancos y nulos debe coincidir con el total de sufragantes.',
      path: ['sufragantes'],
    },
  );

export type VoteValues = z.infer<typeof voteSchema>;

function validateVotes(values: unknown): boolean {
  return voteSchema.safeParse(values).success;
}
type Dignidad = 'alcaldia' | 'prefectura';
type CaptureStatus = 'idle' | 'local' | 'draft' | 'error';

interface DignidadCapture {
  photoUri: string | null;
  quality: 'pending' | 'buena' | 'dudosa';
  qualityReason: string;
  attempts: number;
  location: PosicionActa | null;
  gpsError: string;
  saveStatus: CaptureStatus;
  saveDetail: string;
}

function emptyVoteValues(): VoteValues {
  return {
    organizacion1: 0,
    organizacion2: 0,
    organizacion3: 0,
    organizacion4: 0,
    organizacion5: 0,
    blancos: 0,
    nulos: 0,
    sufragantes: 0,
  };
}

function emptyCapture(): DignidadCapture {
  return {
    photoUri: null,
    quality: 'pending',
    qualityReason: '',
    attempts: 0,
    location: null,
    gpsError: '',
    saveStatus: 'idle',
    saveDetail: '',
  };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ActaCaptureScreen() {
  const params = useLocalSearchParams<{ jrvId?: string }>();
  const { resultado } = useMesasAutorizadas();
  const user = useSessionStore((state) => state.user);
  const offline = useConnectivityStore((state) => state.connectivity === 'offline');
  const mesa =
    resultado && 'mesas' in resultado
      ? resultado.mesas.find((item) => item.id === params.jrvId)
      : undefined;
  const [dignidad, setDignidad] = useState<Dignidad>('alcaldia');
  const [catalogResult, setCatalogResult] = useState<{
    key: string;
    organizaciones?: OrganizacionElectoral[];
    error?: string;
  }>();
  const [catalogRevision, setCatalogRevision] = useState(0);
  const catalogRequestKey = `${mesa?.id ?? ''}:${user?.id ?? ''}:${offline ? 'offline' : 'online'}:${catalogRevision}`;
  const currentCatalogResult =
    catalogResult?.key === catalogRequestKey ? catalogResult : undefined;
  const catalogo = currentCatalogResult?.organizaciones;
  const errorCatalogo = currentCatalogResult?.error ?? '';
  const catalogLoading = !!mesa && user?.status === 'ACTIVE' && !currentCatalogResult;
  const formAlcaldia = useForm<VoteValues>({
    resolver: zodResolver(voteSchema),
    defaultValues: emptyVoteValues(),
  });
  const formPrefectura = useForm<VoteValues>({
    resolver: zodResolver(voteSchema),
    defaultValues: emptyVoteValues(),
  });
  const form = dignidad === 'alcaldia' ? formAlcaldia : formPrefectura;
  const [captures, setCaptures] = useState<Record<Dignidad, DignidadCapture>>({
    alcaldia: emptyCapture(),
    prefectura: emptyCapture(),
  });
  const capture = captures[dignidad];
  const updateCapture = (changes: Partial<DignidadCapture>) => {
    setCaptures((current) => ({
      ...current,
      [dignidad]: { ...current[dignidad], ...changes },
    }));
  };

  useEffect(() => {
    if (!mesa || user?.status !== 'ACTIVE') return;
    let vigente = true;
    void cargarOrganizaciones(user.id, offline).then(
      (organizaciones) => {
        if (vigente) {
          setCatalogResult({ key: catalogRequestKey, organizaciones });
        }
      },
      (cause: unknown) => {
        if (vigente) {
          setCatalogResult({
            key: catalogRequestKey,
            error:
              cause instanceof Error
                ? cause.message
                : 'No se pudieron cargar las organizaciones políticas.',
          });
        }
      },
    );
    return () => {
      vigente = false;
    };
  }, [mesa, user, offline, catalogRequestKey]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const analizadorRef = useRef<AnalizadorNitidezHandle>(null);
  const [capturing, setCapturing] = useState(false);

  const retryCatalog = () => {
    setCatalogRevision((current) => current + 1);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    updateCapture({
      photoUri: null,
      location: null,
      quality: 'pending',
      qualityReason: '',
      gpsError: '',
      saveStatus: 'idle',
      saveDetail: '',
    });
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        exif: false,
      });
      const metricas = photo.base64
        ? await analizadorRef.current?.analizarBase64(photo.base64)
        : null;
      const nextAttempts = capture.attempts + 1;
      const evaluacion = evidenciaCaptura.inspeccionarFoto(
        photo.uri,
        photo.width,
        photo.height,
        metricas,
      );
      updateCapture({
        photoUri: photo.uri,
        attempts: nextAttempts,
        quality: evaluacion.calidad,
        qualityReason: evaluacion.motivo,
      });

      const reading = await evidenciaCaptura.posicion();
      if (!reading) {
        updateCapture({
          gpsError: 'Activa el permiso de ubicación en tu teléfono para poder guardar el acta.',
        });
      } else {
        updateCapture({ location: reading, gpsError: '' });
      }
    } catch (error) {
      updateCapture({
        saveStatus: 'error',
        saveDetail:
          error instanceof Error ? error.message : 'No se pudo tomar la fotografía del acta.',
      });
      void reportOperationalError(error, 'PHOTO_CAPTURE_FAILED', 'veedor/acta', offline);
    } finally {
      setCapturing(false);
    }
  };

  const save = form.handleSubmit(async (values) => {
    updateCapture({ saveStatus: 'idle', saveDetail: '' });
    if (!Object.values(values).some((voto) => voto > 0) && !form.getFieldState('sufragantes').isTouched) {
      updateCapture({
        saveStatus: 'error',
        saveDetail: 'Ingresa el conteo del acta o confirma explícitamente el total si todos los valores son cero.',
      });
      return;
    }
    if (!capture.photoUri) {
      updateCapture({
        saveStatus: 'error',
        saveDetail: 'Toma la fotografía del acta antes de guardar.',
      });
      return;
    }
    if (
      !capture.location ||
      !Number.isFinite(capture.location.coords.latitude) ||
      !Number.isFinite(capture.location.coords.longitude)
    ) {
      updateCapture({
        saveStatus: 'draft',
        saveDetail: 'Aún no se obtuvo ubicación GPS. Concede el permiso y vuelve a tomar la foto.',
      });
      return;
    }
    if (!mesa || catalogo?.length !== 5 || user?.role !== 'veedor' || user.status !== 'ACTIVE') {
      updateCapture({
        saveStatus: 'draft',
        saveDetail: 'No se pudo verificar la mesa o las candidaturas. Reintenta cargar la pantalla.',
      });
      return;
    }
    if (capture.quality === 'pending' || (capture.quality === 'dudosa' && capture.attempts < 3)) {
      updateCapture({
        saveStatus: 'error',
        saveDetail: `La fotografía aún no es legible (${capture.attempts} de 3 intentos). Toma una nueva foto enfocando bien el acta.`,
      });
      return;
    }

    try {
      const conteos = [
        values.organizacion1,
        values.organizacion2,
        values.organizacion3,
        values.organizacion4,
        values.organizacion5,
      ];
      const votos = catalogo.map(({ id }, index) => ({
        actaId: '',
        organizacionId: id,
        votos: conteos[index],
      }));
      await registrarActa.execute({
        autorId: user.id,
        recinto: mesa.recinto,
        numeroJrv: mesa.numero,
        recintoLat: mesa.latitud,
        recintoLon: mesa.longitud,
        jrvId: mesa.id,
        dignidad,
        capturedAt: capture.location.timestamp
          ? new Date(capture.location.timestamp).toISOString()
          : new Date().toISOString(),
        lat: capture.location.coords.latitude,
        lon: capture.location.coords.longitude,
        accuracy: capture.location.coords.accuracy ?? 999,
        fotoPath: capture.photoUri,
        calidadFoto: capture.quality === 'dudosa' ? 'dudosa' : 'buena',
        votos,
        votosBlancos: values.blancos,
        votosNulos: values.nulos,
        totalSufragantes: values.sufragantes,
      });
      const etiquetaDignidad = dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura';
      updateCapture({
        saveStatus: 'local',
        saveDetail: offline
          ? `Quedó guardada en tu teléfono y se enviará sola en cuanto tengas señal.`
          : `El acta de ${etiquetaDignidad} quedó guardada y se está enviando ahora mismo.`,
      });
      solicitarSincronizacionInmediata();
    } catch (error) {
      updateCapture({
        saveStatus: 'error',
        saveDetail:
          error instanceof Error ? error.message : 'No se pudo guardar el acta en el teléfono.',
      });
      void reportOperationalError(error, 'ACTA_LOCAL_SAVE_FAILED', 'veedor/acta', offline);
    }
  });

  if (!resultado) {
    return (
      <View style={styles.center}>
        <Text className="font-electoral text-sm text-brand-muted">Cargando tu mesa asignada…</Text>
      </View>
    );
  }

  if (!mesa) {
    return (
      <View className="flex-1 justify-center bg-brand-paper px-5 py-8">
        <View className="mx-auto w-full max-w-xl">
          <ScreenHeader
            eyebrow="REGISTRO DE ACTA"
            title="Selecciona una mesa asignada"
            subtitle="Ingresa desde tu lista de mesas para registrar las actas correspondientes."
          />
          <StatusBanner
            tone="warning"
            title="Mesa no encontrada"
            detail={
              'error' in resultado
                ? resultado.error
                : 'Consulta con el coordinador de tu recinto si necesitas que te asignen esta mesa.'
            }
          />
          <View className="mt-4">
            <AppButton
              label="Volver a mis mesas"
              variant="secondary"
              onPress={() => router.replace('/veedor')}
            />
          </View>
        </View>
      </View>
    );
  }

  const accuracy = capture.location?.coords.accuracy;
  const precisionWarning = typeof accuracy === 'number' && accuracy > 100;
  let distance: number | null = null;
  if (capture.location && mesa.latitud !== null && mesa.longitud !== null) {
    distance = haversineMeters(
      capture.location.coords.latitude,
      capture.location.coords.longitude,
      mesa.latitud,
      mesa.longitud,
    );
  }
  const distanceWarning = distance !== null && distance > 300;
  const dignityLabel = dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura';
  const mustRetakePhoto = capture.quality === 'dudosa' && capture.attempts < 3;
  const otherDignity: Dignidad = dignidad === 'alcaldia' ? 'prefectura' : 'alcaldia';
  const otherSaved = captures[otherDignity].saveStatus === 'local';

  return (
    <View className="flex-1 bg-brand-paper">
      <ContourLines />
      <AnalizadorNitidez ref={analizadorRef} />

      <View className="z-10 flex-row items-center border-b border-brand-line bg-brand-paper px-3 py-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mis mesas"
          className="h-11 w-11 items-center justify-center rounded-full active:bg-brand-field"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/veedor'))}>
          <AppIcon
            name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
            size={21}
            tintColor={colors.primary}
          />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="font-electoral-bold flex-1 text-center text-lg text-brand-ink">
          Registrar acta
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View className="flex-row gap-2">
          {(
            [
              { value: 'alcaldia', label: 'Alcaldía' },
              { value: 'prefectura', label: 'Prefectura' },
            ] as const
          ).map(({ value, label }) => {
            const selected = dignidad === value;
            const saved = captures[value].saveStatus === 'local';
            return (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{
                  selected,
                  disabled: capturing || form.formState.isSubmitting,
                }}
                disabled={capturing || form.formState.isSubmitting}
                onPress={() => setDignidad(value)}
                className={`min-h-14 flex-1 items-center justify-center gap-0.5 rounded-xl border px-2 py-1.5 ${
                  selected
                    ? 'border-brand-navy bg-brand-navy'
                    : 'border-brand-line bg-brand-surface'
                }`}>
                <AppIcon
                  name={
                    value === 'alcaldia'
                      ? { ios: 'building.columns', android: 'account_balance', web: 'account_balance' }
                      : { ios: 'shield', android: 'shield', web: 'shield' }
                  }
                  size={18}
                  tintColor={selected ? '#FFFFFF' : colors.primary}
                />
                <Text
                  className={`font-electoral-bold text-sm ${
                    selected ? 'text-white' : 'text-brand-navy'
                  }`}>
                  {label}
                </Text>
                {saved ? (
                  <Text className={`text-xs ${selected ? 'text-white' : 'text-brand-success'}`}>
                    Registrada ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View className="gap-0.5 rounded-xl border border-brand-line bg-brand-surface px-3.5 py-2.5">
          <Text className="font-electoral-bold text-base text-brand-ink">Mesa JRV {mesa.numero}</Text>
          <Text className="font-electoral text-xs text-brand-muted">{mesa.recinto}</Text>
        </View>

        {catalogLoading ? (
          <StatusBanner tone="info" election="record" busy title="Cargando candidaturas…" />
        ) : catalogo?.length === 5 ? (
          <ActaVoteCard
            key={dignidad}
            form={form}
            names={catalogo.map(({ nombre, candidaturas }) => {
              const candidatura = candidaturas?.find((item) => item.dignidad === dignidad);
              return candidatura ? `${nombre}\n${candidatura.nombre}` : nombre;
            })}
            validate={validateVotes}
          />
        ) : (
          <Card compact>
            <StatusBanner
              tone="error"
              title="No se pudieron cargar las candidaturas"
              detail={
                errorCatalogo || 'Conéctate un momento para descargar la lista de organizaciones.'
              }
            />
            <View className="mt-2">
              <AppButton label="Reintentar" variant="secondary" onPress={retryCatalog} />
            </View>
          </Card>
        )}

        {capture.saveStatus === 'local' ? (
          <SaveCelebrationCard
            tone="success"
            scene="voting"
            eyebrow="REGISTRO GUARDADO"
            title={`Acta de ${dignityLabel} guardada`}
            detail={capture.saveDetail}
            actionLabel={
              !otherSaved
                ? `Continuar con ${otherDignity === 'alcaldia' ? 'Alcaldía' : 'Prefectura'}`
                : 'Volver a mis mesas'
            }
            onAction={() => {
              if (!otherSaved) {
                setDignidad(otherDignity);
              } else {
                router.replace('/veedor');
              }
            }}
          />
        ) : null}
        {capture.saveStatus === 'draft' ? (
          <StatusBanner tone="warning" title="Falta ubicación para guardar" detail={capture.saveDetail} />
        ) : null}
        {capture.saveStatus === 'error' ? (
          <StatusBanner tone="error" title="Revisa antes de guardar" detail={capture.saveDetail} />
        ) : null}

        <Card compact>
          <Text
            accessibilityRole="header"
            className="font-electoral-bold mb-2 text-base text-brand-ink">
            Fotografía del acta
          </Text>
          {!permission ? (
            <StatusBanner tone="info" busy title="Verificando acceso a la cámara…" />
          ) : !permission.granted ? (
            <View className="gap-2">
              <Text className="font-electoral text-sm text-brand-muted">
                Permite el uso de la cámara para tomar la foto directa del acta física.
              </Text>
              <AppButton label="Permitir cámara" variant="secondary" onPress={requestPermission} />
            </View>
          ) : !capture.photoUri ? (
            <View>
              <View style={styles.cameraStage}>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" autofocus="on" />
                <View pointerEvents="none" style={styles.cameraGuide}>
                  <Text style={styles.guideLabel}>ENCUADRA EL ACTA FÍSICA</Text>
                  <View style={styles.documentFrame} />
                  <Text style={styles.guideHelp}>
                    Coloca el acta sobre una mesa iluminada, sin sombras ni reflejos.
                  </Text>
                </View>
              </View>
              <View style={{ height: 12 }} />
              <AppButton
                label={capturing ? 'Verificando nitidez…' : 'Tomar fotografía'}
                onPress={takePhoto}
                loading={capturing}
              />
            </View>
          ) : (
            <View>
              <Image
                accessibilityLabel={`Fotografía del acta de ${dignityLabel}`}
                source={{ uri: capture.photoUri }}
                style={styles.preview}
                resizeMode="contain"
              />
              <View style={{ height: 10 }} />
              {capture.quality === 'dudosa' ? (
                <StatusBanner
                  tone={mustRetakePhoto ? 'error' : 'warning'}
                  title={
                    mustRetakePhoto
                      ? `Fotografía no legible (intento ${capture.attempts} de 3)`
                      : 'Fotografía guardada con observación'
                  }
                  detail={
                    mustRetakePhoto
                      ? `${capture.qualityReason} Debes tomarla nuevamente.`
                      : `${capture.qualityReason} Ya hiciste 3 intentos: puedes intentar otra foto o guardar el acta para revisión.`
                  }
                />
              ) : (
                <StatusBanner
                  tone="success"
                  title="Fotografía nítida y legible"
                  detail={capture.qualityReason}
                />
              )}
              <View style={{ height: 10 }} />
              <AppButton
                label="Tomar otra fotografía"
                variant={mustRetakePhoto ? 'primary' : 'secondary'}
                onPress={() =>
                  updateCapture({
                    photoUri: null,
                    quality: 'pending',
                    qualityReason: '',
                    location: null,
                    gpsError: '',
                  })
                }
              />
            </View>
          )}
        </Card>

        {capture.location ? (
          <Card compact>
            <Text
              accessibilityRole="header"
              className="font-electoral-bold mb-3 text-base text-brand-ink">
              Ubicación de captura
            </Text>
            <ActaMap
              lat={capture.location.coords.latitude}
              lon={capture.location.coords.longitude}
              recintoLat={mesa.latitud ?? undefined}
              recintoLon={mesa.longitud ?? undefined}
              accuracy={accuracy}
            />
            <View className="mt-2">
              {[
                {
                  label: 'Margen de precisión',
                  value: typeof accuracy === 'number' ? `${accuracy.toFixed(0)} m` : 'No disponible',
                },
                {
                  label: 'Distancia al recinto',
                  value: distance !== null ? `${distance.toFixed(0)} m` : 'Sin referencia',
                },
                {
                  label: 'Hora registrada',
                  value: new Date(capture.location.timestamp).toLocaleTimeString('es-EC'),
                },
              ].map(({ label, value }) => (
                <View
                  key={label}
                  className="flex-row items-center justify-between gap-2 border-t border-brand-line py-2">
                  <Text className="font-electoral-bold flex-1 text-sm text-brand-ink">{label}</Text>
                  <Text className="font-electoral shrink text-right text-xs text-brand-muted">
                    {value}
                  </Text>
                </View>
              ))}
            </View>
            {precisionWarning ? (
              <View className="mt-2">
                <StatusBanner
                  tone="warning"
                  title="Señal GPS con baja precisión"
                  detail="Estás bajo techo o con señal débil. Puedes guardar el acta igualmente."
                />
              </View>
            ) : null}
            {distanceWarning ? (
              <View className="mt-2">
                <StatusBanner
                  tone="warning"
                  title="Ubicación alejada del punto del recinto"
                  detail="Quedará registrada tu ubicación actual sin impedir el guardado."
                />
              </View>
            ) : null}
          </Card>
        ) : capture.gpsError ? (
          <StatusBanner tone="warning" title="Ubicación requerida" detail={capture.gpsError} />
        ) : null}
      </ScrollView>

      {catalogo?.length === 5 && capture.saveStatus !== 'local' ? (
        <View className="border-t border-brand-line bg-brand-surface px-4 py-2.5">
          <View className="w-full self-center gap-2" style={styles.actionWidth}>
            <AppButton
              label={`Guardar acta de ${dignityLabel}`}
              pill
              onPress={save}
              loading={form.formState.isSubmitting}
              disabled={!permission?.granted || capturing || mustRetakePhoto}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const colors = Colors.light;
const styles = StyleSheet.create({
  container: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    padding: 12,
    gap: 10,
    paddingBottom: 18,
  },
  actionWidth: { maxWidth: 576 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraStage: {
    height: 320,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#14282B',
  },
  camera: { ...StyleSheet.absoluteFill },
  cameraGuide: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  documentFrame: {
    width: '82%',
    height: '72%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F3DFBA',
    backgroundColor: 'rgba(16, 59, 80, 0.08)',
  },
  guideLabel: {
    fontFamily: 'LatoBold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 59, 80, 0.84)',
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.7,
  },
  guideHelp: {
    fontFamily: 'LatoRegular',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 59, 80, 0.84)',
    color: '#F5EFE6',
    fontSize: 11,
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#F2F4F5',
  },
});
