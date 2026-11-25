/**
 * Use-case: registrar un nuevo usuario desde el flujo administrativo.
 * Valida cédula ecuatoriana (algoritmo módulo 10) y número telefónico ecuatoriano en dominio puro (ADR-04).
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

/**
 * Devuelve null si la cédula ecuatoriana es válida, o el motivo exacto del fallo.
 * Reglas:
 * 1. Exactamente 10 dígitos numéricos.
 * 2. Código provincial (2 primeros dígitos) entre 01 y 24.
 * 3. Tercer dígito entre 0 y 5 (persona natural).
 * 4. Décimo dígito igual al verificador módulo 10 con coeficientes [2,1,2,1,2,1,2,1,2].
 */
export function motivoErrorCedula(cedula: string): string | null {
  const limpia = cedula.trim();
  if (!/^\d+$/.test(limpia)) {
    return 'La cédula solo debe contener números.';
  }
  if (limpia.length !== 10) {
    return `La cédula debe tener 10 dígitos (llevas ${limpia.length}).`;
  }
  const provincia = Number(limpia.slice(0, 2));
  if (provincia < 1 || provincia > 24) {
    return 'Los dos primeros dígitos deben corresponder a una provincia válida (01 a 24).';
  }
  const tercerDigito = Number(limpia[2]);
  if (tercerDigito > 5) {
    return 'El tercer dígito de una cédula personal debe estar entre 0 y 5.';
  }

  const suma = [...limpia.slice(0, 9)].reduce((total, digito, indice) => {
    const valor = Number(digito) * (indice % 2 === 0 ? 2 : 1);
    return total + (valor > 9 ? valor - 9 : valor);
  }, 0);
  const verificador = (10 - (suma % 10)) % 10;
  if (verificador !== Number(limpia[9])) {
    return 'El dígito verificador final no coincide; revisa el número de cédula.';
  }
  return null;
}

export function cedulaEcuatorianaValida(cedula: string): boolean {
  return motivoErrorCedula(cedula) === null;
}

/**
 * Normaliza espacios y guiones, convirtiendo +5939XXXXXXXX a 09XXXXXXXX.
 */
export function normalizarTelefonoEcuatoriano(phone: string): string {
  const sinSeparadores = phone.trim().replace(/[\s-]/g, '');
  if (/^\+5930?\d{8,9}$/.test(sinSeparadores)) {
    const resto = sinSeparadores.slice(4);
    return resto.startsWith('0') ? resto : `0${resto}`;
  }
  return sinSeparadores;
}

/**
 * Valida teléfono de Ecuador:
 * - Celular: 10 dígitos iniciando con 09 (ej. 0991234567 o +593991234567)
 * - Convencional fijo con código provincial: 9 dígitos iniciando con 02..07 (ej. 022334455)
 */
export function motivoErrorTelefono(phone: string): string | null {
  const limpio = normalizarTelefonoEcuatoriano(phone);
  if (!limpio) {
    return 'Ingresa un número de teléfono.';
  }
  if (!/^\d+$/.test(limpio)) {
    return 'Ingresa únicamente números (ej. 0991234567).';
  }
  if (limpio.startsWith('09')) {
    if (limpio.length !== 10) {
      return `El celular ecuatoriano debe tener 10 dígitos (llevas ${limpio.length}).`;
    }
    return null;
  }
  if (/^0[2-7]/.test(limpio)) {
    if (limpio.length !== 9) {
      return `El teléfono fijo con código provincial debe tener 9 dígitos (llevas ${limpio.length}).`;
    }
    return null;
  }
  return 'Ingresa un celular ecuatoriano válido que empiece con 09 (10 dígitos).';
}

export function telefonoEcuatorianoValido(phone: string): boolean {
  return motivoErrorTelefono(phone) === null;
}

export class RegisterUser {
  constructor(private readonly repo: AuthRepository) {}

  async execute(input: RegisterUserInput, asignacionEsperada?: string): Promise<{ user: User; temporaryPassword: string }> {
    const cedula = input.cedula.trim();
    const nombres = input.firstName.trim();
    const apellidos = input.lastName.trim();
    const telefono = normalizarTelefonoEcuatoriano(input.phone);
    const email = input.email.trim().toLowerCase();

    const errorCedula = motivoErrorCedula(cedula);
    if (errorCedula) {
      throw new Error(`La cédula ecuatoriana no es válida: ${errorCedula}`);
    }
    if (nombres.length < 2 || apellidos.length < 2) {
      throw new Error('Ingresa los nombres y apellidos completos.');
    }
    const errorTelefono = motivoErrorTelefono(input.phone);
    if (errorTelefono) {
      throw new Error(errorTelefono);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Revisa el correo electrónico.');
    }
    if (!input.jurisdictionId) {
      throw new Error('Selecciona el recinto o la mesa que se asignará a esta cuenta.');
    }

    return this.repo.createUser({
      ...input,
      cedula,
      firstName: nombres,
      lastName: apellidos,
      phone: telefono,
      email,
    }, asignacionEsperada);
  }
}
