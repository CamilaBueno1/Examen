// Guía: Obtiene la ubicación con Expo Location y consulta el tamaño de la foto.

import { File } from 'expo-file-system';
import * as Location from 'expo-location';

import type { EvidenciaSource } from '../../domain/usecases/leerEvidencia';

export const evidenciaExpo: EvidenciaSource = {
  async leerPosicion() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  },
  tamanoDeFoto(uri) {
    return new File(uri).size;
  },
};
