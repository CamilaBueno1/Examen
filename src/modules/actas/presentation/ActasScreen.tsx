import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import ActaMap from './ActaMap';
import { useActasLocales } from './useActasLocales';
import { estadoActa } from './estadoActa';

export default function ActasScreen() {
  const visible = useActasLocales();
  const [selected, setSelected] = useState<string>();

  return (
    <AppPage>
      <ScreenHeader eyebrow="VEEDOR" title="Mis actas" subtitle="Registros guardados en este dispositivo." />
      {!visible ? <StatusBanner tone="info" title="Consultando actas" busy /> : null}
      {visible?.error ? <StatusBanner tone="error" title="No se pudieron cargar las actas" detail={visible.error} /> : null}
      {visible?.actas?.length === 0 ? <StatusBanner tone="info" title="Aún no hay actas guardadas" /> : null}
      {visible?.actas?.map(({ id, estado, registro }) => (
        <Card key={id}>
          <Text className="text-lg font-bold text-brand-ink">{registro.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura'}</Text>
          <Text className="mt-1 text-sm text-brand-muted">{registro.recinto} · JRV {registro.numeroJrv}</Text>
          <Text className="mt-1 text-sm text-brand-muted">{new Date(registro.capturedAt).toLocaleString()}</Text>
          <Text className="mb-3 mt-1 text-sm text-brand-muted">{estadoActa(estado)}</Text>
          <AppButton label={selected === id ? 'Cerrar detalle' : 'Ver detalle'} variant="secondary" onPress={() => setSelected(selected === id ? undefined : id)} />
          {selected === id ? (
            <View className="mt-4 gap-3">
              <Text className="text-sm text-brand-ink">Sufragantes: {registro.totalSufragantes} · Blancos: {registro.votosBlancos} · Nulos: {registro.votosNulos}</Text>
              <Text className="text-sm text-brand-muted">Precisión GPS: {registro.accuracy} m · Foto {registro.calidadFoto}</Text>
              <Image accessibilityLabel="Fotografía del acta" source={{ uri: registro.fotoPath }} style={{ width: '100%', height: 220 }} resizeMode="contain" />
              <ActaMap lat={registro.lat} lon={registro.lon} recintoLat={registro.recintoLat ?? undefined} recintoLon={registro.recintoLon ?? undefined} />
            </View>
          ) : null}
        </Card>
      ))}
      <AppButton label="Consultar actas recibidas" variant="secondary" onPress={() => router.push('/veedor/recibidas')} />
      <AppButton label="Volver a mis mesas" variant="secondary" onPress={() => router.replace('/veedor')} />
    </AppPage>
  );
}
