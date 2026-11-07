# Aisuni-Máscaras 3D · 3.0

Genera máscaras 3D personalizables con variaciones de forma y acabado.

- **Versión:** 3.0
- **Probar:** https://aisuni-lab.github.io/A-tools/Aisuni-mascaras/


Generador de máscaras con geometría tridimensional procedural. Todos los archivos
necesarios para funcionar están incluidos. No hay APIs, cuentas de IA ni CDN en
la aplicación. Subir el contenido completo, incluida la carpeta vendor.

- index.html / style.css: interfaz oscura adaptable
- engine.js: semillas, parámetros, validación y alternativa SVG vectorial 2D
- sculpt.js: anatomía 3D, pintura sobre superficie, materiales, luces y render
- app.js: colección, controles, bloqueos, historial, proyectos y exportación
- vendor/three.min.js: Three.js r160, licencia MIT incluida
- INSTALACION.html: uso e instalación en IONOS / GitHub Pages

Volúmenes: frente y mejillas convexas, cavidades orbitales, párpados y hocico.
Variación: contorno, proporciones, apéndices, órbitas, hocicos y ornamentos.
Material: mate, esmalte y microtextura. Acabado: grano fino y papel sobre la imagen.
Vista: giro, inclinación, dirección de luz y zoom. La vista se guarda en el JSON.

WebGL utiliza materiales físicos, luces y sombras. Si no está disponible, el
modo de compatibilidad rasteriza la MISMA geometría 3D en CPU, con iluminación
simplificada. Este modo no reproduce exactamente los reflejos/sombras WebGL.
La herramienta abre directamente desde index.html; se recomienda un hosting
HTTPS para el uso habitual. No necesita compilación, Node ni base de datos.

EXPORTACIÓN
PNG: render actual, 1000–4000 px con WebGL (sujeto a capacidad del dispositivo).
CPU: 1000–2000 px. Fondo transparente disponible.
SVG render: PNG incrustado; conserva el aspecto, no es vector editable.
SVG vectorial: interpretación 2D del motor anterior; no reproduce el render 3D.
El JSON conserva parámetros y vista. No exporta mallas OBJ/GLB ni animaciones.
El enlace Descargar última exportación permite repetir la última descarga.

Proyectos de versiones anteriores: se importan parámetros; se añaden controles
3D deterministas. Su apariencia cambia. Guarda una copia de tu JSON anterior.
El preset de referencia es un punto de partida diseñado; Generar utiliza la
semilla y los ajustes actuales. No hay guardado automático de colecciones.

VALIDACIÓN
Mallas y normales finitas en 18 semillas (más de 900.000 vértices), bloqueos,
migración de proyectos y transparencia comprobados. Interfaz, giro y creación
de archivos revisados en Chrome mediante el render CPU. Ese navegador no permite
WebGL; la iluminación completa GPU no pudo comprobarse allí. El entorno de prueba
no expone la finalización de descargas; se comprobó la creación del archivo y del
enlace de descarga, además del PNG nativo. No se afirma QA en todos los navegadores.
