# Fuentes y alcance de los datos

## Láminas proporcionadas

Las imágenes `ruta_norte.jpg`, `ruta_sur.jpg`, `ruta_este.jpg`, `ruta_oeste.jpg` fueron proporcionadas por el usuario en la carpeta de trabajo el 23 de noviembre de 2026 (America/Lima). Se conservan sin editar en `public/routes/`.

- Identifican cuatro recorridos del **turno mañana**, con secuencia de vías y horas de partida/llegada.
- No aportan fecha, coordenadas, polígonos de geocercas, ubicación de GPS, identificación de unidades, horarios nocturnos ni autorización específica de puntos de embarque.
- La primera versión usaba un esquema SVG. Se retiró del seguimiento y del código de rutas. La nueva vista solicita a Google una geometría por calles en el orden de las láminas; la validación visual de los resultados sigue pendiente de activar la facturación.
- Los ejemplos Centro, Cayma, Sachaca y Zamácola del PDF inicial no se trataron como cuatro rutas oficiales independientes; prevalecen las cuatro láminas suministradas.
- El campo `boardingVerified` es `false` y `coordinate` es `null` en todas las referencias. Solo deben cambiar con datos verificados.

## Fuentes oficiales consultadas

1. **UCSM, 7 de marzo de 2025**: [Con el inicio del año académico 2025 la UCSM brinda servicio de transporte gratuito a sus estudiantes](https://ucsm.edu.pe/con-el-inicio-del-ano-academico-2025-la-ucsm-brinda-servicio-de-transporte-gratuito-a-sus-estudiantes/). Confirma el servicio gratuito, Norte/Sur, horarios generales de mañana/noche y documentos de identificación para abordar. La flota y horarios descritos corresponden a esa publicación, no se atribuyen automáticamente al servicio actual.
2. **UCSM, 25 de noviembre de 2025**: [Incorporación de buses eléctricos](https://ucsm.edu.pe/ucsm-es-la-primera-universidad-del-peru-en-incorporar-buses-electricos-para-el-transporte-gratuito-de-sus-estudiantes/). Confirma incorporación de dos unidades eléctricas y cobertura Norte/Sur. No publica por sí sola un catálogo actualizado de cuatro rutas con georreferenciación.

La búsqueda también encontró una referencia secundaria a una ampliación hacia Este/Oeste en 2026; no se usó como evidencia oficial de paraderos. Las cuatro rutas de la app se fundamentan en las láminas del autor. La fecha exacta de vigencia de esas láminas continúa sin confirmar.

## Datos de demostración

Ubicación del bus, velocidad de reproducción, ETA, ocupación y eventos de prueba son simulados. Las 50 plazas de capacidad de la demostración son un parámetro de ejemplo, no una especificación confirmada de las unidades actuales. No se muestra tráfico real en la demo ni se atribuye precisión predictiva a un recorrido sin históricos.

## Requisitos pendientes de insumos externos

- Validar las ubicaciones exactas y los puntos autorizados de abordaje con UCSM.
- Confirmar vigencia de recorridos, calendario de operación y horarios nocturnos.
- Obtener proyecto Firebase, dominio institucional y configuración Google Maps.
- Integrar equipos GPS y fuente de aforo auténtica.
- Recoger históricos para calibrar ETA y medir error con viajes reales.
- Validar push en Android y en PWA instalada de iOS compatible; la entrega depende del navegador, la red y los permisos.

Una demo completamente navegable no demuestra conexión con la flota universitaria.
