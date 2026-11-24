# Revisión de recorridos — 24 de noviembre de 2026

Se compararon las referencias de las cuatro láminas con nombres, geometrías y conectividad de OpenStreetMap. La versión anterior resolvía puntos por coincidencia de nombre y cercanía a una zona aproximada: esto no era suficiente para distinguir calles homónimas.

## Correcciones

- Norte: Buenos Aires se sitúa en el tramo posterior a Honorio Delgado. Túpac Amaru y Aviación se trasladan al corredor hacia El Azufral, retirando la excursión a los homónimos del noreste de Cayma. Los enlaces OSM y la justificación están en `data/route-waypoints.json`.
- Este: se retira Tupacamaru de Miraflores y se usa Túpac Amaru entre Jesús y Prolongación Mariscal Castilla. Se ajustan ambos puntos de Mariscal Castilla y Lima para mantener la secuencia hacia Umachiri, sin sobrepasar esa zona y volver.
- Las cuatro rutas: José Santos Chocano se referencia en el tramo cercano a San Jerónimo, evitando usar su extremo de Samuel Velarde como punto de paso obligado.
- El motor vial ahora conserva la continuidad en los puntos intermedios (`continue_straight=true`) y limita el ajuste a la vía a 80 metros, antes 350. Las distancias de ajuste se guardan en la procedencia de cada archivo.
- La animación respeta las duraciones de las láminas: cada actualización de dos segundos avanza dos segundos de recorrido. Antes el ciclo completo duraba unos ocho minutos independientemente de la ruta.
- La cámara comienza plana, mirando al norte. La vista 3D opcional reduce la inclinación a 40° y conserva el norte, evitando una perspectiva tan pronunciada.

| Ruta  | Longitud anterior aproximada | Longitud revisada aproximada |
| ----- | ---------------------------- | ---------------------------- |
| Norte | 16,4 km                      | 12,2 km                      |
| Sur   | 10,0 km                      | 9,4 km                       |
| Este  | 15,4 km                      | 11,6 km                      |
| Oeste | 16,7 km                      | 16,4 km                      |

Las cifras describen el trazado vial calculado, no una distancia operativa certificada. Los cambios de longitud no se usan como prueba de exactitud: las pruebas comprueban las ubicaciones que causaron la regresión, la continuidad, el límite de ajuste y el ritmo de reproducción.

## Lo que continúa sin certificar

Siguen pendientes cinco referencias: Ricardo Palma en Norte, Sur y Oeste, Óvalo Vallecito en Sur y Las Rosas en Oeste. No se les asigna una ubicación inventada. La municipalidad confirma la existencia de Ricardo Palma en Umacollo y describe conexiones con calles próximas en [su publicación del 4 de mayo de 2026](https://www.muniarequipa.gob.pe/2026/05/04/inician-trabajos-de-asfaltado-en-avenida-ricardo-palma/), pero esto no aporta coordenadas precisas del punto de paso de las láminas. Esa noticia tampoco demuestra que los desvíos de obra sigan vigentes.

El perfil OSRM es de automóvil; sentidos de circulación, permisos de buses, conexiones entre referencias faltantes y vigencia del servicio necesitan validación con UCSM. No se afirma haber verificado el 100% del recorrido real.

La interfaz deja de usar los términos “demo” y “simulación”. Mantiene “Posición de referencia · Sin conexión GPS” y “recorrido orientativo” para que el cambio de redacción no presente datos generados como telemetría de una unidad real. Se rediseñaron el logo SVG, los iconos PWA y el marcador del bus de manera coherente.
