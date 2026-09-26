## Context

Base: develop sincronizada con origin, commit f97a6e6cdde474b8ffbf100a8f0cc7e2843166aa; main también sincronizada. No había cambios OpenSpec activos ni issues duplicados. Issue #12, milestone v1.1.0 abierto, Project DECILO v1.1.0 en In Progress.

index.html no tiene manifest, favicon ni metadatos de instalación. build-frontend.js genera siete archivos públicos con allowlist explícita y config.js público, diferente del archivo privado de backend. Dockerfile.frontend copia explícitamente las fuentes antes de generar dist. Nginx deriva /api/ y /socket.io/ a la API; su protección 404 solo contempla js/css/txt y los demás faltantes caen al HTML. Render está documentado como Static Site HTTPS separado de la API; no existe blueprint Render versionado. Compose expone Nginx y mantiene PostgreSQL aislado del frontend.

La marca usada por app.js/styles.css es una D blanca, cuadrado naranja #e06a42 redondeado; el fondo es #faf8f5. Se inspeccionó también stitch_decilo/decilo_logo: es un boceto con globo de conversación petrol, no el símbolo actualmente renderizado. No se publicará esa carpeta ni su captura como ícono.

No se encontró registro de service worker, manifest ni íconos de instalación existentes. JWT permanece en sessionStorage; el dominio demostrativo usa localStorage y usuarios/notificaciones viven en PostgreSQL. Instalar no convierte ese almacenamiento local en autorización remota ni garantiza compartir sesión entre navegador y aplicación instalada.

Las pruebas Node verifican la allowlist exacta del build; deben incorporar los binarios sin tratarlos como texto. Playwright sirve dist mediante Express y prueba autenticación, actividades y notificaciones con API/PostgreSQL temporales. Sus pruebas no acreditan la instalación del sistema operativo ni el proxy Nginx.

## Goals / Non-Goals

Objetivos: identidad propia al instalar, apertura standalone, instrucciones comprensibles en los navegadores objetivo, distribución reproducible de archivos públicos y actualización sin introducir almacenamiento privado adicional.

Fuera de alcance: funcionamiento offline, service worker, caché programática, push, sincronización de sesiones/dispositivos, cambios de dominio o autenticación, refactorizaciones, tiendas de aplicaciones y nuevos servicios. En esta etapa tampoco se crean imágenes, código, PR ni despliegues.

## Decisions

### 1. Instalación sin service worker

La instalación desde el menú de Chrome no exige un service worker con fetch handler. No se depende de beforeinstallprompt ni se promete promoción automática. Se descarta un worker vacío o una caché de shell porque agregaría ciclo de actualización y riesgo sin satisfacer una necesidad offline autorizada.

Se usará el menú de instalación de Chrome Android/escritorio y Compartir → Agregar a pantalla de inicio en Safari/iPhone (activar Abrir como app web si esa versión presenta la opción). Una sección de ayuda visible desde el acceso y la aplicación autenticada explicará pasos, conexión requerida y alternativa de seguir en navegador. Preferir details/summary semántico, sin modal ni detección frágil de user-agent, sin botones de instalación que no funcionen y sin prompts forzados. No se agregará un listener beforeinstallprompt en este alcance.

Fuentes oficiales consultadas el 2026-09-25: [Chrome](https://developer.chrome.com/blog/update-install-criteria) distingue menú y promoción automática; [Apple](https://support.apple.com/guide/iphone/iphea86e5236/ios) documenta instalación manual. Registrar versiones efectivamente probadas; estas fuentes no sustituyen la prueba en dispositivo.

### 2. Identidad y manifest

manifest.webmanifest en la raíz: name y short_name DECILO, id `/`, start_url `/`, scope `/`, display `standalone`, lang `es`, theme_color `#e06a42`, background_color `#faf8f5`, prefer_related_applications false. No incluir queries, tokens, usuario, API como origen de inicio ni orientación forzada. El alojamiento actual está en la raíz; un futuro subpath requeriría revisar estas tres rutas conjuntamente.

Plan de recursos públicos: icons/decilo-192-v1.png y decilo-512-v1.png con purpose any; decilo-maskable-512-v1.png con purpose maskable y fondo naranja opaco completo, D dentro del círculo seguro central de radio 40% del lado; apple-touch-icon-v1.png 180x180 opaco; favicon-v1.png 32x32. Los íconos any y favicon reproducirán el símbolo redondeado; el maskable no tendrá transparencia externa y dejará el recorte al sistema. El ícono Apple no preaplicará la máscara del sistema. Revisar visualmente legibilidad y recortes.

index.html enlazará manifest, favicon y apple-touch-icon, con sizes/type correctos, theme-color y apple-mobile-web-app-title DECILO. Conservar título descriptivo, idioma, viewport, orden de scripts y navegación existentes. Versionar nombres de imágenes al cambiar su contenido; mantener id estable para no crear otra identidad instalada.

### 3. Distribución y actualización

Extender la allowlist de build explícitamente con manifest e imágenes; copiar bytes sin transformación implícita ni directorios enteros. Agregar esas fuentes al COPY del stage Node de Dockerfile.frontend; seguir sirviendo únicamente dist. Mantener exclusiones de .gitignore/.dockerignore, sin versionar dist ni publicar stitch_decilo, archivos privados o .env. No se necesita una dependencia PWA.

Nginx tendrá rutas estáticas precisas para manifest e icons con try_files y 404 real si faltan, sin interferir con /api/ y /socket.io/. Manifest: application/manifest+json; PNG: image/png. HTML, manifest e imágenes PWA usarán Cache-Control: no-cache para permitir almacenamiento HTTP público pero exigir revalidación antes de reutilizarlo; no usar immutable en rutas mutables. Probar ETag/Last-Modified y respuesta tras sustituir una versión en un entorno aislado. No extender estas reglas a API ni transporte.

Documentar los headers equivalentes en el Static Site de Render, publicado desde dist por HTTPS. No asumir que nginx.conf gobierna Render. Evitar rewrite global que transforme recursos PWA faltantes en HTML 200; documentar configuración precisa y comprobarla después de una publicación autorizada. No cambiar ahora el Dashboard ni auto-deploy. El navegador/sistema operativo determina cuándo actualiza una instalación; no prometer actualización inmediata de nombre/ícono. Ofrecer reabrir/actualizar y, si persiste el ícono antiguo, reinstalar con advertencia de que no se garantiza conservar datos locales entre contextos. No borrar almacenamiento para forzar actualización.

### 4. Privacidad y conservación de flujos

No registrar workers ni usar Cache API, Background Sync o interceptores de requests. No agregar caché de respuestas /api, credenciales, JWT, pacientes, notificaciones o HTML autenticado, en navegador ni proxy. Mantener no-store existente de notificaciones. Revisar que las reglas estáticas nunca alcancen /api o /socket.io, incluyendo polling y upgrade WebSocket. La caché HTTP de íconos públicos es distinta del almacenamiento privado y no contiene datos de cuenta.

Comprobar perfiles de prueba nuevos sin registrations ni Cache Storage antes/después de login, lectura, logout y cambio de cuenta; confirmar API/polling por red y frames WebSocket reales. Esta prueba no certifica que todo el navegador carece de almacenamiento: sessionStorage/localStorage del MVP se conservan. No agregar autorización local como sustituto del backend ni migrar datos a la PWA.

### 5. Validación y evidencia

Node: JSON del manifest, valores/rutas y referencias, firma y dimensiones reales PNG, cobertura de todos los recursos enlazados, build con API_PUBLIC_URL vacío y origen público, ninguna fuente privada. Conservar controles de secretos en archivos de texto y analizar imágenes como binarios.

Playwright: cargar recursos desde dist, comprobar HTTP/MIME/cuerpo, ayuda sin auto-prompt, teclado/foco, 320/768/1280 px y zoom 200%, sin overflow; comprobar cero workers/cachés y regresiones de sesión, actividades y notificaciones. Mantener fixtures aislados. Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend secuencialmente porque comparten dist. Validar OpenSpec estricto y git diff --check.

Docker: construir/arrancar Compose con proyecto, puertos, volumen y credenciales sintéticas separados según test/README.md; no usar base operativa. Comprobar recursos 200, faltantes 404, MIME, revalidación, /api/health, polling y upgrade; registrar limitaciones si Docker no está disponible.

Manual: Chrome escritorio, Chrome Android y Safari iPhone reales con versión/OS/fecha; instalar, verificar nombre/ícono, abrir standalone, cerrar/reabrir y probar login, navegación y logout con datos sintéticos. Revisar red, ausencia de promesa offline, teclado donde corresponda y orientación. Emulación móvil/WebKit no sustituye iPhone ni launcher real. Para móvil usar entorno HTTPS autorizado, no HTTP de IP LAN. La comprobación pública de Render solo se completa tras autorización de publicación; si no está disponible permanece pendiente.

## Risks / Trade-offs

- Sin worker no hay offline propio ni garantía de aviso automático; se acepta instalación por menú y ayuda persistente.
- Render puede aplicar headers/rewrite distintos de Nginx; requiere verificación HTTP independiente, no solo leer configuración.
- Sistemas instalados pueden conservar íconos antiguos; nombres versionados y revalidación reducen el riesgo sin prometer tiempos del sistema.
- La instalación puede abrir otra sesión o contexto de datos; conservar login seguro, no copiar tokens ni prometer continuidad automática.
- Automatización no prueba interacción del launcher; evidencia manual pendiente bloquea afirmar compatibilidad total.

## Migration Plan

No hay migración de datos ni base. Implementar recursos/pruebas en esta rama solo cuando se autorice. Integración y publicación seguirán revisiones posteriores. Si se requiere revertir en el futuro, retirar enlaces/ayuda/recursos mediante cambio revisado sin borrar datos; no habrá worker que desregistrar. Usuarios ya instalados pueden conservar acceso al sitio; la reversión no desinstala aplicaciones de sus dispositivos.
