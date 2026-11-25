// Guía: Protege las rutas del coordinador de recinto.

import ProtectedRoleLayout from '@/shared/presentation/ProtectedRoleLayout';

export default function RecintoLayout() {
  return <ProtectedRoleLayout role="coordinator" />;
}
