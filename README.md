# UCSM BusTrack

PWA de transporte universitario, creada con Next.js, React y TypeScript.

**Actualización:** la vista principal ahora usa Google Maps y Routes API. La clave está configurada en Vercel; Google indica que falta el prepago de activación. El mapa y la comprobación visual de las rutas quedan pendientes de ese paso. Consulta `docs/google-maps.md`. Diseñada para celulares Android/iOS y escritorio. Proyecto académico independiente: no es un servicio oficial de la Universidad Católica de Santa María.

## Inicio rápido

Requisitos: Node.js 22 y npm.

```sh
npm ci
npm run dev
```

Abre el enlace local que muestra Next.js. Sin variables de entorno se activa una **demostración**: cuatro recorridos, favoritos persistentes y centro de avisos. El bus animado y el ETA de demostración requieren que Google resuelva una geometría válida. No requiere una cuenta ni permisos de ubicación. La simulación pausa cuando el navegador está sin conexión.

## Funcionalidades

- Cuatro rutas y 75 referencias transcritas de las láminas del proyecto.
- Horarios de mañana, búsqueda por ruta o referencia y vista de las imágenes originales.
- Google Maps como vista principal, cálculo por calles con Routes API y movimiento simulado sobre la polilínea devuelta; sin rectas inventadas como alternativa.
- ETA de demostración por referencia y aforo con controles de prueba.
- Favoritos y preferencias guardados en el dispositivo; sincronización con Firestore al iniciar sesión.
- Alertas de proximidad con umbral 3/5/10 minutos y prevención de duplicados por ciclo; pruebas de llegada, retraso y desvío.
- Acceso Google institucional con Firebase, validación de correo verificado y reglas de acceso.
- Lectura de telemetría Firebase con rechazo de datos inválidos; GPS vencido después de 60 segundos.
- Google Maps para demostración y posición GPS real; controles de satélite y capa de tráfico.
- Manifiesto PWA, iconos e instrucciones de instalación. Página offline con las cuatro láminas almacenadas; **el mapa en vivo necesita internet**.
- Service worker preparado para notificaciones push de datos FCM.

## Información de las rutas

| Ruta  | Partida | Llegada | Referencias |
| ----- | ------- | ------- | ----------- |
| Norte | 06:00   | 06:50   | 19          |
| Sur   | 06:05   | 06:45   | 15          |
| Este  | 05:50   | 06:50   | 16          |
| Oeste | 05:50   | 06:55   | 25          |

Fuente inmediata: las cuatro imágenes entregadas por el autor del proyecto, conservadas en `public/routes/`. No indican fecha de vigencia. Se transcribieron los nombres en su orden original, sin inventar paraderos autorizados ni coordenadas. El término **referencia** incluye avenidas y calles de paso, no implica autorización de embarque.

Las publicaciones oficiales verifican el contexto del servicio, pero la programación de marzo de 2025 difiere de estas láminas. Consulta `docs/fuentes-y-alcance.md` antes de usar la app para un viaje real.

## Firebase y Google Maps

1. Crea un proyecto Firebase y una aplicación web. Habilita Authentication con Google, Firestore y Realtime Database.
2. Copia `.env.example` a `.env.local` y configura tus valores **sin subir ese archivo al repositorio**.
3. Confirma el dominio institucional real: el valor inicial es `ucsm.edu.pe`. Si cambia, actualiza también las reglas Firebase y las funciones del servidor; no basta con cambiar la variable del cliente.
4. Autoriza localhost y tu dominio de Vercel en Authentication. Despliega `firebase/firestore.rules` y `firebase/database.rules.json` mediante Firebase CLI en el proyecto correcto.
5. Configura Maps JavaScript API con una clave pública restringida a los dominios de la app. Google Maps puede requerir facturación. La demo no activa servicios de pago.
6. Para GPS real, conecta un emisor autorizado con el contrato de `docs/integraciones.md`; la escritura directa del cliente en telemetría está bloqueada.
7. Para push, habilita Cloud Messaging, configura `NEXT_PUBLIC_FIREBASE_VAPID_KEY` y el ID del remitente. El usuario debe iniciar sesión, cambiar a GPS real y activar push desde Perfil.

Las integraciones necesitan servicios externos configurados. No se incluye acceso al sistema de cuentas universitario ni a los GPS/sensores de UCSM. El acceso Google comprueba dominio y verificación, pero no acredita matrícula activa.

## Vercel

Repositorio: https://github.com/ChipanaGerman/ucsm-bus-tracker

Importa este repositorio como proyecto **Next.js**, raíz `.` y Node.js 22. Comando de build `npm run build`. La consulta de rutas se despliega sin variables. Para el mapa se requiere NEXT*PUBLIC_GOOGLE_MAPS_API_KEY y Google Maps activo. Configura variables reales por separado para Preview y Production; Vercel requiere un nuevo build después de cambiar variables `NEXT_PUBLIC*\*`.

La integración Git crea despliegues para las ramas y publica la rama de producción configurada. La protección de acceso depende de la configuración de tu equipo Vercel.

## Verificación

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Las pruebas automatizadas cubren la transcripción de rutas, ETA de demostración, cruce de umbrales, antigüedad del GPS, validación de telemetría, aforo, zona horaria y distancia. Las pruebas reales de cuentas, GPS, Google Maps, push y reglas necesitan un proyecto Firebase configurado; no se consideran verificadas por ejecutar pruebas unitarias.

## Estructura

```text
src/app/                 Página, estilos globales, manifiesto y metadatos
src/components/          Aplicación, esquema y mapa Google opcional
src/lib/                 Rutas, validación de telemetría y cliente Firebase
public/routes/           Cuatro láminas de origen
public/sw.js             Caché offline y recepción push
firebase/                Reglas de acceso
functions/               Procesamiento de telemetría, ETA y alertas (configuración adicional)
tests/                   Pruebas de dominio
docs/                    Fuentes, arquitectura y límites de integración
```
