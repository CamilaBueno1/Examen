// Guía: Consulta el historial local únicamente para el autor solicitado.

import type { RegisterActaInput } from './RegisterActaUseCase';

export interface ActaLocal {
  id: string;
  estado: string;
  registro: RegisterActaInput;
}

export interface ActasLocalesRepository {
  consultarPorAutor(autorId: string): Promise<ActaLocal[]>;
}

export function consultarActasLocales(repository: ActasLocalesRepository) {
  return (autorId: string) => repository.consultarPorAutor(autorId);
}
