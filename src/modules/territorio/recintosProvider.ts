// Guía: Conecta la gestión de recintos con su adaptador remoto.

import { recintosAdapter } from './data/adapters/supabase/recintosAdapter';
import { gestionarRecintos } from './domain/usecases/gestionarRecintos';

export const recintos = gestionarRecintos(recintosAdapter);
