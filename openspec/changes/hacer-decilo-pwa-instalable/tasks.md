## 1. Identidad y manifest

- [x] 1.1 Crear los PNG versionados: favicon 32, apple-touch-icon 180, any 192/512 y maskable 512; revisar D blanca, naranja, esquinas, opacidad y zona segura.
- [x] 1.2 Crear manifest.webmanifest con identidad, colores, id/start_url/scope raíz y standalone definidos; verificar referencias y ausencia de datos privados.
- [x] 1.3 Enlazar manifest, favicon, apple-touch-icon y metadatos desde index.html conservando idioma, viewport y orden de scripts.

## 2. Experiencia de instalación

- [x] 2.1 Agregar ayuda semántica disponible desde acceso y sesión autenticada para Chrome Android/escritorio y Safari/iPhone, sin depender de prompt automático.
- [x] 2.2 Explicar conexión requerida, alternativa de uso en navegador y límites de continuidad de sesión entre contextos, sin cambiar autenticación ni almacenamiento.
- [x] 2.3 Verificar teclado, nombres accesibles, foco visible, 320/768/1280 px y zoom 200%, conservando navegación y controles existentes.

## 3. Build, entrega y actualización

- [x] 3.1 Ampliar allowlist y copia binaria de build-frontend.js para recursos PWA; comprobar dist sin fuentes privadas y configuración pública en ambos modos de origen.
- [x] 3.2 Incorporar recursos al stage de Dockerfile.frontend sin publicar raíz, bocetos ni secretos; mantener exclusiones y no versionar dist.
- [x] 3.3 Configurar rutas Nginx, MIME y 404 de manifest/icons, y revalidación no-cache de HTML/manifest/imágenes sin afectar proxies API/Socket.IO.
- [x] 3.4 Comprobar MIME/headers del servidor local y fixture; ajustar solo si hace falta para los recursos PWA.
- [x] 3.5 Documentar headers/rutas específicos de Render HTTPS, versionado de íconos, id estable, demoras del launcher y rollback sin borrar datos; actualizar inventario en ARCHITECTURE.md y DEPLOY_RENDER.md.

## 4. Pruebas automatizadas y aislamiento

- [x] 4.1 Agregar pruebas Node de manifest, enlaces, firma/dimensiones PNG y allowlist de dist; conservar controles de secretos diferenciando texto y binarios.
- [x] 4.2 Agregar Playwright de recursos HTTP/MIME y ayuda sin prompt, teclado/responsive y uso sin instalación.
- [x] 4.3 Verificar en perfil limpio cero workers/Cache Storage antes y después de login, notificaciones, logout y cambio de cuenta; API/polling/WebSocket por red sin caché PWA ni proxy-cache nuevo.
- [x] 4.4 Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend secuencialmente con base temporal aislada; registrar resultados y regresiones de autenticación, actividades y notificaciones.
- [x] 4.5 Construir y probar Docker/Nginx en Compose aislado: recursos 200, faltantes 404, MIME, no-cache/revalidación, healthcheck, polling y upgrade; documentar cualquier bloqueo de entorno.
- [x] 4.6 Simular actualización de manifest e imagen versionada en entorno aislado y verificar referencias tras revalidación sin alterar id ni datos privados.

## 5. Evidencia manual y documentación

- [ ] 5.1 Probar instalación real en Chrome escritorio y Android mediante entorno HTTPS autorizado, registrar versiones, nombre, ícono, standalone, reapertura, login/navegación/logout y accesibilidad.

  Avance parcial informado por la usuaria el 2026-09-27: instaló DECILO desde
  http://localhost:8080 en Chrome de escritorio; apareció el ícono naranja con
  la D y se abrió en una ventana propia. No se informaron versión de Chrome/OS,
  reapertura ni recorrido completo de sesión/accesibilidad. No acredita HTTPS
  público ni Android; la tarea agrupada permanece pendiente.
- [x] 5.2 Probar Safari/iPhone real: ayuda, Agregar a pantalla de inicio, nombre/ícono, standalone, orientación y sesión; registrar versión y limitaciones sin sustituirla por emulación.

  Instalación probada en dispositivo iPhone 13 real (Safari) confirmada funcional por la usuaria el 2026-09-28: flujo de ayuda, "Agregar a pantalla de inicio" e instalación operativa en standalone. Observación registrada: el diseño móvil es mejorable.
- [x] 5.3 Documentar resultados, ausencia de offline y diferencias entre actualización de recursos y launcher, sin capturar datos personales ni tokens.
- [x] 5.4 Tras autorización posterior de publicación, verificar recursos/headers HTTPS y rutas reales de Render e instalación móvil contra esa versión; mantener pendiente mientras no exista esa autorización/evidencia. Esta tarea no autoriza desplegar.

  Verificación HTTP realizada el 2026-09-28 contra https://decilo-web.onrender.com:
  - HTTPS / TLS: conexión segura TLS 1.3 con Cloudflare SNI y HSTS (strict-transport-security: max-age=315360000; includeSubdomains; preload).
  - Raíz (/): HTTP/1.1 200 OK, Content-Type: text/html; charset=utf-8, Cache-Control: public, max-age=0, s-maxage=300, ETag: W/"245e6b9992c8a456b12af7ac5f0f6e7d".
  - Manifest (/manifest.webmanifest): HTTP/1.1 200 OK, Content-Type: binary/octet-stream (default en Static Sites de Render), Cache-Control: public, max-age=0, s-maxage=300, ETag: "f1db37d6d8b311b7da5b9830764e5cac". JSON íntegro con name/short_name DECILO, display standalone, colores de marca y rutas a íconos v1.
  - Íconos PNG (/icons/favicon-v1.png, /icons/apple-touch-icon-v1.png, /icons/decilo-192-v1.png, /icons/decilo-512-v1.png, /icons/decilo-maskable-512-v1.png): todos devuelven HTTP/1.1 200 OK, Content-Type: image/png, Cache-Control: public, max-age=0, s-maxage=300 con ETags específicos.
  - Rutas inexistentes (/icons/inexistente.png, /inexistente.webmanifest): devuelven HTTP/1.1 404 Not Found, Content-Type: text/plain; charset=utf-8 (sin falsos 200 por fallback).
  - Backend asociado (https://decilo-api.onrender.com/api/health): HTTP/1.1 200 OK, {"status":"ok","database":"ok"}.
  - Instalación móvil contra esta versión: verificada en iPhone 13 (funcional, con observación de diseño móvil mejorable). Android permanece pendiente en la tarea 5.1.

## 6. Cierre de implementación futura

- [x] 6.1 Ejecutar openspec.cmd status --change hacer-decilo-pwa-instalable, openspec.cmd validate hacer-decilo-pwa-instalable --strict, openspec.cmd validate --all --strict y git diff --check sobre la implementación.
- [x] 6.2 Revisar diff completo, secretos, archivos generados y alcance exclusivo del issue #12; marcar únicamente tareas con evidencia y enumerar pendientes antes de solicitar etapa posterior.

Las casillas marcadas cuentan con implementación y evidencia local en test/README.md. La tarea 4.5 se completó el 2026-09-27 con el segundo proyecto decilo-pwa-12-check (58082/55434), red y volumen propios. El proyecto de prueba se detuvo sin borrar volúmenes; los contenedores originales conservaron IDs, horas de arranque y montajes. La tarea 5.2 (iPhone 13) y la tarea 5.4 (verificación HTTP/headers en Render) cuentan con evidencia registrada el 2026-09-28. La tarea 5.1 cuenta con evidencia parcial de Chrome escritorio y mantiene pendiente la comprobación en Android real. La especificación OpenSpec se mantiene activa sin archivar; no se autoriza merge automático ni despliegue adicional en esta etapa.
