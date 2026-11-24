# Identidad visual y nueva ilustración

La interfaz se adapta al verde oscuro, verde vivo y blanco de las aplicaciones de la identidad UCSM. Se consultaron la [presentación de identidad en el dominio institucional](https://apps.ucsm.edu.pe/UCSMERP/Docs/Logistica/Requerimiento/00059761-CDInforme.pdf) y el [anuncio de la nueva marca de 2026](https://ucsm.edu.pe/nueva-marca-ucsm-sentimiento-santamariano-evoluciona/).

En los elementos vectoriales de la presentación (por ejemplo páginas 101 y 111), los colores recurrentes son RGB 0,66,45 (`#00422D`) y RGB 15,217,93 (`#0FD95D`). Se toman como referencia visual de esas aplicaciones, sin afirmar una equivalencia Pantone o un manual cromático certificado. La interfaz usa blanco en superficies, verdes suaves para fondos y un verde más oscuro para botones con texto blanco, manteniendo contraste. Los cuatro colores de ruta siguen diferenciando recorridos.

La ilustración anterior estaba formada por cajas CSS inclinadas. Se sustituyó por un bus de proporciones coherentes, carrocería blanca, detalles verdes, ventanas, puertas, espejos, luces y ruedas. Es una ilustración para este proyecto académico, no una fotografía ni una especificación de la flota UCSM. Se mantiene la indicación de proyecto independiente y no se inventa un escudo oficial.

- Original transparente: `public/images/ucsm-bus-hero-v2.png` (1774 × 887).
- Versión web con transparencia: `public/images/ucsm-bus-hero-v2.webp` (1100 × 550, aproximadamente 78 KB).
- El hero usa `next/image` y composiciones específicas para móvil/escritorio. El movimiento respeta la preferencia de movimiento reducido.
- También se actualizan los verdes del logo, el marcador y los iconos PWA.

## Generación del recurso

Herramienta integrada ImageGen; imagen adjunta del usuario como referencia y fondo transparente. Prompt final:

> Create a polished replacement illustration for the university bus visible in the reference screenshot. The screenshot is a style/composition reference; output ONLY the isolated bus on a genuinely transparent background, no road, no UI, no backdrop or cards. Keep the recognizable front-left three-quarter perspective, front of bus on left, long passenger side extending to the right. Full bus fully visible with generous transparent margins. Premium contemporary 3D editorial product illustration, crisp clean geometry, correct perspective and realistic wheel alignment, two dark rubber wheels with metallic hubs, refined side mirrors, thin LED headlights, broad dark green windshield, five evenly spaced passenger windows and a clearly defined two-panel passenger door near the front; modern low-floor electric university shuttle proportions, no toy distortion. Institutional palette of Universidad Catolica de Santa Maria: deep forest green #004E36, vivid university green #00B451, clean off-white #FAFCF9. Main body white/off-white, lower skirt and elegant sweeping stripe vivid green, roof edge and trims deep forest green; dark tinted glass with subtle studio reflections. Avoid yellow, lime or neon yellow entirely. Small front destination sign reads exactly 'UCSM'; side wordmark reads exactly 'BusTrack' in clean dark green lettering. No invented coat of arms or extra branding. Soft studio highlights, careful ambient occlusion, beautifully detailed but uncluttered, professional website hero asset. No cast background shadow baked into a rectangular plate, only subtle contact shadow around wheels. Output high resolution landscape composition.

La generación comenzó con una paleta provisional; los tokens de la interfaz se ajustaron después de inspeccionar la presentación institucional. La ilustración conserva variación de tonos debida a luces y materiales.
