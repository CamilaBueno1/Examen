// Guía: Valida la ubicación y los datos necesarios para registrar un recinto.

export interface CrearRecintoInput {
  nombre: string;
  parroquia: string;
  numeroJrv: number;
}

export interface RecintosRepository {
  crear(input: CrearRecintoInput): Promise<string>;
}

export function gestionarRecintos(repository: RecintosRepository) {
  return {
    crear(input: CrearRecintoInput) {
      const nombre = input.nombre.trim();
      const parroquia = input.parroquia.trim();
      if (nombre.length < 2 || nombre.length > 150
          || parroquia.length < 2 || parroquia.length > 100
          || !Number.isInteger(input.numeroJrv)
          || input.numeroJrv < 1 || input.numeroJrv > 200) {
        throw new Error('Revisa el nombre, la parroquia y la cantidad de JRV.');
      }
      return repository.crear({ nombre, parroquia, numeroJrv: input.numeroJrv });
    },
  };
}
