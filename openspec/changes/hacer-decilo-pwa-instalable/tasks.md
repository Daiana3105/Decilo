## 1. Identidad y manifest

- [ ] 1.1 Crear los PNG versionados: favicon 32, apple-touch-icon 180, any 192/512 y maskable 512; revisar D blanca, naranja, esquinas, opacidad y zona segura.
- [ ] 1.2 Crear manifest.webmanifest con identidad, colores, id/start_url/scope raíz y standalone definidos; verificar referencias y ausencia de datos privados.
- [ ] 1.3 Enlazar manifest, favicon, apple-touch-icon y metadatos desde index.html conservando idioma, viewport y orden de scripts.

## 2. Experiencia de instalación

- [ ] 2.1 Agregar ayuda semántica disponible desde acceso y sesión autenticada para Chrome Android/escritorio y Safari/iPhone, sin depender de prompt automático.
- [ ] 2.2 Explicar conexión requerida, alternativa de uso en navegador y límites de continuidad de sesión entre contextos, sin cambiar autenticación ni almacenamiento.
- [ ] 2.3 Verificar teclado, nombres accesibles, foco visible, 320/768/1280 px y zoom 200%, conservando navegación y controles existentes.

## 3. Build, entrega y actualización

- [ ] 3.1 Ampliar allowlist y copia binaria de build-frontend.js para recursos PWA; comprobar dist sin fuentes privadas y configuración pública en ambos modos de origen.
- [ ] 3.2 Incorporar recursos al stage de Dockerfile.frontend sin publicar raíz, bocetos ni secretos; mantener exclusiones y no versionar dist.
- [ ] 3.3 Configurar rutas Nginx, MIME y 404 de manifest/icons, y revalidación no-cache de HTML/manifest/imágenes sin afectar proxies API/Socket.IO.
- [ ] 3.4 Comprobar MIME/headers del servidor local y fixture; ajustar solo si hace falta para los recursos PWA.
- [ ] 3.5 Documentar headers/rutas específicos de Render HTTPS, versionado de íconos, id estable, demoras del launcher y rollback sin borrar datos; actualizar inventario en ARCHITECTURE.md y DEPLOY_RENDER.md.

## 4. Pruebas automatizadas y aislamiento

- [ ] 4.1 Agregar pruebas Node de manifest, enlaces, firma/dimensiones PNG y allowlist de dist; conservar controles de secretos diferenciando texto y binarios.
- [ ] 4.2 Agregar Playwright de recursos HTTP/MIME y ayuda sin prompt, teclado/responsive y uso sin instalación.
- [ ] 4.3 Verificar en perfil limpio cero workers/Cache Storage antes y después de login, notificaciones, logout y cambio de cuenta; API/polling/WebSocket por red sin caché PWA ni proxy-cache nuevo.
- [ ] 4.4 Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend secuencialmente con base temporal aislada; registrar resultados y regresiones de autenticación, actividades y notificaciones.
- [ ] 4.5 Construir y probar Docker/Nginx en Compose aislado: recursos 200, faltantes 404, MIME, no-cache/revalidación, healthcheck, polling y upgrade; documentar cualquier bloqueo de entorno.
- [ ] 4.6 Simular actualización de manifest e imagen versionada en entorno aislado y verificar referencias tras revalidación sin alterar id ni datos privados.

## 5. Evidencia manual y documentación

- [ ] 5.1 Probar instalación real en Chrome escritorio y Android mediante entorno HTTPS autorizado, registrar versiones, nombre, ícono, standalone, reapertura, login/navegación/logout y accesibilidad.
- [ ] 5.2 Probar Safari/iPhone real: ayuda, Agregar a pantalla de inicio, nombre/ícono, standalone, orientación y sesión; registrar versión y limitaciones sin sustituirla por emulación.
- [ ] 5.3 Documentar resultados, ausencia de offline y diferencias entre actualización de recursos y launcher, sin capturar datos personales ni tokens.
- [ ] 5.4 Tras autorización posterior de publicación, verificar recursos/headers HTTPS y rutas reales de Render e instalación móvil contra esa versión; mantener pendiente mientras no exista esa autorización/evidencia. Esta tarea no autoriza desplegar.

## 6. Cierre de implementación futura

- [ ] 6.1 Ejecutar openspec.cmd status --change hacer-decilo-pwa-instalable, openspec.cmd validate hacer-decilo-pwa-instalable --strict, openspec.cmd validate --all --strict y git diff --check sobre la implementación.
- [ ] 6.2 Revisar diff completo, secretos, archivos generados y alcance exclusivo del issue #12; marcar únicamente tareas con evidencia y enumerar pendientes antes de solicitar etapa posterior.

Todas las casillas corresponden a implementación o comprobación futura; esta entrega solo planifica. Las validaciones de planificación no completan las validaciones de la implementación. No abrir PR, mergear, archivar ni desplegar sin autorización posterior.
