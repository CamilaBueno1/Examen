// Guía: Implementa el análisis de imagen para la versión web.

import { forwardRef, useImperativeHandle } from 'react';

import { calcularMetricasGrises, type MetricasImagen } from '../domain/usecases/leerEvidencia';

export interface AnalizadorNitidezHandle {
  analizarBase64(base64: string): Promise<MetricasImagen | null>;
}

const AnalizadorNitidez = forwardRef<AnalizadorNitidezHandle>(function AnalizadorNitidez(_props, ref) {
  useImperativeHandle(ref, () => ({
    analizarBase64(base64: string): Promise<MetricasImagen | null> {
      if (!base64 || typeof document === 'undefined') return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const maxSide = 512;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const w = Math.max(64, Math.round(img.width * scale));
            const h = Math.max(64, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            const rgba = ctx.getImageData(0, 0, w, h).data;
            const grises = new Float32Array(w * h);
            for (let i = 0, p = 0; i < grises.length; i++, p += 4) {
              grises[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
            }
            resolve(calcularMetricasGrises(grises, w, h));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = `data:image/jpeg;base64,${base64}`;
      });
    },
  }));

  return null;
});

export default AnalizadorNitidez;
