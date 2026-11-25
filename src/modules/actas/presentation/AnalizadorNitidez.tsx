import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { MetricasImagen } from '../domain/usecases/leerEvidencia';

export interface AnalizadorNitidezHandle {
  analizarBase64(base64: string): Promise<MetricasImagen | null>;
}

const ANALYZER_HTML = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<canvas id="cv"></canvas>
<script>
window.__b64 = '';
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { willReadFrequently: true });

function computeMetrics(rgba, width, height) {
  const len = width * height;
  const grises = new Float32Array(len);
  for (let i = 0, p = 0; i < len; i++, p += 4) {
    grises[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }

  const x0 = Math.floor(width * 0.12);
  const x1 = Math.floor(width * 0.88);
  const y0 = Math.floor(height * 0.10);
  const y1 = Math.floor(height * 0.90);
  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);
  const totalPixels = cropW * cropH;

  let sumY = 0, oscuros = 0, reflejos = 0;
  const gridCols = 8, gridRows = 8, blockCount = 64;
  const blockMin = new Float32Array(blockCount).fill(255);
  const blockMax = new Float32Array(blockCount).fill(0);
  const blockSum = new Float32Array(blockCount);
  const blockLen = new Int32Array(blockCount);
  const blockG1 = new Float32Array(blockCount);
  const blockG3 = new Float32Array(blockCount);
  const blockMaxStep = new Float32Array(blockCount);

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

  let bloquesDocumento = 0, totalG1 = 0, totalG3 = 0, sumMaxStep = 0;
  for (let i = 0; i < blockCount; i++) {
    if (!blockLen[i]) continue;
    const meanBlock = blockSum[i] / blockLen[i];
    if (blockMax[i] - blockMin[i] >= 38 && meanBlock >= 68) {
      bloquesDocumento++;
      totalG1 += blockG1[i];
      totalG3 += blockG3[i];
      sumMaxStep += blockMaxStep[i];
    }
  }

  return {
    brilloMedio: sumY / totalPixels,
    porcentajeOscuro: oscuros / totalPixels,
    porcentajeReflejo: reflejos / totalPixels,
    bloquesDocumento,
    acutancia: bloquesDocumento > 0 && totalG3 > 0 ? totalG1 / totalG3 : 0,
    nitidezBordes: bloquesDocumento > 0 ? sumMaxStep / bloquesDocumento : 0,
  };
}

window.__runAnalysis = function(reqId) {
  const raw = window.__b64;
  window.__b64 = '';
  if (!raw) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ reqId, metricas: null }));
    return;
  }
  const img = new Image();
  img.onload = function() {
    try {
      const maxSide = 512;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(64, Math.round(img.width * scale));
      const h = Math.max(64, Math.round(img.height * scale));
      cv.width = w;
      cv.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const metricas = computeMetrics(data, w, h);
      window.ReactNativeWebView.postMessage(JSON.stringify({ reqId, metricas }));
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ reqId, metricas: null }));
    }
  };
  img.onerror = function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ reqId, metricas: null }));
  };
  img.src = 'data:image/jpeg;base64,' + raw;
};
</script></body></html>`;

const AnalizadorNitidez = forwardRef<AnalizadorNitidezHandle>(function AnalizadorNitidez(_props, ref) {
  const webViewRef = useRef<{ injectJavaScript(script: string): void } | null>(null);
  const readyRef = useRef(false);
  const readyWaiters = useRef<(() => void)[]>([]);
  const seqRef = useRef(0);
  const pendingRef = useRef(new Map<number, (value: MetricasImagen | null) => void>());

  const waitUntilReady = () => {
    if (readyRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1500);
      readyWaiters.current.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  };

  useImperativeHandle(ref, () => ({
    async analizarBase64(base64: string): Promise<MetricasImagen | null> {
      if (!base64) return null;
      await waitUntilReady();
      const webView = webViewRef.current;
      if (!webView) return null;

      const reqId = ++seqRef.current;
      return new Promise<MetricasImagen | null>((resolve) => {
        const timeout = setTimeout(() => {
          pendingRef.current.delete(reqId);
          resolve(null);
        }, 3500);

        pendingRef.current.set(reqId, (metricas) => {
          clearTimeout(timeout);
          resolve(metricas);
        });

        const CHUNK_SIZE = 160_000;
        webView.injectJavaScript('window.__b64 = ""; true;');
        for (let offset = 0; offset < base64.length; offset += CHUNK_SIZE) {
          const piece = JSON.stringify(base64.slice(offset, offset + CHUNK_SIZE));
          webView.injectJavaScript(`window.__b64 += ${piece}; true;`);
        }
        webView.injectJavaScript(`window.__runAnalysis(${reqId}); true;`);
      });
    },
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as {
        reqId?: number;
        metricas?: MetricasImagen | null;
      };
      if (typeof parsed.reqId === 'number') {
        const resolver = pendingRef.current.get(parsed.reqId);
        if (resolver) {
          pendingRef.current.delete(parsed.reqId);
          resolver(parsed.metricas ?? null);
        }
      }
    } catch {
      // Ignora mensajes ajenos
    }
  };

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={(instance) => {
          webViewRef.current = instance;
        }}
        originWhitelist={['*']}
        source={{ html: ANALYZER_HTML }}
        javaScriptEnabled
        onLoadEnd={() => {
          readyRef.current = true;
          const waiters = readyWaiters.current.splice(0);
          for (const notify of waiters) notify();
        }}
        onMessage={onMessage}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -10,
    top: -10,
  },
});

export default AnalizadorNitidez;
