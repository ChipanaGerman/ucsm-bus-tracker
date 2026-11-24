# Funciones Firebase (integración pendiente de proyecto real)

Código de integración para Node.js 22. No se despliega con Vercel. No está activado ni validado contra un proyecto cloud en la demostración.

```sh
cd functions
npm ci
npm run check
cd ..
firebase functions:secrets:set GOOGLE_ROUTES_API_KEY --project TU_PROYECTO_CONFIRMADO
firebase deploy --only database,firestore:rules,functions --project TU_PROYECTO_CONFIRMADO
```

El despliegue de funciones y Google Routes puede requerir facturación. Revisa cuotas/costos antes de activarlos. El proyecto de ejemplo no crea una cuenta, recursos de pago ni claves.

## Emisor

El emisor debe usar Firebase Auth de dispositivo y App Check válido. Un administrador configura custom claims `{ device: true, vehicleId: 'BUS_01', allowedRouteIds: ['norte'] }` usando Admin SDK en un entorno seguro. No lo hagas desde el cliente estudiante. La función callable `ingestTelemetry` recibe:

```json
{"routeId":"norte","vehicleId":"BUS_01","tripId":"20261123_manana_norte","sequence":1,"nextPointIndex":0,"latitude":-16.4,"longitude":-71.5,"speedKmh":20,"sampledAt":1795489200000,"occupancy":20,"capacity":50,"status":"normal"}
```

Valores de ejemplo, no coordenadas oficiales. `tripId` es único por recorrido real; `nextPointIndex` es el siguiente índice 0-based calculado por el adaptador del dispositivo. No se acepta como prueba de un paradero sin coordenadas verificadas. La función rechaza muestras antiguas, fuera de rango, repetidas, de otra ruta o más frecuentes que 4 segundos.

## Configuración de rutas

Firestore `/routes/{routeId}` debe contener `etaEnabled: true` y una lista `points` en el mismo orden y con los mismos IDs de `src/lib/routes.ts`:

```json
{"id":"norte-1","name":"Nombre validado","lat":-16.4,"lng":-71.5,"coordinateVerified":true,"boardingVerified":false}
```

No copies las coordenadas de ejemplo. Completa la **lista íntegra** con posiciones verificadas; si falta alguna se deshabilita el ETA. La autorización de abordaje es independiente de la verificación de una coordenada.

Google Routes calcula las duraciones de las piernas restantes con tráfico. Cuando se aportan históricos reales por punto de partida (`historyByNextPoint`) y al menos diez muestras, el estimador combina 85% tráfico con 15% histórico. En el último tramo menor a 300 metros incorpora velocidad GPS. Es una heurística inicial que necesita calibración y evaluación con recorridos reales. No se entrena un modelo predictivo con datos ficticios.

## Alertas

`sendTransportAlerts` evalúa el cruce del umbral de cada usuario, llegada a geocerca de 100 metros de un punto autorizado y transiciones de retraso/desvío. Usa IDs deterministas por viaje/referencia/tipo para evitar avisos repetidos al reprocesar eventos. La reclamación previa al envío prioriza evitar duplicados: una interrupción entre reclamación y envío puede dejar un aviso sin entregar; el estado queda registrado para revisión. No se promete exactamente una entrega ni puntualidad absoluta de push.

La consulta de perfiles está limitada por ruta y procesa dispositivos por usuario. Para una flota grande debe migrar a suscripciones indexadas por ruta/punto y cola de entrega; este backend está dimensionado como integración académica inicial de una unidad por ruta.

## Históricos

No se guardan indefinidamente muestras de localización ni se inventan históricos. Un proceso administrativo de recolección y agregación real debe producir `historyByNextPoint[index] = { seconds, samples }`. Sin esos datos se utiliza únicamente Google Routes y último tramo. Antes de operar, verificar reglas en emulador, cuenta institucional, dispositivo, costos y eventos con un viaje controlado.
