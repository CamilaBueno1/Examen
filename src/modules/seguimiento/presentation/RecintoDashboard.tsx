// Guía: Muestra el avance del recinto y acceso a sus operaciones autorizadas.

import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import AvanceElectoral from './AvanceElectoral';
import { ActionRow, AppPage, ScreenHeader } from '@/shared/presentation/Ui';

export default function RecintoDashboard() {
  return (
    <AppPage>
      <ScreenHeader
        eyebrow="COORDINACIÓN DE RECINTO"
        title="Gestión de tu recinto"
        subtitle="Supervisa el avance de tus mesas, habilita veedores, reemplaza ausentes y corrige actas"
      />
      <AvanceElectoral />
      <View className="gap-2.5">
        <Text accessibilityRole="header" className="font-electoral-bold text-base text-brand-ink">
          Acciones del coordinador de recinto
        </Text>
        <ActionRow
          title="Habilitar nuevo veedor"
          subtitle="Crear acceso para delegado con cédula verificada y mesa asignada"
          onPress={() => router.push('/recinto/veedor')}
        />
        <ActionRow
          title="Asignar o reemplazar veedor en mesa"
          subtitle="Cubrir ausencias al instante conservando el registro histórico"
          onPress={() => router.push('/recinto/asignaciones')}
        />
        <ActionRow
          title="Consultar y corregir actas del recinto"
          subtitle="Revisar evidencia fotográfica, ubicación GPS o corregir conteos con motivo"
          onPress={() => router.push('/recinto/actas')}
        />
      </View>
      <Text accessibilityRole="header" className="font-electoral-bold mt-1 text-base text-brand-ink">
        Juntas Receptoras del Voto (JRV) de tu recinto
      </Text>
      <MesasAutorizadas />
    </AppPage>
  );
}
