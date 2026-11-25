// Guía: Abre el formulario de alta de un coordinador de recinto.

import CreateUserScreen from '@/modules/authentication/presentation/CreateUserScreen';

export default function CreateCoordinatorRoute() {
  return <CreateUserScreen role="coordinator" />;
}
