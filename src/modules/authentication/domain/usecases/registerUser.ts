/**
 * Use‑case: registrar un nuevo usuario desde el flujo administrativo.
 * No contiene lógica de UI, solo orquesta el `AuthRepository`.
 */
import type { AuthRepository } from '../repositories';
import type { User } from '../entities';

export interface RegisterUserInput {
  cedula: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: 'provincial' | 'coordinator' | 'veedor';
  jurisdictionId?: string;
}

export function cedulaEcuatorianaValida(cedula: string) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  const tercerDigito = Number(cedula[2]);
  if (provincia < 1 || provincia > 24 || tercerDigito > 5) return false;

  const suma = [...cedula.slice(0, 9)].reduce((total, digito, indice) => {
    const valor = Number(digito) * (indice % 2 === 0 ? 2 : 1);
    return total + (valor > 9 ? valor - 9 : valor);
  }, 0);
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

export class RegisterUser {
  constructor(private readonly repo: AuthRepository) {}

  async execute(input: RegisterUserInput): Promise<{ user: User; temporaryPassword: string }> {
    const nombres = input.firstName.trim();
    const apellidos = input.lastName.trim();
    const telefono = input.phone.trim();
    const email = input.email.trim().toLowerCase();
    if (!cedulaEcuatorianaValida(input.cedula)) {
      throw new Error('La cédula ecuatoriana no es válida.');
    }
    if (nombres.length < 2 || apellidos.length < 2 || !/^\+?[0-9 -]{7,20}$/.test(telefono)) {
      throw new Error('Revisa los nombres, apellidos y teléfono.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Revisa el correo electrónico.');
    }
    if (!input.jurisdictionId) {
      throw new Error('Selecciona el recinto o la JRV que se asignará a esta cuenta.');
    }

    return this.repo.createUser({
      ...input,
      firstName: nombres,
      lastName: apellidos,
      phone: telefono,
      email,
    });
  }
}
