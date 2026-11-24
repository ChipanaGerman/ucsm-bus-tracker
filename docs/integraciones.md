# Contratos e integración real

## Separación de modos

La app inicia en modo **DEMO**. No utiliza credenciales de universidad y no publica ubicación del estudiante. Al seleccionar GPS real desde Perfil, requiere acceso institucional válido. Si no existe telemetría reciente, muestra sin señal y no dibuja un bus de ejemplo.

## Telemetría

Realtime Database: `/telemetry/{norte|sur|este|oeste}`. Solo el backend Admin puede escribir. El cliente autenticado institucional puede leer.

```json
{
  "routeId": "norte",
  "vehicleId": "IDENTIFICADOR_AUTORIZADO",
  "latitude": -16.4,
  "longitude": -71.5,
  "speedKmh": 25,
  "updatedAt": 1795489200000,
  "occupancy": 24,
  "capacity": 50,
  "etaMinutes": 8,
  "targetPointId": "norte-19",
  "status": "normal"
}
```

Los números de este bloque son ejemplos del contrato, no datos observados. `updatedAt` se expresa en milisegundos UTC. El cliente rechaza coordenadas fuera de rango, velocidad inválida y rutas incongruentes. Después de 60 segundos oculta ETA/aforo y deja de presentar el GPS como actual. Sin `capacity` y `occupancy` válidos, muestra aforo sin datos. Un ETA corresponde únicamente a su `targetPointId`; no se reutiliza para otras referencias.

Las funciones incluidas permiten recibir muestras mediante una llamada autenticada con claims de dispositivo. **No asignes esos claims a estudiantes.** Requiere Firebase Admin, App Check y despliegue de funciones en un proyecto confirmado. El backend debe normalizar el protocolo del módulo GPS elegido.

## Preferencias

Firestore `/users/{uid}` contiene favoritos, activación de avisos, umbral 3/5/10, ruta y referencia habitual. Solo el usuario propietario con correo institucional verificado puede leer/escribir su perfil. El dominio de las reglas es `ucsm.edu.pe`: confirmar antes de producción.

Dispositivos push: `/users/{uid}/devices/{token}`. Al cerrar sesión se elimina la inscripción del dispositivo y se limpia el historial/favoritos de la sesión local. Los estudiantes no pueden crear alertas de servidor ni escribir rutas o GPS.

## ETA, Google y geocercas

El esquema del cliente no es apto para calcular distancias reales. El backend necesita referencias georreferenciadas y secuencia validada, registradas en Firestore `/routes/{routeId}`. Debe ignorar los puntos de dibujo SVG.

Las funciones tienen un adaptador para Google Routes con tráfico. En ausencia de datos verificados o clave del servidor, la telemetría puede mostrarse pero el ETA queda nulo. Los históricos se incorporan únicamente cuando se suministran muestras reales; se debe medir y documentar su error antes de anunciar precisión predictiva. La velocidad GPS se valida en la ingesta y puede apoyar el cálculo de último tramo; no se debe estimar el recorrido completo como distancia en línea recta / velocidad.

El procesamiento de alertas se ejecuta en Firebase, no en un temporizador del navegador ni en un proceso perpetuo de Vercel. Los avisos de proximidad requieren un ETA válido para la referencia habitual. La llegada requiere una geocerca con coordenadas verificadas. Se usan claves deterministas de viaje para evitar duplicados; un proveedor push externo no ofrece entrega exactamente una vez.

## Push

Se envían mensajes FCM de datos (`title`, `body`, `routeId`, `tag`). `/sw.js` muestra la notificación y abre el recorrido. El usuario debe solicitar y conceder permiso. Los tokens se conservan en Firestore con acceso restringido. La configuración VAPID nunca se genera automáticamente. iOS requiere instalación en pantalla de inicio en una versión compatible.

## Despliegue

- Next.js: Vercel con repositorio conectado y Node 22.
- Firebase: reglas y funciones, desplegadas por separado. No se habilita facturación ni se crean recursos de pago sin revisar sus costos.
- Maps JavaScript: clave pública restringida por dominio. Routes: secreto únicamente en funciones.
- Preview debe usar un proyecto Firebase de pruebas si se habilitan integraciones.

Antes de activar modo real, comprobar: cuenta verificada, reglas desplegadas, rechazo a otro dominio, escritura GPS denegada a estudiantes, fuente de telemetría válida, pérdida de señal, ETA por punto, evento de proximidad, llegada y deduplicación, entrega push con app cerrada y cierre de sesión.
