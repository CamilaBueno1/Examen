// Guía: Convierte los estados de sincronización en etiquetas y mensajes de interfaz.

export interface ResumenEstadoActa {
  etiqueta: string;
  detalle: string;
  categoria: 'enviada' | 'revision' | 'pendiente' | 'rechazada';
}

const CATALOGO_ESTADOS: Record<string, ResumenEstadoActa> = {
  PENDING: {
    etiqueta: 'Pendiente de envío',
    detalle: 'Guardada en el teléfono · se enviará al tener señal',
    categoria: 'pendiente',
  },
  EVIDENCIA_PENDIENTE: {
    etiqueta: 'Subiendo fotografía',
    detalle: 'Conteo recibido · terminando de subir la foto',
    categoria: 'pendiente',
  },
  EVIDENCIA_RECIBIDA: {
    etiqueta: 'Foto recibida',
    detalle: 'Conteo y fotografía recibidos · respaldo aún sin confirmar',
    categoria: 'revision',
  },
  EVIDENCIA_RESPALDADA: {
    etiqueta: 'Enviada y verificada ✓',
    detalle: 'Conteo recibido y fotografía respaldada',
    categoria: 'enviada',
  },
  EN_REVISION: {
    etiqueta: 'Enviada con observación',
    detalle: 'Recibida con fotografía marcada para revisión',
    categoria: 'revision',
  },
  PERMISO_REVOCADO: {
    etiqueta: 'No enviada',
    detalle: 'Ya no tienes asignada esta mesa; se conserva en el teléfono',
    categoria: 'rechazada',
  },
  CONFLICTO_VERSION: {
    etiqueta: 'Ya existe un acta para esta mesa',
    detalle: 'Revisa el acta vigente de esta dignidad en Enviadas. Esta captura permanece en el teléfono.',
    categoria: 'rechazada',
  },
  OPERACION_INCOMPATIBLE: {
    etiqueta: 'Requiere revisión',
    detalle: 'Ya existe un registro distinto para esta mesa y dignidad',
    categoria: 'rechazada',
  },
  VOTOS_INVALIDOS: {
    etiqueta: 'Conteo rechazado',
    detalle: 'La suma de votos no cuadró al validar en el servidor',
    categoria: 'rechazada',
  },
  EVIDENCIA_INVALIDA: {
    etiqueta: 'Foto no aceptada',
    detalle: 'Los datos de la fotografía o ubicación fueron rechazados',
    categoria: 'rechazada',
  },
  FOTO_NO_DISPONIBLE: {
    etiqueta: 'Falta archivo de foto',
    detalle: 'No se encontró la fotografía guardada en este teléfono',
    categoria: 'rechazada',
  },
};

export function infoEstadoActa(estado: string): ResumenEstadoActa {
  return (
    CATALOGO_ESTADOS[estado] ?? {
      etiqueta: estado,
      detalle: estado,
      categoria: 'revision',
    }
  );
}

export function estadoActa(estado: string): string {
  return infoEstadoActa(estado).detalle;
}
