import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { MesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import SignOutButton from '@/modules/authentication/presentation/SignOutButton';
import AvanceElectoral from './AvanceElectoral';
import { AppButton, AppPage, ScreenHeader } from '@/shared/presentation/Ui';

export default function RecintoDashboard() {

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="COORDINACIÓN DE RECINTO"
        title="Tu recinto"
        subtitle="Veedores, JRV y actas dentro de tu ámbito autorizado"
      />
      <MesasAutorizadas />
      <AvanceElectoral />
      <AppButton label="Revisar actas y evidencias" variant="secondary" onPress={() => router.push('/recinto/actas')} />
      <Pressable
        accessibilityRole="button"
        className="rounded-2xl border border-brand-line bg-brand-surface p-4 active:bg-brand-paper"
        onPress={() => router.push('/recinto/veedor')}>
        <Text className="text-base font-bold text-brand-ink">Habilitar veedor</Text>
        <Text className="mt-1 text-sm leading-5 text-brand-muted">Crear una cuenta y asignarla a una JRV de tu recinto.</Text>
        <Text className="mt-3 text-sm font-bold text-brand-navy">Crear veedor  ›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="rounded-2xl border border-brand-line bg-brand-surface p-4 active:bg-brand-paper"
        onPress={() => router.push('/recinto/asignaciones')}>
        <Text className="text-base font-bold text-brand-ink">Veedores y asignaciones</Text>
        <Text className="mt-1 text-sm leading-5 text-brand-muted">Consultar la información sincronizada para este recinto.</Text>
        <Text className="mt-3 text-sm font-bold text-brand-navy">Ver asignaciones  ›</Text>
      </Pressable>
      <SignOutButton />
    </AppPage>
  );
}
