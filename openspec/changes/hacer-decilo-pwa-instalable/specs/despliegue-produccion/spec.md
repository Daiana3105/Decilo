## ADDED Requirements

### Requirement: Distribución pública de recursos PWA

El build MUST incluir manifest e íconos de instalación mediante allowlist explícita en dist y Docker/Nginx. MUST conservar el orden de scripts, configuración pública y exclusión de fuentes privadas. Los recursos MUST servirse con rutas y MIME correctos: application/manifest+json para manifest e image/png para PNG. Los faltantes MUST responder 404 sin fallback HTML exitoso. La guía de Render MUST preparar entrega HTTPS desde dist y configuración propia del Static Site sin asumir que utiliza nginx.conf.

#### Scenario: Build para mismo origen y API separada
- **WHEN** se ejecuta el build sin API_PUBLIC_URL o con un origen público válido
- **THEN** dist contiene todos los recursos de instalación referenciados, los binarios conservan dimensiones y solo config.js público depende del origen API, sin publicar secretos ni módulos de backend

#### Scenario: Entrega mediante Nginx
- **WHEN** se solicitan manifest, íconos y recursos PWA inexistentes al frontend Docker
- **THEN** los existentes devuelven 200 con contenido y MIME correctos y los inexistentes devuelven 404, mientras /api/ y /socket.io/ conservan su proxy, polling y upgrade

#### Scenario: Preparación para Render
- **WHEN** se revisa la guía previa a publicación
- **THEN** contiene los comandos de build, directorio dist y reglas de headers/rutas para HTTPS, distinguiendo preparación de verificación pública posterior autorizada

### Requirement: Actualización y verificación de instalación

HTML, manifest e imágenes PWA MUST exigir revalidación HTTP mediante Cache-Control no-cache; imágenes modificadas MUST usar nombres versionados y referencias actualizadas. MUST mantener id estable y MUST NOT aplicar reglas de caché estática a API o Socket.IO. La implementación MUST aportar pruebas de manifest, dimensiones, build, rutas/MIME, accesibilidad y privacidad, además de evidencia manual real en Chrome Android/escritorio y Safari/iPhone. MUST distinguir comprobaciones pendientes de resultados ejecutados y documentar que la actualización del ícono instalado depende del sistema operativo.

#### Scenario: Nueva versión de recursos
- **WHEN** se cambia una imagen y se solicita el manifest después de revalidar en un entorno de prueba
- **THEN** el manifest actualizado referencia la imagen versionada correcta sin cambiar la identidad de la app ni requerir borrar datos privados, y la guía no garantiza actualización inmediata del launcher

#### Scenario: Verificación aislada completa
- **WHEN** se valida la futura implementación
- **THEN** se registran resultados de Node, build, Playwright, Docker/Nginx, OpenSpec estricto y diff, usando datos sintéticos aislados y anotando fallos del entorno sin omitirlos

#### Scenario: Límites de la automatización
- **WHEN** Playwright verifica metadatos, interfaz y ausencia de caché PWA
- **THEN** la instalación del sistema operativo permanece pendiente hasta contar con evidencia manual de navegador, versión, dispositivo, nombre, ícono y apertura standalone; Render público permanece pendiente hasta publicación autorizada
