export interface ActaRemota {
  id: string;
  numero: number;
  recinto: string;
  dignidad: 'alcaldia' | 'prefectura';
  version: number;
  blancos: number;
  nulos: number;
  sufragantes: number;
  conteos: { id: string; nombre: string; votos: number | null }[] | null;
  evidencia: string;
  foto_id: string | null;
  storage_path: string | null;
  lat: number | null;
  lon: number | null;
  precision_m: number | null;
  captura_at: string | null;
  recinto_lat: number | null;
  recinto_lon: number | null;
}

export interface RevisionAnterior {
  version: number;
  autor: string;
  motivo: string;
  fecha: string;
  anteriores: { blancos: number; nulos: number; sufragantes: number; votos: Record<string, number> };
}

export interface CorreccionActa {
  blancos: number;
  nulos: number;
  sufragantes: number;
  motivo: string;
  votos: { id: string; votos: number }[];
}

export interface PropuestasRepository {
  guardarPropuesta(autor: string, acta: string, version: number, propuesta: CorreccionActa): Promise<void>;
  consultarPropuesta(autor: string, acta: string): Promise<{ version: number; propuesta: CorreccionActa } | null>;
  borrarPropuesta(autor: string, acta: string): Promise<void>;
}

export interface RevisionActasRepository {
  listar(): Promise<ActaRemota[]>;
  historial(id: string): Promise<RevisionAnterior[]>;
  foto(ruta: string): Promise<string>;
  aprobar(fotoId: string): Promise<void>;
  corregir(id: string, version: number, correccion: CorreccionActa): Promise<number>;
}

export function revisarActas(repository: RevisionActasRepository) {
  return {
    listar: () => repository.listar(),
    historial: (id: string) => repository.historial(id),
    foto: (ruta: string) => repository.foto(ruta),
    aprobar: (id: string) => repository.aprobar(id),
    corregir: (acta: ActaRemota, correccion: CorreccionActa) => {
      const { motivo, votos, blancos, nulos, sufragantes } = correccion;
      const conteos = [...votos.map((voto) => voto.votos), blancos, nulos, sufragantes];
      if (votos.length !== 5 || new Set(votos.map((voto) => voto.id)).size !== 5 ||
          conteos.some((value) => !Number.isSafeInteger(value) || value < 0) ||
          conteos.slice(0, -1).reduce((total, count) => total + count, 0) !== sufragantes ||
          !motivo.trim() || motivo.trim().length > 250) {
        throw new Error('Revisa los conteos, el total y el motivo de la corrección.');
      }
      return repository.corregir(acta.id, acta.version, { ...correccion, motivo: motivo.trim() });
    },
  };
}
