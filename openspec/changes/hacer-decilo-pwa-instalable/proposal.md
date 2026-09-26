## Why

DECILO carece de manifest e íconos de instalación propios. El issue [#12](https://github.com/Daiana3105/Decilo/issues/12) propone facilitar el acceso desde el dispositivo como aplicación instalada, conservando su identidad y los límites de privacidad del MVP.

## What Changes

- Publicar un manifest con identidad DECILO y apertura standalone desde la raíz del frontend.
- Preparar favicon, apple-touch-icon e íconos PNG normales y maskable basados en la D blanca sobre naranja actual.
- Incorporar ayuda accesible para instalar desde Chrome Android/escritorio y Safari/iPhone, sin depender de un aviso automático.
- Incluir los recursos en la allowlist de dist y Docker, con MIME, rutas y revalidación correctos en Nginx y preparación documental de Render HTTPS.
- Agregar pruebas de identidad, distribución, accesibilidad y privacidad, y una matriz de instalación manual real.
- No incorporar service worker, Cache Storage, soporte offline, push ni nueva persistencia de datos privados.

## Capabilities

### New Capabilities

- `instalacion-pwa`: identidad, instalación nativa, ayuda accesible y ausencia de caché PWA de datos privados.

### Modified Capabilities

- `despliegue-produccion`: agregar distribución y actualización verificables de recursos públicos PWA en build, Docker/Nginx y Render.

## Impact

La futura implementación afectará index.html, recursos nuevos de identidad, ayuda de instalación y sus estilos, build-frontend.js, Dockerfile.frontend, nginx.conf, pruebas frontend/Playwright y documentación de arquitectura/despliegue. No requiere cambios de contratos API, PostgreSQL, autenticación, dependencias de runtime ni datos del dominio. El servidor estático local se ajustará solo si las pruebas detectan MIME o headers incompatibles.

Esta entrega crea exclusivamente planificación en `openspec/changes/hacer-decilo-pwa-instalable/`, en `feature/12-decilo-pwa-instalable`. Implementación, PR, merge, archivo y despliegue quedan fuera de esta etapa.
