// Guía: Define los contratos y consultas de avance por recinto y de resultados.

export interface AvanceRecinto {
  recinto_id: string;
  recinto: string;
  jrv_total: number;
  jrv_reportadas: number;
  jrv_respaldadas: number;
  alcaldia_recibidas: number;
  prefectura_recibidas: number;
}

export interface AvanceRepository {
  consultar(): Promise<AvanceRecinto[]>;
  resultados(): Promise<ResultadoCandidatura[]>;
  observarCambios(callback: () => void): () => void;
}

export interface ResultadoCandidatura {
  recinto_id: string;
  recinto: string;
  dignidad: 'alcaldia' | 'prefectura';
  candidato_id: string;
  candidato: string;
  organizacion: string;
  votos: number;
}

export function consultarAvance(repository: AvanceRepository) {
  return () => repository.consultar();
}

export function consultarResultados(repository: AvanceRepository) {
  return () => repository.resultados();
}

export function observarCambios(repository: AvanceRepository) {
  return (callback: () => void) => repository.observarCambios(callback);
}
