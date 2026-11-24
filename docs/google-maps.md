# Google Maps y rediseño

La vista principal usa exclusivamente Maps JavaScript API. Se retiró el esquema SVG de la pantalla de seguimiento. La geometría se solicita mediante `Route.computeRoutes` de la biblioteca `routes`, con modo DRIVING, orden de referencias fijo y hasta 23 puntos intermedios para Oeste. No se dibujan rectas si falla el servicio.

El cálculo de geometría es bajo demanda al seleccionar una ruta; se conserva en memoria de la pestaña para no repetir solicitudes al animar o seleccionar referencias. No se guardan resultados Google en archivos, service workers ni almacenamiento persistente. El mapa ofrece calles, satélite y una capa de tráfico activable. La geometría básica usa TRAFFIC_UNAWARE; activar la capa de tráfico no convierte el ETA de demo en una predicción real.

Los textos de las láminas se complementan con localidades de búsqueda de Arequipa. Estos calificadores son ayudas para resolver nombres repetidos, no datos certificados. Las vías no describen intersecciones exactas. La app comprueba que todas las referencias devueltas estén dentro de Arequipa y que se mantenga su cantidad y orden. Esto no demuestra que Google haya elegido el tramo correcto de cada avenida: hace falta revisar visualmente el resultado y, cuando sea necesario, sustituir direcciones ambiguas por coordenadas o Place IDs confirmados. No se presenta el trazado como ruta operativa oficial.

El bus simulado avanza por distancia sobre los segmentos de la polilínea Google. No se interpola una recta entre referencias lejanas. El ETA de demostración se deriva de la distancia restante y la duración publicada en la lámina; no usa sensores, históricos de viajes ni tráfico real. Sin geometría válida se muestra ETA no disponible.

## Estado de configuración verificado

- Se creó un proyecto vacío UCSM Bus Tracker (`precise-duality-515704-m4`).
- El usuario completó el inicio de Maps en otro proyecto (`project-5103f937-0e09-49a7-a63`, nombre My First Project); no se creó una cuenta de facturación desde la automatización.
- Google generó una clave durante ese inicio. Se restringió al sitio `https://ucsm-bus-tracker.vercel.app/*` y se configuró `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en Vercel Production. No se incluye la clave en Git.
- Google muestra que la prueba gratuita requiere un prepago. El usuario confirmó que todavía no lo realizó. La carga real del mapa, Routes API y los resultados cartográficos NO están verificados mientras esto siga pendiente.

## Completar la activación

1. En el proyecto de Maps, completar personalmente cualquier pago o aceptación contractual que Google requiera. No puede garantizarse que el consumo sea gratuito.
2. Confirmar la facturación activa y habilitar Maps JavaScript API y Routes API.
3. La clave ya está limitada a esas dos APIs. Los dominios locales no están autorizados; validar el mapa en el dominio de producción o ampliar expresamente las restricciones a un entorno de pruebas. Tras acreditar el pago y activar las APIs, poner `NEXT_PUBLIC_GOOGLE_MAPS_BILLING_PENDING=false` en Vercel y volver a desplegar.
4. Crear cuotas y alertas de presupuesto acordes al uso. Una alerta no detiene automáticamente el gasto.
5. Verificar en producción las cuatro rutas, cada vía y sentido de circulación; corregir referencias ambiguas antes de considerarlas validadas.

Mientras Google rechace la carga, la app informa la configuración pendiente y conserva la consulta de horarios, láminas, favoritos y simulaciones de avisos.
