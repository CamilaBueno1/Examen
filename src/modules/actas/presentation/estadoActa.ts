const estados: Record<string, string> = {
  PENDING: 'Pendiente de sincronización',
  EVIDENCIA_PENDIENTE: 'Resultado recibido · evidencia pendiente',
  EVIDENCIA_RECIBIDA: 'Evidencia recibida · pendiente de validación',
  EVIDENCIA_RESPALDADA: 'Evidencia respaldada',
  EN_REVISION: 'Fotografía dudosa · en revisión',
  PERMISO_REVOCADO: 'Asignación revocada · requiere revisión',
  CONFLICTO_VERSION: 'Ya existe un acta vigente · requiere revisión',
  OPERACION_INCOMPATIBLE: 'Operación incompatible · requiere revisión',
  VOTOS_INVALIDOS: 'El servidor rechazó el conteo',
  EVIDENCIA_INVALIDA: 'El servidor rechazó los datos de evidencia',
  FOTO_NO_DISPONIBLE: 'Fotografía no disponible en este dispositivo',
};

export function estadoActa(estado: string): string {
  return estados[estado] ?? estado;
}
