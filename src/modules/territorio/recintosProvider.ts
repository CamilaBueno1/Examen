import { recintosAdapter } from './data/adapters/supabase/recintosAdapter';
import { gestionarRecintos } from './domain/usecases/gestionarRecintos';

export const recintos = gestionarRecintos(recintosAdapter);
