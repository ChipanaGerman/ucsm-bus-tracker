# MapLibre GL + OpenFreeMap

Desde el 24 de noviembre de 2026 el mapa usa MapLibre GL JS y el estilo Liberty de OpenFreeMap. No requiere cuenta, clave ni prepago de Google. El SDK y los avisos de facturación de Google Maps fueron retirados. Las variables antiguas de Google Maps ya no son utilizadas por la aplicación.

El mapa vectorial admite zoom, rotación, pantalla completa, recentrado del recorrido y vista 2D/3D. El botón 3D enfoca la referencia seleccionada y muestra extrusiones de edificios disponibles en OpenMapTiles; no representa terreno ni garantiza alturas para todos los edificios. No hay capa de tráfico ni fotografías satelitales.

## Geometría y límites

Las 75 referencias y horarios conservan el orden de las láminas originales. `data/route-waypoints.json` documenta 70 ubicaciones aproximadas obtenidas de elementos de OpenStreetMap, con enlace al elemento fuente y su nombre cartográfico. Las coordenadas corresponden a puntos de la vía o del lugar, no a paraderos autorizados. Algunos nombres se resuelven con variantes cartográficas (Plaza Umachiri / Parque Umachiri, Calle Palacios / Teniente Palacios, etc.); requieren comprobación local.

Cinco referencias no se ubicaron con confianza: Av. Ricardo Palma en Norte, Sur y Oeste; Óvalo Vallecito en Sur; Las Rosas en Oeste. Se conservan como `null`: no tienen marcador ni ETA. No se trasladan a otras calles con el mismo nombre.

`public/map-routes/*.json` contiene cuatro trazados calculados mediante OSRM/FOSSGIS (perfil automóvil) entre las referencias ubicadas y en su orden. Los segmentos siguen la red vial de OSM, no las rectas del esquema original. El motor puede elegir calles adicionales o giros distintos a los de un bus universitario. En particular, conecta referencias vecinas alrededor de las que faltan. Por ello se rotulan **recorridos orientativos, no oficiales**, pendientes de contrastar vía por vía y sentido por sentido con UCSM. La presencia de una polilínea sobre una calle no certifica que el bus pase por ella.

El bus de demostración interpola la distancia a lo largo de todos los vértices del trazado. Su ETA usa la duración de la lámina y la proporción de distancia restante: es una simulación, no una predicción con tráfico real. GPS real sigue requiriendo telemetría autorizada de Firebase. La animación respeta movimiento reducido y no añade solicitudes al servidor de rutas.

## Reproducir y actualizar

1. Revisar y corregir `data/route-waypoints.json` con coordenadas contrastadas. Conservar fuentes y las referencias todavía desconocidas como `null`.
2. Ejecutar `npm run maps:rebuild` desde la raíz. Hace cuatro solicitudes seriales a OSRM, espaciadas por más de un segundo. No se ejecuta al compilar o abrir la app.
3. Revisar visualmente el resultado y ejecutar `npm run check`. Los tests comprueban límites geográficos, continuidad, correspondencia de las referencias y ETA no inventado.

El visitante descarga geometría estática desde Vercel y cartografía desde OpenFreeMap. No llama a geocodificadores ni servidores públicos de rutas. El worker de MapLibre se copia de la versión instalada a `public/vendor/` mediante `postinstall` para que coincida con el SDK. El mapa base necesita conexión y WebGL; si falla, se ofrece reintentar y permanecen disponibles horarios, favoritos e imágenes. La página offline conserva las láminas, no descarga un mapa completo.

## Fuentes y atribución

- [OpenFreeMap: guía de integración](https://openfreemap.org/quick_start/).
- [MapLibre: edificios 3D](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/).
- [OpenStreetMap: datos ODbL](https://www.openstreetmap.org/copyright). Las geometrías derivadas se distribuyen bajo ODbL 1.0. Las láminas originales no se relicencian.
- [OSRM/FOSSGIS: condiciones del servicio](https://routing.openstreetmap.de/about.html), máximo una solicitud por segundo, uso ligero.
- [OSRM: Route service](https://project-osrm.org/docs/v5.24.0/api/#route-service).

Se mantienen visibles las atribuciones OpenFreeMap, OpenMapTiles, OpenStreetMap y OSRM/FOSSGIS. La ausencia de clave no constituye una garantía de disponibilidad del servicio público.
