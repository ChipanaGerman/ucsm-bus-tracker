# UCSM BusTrack

PWA de transporte universitario, creada con Next.js, React y TypeScript.

**Mapas libres:** MapLibre GL + OpenFreeMap, sin clave ni prepago. Cuatro trazados orientativos sobre calles de OpenStreetMap, calculados con OSRM y guardados en el repositorio. Vista 2D/3D, marcadores y bus simulado. Consulta `docs/mapas-abiertos.md`. Diseñada para celulares Android/iOS y escritorio. Proyecto académico independiente: no es un servicio oficial de la Universidad Católica de Santa María.

## Inicio rápido

Requisitos: Node.js 22 y npm.

```sh
npm ci
npm run dev
```

Abre el enlace local que muestra Next.js. Sin variables de entorno se activa una **demostración**: cuatro recorridos, favoritos persistentes y centro de avisos. El bus animado utiliza los trazados guardados. Cinco referencias sin ubicación fiable no tienen marcador ni ETA. No requiere una cuenta ni permisos de ubicación. La simulación pausa cuando el navegador está sin conexión.

## Funcionalidades

- Cuatro rutas y 75 referencias transcritas de las láminas del proyecto.
- Horarios de mañana, búsqueda por ruta o referencia y vista de las imágenes originales.
- MapLibre GL y OpenFreeMap, con cuatro trazados OSRM sobre calles, referencias aproximadas y bus simulado sobre la polilínea vial.
- ETA de demostración por referencia y aforo con controles de prueba.
- Favoritos y preferencias guardados en el dispositivo; sincronización con Firestore al iniciar sesión.
- Alertas de proximidad con umbral 3/5/10 minutos y prevención de duplicados por ciclo; pruebas de llegada, retraso y desvío.
- Acceso Google institucional con Firebase, validación de correo verificado y reglas de acceso.
- Lectura de telemetría Firebase con rechazo de datos inválidos; GPS vencido después de 60 segundos.
- Controles de zoom, orientación, pantalla completa, recentrado y edificios 3D donde existen datos; sin servicios de mapas de pago.
- Manifiesto PWA, iconos e instrucciones de instalación. Página offline con las cuatro láminas almacenadas; **el mapa en vivo necesita internet**.
- Service worker preparado para notificaciones push de datos FCM.

## Información de las rutas

| Ruta  | Partida | Llegada | Referencias |
| ----- | ------- | ------- | ----------- |
| Norte | 06:00   | 06:50   | 19          |
| Sur   | 06:05   | 06:45   | 15          |
| Este  | 05:50   | 06:50   | 16          |
| Oeste | 05:50   | 06:55   | 25          |

Fuente inmediata: las cuatro imágenes entregadas por el autor del proyecto, conservadas en `public/routes/`. No indican fecha de vigencia. Se transcribieron los nombres en su orden original, sin inventar paraderos autorizados. Las coordenadas aproximadas de 70 referencias se documentan por separado en `data/route-waypoints.json`, con fuentes OSM. El término **referencia** incluye avenidas y calles de paso, no implica autorización de embarque.

Las publicaciones oficiales verifican el contexto del servicio, pero la programación de marzo de 2025 difiere de estas láminas. Consulta `docs/fuentes-y-alcance.md` antes de usar la app para un viaje real.

## Firebase

1. Crea un proyecto Firebase y una aplicación web. Habilita Authentication con Google, Firestore y Realtime Database.
2. Copia `.env.example` a `.env.local` y configura tus valores **sin subir ese archivo al repositorio**.
3. Confirma el dominio institucional real: el valor inicial es `ucsm.edu.pe`. Si cambia, actualiza también las reglas Firebase y las funciones del servidor; no basta con cambiar la variable del cliente.
4. Autoriza localhost y tu dominio de Vercel en Authentication. Despliega `firebase/firestore.rules` y `firebase/database.rules.json` mediante Firebase CLI en el proyecto correcto.
5. Para GPS real, conecta un emisor autorizado con el contrato de `docs/integraciones.md`; la escritura directa del cliente en telemetría está bloqueada.
6. Para push, habilita Cloud Messaging, configura `NEXT_PUBLIC_FIREBASE_VAPID_KEY` y el ID del remitente. El usuario debe iniciar sesión, cambiar a GPS real y activar push desde Perfil.

Las integraciones necesitan servicios externos configurados. No se incluye acceso al sistema de cuentas universitario ni a los GPS/sensores de UCSM. El acceso Google comprueba dominio y verificación, pero no acredita matrícula activa.

## Vercel

Repositorio: https://github.com/ChipanaGerman/ucsm-bus-tracker

Importa este repositorio como proyecto **Next.js**, raíz `.` y Node.js 22. Comando de build `npm run build`. La consulta de rutas se despliega sin variables. El mapa no requiere variables ni cuentas. Configura variables reales por separado para Preview y Production; Vercel requiere un nuevo build después de cambiar variables `NEXT_PUBLIC*\*`.

La integración Git crea despliegues para las ramas y publica la rama de producción configurada. La protección de acceso depende de la configuración de tu equipo Vercel.

## Verificación

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Las pruebas automatizadas cubren la transcripción de rutas, ETA de demostración, cruce de umbrales, antigüedad del GPS, validación de telemetría, aforo, zona horaria y distancia. Las pruebas reales de cuentas, GPS, push y reglas necesitan un proyecto Firebase configurado; no se consideran verificadas por ejecutar pruebas unitarias.

## Estructura

```text
src/app/                 Página, estilos globales, manifiesto y metadatos
src/components/          Aplicación y mapa MapLibre
src/lib/                 Rutas, validación de telemetría y cliente Firebase
public/routes/           Cuatro láminas de origen
public/map-routes/       Geometrías viales OSM/OSRM
data/                    Referencias cartográficas y fuentes
scripts/                 Worker MapLibre y regeneración manual de trazados
public/sw.js             Caché offline y recepción push
firebase/                Reglas de acceso
functions/               Procesamiento de telemetría, ETA y alertas (configuración adicional)
tests/                   Pruebas de dominio
docs/                    Fuentes, arquitectura y límites de integración
```
