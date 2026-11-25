export interface EvidenciaSource {
  leerPosicion(): Promise<{
    coords: { latitude: number; longitude: number; accuracy: number | null };
    timestamp: number;
  } | null>;
  tamanoDeFoto(uri: string): number;
}

export interface MetricasImagen {
  brilloMedio: number;
  porcentajeOscuro: number;
  porcentajeReflejo: number;
  bloquesDocumento: number;
  acutancia: number;
  nitidezBordes: number;
}

export interface EvaluacionFoto {
  calidad: 'buena' | 'dudosa';
  motivo: string;
}

export type PosicionActa = NonNullable<Awaited<ReturnType<EvidenciaSource['leerPosicion']>>>;

/**
 * Calcula métricas reales de iluminación, contraste documental y nitidez de enfoque
 * sobre una matriz de luminancia en escala de grises (0..255).
 */
export function calcularMetricasGrises(
  grises: ArrayLike<number>,
  width: number,
  height: number,
): MetricasImagen {
  if (width < 32 || height < 32 || grises.length < width * height) {
    return {
      brilloMedio: 0,
      porcentajeOscuro: 1,
      porcentajeReflejo: 0,
      bloquesDocumento: 0,
      acutancia: 0,
      nitidezBordes: 0,
    };
  }

  const x0 = Math.floor(width * 0.12);
  const x1 = Math.floor(width * 0.88);
  const y0 = Math.floor(height * 0.10);
  const y1 = Math.floor(height * 0.90);
  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);
  const totalPixels = cropW * cropH;

  let sumY = 0;
  let oscuros = 0;
  let reflejos = 0;

  const gridCols = 8;
  const gridRows = 8;
  const blockCount = gridCols * gridRows;
  const blockMin = new Float64Array(blockCount).fill(255);
  const blockMax = new Float64Array(blockCount).fill(0);
  const blockSum = new Float64Array(blockCount);
  const blockLen = new Int32Array(blockCount);
  const blockG1 = new Float64Array(blockCount);
  const blockG3 = new Float64Array(blockCount);
  const blockMaxStep = new Float64Array(blockCount);

  for (let y = y0; y < y1; y++) {
    const rowOffset = y * width;
    const by = Math.min(gridRows - 1, Math.floor(((y - y0) * gridRows) / cropH));
    for (let x = x0; x < x1; x++) {
      const idx = rowOffset + x;
      const v = grises[idx];
      sumY += v;
      if (v < 48) oscuros++;
      if (v > 248) reflejos++;

      const bx = Math.min(gridCols - 1, Math.floor(((x - x0) * gridCols) / cropW));
      const bi = by * gridCols + bx;
      if (v < blockMin[bi]) blockMin[bi] = v;
      if (v > blockMax[bi]) blockMax[bi] = v;
      blockSum[bi] += v;
      blockLen[bi]++;

      if (x + 3 < x1 && y + 3 < y1) {
        const dx1 = Math.abs(grises[idx + 1] - v);
        const dy1 = Math.abs(grises[idx + width] - v);
        const step = dx1 > dy1 ? dx1 : dy1;
        if (step > blockMaxStep[bi]) blockMaxStep[bi] = step;
        blockG1[bi] += dx1 + dy1;
        blockG3[bi] += Math.abs(grises[idx + 3] - v) + Math.abs(grises[idx + width * 3] - v);
      }
    }
  }

  let bloquesDocumento = 0;
  let totalG1 = 0;
  let totalG3 = 0;
  let sumMaxStep = 0;

  for (let i = 0; i < blockCount; i++) {
    if (blockLen[i] === 0) continue;
    const meanBlock = blockSum[i] / blockLen[i];
    const contrast = blockMax[i] - blockMin[i];
    if (contrast >= 38 && meanBlock >= 68) {
      bloquesDocumento++;
      totalG1 += blockG1[i];
      totalG3 += blockG3[i];
      sumMaxStep += blockMaxStep[i];
    }
  }

  const acutancia = bloquesDocumento > 0 && totalG3 > 0 ? totalG1 / totalG3 : 0;
  const nitidezBordes = bloquesDocumento > 0 ? sumMaxStep / bloquesDocumento : 0;

  return {
    brilloMedio: sumY / totalPixels,
    porcentajeOscuro: oscuros / totalPixels,
    porcentajeReflejo: reflejos / totalPixels,
    bloquesDocumento,
    acutancia,
    nitidezBordes,
  };
}

export function leerEvidencia(source: EvidenciaSource) {
  return {
    posicion: () => source.leerPosicion(),
    inspeccionarFoto(
      uri: string,
      width: number,
      height: number,
      metricas?: MetricasImagen | null,
    ): EvaluacionFoto {
      const size = source.tamanoDeFoto(uri);
      if (width < 900 || height < 900 || (size > 0 && size < 150_000)) {
        return {
          calidad: 'dudosa',
          motivo: 'La imagen tiene baja resolución. Acerca un poco más el teléfono al acta.',
        };
      }
      if (!metricas) {
        return {
          calidad: 'dudosa',
          motivo: 'No se pudo comprobar la nitidez de la imagen. Toma la fotografía nuevamente.',
        };
      }
      if (metricas.brilloMedio < 82 || metricas.porcentajeOscuro > 0.38) {
        return {
          calidad: 'dudosa',
          motivo: 'La foto está muy oscura. Ilumina bien el acta sobre una mesa clara.',
        };
      }
      if (
        metricas.porcentajeReflejo > 0.52 ||
        (metricas.porcentajeReflejo > 0.05 && metricas.brilloMedio < 145)
      ) {
        return {
          calidad: 'dudosa',
          motivo: 'Se detectó un reflejo fuerte de luz que tapa parte de la imagen.',
        };
      }
      if (metricas.bloquesDocumento < 8) {
        return {
          calidad: 'dudosa',
          motivo: 'La foto está borrosa o no se distinguen los recuadros ni el texto del acta.',
        };
      }
      if (metricas.acutancia < 0.42 || metricas.nitidezBordes < 40) {
        return {
          calidad: 'dudosa',
          motivo: 'La foto salió borrosa o desenfocada. Sujeta firme el teléfono y enfoca el texto.',
        };
      }
      return {
        calidad: 'buena',
        motivo: 'La imagen tiene buena iluminación y los datos del acta se ven nítidos.',
      };
    },
    evaluarFoto(
      uri: string,
      width: number,
      height: number,
      metricas?: MetricasImagen | null,
    ): 'buena' | 'dudosa' {
      return this.inspeccionarFoto(uri, width, height, metricas).calidad;
    },
  };
}
