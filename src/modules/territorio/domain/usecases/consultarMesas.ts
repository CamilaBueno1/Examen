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
}

export interface OrganizacionesRepository {
  listarOrganizaciones(): Promise<OrganizacionElectoral[]>;
}

export function consultarOrganizaciones(repository: OrganizacionesRepository) {
  return async () => {
    const organizaciones = await repository.listarOrganizaciones();
    if (organizaciones.length !== 5) throw new Error('El catálogo debe contener exactamente cinco organizaciones.');
    return organizaciones;
  };
}
