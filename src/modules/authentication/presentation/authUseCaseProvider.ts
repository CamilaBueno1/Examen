// Presentation solo re-exporta los casos de uso ya compuestos en ../authProvider.ts.
// No importa ni instancia adaptadores de data.
export {
  registrarUsuario,
  loginUseCase,
  requestPasswordResetUseCase,
  restablecerClave,
  flujoPrimerAcceso,
  restaurarSesion,
  cerrarSesion,
  desactivarUsuario,
} from '../authProvider';
