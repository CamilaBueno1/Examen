// Guía: Comprueba los datos y el motivo antes de asignar o reemplazar un veedor.

export interface RegistroAsignacion {
  id: string;
  jrv_id: string;
  veedor_id: string;
  veedor: string;
  activo: boolean;
  desde: string;
  hasta: string | null;
  motivo: string | null;
}

export interface AsignacionesRepository {
  historial(): Promise<RegistroAsignacion[]>;
  asignar(mesa: string, veedor: string, razon: string, asignacionEsperada: string | null): Promise<void>;
}

export function gestionarAsignaciones(repository: AsignacionesRepository) {
  return {
    historial: () => repository.historial(),
    asignar: (mesa: string, veedor: string, razon: string, asignacionEsperada: string | null = null) => {
      const motivo = razon.trim();
      if (!mesa || !veedor || !motivo || motivo.length > 250) {
        throw new Error('Selecciona una JRV y un veedor e ingresa el motivo.');
      }
      return repository.asignar(mesa, veedor, motivo, asignacionEsperada);
    },
  };
}
