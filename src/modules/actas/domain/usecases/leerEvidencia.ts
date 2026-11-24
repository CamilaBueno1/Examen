export interface EvidenciaSource {
  leerPosicion(): Promise<{
    coords: { latitude: number; longitude: number; accuracy: number | null };
    timestamp: number;
  } | null>;
  tamanoDeFoto(uri: string): number;
}

export type PosicionActa = NonNullable<Awaited<ReturnType<EvidenciaSource['leerPosicion']>>>;

export function leerEvidencia(source: EvidenciaSource) {
  return {
    posicion: () => source.leerPosicion(),
    evaluarFoto(uri: string, width: number, height: number): 'buena' | 'dudosa' {
      const size = source.tamanoDeFoto(uri);
      return width < 900 || height < 900 || (size > 0 && size < 150_000) ? 'dudosa' : 'buena';
    },
  };
}
