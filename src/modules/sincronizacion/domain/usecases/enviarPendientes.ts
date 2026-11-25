// Guía: Controla las etapas, los reintentos y los rechazos al enviar actas.

export interface OperacionActa {
  id: string;
  autorId: string;
  datos: Record<string, unknown> & { fotoPath: string };
  estado: string;
  intentos: number;
}

export interface ColaActas {
  pendientes(autorId: string): Promise<OperacionActa[]>;
  cambiarEstado(operacion: OperacionActa, estado: string, aumentarIntento?: boolean): Promise<void>;
}

export interface RecepcionActas {
  recibir(operacion: OperacionActa): Promise<string>;
  evidencia(operacion: OperacionActa, actaId: string): Promise<string>;
}

// Envía el conteo y confirma la evidencia en dos pasos con el mismo identificador.
export function enviarPendientes(cola: ColaActas, remoto: RecepcionActas) {
  const notBefore = new Map<string, number>();

  return async (
    autorId: string,
    vigente: () => boolean,
    alActualizar: () => void,
    alFallar?: (error: unknown, codigo: string) => void,
  ) => {
    for (const operation of await cola.pendientes(autorId)) {
      if (!vigente()) return;
      if ((notBefore.get(operation.id) ?? 0) > Date.now()) continue;
      let estado = operation.estado;
      try {
        const actaId = await remoto.recibir(operation);
        if (!vigente()) return;
        if (estado !== 'EVIDENCIA_PENDIENTE') {
          estado = 'EVIDENCIA_PENDIENTE';
          await cola.cambiarEstado(operation, estado);
          alActualizar();
        }
        const resultado = await remoto.evidencia(operation, actaId);
        if (!vigente()) return;
        await cola.cambiarEstado(operation, resultado);
        notBefore.delete(operation.id);
        alActualizar();
      } catch (cause) {
        if (!vigente()) return;
        const message = cause instanceof Error ? cause.message : '';
        // Los rechazos definitivos se conservan para revisión, sin reintento automático.
        const terminal = [
          'CONFLICTO_VERSION',
          'PERMISO_REVOCADO',
          'OPERACION_INCOMPATIBLE',
          'VOTOS_INVALIDOS',
          'EVIDENCIA_INVALIDA',
          'FOTO_NO_DISPONIBLE',
        ].find((code) => message.includes(code));
        await cola.cambiarEstado(operation, terminal ?? estado, true);
        if (!terminal) {
          notBefore.set(operation.id, Date.now() + Math.min(300_000, 10_000 * 2 ** Math.min(operation.intentos, 5)));
        }
        alFallar?.(
          cause,
          estado === 'EVIDENCIA_PENDIENTE' ? 'ACTA_PHOTO_UPLOAD_FAILED' : terminal ?? 'ACTA_SYNC_RETRY_FAILED',
        );
        alActualizar();
      }
    }
  };
}
