// Guía: Declara cómo suscribirse a los cambios de conectividad y cancelar la suscripción.

import type { Connectivity } from '../entities/connectivity';

export interface ConnectivitySource {
  // Recibe una función que se ejecuta al cambiar la conexión.
  // Devuelve otra función que permite dejar de escuchar esos cambios.
  subscribe(onChange: (connectivity: Connectivity) => void): () => void;
}
