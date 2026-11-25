// Guía: Muestra el GPS de captura y la posición del recinto en un mapa interno.

import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { leafletScript, leafletStyles } from '@/assets/leaflet/embedded';
import { Colors } from '@/constants/theme';

const hasCoordinates = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

export default function ActaMap({ lat, lon, recintoLat = NaN, recintoLon = NaN, accuracy }: {
  lat: number; lon: number; recintoLat?: number; recintoLon?: number; accuracy?: number | null;
}) {
  if (!hasCoordinates(lat, lon)) {
    return <Text style={styles.value}>No hay una ubicación de captura válida para mostrar.</Text>;
  }
  const recinto = hasCoordinates(recintoLat, recintoLon) ? [recintoLat, recintoLon] : null;
  const points = JSON.stringify({
    captura: [lat, lon],
    recinto,
    precision: typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null,
  });
  const html = `<!doctype html>
    <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>${leafletStyles}</style>
    <style>
      html,body,#map{height:100%;margin:0}
      .leaflet-container{background:#edf2ef}
      .map-pin{width:16px;height:16px;border-radius:50%;border:2px solid white;background:#103b50;box-shadow:0 1px 4px #20353c80}
      .map-pin.recinto{background:#a3712e}
      #tile-status{position:absolute;z-index:1000;left:8px;right:8px;bottom:18px;padding:6px 8px;border-radius:8px;background:#ffffffe8;color:#172b35;font:12px sans-serif}
      #tile-status[hidden]{display:none}
    </style></head>
    <body><div id="map"></div><div id="tile-status" role="status">Cargando mapa base…</div>
    <script>${leafletScript}</script>
    <script>
      const points=${points};
      const map=L.map('map',{zoomControl:true}).setView(points.captura,15);
      function pin(position,role,label) {
        const icon=L.divIcon({className:'',html:'<div class="map-pin '+role+'"></div>',iconSize:[20,20],iconAnchor:[10,10]});
        L.marker(position,{icon,title:label,alt:label}).addTo(map).bindPopup(label);
      }
      if(points.precision) L.circle(points.captura,{radius:points.precision,color:'#103b50',fillOpacity:.19,weight:1}).addTo(map);
      pin(points.captura,'captura','Ubicación de captura');
      if(points.recinto) {
        pin(points.recinto,'recinto','Recinto electoral');
        map.fitBounds([points.captura,points.recinto],{padding:[28,28],maxZoom:15});
      }
      const status=document.getElementById('tile-status');
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,attribution:'© OpenStreetMap'
      });
      let failures=0;
      tiles.on('loading',()=>{failures=0;});
      tiles.on('tileerror',()=>{failures++;status.hidden=false;status.textContent='Mapa base no disponible · se conservan los marcadores';});
      tiles.on('load',()=>{if(!failures)status.hidden=true;});
      tiles.addTo(map);
      setTimeout(()=>map.invalidateSize(),100);
      setTimeout(()=>{
        if(!status.hidden && !failures) status.textContent='Mapa base no disponible · se conservan los marcadores';
      },5500);
    </script></body></html>`;
  return (
    <View>
      <View style={styles.frame}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webView}
          javaScriptEnabled
          scrollEnabled={false}
          onShouldStartLoadWithRequest={({ url }) => url === 'about:blank' || url.startsWith('data:text/html')}
          renderError={() => <Text style={styles.notice}>El visor no se pudo abrir. Las coordenadas se muestran abajo.</Text>}
        />
      </View>
      <Text style={styles.value}>Captura: {lat.toFixed(6)}, {lon.toFixed(6)}</Text>
      {recinto ? <Text style={styles.value}>Recinto: {recintoLat.toFixed(6)}, {recintoLon.toFixed(6)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 230, borderRadius: 14, overflow: 'hidden', backgroundColor: '#EDF2EF' },
  webView: { flex: 1, backgroundColor: '#EDF2EF' },
  value: { fontFamily: 'LatoRegular', color: Colors.light.textSecondary, marginTop: 6 },
  notice: { fontFamily: 'LatoRegular', color: Colors.light.textSecondary, padding: 12 },
});
