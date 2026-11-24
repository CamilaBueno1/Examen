import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Colors } from '@/constants/theme';
import { AppButton, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import { useMesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import { evidenciaCaptura, registrarActa } from '../actasProvider';
import type { PosicionActa } from '../domain/usecases/leerEvidencia';
import { cargarOrganizaciones } from '@/modules/territorio/mesasProvider';
import type { OrganizacionElectoral } from '@/modules/territorio/domain/usecases/consultarMesas';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { reportOperationalError } from '@/shared/monitoring/sentry';

const voteSchema = z.object({
  organizacion1: z.number().int().min(0, 'No puede ser negativo'),
  organizacion2: z.number().int().min(0, 'No puede ser negativo'),
  organizacion3: z.number().int().min(0, 'No puede ser negativo'),
  organizacion4: z.number().int().min(0, 'No puede ser negativo'),
  organizacion5: z.number().int().min(0, 'No puede ser negativo'),
  blancos: z.number().int().min(0, 'No puede ser negativo'),
  nulos: z.number().int().min(0, 'No puede ser negativo'),
  sufragantes: z.number().int().min(0, 'No puede ser negativo'),
}).refine((values) => (
  values.organizacion1 + values.organizacion2 + values.organizacion3 +
  values.organizacion4 + values.organizacion5 + values.blancos + values.nulos
  === values.sufragantes
), {
  message: 'La suma de organización, blancos y nulos debe igualar al total de sufragantes.',
  path: ['sufragantes'],
});

type VoteValues = z.infer<typeof voteSchema>;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ActaCaptureScreen() {
  const params = useLocalSearchParams<{ jrvId?: string }>();
  const { resultado } = useMesasAutorizadas();
  const user = useSessionStore((state) => state.user);
  const offline = useConnectivityStore((state) => state.connectivity === 'offline');
  const mesa = resultado && 'mesas' in resultado ? resultado.mesas.find((item) => item.id === params.jrvId) : undefined;
  const [dignidad, setDignidad] = useState<'alcaldia' | 'prefectura'>('alcaldia');
  const [catalogo, setCatalogo] = useState<OrganizacionElectoral[]>();
  const [errorCatalogo, setErrorCatalogo] = useState('');
  useEffect(() => {
    if (!mesa || user?.status !== 'ACTIVE') return;
    let vigente = true;
    void cargarOrganizaciones(user.id, offline).then(
      (organizaciones) => {
        if (vigente) {
          setCatalogo(organizaciones);
          setErrorCatalogo('');
        }
      },
      () => { if (vigente) setErrorCatalogo('No se pudieron cargar las cinco organizaciones. Vuelve a abrir la captura con conexión.'); },
    );
    return () => { vigente = false; };
  }, [mesa, user, offline]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [quality, setQuality] = useState<'pending' | 'buena' | 'dudosa'>('pending');
  const [attempts, setAttempts] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [location, setLocation] = useState<PosicionActa | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'local' | 'draft' | 'error'>('idle');
  const [saveDetail, setSaveDetail] = useState('');

  const form = useForm<VoteValues>({
    resolver: zodResolver(voteSchema),
    defaultValues: {
      organizacion1: 0, organizacion2: 0, organizacion3: 0, organizacion4: 0,
      organizacion5: 0, blancos: 0, nulos: 0, sufragantes: 0,
    },
  });

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    setPhotoUri(null);
    setLocation(null);
    setQuality('pending');
    setGpsError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.82, base64: false, exif: false });
      setPhotoUri(photo.uri);
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setQuality(evidenciaCaptura.evaluarFoto(photo.uri, photo.width, photo.height));

      const reading = await evidenciaCaptura.posicion();
      if (!reading) {
        setGpsError('Permiso de ubicación denegado. Concede el permiso antes de guardar.');
        setLocation(null);
      } else {
        setLocation(reading);
        setGpsError('');
      }
    } catch (error) {
      setSaveStatus('error');
      setSaveDetail(error instanceof Error ? error.message : 'No se pudo tomar o evaluar la fotografía.');
      reportOperationalError(error, 'PHOTO_CAPTURE_FAILED', 'veedor/acta');
    } finally {
      setCapturing(false);
    }
  };

  const save = form.handleSubmit(async (values) => {
    setSaveStatus('idle');
    setSaveDetail('');
    if (!photoUri) {
      setSaveStatus('error');
      setSaveDetail('Toma una fotografía antes de guardar el acta.');
      return;
    }
    if (!location || !Number.isFinite(location.coords.latitude) || !Number.isFinite(location.coords.longitude)) {
      setSaveStatus('draft');
      setSaveDetail('No hay lectura GPS válida. La captura aún no se ha guardado.');
      return;
    }
    if (!mesa || !catalogo || user?.role !== 'veedor' || user.status !== 'ACTIVE') {
      setSaveStatus('draft');
      setSaveDetail('La captura tiene foto y GPS, pero falta una JRV asignada y sincronizada para guardar el acta.');
      return;
    }
    if (quality === 'pending' || (quality === 'dudosa' && attempts < 3)) {
      setSaveStatus('error');
      setSaveDetail('Repite la fotografía antes de guardar el acta.');
      return;
    }

    try {
      const conteos = [values.organizacion1, values.organizacion2, values.organizacion3,
        values.organizacion4, values.organizacion5];
      const votos = catalogo.map(({ id }, index) => ({
        actaId: '', organizacionId: id, votos: conteos[index],
      }));
      const acta = await registrarActa.execute({
        autorId: user.id,
        recinto: mesa.recinto,
        numeroJrv: mesa.numero,
        recintoLat: mesa.latitud,
        recintoLon: mesa.longitud,
        jrvId: mesa.id,
        dignidad,
        capturedAt: location.timestamp ? new Date(location.timestamp).toISOString() : new Date().toISOString(),
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 999,
        fotoPath: photoUri,
        calidadFoto: quality === 'dudosa' ? 'dudosa' : 'buena',
        votos,
        votosBlancos: values.blancos,
        votosNulos: values.nulos,
        totalSufragantes: values.sufragantes,
      });
      setSaveStatus('local');
      setSaveDetail(`Acta guardada localmente. Versión ${acta.version}; pendiente de sincronización y confirmación del servidor.`);
    } catch (error) {
      setSaveStatus('error');
      setSaveDetail(error instanceof Error ? error.message : 'No se pudo guardar el acta localmente.');
      reportOperationalError(error, 'ACTA_LOCAL_SAVE_FAILED', 'veedor/acta');
    }
  });

  if (!resultado) return <View style={styles.center}><Text>Comprobando asignación…</Text></View>;

  if (!mesa) {
    return (
      <View className="flex-1 justify-center bg-brand-paper px-5 py-8">
        <View className="mx-auto w-full max-w-xl">
          <ScreenHeader
            eyebrow="REGISTRO DE ACTA"
            title="Falta una JRV asignada"
            subtitle="Por seguridad, la captura solo se inicia desde una mesa autorizada y sincronizada."
          />
          <StatusBanner
            tone="warning"
            title="No se abrió la cámara"
            detail={'error' in resultado ? resultado.error : 'Solicita a tu coordinador que confirme tu asignación.'}
          />
          <View className="mt-4">
            <AppButton label="Volver a mis mesas" variant="secondary" onPress={() => router.replace('/veedor')} />
          </View>
        </View>
      </View>
    );
  }

  if (!permission) return <View style={styles.center}><Text>Cargando permisos…</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.page}>
        <View style={styles.permissionCard}>
          <ScreenHeader eyebrow="Evidencia" title="Permiso de cámara" subtitle="Se necesita acceso directo a la cámara para registrar el acta." />
          <AppButton label="Autorizar cámara" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  const accuracy = location?.coords.accuracy;
  const precisionWarning = typeof accuracy === 'number' && accuracy > 100;
  let distance: number | null = null;
  if (location && mesa.latitud !== null && mesa.longitud !== null) {
    distance = haversineMeters(location.coords.latitude, location.coords.longitude, mesa.latitud, mesa.longitud);
  }
  const distanceWarning = distance !== null && distance > 300;

  const fields: { name: keyof VoteValues; label: string }[] = [
    { name: 'organizacion1', label: 'Organización 1' },
    { name: 'organizacion2', label: 'Organización 2' },
    { name: 'organizacion3', label: 'Organización 3' },
    { name: 'organizacion4', label: 'Organización 4' },
    { name: 'organizacion5', label: 'Organización 5' },
    { name: 'blancos', label: 'Votos en blanco' },
    { name: 'nulos', label: 'Votos nulos' },
    { name: 'sufragantes', label: 'Total de sufragantes' },
  ];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Card>
        <Text className="mb-3 text-lg font-bold text-brand-ink">{mesa.recinto} · JRV {mesa.numero}</Text>
        <AppButton label={dignidad === 'alcaldia' ? 'Alcaldía (seleccionada)' : 'Alcaldía'} variant={dignidad === 'alcaldia' ? 'primary' : 'secondary'} onPress={() => setDignidad('alcaldia')} />
        <View className="mt-2"><AppButton label={dignidad === 'prefectura' ? 'Prefectura (seleccionada)' : 'Prefectura'} variant={dignidad === 'prefectura' ? 'primary' : 'secondary'} onPress={() => setDignidad('prefectura')} /></View>
      </Card>
      <ScreenHeader eyebrow="Registro de acta" title="Fotografía y resultados" subtitle="Completa la evidencia antes de sincronizar." />

      {saveStatus === 'local' ? <StatusBanner tone="success" title="Guardada localmente" detail={saveDetail} /> : null}
      {saveStatus === 'draft' ? <StatusBanner tone="warning" title="Borrador" detail={saveDetail} /> : null}
      {saveStatus === 'error' ? <StatusBanner tone="error" title="Operación no completada" detail={saveDetail} /> : null}

      <Card>
        {!photoUri ? (
          <View>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={{ height: 12 }} />
            <AppButton label="Tomar fotografía" onPress={takePhoto} loading={capturing} />
          </View>
        ) : (
          <View>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
            <View style={{ height: 10 }} />
            {quality === 'dudosa'
              ? <StatusBanner tone="warning" title={attempts >= 3 ? 'CALIDAD_DUDOSA: requiere revisión humana' : 'La fotografía parece poco legible'} detail={attempts >= 3 ? 'Puedes conservarla después del tercer intento fallido, pero no contará como evidencia respaldada.' : 'Repite la fotografía con mejor iluminación y enfoque.'} />
              : <StatusBanner tone="success" title="Fotografía orientativamente legible" detail="Esta evaluación no reemplaza la revisión humana." />}
            <View style={{ height: 10 }} />
            <AppButton label="Repetir fotografía" variant="secondary" onPress={() => { setPhotoUri(null); setQuality('pending'); }} />
          </View>
        )}
      </Card>

      {location ? (
        <Card>
          <Text style={styles.sectionTitle}>Ubicación original de captura</Text>
          <Text style={styles.value}>Latitud: {location.coords.latitude.toFixed(6)}</Text>
          <Text style={styles.value}>Longitud: {location.coords.longitude.toFixed(6)}</Text>
          <Text style={styles.value}>Precisión: {typeof accuracy === 'number' ? `${accuracy.toFixed(1)} m` : 'No disponible'}</Text>
          <Text style={styles.value}>Hora: {new Date(location.timestamp).toLocaleString()}</Text>
          {distance !== null ? <Text style={styles.value}>Distancia al recinto: {distance.toFixed(0)} m</Text> : null}
          {precisionWarning ? <StatusBanner tone="warning" title="Precisión GPS superior a 100 m" detail="Se conserva la lectura y se advierte, sin rechazar el acta." /> : null}
          {distanceWarning ? <StatusBanner tone="warning" title="Captura a más de 300 m del recinto" detail="Se conserva la ubicación para revisión humana." /> : null}

        </Card>
      ) : gpsError ? (
        <StatusBanner tone="warning" title="Sin GPS válido" detail={gpsError} />
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Conteo de votos</Text>
        {errorCatalogo ? <StatusBanner tone="error" title="Catálogo no disponible" detail={errorCatalogo} /> : null}
        {fields.map((field, index) => (
          <View key={field.name}>
            <Text style={styles.label}>{catalogo?.[index]?.nombre ?? field.label}</Text>
            <Controller control={form.control} name={field.name} render={({ field: controller }) => (
              <TextInput
                value={String(controller.value)}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text)) controller.onChange(text === '' ? 0 : Number(text));
                }}
                keyboardType="number-pad"
                style={styles.input}
              />
            )} />
            {form.formState.errors[field.name] ? <Text style={styles.error}>{String(form.formState.errors[field.name]?.message)}</Text> : null}
          </View>
        ))}
        {form.formState.errors.sufragantes ? <Text style={styles.error}>{form.formState.errors.sufragantes.message}</Text> : null}
        <View style={{ height: 14 }} />
        <AppButton label="Guardar acta" onPress={save} loading={form.formState.isSubmitting} disabled={!catalogo || capturing || saveStatus === 'local'} />
      </Card>
    </ScrollView>
  );
}

const colors = Colors.light;
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  container: { maxWidth: 800, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 26, gap: 14 },
  permissionCard: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: colors.backgroundElement, borderRadius: 16, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { height: 420, width: '100%', borderRadius: 12, overflow: 'hidden' },
  preview: { height: 420, width: '100%', backgroundColor: '#111827', borderRadius: 12 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  value: { color: colors.textSecondary, lineHeight: 21 },
  label: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: colors.text },
  error: { color: colors.danger, fontSize: 13, marginTop: 5 },
});
