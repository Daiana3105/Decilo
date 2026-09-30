# Despliegue manual de DECILO en Render

Esta guía prepara el cambio `agregar-notificaciones-tiempo-real`; no registra un
despliegue de notificaciones ejecutado. Las tareas documentales 8.1–8.3 se completan
con esta preparación; 8.4 queda pendiente de verificación integral posterior al
despliegue. Usar los servicios existentes y la misma rama para API y frontend.
Si se parte de cero, el orden es PostgreSQL administrado → Web Service → Static
Site → configurar el origen del frontend en la API. Cargar secretos únicamente
en el entorno privado de Render, nunca en archivos versionados ni capturas.

## 1. PostgreSQL administrado

1. En Render, creá una base PostgreSQL administrada para DECILO y esperá a que esté disponible.
2. Si la base ya existe, reutilizarla. Conservarla al reiniciar, redesplegar o volver a una versión anterior: contiene cuentas, notificaciones, fechas de lectura y revisiones. `db.js` agrega tablas e índices de forma transaccional e idempotente; no borrar ni recrear PostgreSQL para aplicar este cambio.
3. En la configuración privada del Web Service, conectá `DATABASE_URL` con la URL de conexión que Render proporciona para esa base. Si Render permite vincular la base como origen de la variable, usá ese vínculo. No copies la URL a este repositorio ni configures usuario y contraseña por separado cuando la URL ya los contiene.

## 2. Web Service de la API

Creá un Web Service Node.js desde el repositorio con esta configuración:

| Campo | Valor |
| --- | --- |
| Root Directory | Raíz del repositorio |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instancias/procesos | Una instancia y un proceso Node; sin cluster ni escalado horizontal |

`npm start` ejecuta `node server.js`. La API escucha en `process.env.PORT`; Render proporciona `PORT` al Web Service. No hace falta fijar un valor manual para esa variable.

Socket.IO comparte ese servidor HTTP, puerto y dominio: `https://decilo-api.onrender.com`,
path `/socket.io/`, polling HTTPS y WebSocket WSS. No crear otro servicio ni puerto
para sockets, ni apuntarlos al Static Site. Render termina TLS delante del servidor;
no hace falta desplegar el Nginx de Compose en este Web Service. El cliente local
Socket.IO conecta al origen HTTPS con JWT en `auth.token`, nunca en query string.
Las salas están en memoria: varias instancias no sincronizarían todas las sesiones.
Ver [WebSockets en Render](https://render.com/docs/websocket).

Configurá estas variables **solo en el Web Service**:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión privada con PostgreSQL administrado. |
| `JWT_SECRET` | Secreto privado para firmar JWT; debe tener al menos 32 caracteres. |
| `JWT_EXPIRES_IN` | Duración de los JWT, por ejemplo `1h`. |
| `FRONTEND_PUBLIC_URL` | `https://decilo-web.onrender.com`, sin ruta ni barra final; autoriza HTTP, polling y upgrade WebSocket. |

Como el frontend todavía no existe en este paso, completá `FRONTEND_PUBLIC_URL` después de crear el Static Site y volvé a desplegar la API si Render no aplica el cambio automáticamente. `API_PUBLIC_URL` corresponde exclusivamente al build del frontend; no se configura en la API. Cuando la API esté disponible, conservá su URL HTTPS pública para el paso siguiente. El healthcheck debe responder con la API y la base disponibles.

En los servicios existentes, comprobar esos valores sin imprimirlos. CORS usa una
lista explícita, no `*`. `config.js` también incluye por defecto localhost:8080 y
127.0.0.1:8080 mediante `LOCAL_FRONTEND_URL`; si se desea autorizar solo el sitio
público en Render, fijar también `LOCAL_FRONTEND_URL=https://decilo-web.onrender.com`.
JWT sigue siendo obligatorio aunque el origen esté permitido. Mantener estable
`JWT_SECRET` entre deploys para no invalidar sesiones por una rotación accidental.

## 3. Static Site del frontend

Creá un Static Site desde el mismo repositorio con esta configuración:

| Campo | Valor |
| --- | --- |
| Root Directory | Raíz del repositorio |
| Build Command | `npm ci && npm run build:frontend` |
| Publish Directory | `dist` |

Configurar `API_PUBLIC_URL=https://decilo-api.onrender.com` como **variable pública
de build**, sin `/api`, credenciales, query ni fragmento. El build genera
`dist/config.js` con ese origen, usado tanto para REST como para Socket.IO.
Si cambia la URL, actualizar la variable y reconstruir el Static Site.
El build necesita dependencias de desarrollo: `socket.io-client` está en
`devDependencies`; no usar `npm ci --omit=dev` ni una configuración que las omita
en el Static Site. No hace falta instalar navegadores Playwright para construir.

El build publica únicamente:

```text
dist/
  index.html
  app.js
  styles.css
  config.js
  notifications-client.js
  manifest.webmanifest
  icons/favicon-v1.png
  icons/apple-touch-icon-v1.png
  icons/decilo-192-v1.png
  icons/decilo-512-v1.png
  icons/decilo-maskable-512-v1.png
  vendor/socket.io.min.js
  vendor/socket.io.LICENSE.txt
```

El transporte se empaqueta desde la dependencia local fijada en lockfile, sin CDN.
`index.html` carga configuración, Socket.IO, módulo de notificaciones y aplicación
en ese orden. Verificar contenido JavaScript y tipo MIME de los scripts; una regla
de fallback no debe ocultar recursos faltantes devolviendo HTML con estado 200.
No publicar la raíz del repositorio: su `config.js` es privado del backend.
No copiar `DATABASE_URL`, `JWT_SECRET`, contraseñas, archivos `.env`, tokens ni
módulos del servidor al frontend ni a grupos de variables compartidos con él.

## 4. Completar la conexión entre servicios

Comprobar que el frontend `https://decilo-web.onrender.com` consulte y conecte a
`https://decilo-api.onrender.com`, sin localhost, mixed content ni puertos internos.
El healthcheck público es `https://decilo-api.onrender.com/api/health`; debe devolver
HTTP 200 y `{ "status": "ok", "database": "ok" }`. Si falla, revisar disponibilidad
de PostgreSQL y configuración privada antes de evaluar sincronización.

### Arranque en frío del plan gratuito

Render puede suspender un Web Service gratuito tras 15 minutos sin tráfico entrante;
una nueva solicitud HTTP o conexión WebSocket lo reactiva. El arranque puede tardar
aproximadamente un minuto. Ver [limitaciones del plan gratuito](https://render.com/docs/free).
No interpretar esa demora como garantía incumplida de convergencia local de cinco
segundos. Esperar healthcheck saludable y luego comprobar login y notificaciones.
No añadir polling periódico para mantener despierto el servicio.

El cliente limita reintentos REST y Socket.IO, por lo que puede agotarlos antes del
arranque: usar Reintentar, abrir el panel o volver a la pestaña visible después de
recuperar la API. La restauración `/me` actual puede devolver al login si falla por
indisponibilidad; iniciar sesión nuevamente cuando el servicio responda. Un JWT
vencido requiere login nuevo. Reinicios pueden perder trabajos secundarios todavía
no persistidos; REST recupera solamente avisos confirmados en PostgreSQL.

## 5. Checklist posterior al despliegue (pendiente)

Registrar fecha, versión de ambos servicios y resultados sin credenciales. Estas
casillas son una guía de comprobación futura, no evidencia de ejecución actual.

- [ ] Verificar deploy exitoso de API y Static Site de versiones compatibles, comandos de build/arranque, directorio `dist` y una sola instancia de API.
- [ ] Verificar healthcheck HTTP 200 con API y PostgreSQL `ok`, considerando arranque en frío.
- [ ] Verificar los trece archivos públicos actuales, scripts JavaScript reales y ausencia de secretos; `API_PUBLIC_URL` debe apuntar al origen HTTPS correcto.
- [ ] Verificar CORS desde `https://decilo-web.onrender.com`, polling y upgrade WSS en `/socket.io/`; rechazar origen arbitrario y JWT inválido. No copiar cabeceras Authorization ni frames con credenciales a reportes.
- [ ] Registrar una cuenta de prueba si hace falta; comprobar login, `/api/auth/me` y acceso de los tres roles. La creación secundaria del aviso nunca debe bloquear la entrega del JWT.
- [ ] Comprobar campana solo autenticado, badge exacto y oculto en cero, listado, fechas, paginación, estados vacío/carga/error, teclado y panel responsive. Abrir no debe marcar leído.
- [ ] Abrir una sesión A y hacer login de A en incógnito: ambas reciben el nuevo aviso sin recargar. Una sesión B mantiene sus propios datos. No compartir tokens entre ventanas.
- [ ] Marcar un aviso y después todos: lecturas y contador convergen entre sesiones; la lectura general incluye páginas no cargadas.
- [ ] Interrumpir/restablecer red y redesplegar API; verificar reconexión, ready y recuperación REST sin duplicados. Volver a visibilidad y abrir panel deben recuperar una señal perdida; una sesión estable no hace polling REST periódico.
- [ ] Verificar expiración JWT, logout y cambio de cuenta: se limpia estado y no aparecen respuestas pendientes de otra identidad.
- [ ] Registrar IDs, fechas de creación/lectura, revisión y contador de cuentas de prueba; tras reinicio/redeploy comparar REST y PostgreSQL, conservando la misma base. Restauración no crea avisos; un login explícito posterior intenta crear uno. Confirmar que no se eliminan avisos antiguos o leídos.
- [ ] Revisar logs de API y errores de navegador sin publicar JWT, correos, contraseñas, hashes, URL de base ni SQL con valores. Los errores secundarios deben limitarse a código, etapa y correlación; investigar cualquier excepción general que exponga datos antes de compartir registros.
- [ ] Registrar resultados y limitaciones y ejecutar la verificación integral de OpenSpec antes de completar 8.4. No archivarlo automáticamente.

## 6. Rollback de aplicación conservando datos

Antes de publicar, identificar un deploy funcional de API y frontend y verificar
su compatibilidad con el esquema aditivo. El rollback de aplicación conserva
`users`, `notifications` y `notification_state`, sus índices, avisos y lecturas.
**No eliminar, recrear ni vaciar PostgreSQL; no hacer DROP/TRUNCATE ni revertir las
tablas para volver a una versión anterior.** Una versión previa sin notificaciones
puede dejar de mostrarlas, pero debe conservarlas para una actualización posterior.

En el Dashboard de Render, seleccionar un deploy exitoso anterior y usar la opción
de rollback del servicio. Coordinar API y Static Site: evitar un frontend nuevo
contra una API anterior sin endpoints de notificaciones. Revisar las variables y
grupos aplicados, comandos, origen API compilado y cantidad de instancias: el
rollback reutiliza el artefacto anterior y ciertas opciones del deploy, pero no
revierte toda la configuración actual ni los valores de grupos de entorno.
Revisar también auto-deploy para evitar republicar inmediatamente la versión con
el problema. Ver [rollback de Render](https://render.com/docs/rollbacks).

Como alternativa, preparar una reversión de código sobre una rama de trabajo
limpia con `git revert <commit-problematico>`, resolver conflictos y revisar el diff.
Si hay varios commits, planificar su orden; un merge requiere elegir correctamente
el padre principal. No usar `git reset --hard` ni force-push como procedimiento de
rollback compartido. Ejecutar pruebas, build y OpenSpec; después, con autorización
para publicar, enviar la reversión y desplegar las versiones compatibles de ambos
servicios. Estos son pasos futuros: esta entrega no ejecuta revert, commit, push
ni rollback remoto.

Conservar `DATABASE_URL` apuntando a la misma base y `JWT_SECRET` salvo rotación
intencional. Después del rollback, repetir healthcheck, login, CORS, carga de
recursos y comparación de datos. Si la versión elegida incluye notificaciones,
repetir además prueba entre sesiones, lecturas y reconexión. Un rollback de código
no repara corrupción de datos; una restauración de backup es un procedimiento
separado y no debe sustituir automáticamente esta conservación de PostgreSQL.

## 7. Registro histórico anterior a notificaciones

El resumen siguiente corresponde a la validación previa de autenticación y
despliegue que ya constaba en el repositorio. No verifica públicamente este cambio
de notificaciones ni completa el checklist anterior o la tarea 8.4.

- Frontend: [https://decilo-web.onrender.com](https://decilo-web.onrender.com)
- API: [https://decilo-api.onrender.com](https://decilo-api.onrender.com)
- Healthcheck: `/api/health` respondió con API y base de datos en estado `ok`.
- Registro, login y `/api/auth/me`: verificados.
- Roles `profesional`, `paciente` y `familiar`: verificados.
- CORS: el frontend público y localhost fueron permitidos; un origen arbitrario fue rechazado.
- Persistencia: verificada después de redesplegar la API.
- Secretos: no se publicaron secretos, credenciales, contraseñas ni tokens.

## 8. Verificación pública y configuración de Headers PWA en Render

### 8.1. Auditoría HTTP inicial en producción (2026-09-28)

La verificación HTTP realizada tras el release v1.1.0 contra `https://decilo-web.onrender.com` arrojó los siguientes valores reales:

| Recurso | Código | Content-Type real | Cache-Control real | ETag real |
| --- | --- | --- | --- | --- |
| `/` | 200 OK | `text/html; charset=utf-8` | `public, max-age=0, s-maxage=300` | `W/"245e6b..."` |
| `/manifest.webmanifest` | 200 OK | `binary/octet-stream` | `public, max-age=0, s-maxage=300` | `"f1db37..."` |
| `/icons/*.png` (5 íconos) | 200 OK | `image/png` | `public, max-age=0, s-maxage=300` | individual |
| `/icons/inexistente.png` | 404 Not Found | `text/plain; charset=utf-8` | — | — |
| `/inexistente.webmanifest` | 404 Not Found | `text/plain; charset=utf-8` | — | — |
| `/api/health` (Web Service) | 200 OK | `application/json` | — | `{"status":"ok","database":"ok"}` |

### 8.2. Contraste técnico frente a especificación y pruebas

- **MIME del Manifest**: Render entrega por defecto `Content-Type: binary/octet-stream` para archivos `.webmanifest` al no tener el mapeo MIME en su servidor estático nativo. La especificación PWA del W3C y las pruebas del proyecto (`e2e/pwa.spec.js` y `test/frontend-pwa.test.js`) exigen `application/manifest+json`.
- **Cache-Control predeterminado**: Render aplica por defecto `public, max-age=0, s-maxage=300` a través de Cloudflare CDN (el navegador no guarda sin consultar, pero el CDN retiene 5 minutos). Se requiere definir la política explícita en el Dashboard.

### 8.3. Definición y justificación de la política de caché por recurso

1. **Puntos de entrada y recursos mutables (`/`, `/index.html`, `/manifest.webmanifest`, `/config.js`)**:
   - **Regla**: `Cache-Control: no-cache` (o `public, max-age=0, must-revalidate`).
   - **Justificación**: Son los puntos de descubrimiento del frontend. Si se publica una actualización o se modifican referencias, los navegadores y el CDN deben revalidar inmediatamente contra el origen con ETag / 304, evitando que los usuarios queden retenidos en versiones obsoletas de la aplicación.
   - **Content-Type de manifest**: `/manifest.webmanifest` debe forzar explícitamente `Content-Type: application/manifest+json`.

2. **Íconos PNG con nombres versionados (`/icons/*-v*.png`)**:
   - **Nombres versionados**: `favicon-v1.png`, `apple-touch-icon-v1.png`, `decilo-192-v1.png`, `decilo-512-v1.png`, `decilo-maskable-512-v1.png`.
   - **Regla**: `Cache-Control: public, max-age=31536000, immutable` y `Content-Type: image/png`.
   - **Justificación**: Al poseer el sufijo `-v1` en el nombre de archivo, el contenido bajo esa URL es inmutable. Si el diseño visual cambia en el futuro, el generador y el manifest adoptarán el sufijo `-v2.png`. Por ende, permitir que el navegador y la red de borde (CDN) almacenen en caché estos recursos de forma prolongada e inmutable (`max-age=31536000, immutable`) elimina peticiones HTTP redundantes, acelera la carga en dispositivos móviles (iPhone/Android) y no genera riesgo de obsolescencia.
   - *(Alternativa de revalidación uniforme: Si se desea mantener paridad exacta con Nginx local, se puede configurar `no-cache` también para `/icons/*`, pero no aprovecha la inmutabilidad de los nombres versionados).*

### 8.4. Configuración requerida en el Dashboard de Render

En el Dashboard de Render ([dashboard.render.com](https://dashboard.render.com)), seleccionar el Static Site `decilo-web` -> sección **Settings** -> **Custom Headers**, y configurar las siguientes reglas:

| Path | Header | Value | Justificación |
| --- | --- | --- | --- |
| `/` | `Cache-Control` | `no-cache` | Revalidación continua de entrada |
| `/index.html` | `Cache-Control` | `no-cache` | Revalidación continua de entrada |
| `/manifest.webmanifest` | `Content-Type` | `application/manifest+json` | MIME estándar W3C para manifests |
| `/manifest.webmanifest` | `Cache-Control` | `no-cache` | Descubrimiento oportuno de cambios |
| `/icons/*` | `Cache-Control` | `public, max-age=31536000, immutable` | Caché prolongada para íconos versionados |
| `/icons/*.png` | `Content-Type` | `image/png` | MIME de imágenes PNG |

*Nota sobre rewrites*: Este frontend navega mediante estado interno. No configurar rewrite global `/* → /index.html` para asegurar que los recursos inexistentes devuelvan HTTP 404 en lugar de HTML con código 200.

### 8.5. Estado de verificación de dispositivos y cierre de tareas

- **Safari en iPhone 13 (Tarea 5.2 - Completa)**: Comprobada en dispositivo físico real por la usuaria el 2026-09-28; instalación operativa mediante «Agregar a pantalla de inicio» y apertura standalone. Se registró la observación de que **el diseño móvil es mejorable**.
- **Chrome Android (Tarea 5.1 - Pendiente)**: Permanece pendiente hasta contar con pruebas en dispositivo físico Android real.
- **Render público (Tarea 5.4 - Pendiente)**: Permanece pendiente hasta que las cabeceras anteriores sean configuradas en el Dashboard de Render y se vuelva a comprobar por HTTP que `/manifest.webmanifest` responde `application/manifest+json` y los íconos aplican la política de caché definida.

### 8.6. Actualización y rollback de recursos

Conservar `npm ci && npm run build:frontend` y Publish Directory `dist`. Las reglas
de headers anteriores corresponden al Static Site, no a la API; `nginx.conf` no
configura el servidor estático de Render. La API conserva su origen HTTPS y
Socket.IO usa HTTPS/WSS. Ver [headers de Static Sites](https://render.com/docs/static-site-headers)
y [reglas de Render](https://render.com/docs/redirects-rewrites).

Al cambiar imágenes, incrementar el sufijo de versión en generador, manifest,
HTML y allowlist/pruebas, manteniendo `id: /` estable. No reemplazar el contenido
de una URL declarada immutable. `no-cache` permite guardar recursos públicos
pero exige revalidarlos; no equivale a caché de API o datos autenticados.

El sistema operativo decide cuándo actualiza el ícono instalado. Probar cerrar
y reabrir antes de reinstalar; una reinstalación puede no conservar datos locales.
No borrar sessionStorage/localStorage para actualizar. Un rollback debe recuperar
juntos HTML, manifest e imágenes de la misma versión y revisar sus headers; no
elimina accesos instalados ni datos. Comprobar por HTTPS los recursos existentes,
404 de faltantes, ETag/Last-Modified, revalidación y ausencia de contenido mixto.
Estas instrucciones no acreditan ejecución ni completan tareas pendientes.
