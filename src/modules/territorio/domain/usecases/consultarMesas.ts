export interface MesaAutorizada {
  id: string;
  numero: number;
  recintoId: string;
  recinto: string;
  latitud: number | null;
  longitud: number | null;
}

export interface MesasRepository {
  consultar(): Promise<MesaAutorizada[]>;
}

export function consultarMesas(repository: MesasRepository) {
  return () => repository.consultar();
}

export interface OrganizacionElectoral {
  id: string;
  nombre: string;
  // Las copias de SQLite guardadas antes de incluir candidaturas aún sirven para capturar votos.
  candidaturas?: { dignidad: 'alcaldia' | 'prefectura'; nombre: string }[];
}

export interface OrganizacionesRepository {
  listarOrganizaciones(): Promise<OrganizacionElectoral[]>;
}

export function consultarOrganizaciones(repository: OrganizacionesRepository) {
  return async () => {
    const organizaciones = await repository.listarOrganizaciones();
    if (organizaciones.length !== 5) {
      throw new Error(`La consulta devolvió ${organizaciones.length} organizaciones. El catálogo autorizado debe contener exactamente cinco.`);
    }
    if (organizaciones.some(({ candidaturas }) =>
      candidaturas?.length !== 2 ||
      !candidaturas.some(({ dignidad, nombre }) => dignidad === 'alcaldia' && nombre.trim()) ||
      !candidaturas.some(({ dignidad, nombre }) => dignidad === 'prefectura' && nombre.trim()))) {
      throw new Error('El catálogo autorizado debe incluir una candidatura de Alcaldía y otra de Prefectura por organización.');
    }
    return organizaciones;
  };
}
