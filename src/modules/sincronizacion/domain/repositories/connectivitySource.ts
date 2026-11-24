import type { Connectivity } from '../entities/connectivity';

export interface ConnectivitySource {
  subscribe(onChange: (connectivity: Connectivity) => void): () => void;
}
