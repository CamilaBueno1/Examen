export type NivelSeguridadClave = 'vacia' | 'no_segura' | 'poco_segura' | 'segura' | 'muy_segura';

export interface ReglaSeguridadClave {
  id: 'longitud' | 'letras' | 'numero' | 'refuerzo';
  texto: string;
  cumple: boolean;
}

export interface ResultadoSeguridadClave {
  nivel: NivelSeguridadClave;
  etiqueta: string;
  puntos: number; // 0..4
  esSegura: boolean;
  reglas: ReglaSeguridadClave[];
}

/**
 * Evalúa en dominio puro qué tan segura es la nueva contraseña definida por el usuario
 * en su primer acceso o recuperación (RF-02 / ADR-04).
 */
export function evaluarSeguridadClave(password: string): ResultadoSeguridadClave {
  const tieneLongitud = password.length >= 8;
  const tieneMayusYMinus = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const tieneNumero = /\d/.test(password);
  const tieneRefuerzo = /[^A-Za-z0-9\s]/.test(password) || password.length >= 12;

  const reglas: ReglaSeguridadClave[] = [
    { id: 'longitud', texto: '8 caracteres como mínimo', cumple: tieneLongitud },
    { id: 'letras', texto: 'Mayúsculas y minúsculas', cumple: tieneMayusYMinus },
    { id: 'numero', texto: 'Al menos un número', cumple: tieneNumero },
    { id: 'refuerzo', texto: 'Símbolo (ej. @ # .) o 12+ letras', cumple: tieneRefuerzo },
  ];

  if (password.length === 0) {
    return {
      nivel: 'vacia',
      etiqueta: 'Escribe tu nueva contraseña',
      puntos: 0,
      esSegura: false,
      reglas,
    };
  }

  const cumplidas = reglas.filter((r) => r.cumple).length;

  if (!tieneLongitud || cumplidas <= 1) {
    return {
      nivel: 'no_segura',
      etiqueta: 'Contraseña no segura',
      puntos: 1,
      esSegura: false,
      reglas,
    };
  }

  if (cumplidas === 2) {
    return {
      nivel: 'poco_segura',
      etiqueta: 'Contraseña poco segura',
      puntos: 2,
      esSegura: false,
      reglas,
    };
  }

  if (cumplidas === 3) {
    return {
      nivel: 'segura',
      etiqueta: 'Contraseña segura',
      puntos: 3,
      esSegura: true,
      reglas,
    };
  }

  return {
    nivel: 'muy_segura',
    etiqueta: 'Contraseña muy segura',
    puntos: 4,
    esSegura: true,
    reglas,
  };
}
