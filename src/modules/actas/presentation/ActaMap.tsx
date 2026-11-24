import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

export default function ActaMap({ lat, lon, recintoLat = NaN, recintoLon = NaN }: {
  lat: number; lon: number; recintoLat?: number; recintoLon?: number;
}) {
  const hasRecinto = Number.isFinite(recintoLat) && Number.isFinite(recintoLon);
  const centerLat = Number.isFinite(lat) ? lat : 0;
  const centerLon = Number.isFinite(lon) ? lon : 0;
  const markers = [
    `L.marker([${lat},${lon}],{title:"Captura"}).addTo(map).bindPopup("Ubicación de captura");`,
    hasRecinto ? `L.marker([${recintoLat},${recintoLon}],{title:"Recinto"}).addTo(map).bindPopup("Recinto electoral");` : '',
  ].join('');

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <style>html,body,#map{height:100%;margin:0}.leaflet-control-attribution{font-size:9px}</style></head>
    <body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>const map=L.map('map').setView([${centerLat},${centerLon}],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    ${markers}</script></body></html>`;

  return (
    <View>
        {Number.isFinite(lat) && Number.isFinite(lon) ? (
          <View style={styles.mapFrame}><WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} /></View>
        ) : (
          <Text style={styles.body}>No existe una ubicación de captura válida para mostrar.</Text>
        )}
        <Text style={styles.value}>Captura: {Number.isFinite(lat) ? lat.toFixed(6) : '—'}, {Number.isFinite(lon) ? lon.toFixed(6) : '—'}</Text>
        {hasRecinto ? <Text style={styles.value}>Recinto: {recintoLat.toFixed(6)}, {recintoLon.toFixed(6)}</Text> : null}
    </View>
  );
}
const colors = Colors.light;
const styles = StyleSheet.create({
  mapFrame: { height: 380, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  value: { color: colors.textSecondary, marginTop: 8 },
  body: { color: colors.textSecondary },
});
