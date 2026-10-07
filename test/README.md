# Pruebas de backend

Preparación Render 2026-10-07: `release-startup.test.js` mide arranque local y
login válido con bcrypt coste 12 mientras una tarea secundaria sigue bloqueada.
`login-loading.spec.js` comprueba carga visible, ausencia de doble envío y entrada
con notificaciones/Socket.IO indisponibles, sin consultar Gemini. Configuración y
Gemini prueban opt-in público, lista de IDs ficticios y edad/consentimiento con mock.
No se consume Google ni se conecta a una base existente. Resultados finales en
[RENDER_RELEASE_CHECKLIST.md](../RENDER_RELEASE_CHECKLIST.md).

## Repository y Unit of Work (issue #17)

Los repositorios reciben un ejecutor inyectado y conservan SQL parametrizado,
filas, rowCount y BIGINT como strings. No controlan transacciones ni contienen
reglas de autenticación. El UoW controla una adquisición, BEGIN, límites locales,
COMMIT/ROLLBACK y release; los servicios coordinan bloqueo, mutación y revisión.
La inicialización DDL de db.js sigue independiente, sin cambios de esquema.
Un COMMIT sin respuesta tiene resultado incierto: no se reintenta ni emite éxito;
REST recupera lo confirmado. Errores secundarios no invalidan el login.

| Suite | Evidencia |
| --- | --- |
| unit-of-work.test.js | Orden, BEGIN/COMMIT pendientes, resultado, fallos de adquisición/configuración/callback/commit/rollback/release, error original y conexión única. |
| repositories.test.js / repository-consumers.test.js | Inyección, parámetros, resultados y consumidores HTTP sin SQL directo. |
| repository-uow-integration.test.js | PostgreSQL real efímero: commit visible, rollback sin aviso/revisión parcial con estado nuevo o previo, deduplicación y pool max 1 reutilizable. |
| login-uow.test.js / login-notifications.test.js | Misma conexión en repositorios, publicación posterior a COMMIT, ninguna mientras espera o rechaza, límites y logs saneados. |
| rest-uow.test.js | Snapshots de lectura, bloqueo/incremento en escrituras, release y rollback con 404 indistinguible. |
| notifications.test.js / realtime.test.js | Contratos, autorización, concurrencia, fechas, login no bloqueante, fallos secundarios, reconexión y recuperación REST. |

Validación final local del 2026-09-30: `npm.cmd test`, **102 aprobadas, 0 fallidas**,
con el runner PostgreSQL temporal protegido. `npm.cmd run build:frontend` correcto.
Después del build, `npm.cmd run test:frontend`: **32 aprobadas en 50,1 s**,
sin omisiones ni cambios de cobertura. El aviso NO_COLOR/FORCE_COLOR fue
informativo; el proceso terminó con código 0.

La imagen API se construyó y arrancó con el Compose real en el proyecto separado
`decilo-17-final-check`: frontend 58087, PostgreSQL 55437, red
`decilo-17-final-check_default` y volumen `decilo-17-final-check_decilo-postgres`.
Se usó `--env-file` temporal fuera del repositorio con credenciales sintéticas
nuevas, eliminando variables heredadas DB/PG/JWT/Compose del proceso de prueba.
No se leyó el .env operativo. Comandos: `docker compose -p decilo-17-final-check
--env-file <archivo-temporal> config --quiet` y `up --build -d --wait`.
API y PostgreSQL saludables; `/api/health` por Nginx respondió status/database ok.
Dentro de la imagen se cargaron UoW y los cuatro módulos de repositories sin error.
Los contenedores habituales conservaron IDs, horas de arranque y montajes.
Al terminar se detuvo únicamente ese proyecto con `stop`; se conservaron
contenedores y volumen. Los IDs, horas de arranque y montajes de los contenedores
habituales siguieron iguales después de detener las pruebas. No se borraron
datos ni volúmenes ni se realizó despliegue.

Revisión de rama contra origin/develop: cambios limitados a #17 (persistencia,
consumidores, empaquetado API, pruebas y documentación/OpenSpec). db.js, esquema,
frontend/PWA, contratos HTTP y eventos conservados. No se incorporaron secretos
operativos ni archivos dist/reportes; las credenciales de pruebas versionadas son
sintéticas. OpenSpec estricto del cambio y global y git diff --check se ejecutan
como comprobaciones de cierre junto con el status del cambio.

Ejecutar `npm.cmd test` en Windows o `npm test` en otros sistemas.

Se necesitan binarios locales de PostgreSQL (`initdb`, `pg_ctl`). En Windows se
detectan en `C:/Program Files/PostgreSQL`; en otros sistemas se usa `pg_config`.
Para otra ubicación, definir `TEST_PG_BIN` con el directorio de binarios.
En Unix ejecutar como usuario sin privilegios (PostgreSQL rechaza iniciar como root).

El runner crea un clúster temporal con contraseña aleatoria, puerto libre en
loopback y base exclusiva. No lee `.env` ni usa `DATABASE_URL`, `DB_*`, `PG*` o
`TEST_DB_*` para elegir una base. No necesita Docker ni un servicio PostgreSQL activo.
Cada suite crea un esquema aleatorio después de verificar la identidad y marcador
de propiedad de la base. La limpieza solo afecta a ese esquema. La ejecución
directa de una suite sin la configuración interna del runner se rechaza antes de
crear tablas o truncar datos. No configurar manualmente `DECILO_TEST_DATABASE`.

Al finalizar se detiene y elimina únicamente el clúster temporal creado por el
runner. Si faltan binarios o falla el arranque, las pruebas fallan; no se omiten
pruebas de integración ni se cambia a la base de desarrollo.

Las pruebas Socket.IO usan conexiones reales sobre puertos efímeros. `npm test`
incluye además pruebas del controlador de frontend, revisiones, recuperación,
aislamiento de sesión y build público. Solo descubre `test/*.test.js`.

`npm run test:frontend` ejecuta Playwright en un clúster PostgreSQL temporal con
la misma protección y aislamiento. Cada prueba abre una API real y un servidor
estático en puertos efímeros distintos; prueba CORS, JWT y Socket.IO entre orígenes.
No utiliza la base configurada para DECILO. El fixture cierra las pestañas antes
de cerrar API y conexiones de base. No ejecutar ambos comandos simultáneamente:
las pruebas de build y navegador generan `dist`.

En Windows se usa Edge instalado, en modo headless. Se puede seleccionar Chrome
con `PLAYWRIGHT_CHANNEL=chrome`. En Linux instalar Chromium con
`npx playwright install --with-deps chromium` antes de ejecutar. No se descargan
navegadores durante las pruebas. `npm ci` instala las dependencias fijadas.

La suite de navegador cubre varias pestañas y cuentas, roles, paginación, lectura,
foco/teclado, Escape, viewport móvil, texto HTML inerte, comunicador, reconexión,
visibilidad, JWT vencido, respuestas demoradas, revisiones concurrentes y fallos
secundarios de persistencia/emisión sin invalidar el login. El límite de las
aserciones de convergencia es de cinco segundos; no usa polling REST de aplicación.

Para desarrollo local, iniciar la API y ejecutar `npm run dev:frontend`. Este
comando construye y sirve únicamente `dist` en `http://localhost:8080`, con API
en `http://localhost:3000` por defecto. Se pueden configurar `API_PUBLIC_URL` y
`FRONTEND_PORT`; autorizar ese origen en `LOCAL_FRONTEND_URL` de la API. No servir
la raíz del repositorio: su `config.js` es privado del backend.

El build normal sin `API_PUBLIC_URL` usa el mismo origen, como Compose/Nginx.
Para frontend y API separados usar un origen HTTP(S) público sin ruta, credenciales
ni parámetros. El cliente Socket.IO y su licencia se copian desde la dependencia
local a `dist/vendor`; no se carga código de transporte desde una CDN.

La configuración de Nginx permite polling y upgrade en `/socket.io/` y conserva
`/api/`; los recursos JavaScript inexistentes devuelven 404. La validación de
directivas/build no sustituye ejecutar Compose, sus healthchecks y reinicios con
volumen persistente. Esas comprobaciones siguen pendientes si el motor Docker
está detenido. No se realizó despliegue ni se archivó el cambio OpenSpec.

Verificación de la primera etapa (2026-09-22): `npm.cmd test`, Node 22.21.1 y
PostgreSQL 16.10 local efímero: 43 pruebas aprobadas, 0 fallidas, 0 omitidas.
Incluye las regresiones existentes de autenticación, configuración y build.

Verificación de frontend (2026-09-22): `npm.cmd ci` completado; `npm.cmd test`:
52 aprobadas, 0 fallidas; `npm.cmd run test:frontend`: 13 aprobadas, 0 fallidas
con Edge headless y PostgreSQL 16 efímero. La primera ejecución de navegador
detectó escape de foco y cierre prematuro del fixture; ambos fueron corregidos
antes de esos resultados. Build verificado con mismo origen y origen HTTPS de
ejemplo; allowlist pública de siete archivos. `docker compose config` verificó
orígenes y puerto configurable. No se validó el proxy en contenedores: el motor
Docker Desktop estaba detenido. No confundir esta comprobación de configuración
con las tareas que estaban pendientes 6.2, 6.3, 7.4 y 7.5 de OpenSpec.

Actualización local posterior (2026-09-22): el usuario confirmó build y arranque
de Compose exitosos, healthchecks saludables y sincronización manual del aviso
de login, badge y lecturas individual/general entre dos sesiones de la misma
cuenta. Se corroboraron mediante solo lectura `docker compose ps`, el healthcheck
público y handshakes de polling y WebSocket por `localhost:8080`. Quedan completas
6.2 y 6.3. En esa fecha faltaban la configuración aislada documentada y la revisión
manual responsive de 7.4, y persistencia tras reinicios de 7.5. El bloqueo anterior
por Docker detenido ya no aplica. Render no fue validado ni desplegado.

## Docker Compose aislado para validación manual

Esta receta reproduce la validación sin compartir contenedores, red, volumen ni
credenciales con el proyecto de desarrollo `decilo`. No cambia el aislamiento
automático de `npm test` y `npm run test:frontend`, que no utilizan Compose.

Desde la raíz del repositorio, usar una terminal PowerShell sin variables de
DECILO heredadas: las variables del proceso tienen precedencia sobre `--env-file`.
En esa terminal dedicada, retirarlas antes de cargar la configuración de pruebas:

```powershell
Get-ChildItem Env: | Where-Object { $_.Name -match '^(DB_|JWT_|FRONTEND_|LOCAL_FRONTEND_URL$|API_PUBLIC_URL$|DATABASE_URL$|COMPOSE_)' } | Remove-Item
node -e "const fs=require('node:fs'),c=require('node:crypto');fs.writeFileSync('.env.notifications-test',['DB_USER=decilo_notifications_test','DB_NAME=decilo_notifications_test','DB_PASSWORD='+c.randomBytes(32).toString('hex'),'JWT_SECRET='+c.randomBytes(32).toString('hex'),'JWT_EXPIRES_IN=1h','DB_PORT=55433','FRONTEND_PORT=58080','DB_POOL_MAX=4','LOCAL_FRONTEND_URL=http://localhost:58080,http://127.0.0.1:58080','API_PUBLIC_URL='].join('\n')+'\n',{flag:'wx'});"
docker compose -p decilo-notifications-test --env-file .env.notifications-test up --build -d
docker compose -p decilo-notifications-test --env-file .env.notifications-test ps
Invoke-RestMethod http://localhost:58080/api/health
```

El archivo privado está excluido por `.gitignore` y `.dockerignore`; el comando
no imprime secretos ni sobrescribe un archivo existente. Reutilizarlo en futuras
ejecuciones del mismo proyecto, sin regenerar credenciales para su volumen.
Comprobar que los puertos 55433 y 58080 estén libres antes del arranque; si se
cambian, actualizar también el origen autorizado y las URLs de esta receta.
No usar cuentas ni datos reales. No publicar el archivo ni la salida completa de
`docker compose config`, que incluye credenciales interpoladas.

El volumen resultante es `decilo-notifications-test_decilo-postgres`, distinto de
`decilo_decilo-postgres`. La API conecta al servicio `postgres` de su propia red;
Compose no pasa `DATABASE_URL` al contenedor. Mantener siempre el mismo `-p` y
`--env-file` en los comandos; no conectar las pruebas a una base externa.

Abrir `http://localhost:58080`, crear cuentas de prueba y comprobar campana/panel
en escritorio, móvil y tablet. Con dos sesiones de A y una de B, verificar aviso
por login, contador y lecturas sincronizadas solo para A, sin recarga. Revisar
polling y upgrade WebSocket en Network y confirmar que los scripts son JavaScript.
Antes de reiniciar, registrar IDs, fechas de creación/lectura y contador sin JWT
ni datos personales. Se puede contrastar la persistencia con esta consulta local:

```powershell
docker compose -p decilo-notifications-test --env-file .env.notifications-test exec -T postgres psql -U decilo_notifications_test -d decilo_notifications_test -c "SELECT id, user_id, created_at, read_at FROM notifications ORDER BY id; SELECT user_id, count(*) FILTER (WHERE read_at IS NULL) AS unread_count FROM notifications GROUP BY user_id;"
docker compose -p decilo-notifications-test --env-file .env.notifications-test restart api
docker compose -p decilo-notifications-test --env-file .env.notifications-test stop api
docker compose -p decilo-notifications-test --env-file .env.notifications-test restart postgres
docker compose -p decilo-notifications-test --env-file .env.notifications-test up -d --wait
```

Comparar la consulta y la interfaz después de cada reinicio, esperando healthchecks
saludables. Restaurar la sesión no debe crear avisos; un login explícito posterior
intenta crear uno nuevo. Los avisos previos y fechas deben conservarse, incluidos
los leídos, sin retención automática. Para detener el entorno, usar `stop` con
los mismos argumentos de proyecto y archivo. No usar `down -v` ni borrar el volumen.

## Evidencia manual completada (2026-09-23)

El usuario confirmó escritorio, móvil y tablet sin desbordamiento horizontal,
textos/fechas/botones correctos y apertura/cierre normal. Confirmó también que los
avisos, el estado leído, la fecha de lectura y el contador permanecieron tras
reiniciar la API y tras reiniciar PostgreSQL y volver a iniciar la API.
Junto con la evidencia anterior y esta documentación, se completan 7.4 y 7.5.
La receta aislada queda documentada para reproducción; no se afirma haberla
ejecutado nuevamente ni que la prueba reportada usara sus puertos específicos.
Las tareas 8.1–8.4 siguen pendientes. No se desplegó en Render.

## Identidad PWA y regresiones

Los cinco PNG de `icons/` están versionados y se generan localmente mediante
`node scripts/generate-pwa-icons.js`. `node scripts/generate-pwa-icons.js --check`
comprueba igualdad byte a byte sin escribir. Usar Node 22 como el build Docker.
No requiere fuentes instaladas, descargas ni dependencias adicionales: la D es
geometría original, rasterizada con cuatro muestras por eje y codificada RGBA PNG
con zlib de Node, sin metadatos. Naranja #e06a42, D blanca centrada y margen dentro
del círculo seguro de radio 40%; variantes any/favicon redondeadas, Apple/maskable
opacas para que el sistema aplique su máscara.

| Archivo en icons/ | Dimensiones | Uso |
| --- | --- | --- |
| favicon-v1.png | 32×32 | Pestaña del navegador |
| apple-touch-icon-v1.png | 180×180 | Safari/iPhone |
| decilo-192-v1.png | 192×192 | Manifest any |
| decilo-512-v1.png | 512×512 | Manifest any |
| decilo-maskable-512-v1.png | 512×512 | Manifest maskable |

Al cambiar el diseño, actualizar versión de nombres, referencias, allowlist y
pruebas conjuntamente; regenerar y revisar visualmente. El script queda fuera de
dist y del runtime. Las pruebas decodifican PNG, verifican dimensiones, opacidad,
margen y ausencia de metadatos; además prueban manifest, referencias HTML y bytes
copiados al build. La lista exacta de trece archivos públicos evita filtrar fuentes.
Los controles de secretos leen como texto solo los archivos que no son PNG.

`e2e/pwa.spec.js` cubre MIME/404/revalidación, decodificación de íconos, ayuda nativa
por teclado a 320/768/1280 px y zoom CSS 200%, registro/login/restauración/logout,
cambio de cuenta y notificaciones sobre API aislada. Verifica perfiles sin service
workers ni Cache Storage y no-store de notificaciones. No certifica instalación
del sistema operativo ni ausencia de todo almacenamiento: el MVP conserva JWT en
sessionStorage y dominio demostrativo en localStorage. La prueba de actualización
Node usa directorio temporal y servidor exclusivo, sin modificar dist o datos reales.

Ejecutar secuencialmente: `npm.cmd ci`, `npm.cmd test`,
`npm.cmd run build:frontend`, `npm.cmd run test:frontend`; después validar OpenSpec
del cambio y global con `--strict`, y `git diff --check`. Para Docker ejecutar
`docker compose config --quiet`, `docker compose up --build -d`,
`docker compose ps`; verificar manifest, cinco íconos, MIME, no-cache, 404 y
`/api/health` en localhost:8080 sin borrar volúmenes. No imprimir `compose config`
sin `--quiet`, porque expone variables privadas.

La instalación real en Chrome escritorio/Android y Safari/iPhone sigue requiriendo
dispositivo, navegador/OS, fecha, nombre/ícono y apertura standalone comprobados.
Usar HTTPS autorizado en móvil. Una captura de viewport no completa ese control.
La verificación pública de Render espera autorización posterior de publicación.

### Validación local del issue #12 — 2026-09-27

Node 22.21.1. `npm ci` se completó en la etapa anterior sin cambiar dependencias.
`npm.cmd test`: 73 aprobadas, 0 fallidas, 0 omitidas; build frontend correcto.
El primer intento tuvo 72 aprobadas y un fallo en la prueba nueva de actualización:
Node fetch agregaba `no-cache` a la solicitud condicional y Express respondía 200.
La prueba ahora pide revalidación explícita con `max-age=0` e If-None-Match; conserva
la exigencia 304 sin cambios y 200 con ETag distinto al actualizar el manifest.

`npx.cmd playwright test` directo: 32 fallos de preparación, con mensaje «Base de
pruebas ausente o insegura». No crea el PostgreSQL temporal ni su marcador interno.
La ejecución válida para esta configuración es `npm.cmd run test:frontend`; no
configurar credenciales manualmente ni eludir la protección contra bases externas.

`npm.cmd run test:frontend`: 32 aprobadas, 0 fallidas, sin omisiones (Edge headless,
PostgreSQL temporal). Incluye las 26 regresiones anteriores y seis pruebas PWA.
Las nueve pruebas Node nuevas cubren identidad, PNG, distribución y actualización.
El aviso NO_COLOR/FORCE_COLOR es informativo; PowerShell lo representa como stderr,
pero el proceso terminó con código 0. Se revisó la ayuda por teclado, tamaños y
zoom en navegador; esto no acredita instalación física ni lectura con lector de pantalla.

Docker Desktop 29.8.0: `docker compose config --quiet`, `up --build -d` y `ps`
correctos. API y PostgreSQL saludables, frontend disponible en localhost:8080.
Manifest: 200 application/manifest+json; los cinco PNG: 200 image/png e igualdad
binaria con las fuentes. HTML/manifest/íconos: no-cache; ETag del manifest: 304 al
revalidar. Ícono y manifest inexistentes: 404. `/api/health`: status/database ok.
Handshake Engine.IO polling 200 y WebSocket upgrade 101 comprobados sin login ni
escrituras de prueba en la base local. No se borraron volúmenes. Esta comprobación
usó el Compose existente solicitado, no un segundo proyecto Compose aislado.
Un navegador Edge limpio cargó login y ayuda desde Nginx, con cero workers y
cero entradas Cache Storage.
El servidor de desarrollo temporal en 18080 también entregó HTML/manifest/PNG con
MIME y no-cache correctos y se detuvo después de la comprobación.

OpenSpec: cambio válido y global 7 aprobados, 0 fallidos, con avisos informativos
sobre requisitos extensos preexistentes. Al finalizar esa validación no había
evidencia de instalación real; el avance posterior de escritorio se registra abajo.

### Evidencia adicional para revisión del issue #12 — 2026-09-27

La usuaria confirmó que instaló DECILO desde http://localhost:8080 en Chrome de
escritorio: apareció el ícono naranja con la D y se abrió en una ventana propia.
Es evidencia manual reportada por la usuaria, distinta de Edge headless. No se
informaron versiones de navegador/OS ni reapertura o recorrido completo de sesión
y accesibilidad. La tarea 5.1 sigue pendiente porque agrupa escritorio y Android;
no acredita Android, Safari/iPhone ni el sitio público HTTPS de Render.

Se completó la tarea 4.5 con **un segundo proyecto Compose**:

| Recurso | Proyecto de prueba |
| --- | --- |
| Nombre | `decilo-pwa-12-check` |
| Frontend | `http://localhost:58082` |
| Puerto PostgreSQL del host | `55434` |
| Red | `decilo-pwa-12-check_default` |
| Volumen PostgreSQL | `decilo-pwa-12-check_decilo-postgres` |

Antes de crear el proyecto se comprobó que no existían contenedores con ese nombre
y que ambos puertos estaban libres. Se generaron credenciales aleatorias nuevas
en un archivo temporal privado fuera del repositorio. El proceso de prueba quitó
variables heredadas DB/JWT/Compose y pasó explícitamente `--env-file`; no usó el
.env de desarrollo ni publicó sus valores. Se compararon red y montajes para
confirmar que no compartía volumen ni red con el proyecto `decilo` existente.

Comandos ejecutados desde la raíz, con `$archivoPrivado` representando la ruta
temporal creada (no contiene ni muestra credenciales en esta documentación):

```powershell
docker compose -p decilo-pwa-12-check --env-file $archivoPrivado config --quiet
docker compose -p decilo-pwa-12-check --env-file $archivoPrivado up --build -d --wait
docker compose -p decilo-pwa-12-check --env-file $archivoPrivado ps
docker compose -p decilo-pwa-12-check --env-file $archivoPrivado stop
```

Build y arranque correctos; API y PostgreSQL saludables. Antes de detenerlo se
verificaron por localhost:58082 HTML y manifest 200, cinco PNG 200 y bytes iguales
a sus fuentes, MIME text/html, application/manifest+json e image/png según recurso,
Cache-Control no-cache, ETag/If-None-Match 304, ícono y manifest inexistentes 404,
`/api/health` con status/database ok, polling Engine.IO 200 y upgrade WebSocket 101.
Edge headless abrió login y ayuda con cero workers y entradas Cache Storage.
No se crearon cuentas ni se realizaron escrituras de prueba en la base original.

Se detuvo **solo el proyecto de prueba** y se conservaron sus contenedores y
volumen, además del archivo privado temporal para reutilizar sus credenciales.
Antes y después, los contenedores originales mantuvieron IDs, horas de arranque
y montajes idénticos. No se ejecutó down, eliminación de volúmenes ni despliegue.

Esta etapa solo agrega evidencia documental: conserva los resultados anteriores
de 73 pruebas Node y 32 Playwright mediante npm run test:frontend, sin afirmar que
se ejecutaron nuevamente. OpenSpec estricto y diff se validan con esta actualización.

### Auditoría pública en Render e instalación en iPhone 13 — 2026-09-28

Se realizó una auditoría de entrega HTTP mediante solicitudes contra el Static Site `https://decilo-web.onrender.com`:
- **Conexión HTTPS / TLS**: negociación TLS 1.3 con Cloudflare SNI y política HSTS (`strict-transport-security: max-age=315360000; includeSubdomains; preload`).
- **Raíz (`/`)**: HTTP 200 OK, `Content-Type: text/html; charset=utf-8`, `Cache-Control: public, max-age=0, s-maxage=300`, `ETag: W/"245e6b9992c8a456b12af7ac5f0f6e7d"`.
- **Manifest (`/manifest.webmanifest`)**: HTTP 200 OK, `Content-Type: binary/octet-stream` (predeterminado de Static Site en Render sin reglas de headers adicionales), `Cache-Control: public, max-age=0, s-maxage=300`, `ETag: "f1db37d6d8b311b7da5b9830764e5cac"`. Parseo JSON válido con identidad DECILO, modo `standalone`, colores institucionales y referencias correctas a íconos.
- **Íconos PNG**: `/icons/favicon-v1.png`, `/icons/apple-touch-icon-v1.png`, `/icons/decilo-192-v1.png`, `/icons/decilo-512-v1.png` y `/icons/decilo-maskable-512-v1.png` devolvieron todos HTTP 200 OK, `Content-Type: image/png`, `Cache-Control: public, max-age=0, s-maxage=300` y ETags individuales.
- **Recursos inexistentes**: `/icons/inexistente.png` y `/inexistente.webmanifest` respondieron HTTP 404 Not Found con `Content-Type: text/plain; charset=utf-8`, confirmando que no existe rewrite indebido con código 200 para recursos estáticos ausentes.
- **API Web Service (`https://decilo-api.onrender.com/api/health`)**: HTTP 200 OK con payload `{"status":"ok","database":"ok"}`.
- **Instalación móvil en dispositivo real (Tarea 5.2 - Completa)**: la usuaria comprobó la instalación de DECILO en un dispositivo físico iPhone 13 a través de Safari (flujo de ayuda, «Agregar a pantalla de inicio» y apertura en ventana propia funcional). Se registró la observación de que el diseño móvil es mejorable.
- **Política de caché definida y justificada**:
  - Recursos mutables de entrada (`/`, `/index.html`, `/manifest.webmanifest`): exigen revalidación `no-cache` para descubrimiento oportuno de nuevas versiones, con `Content-Type: application/manifest+json` forzado para el manifest.
  - Íconos versionados (`/icons/*-v*.png`): al tener sufijos de versión inmutables (`-v1.png`), se define `Cache-Control: public, max-age=31536000, immutable` para eliminar peticiones redundantes y acelerar la carga en móviles sin riesgo de obsolescencia.
- **Estado de tareas pendientes**: la tarea 5.1 permanece pendiente hasta contar con pruebas en dispositivo físico Android. La tarea 5.4 permanece pendiente hasta que los headers sean configurados en el Dashboard de Render y se confirme su efectividad por HTTP. La especificación OpenSpec `hacer-decilo-pwa-instalable` se mantiene activa y sin archivar.
# Ayudante simulado: primera etapa

## Extensión: Gemini en demo local

`test/gemini-provider.test.js` usa únicamente fetch inyectado con respuestas
sintéticas: payload mínimo, clave sintética en header, URL/modelo configurable,
consentimiento backend, cuentas ficticias, 429, errores/bloqueos, tamaño,
timeout y límites. No se hace inferencia externa ni se prueba una clave real.
El runner elimina GEMINI_* heredadas y el adaptador bloquea fetch real cuando
está presente la configuración del runner. Playwright intercepta capacidades
y mensajes para comprobar aceptación por envío y limpieza al cambiar de sesión.

Mantener pendientes la prueba manual consentida de Google, elegibilidad/cuota
real del proyecto, evaluación de seguridad clínica y privacidad de producción,
reservas persistentes y presupuesto. Verificar secretos sin imprimir valores:
archivos versionables/índice y dist; imágenes exportadas y configuración de
imagen. La clave solo puede estar en el entorno de la API en ejecución, no en
build args ni capas. Los resultados de esta etapa se registran en tasks.md.

`test/assistant.test.js` verifica mensajes y payload mínimo, roles, JWT vigente
contra el repositorio de usuarios inyectado, CORS, parser 8 KiB, no-store,
contadores minuto/día UTC, concurrencia, cancelación, timeout, errores saneados
y rechazo de salida no predefinida. No usa proveedor real; fetch está bloqueado
en la prueba del simulador. Los tests HTTP usan usuarios sintéticos inyectados;
las regresiones generales mantienen la autenticación sobre PostgreSQL efímero.

`e2e/assistant.spec.js` cubre paciente/familiar, sugerencias sin autoenvío, texto
inerte, 320/768/1280 px, ampliación CSS 200%, foco, carga, error, cancelación y
cambio de cuenta durante una respuesta. Verifica ausencia de conversaciones en
localStorage/sessionStorage y rechazo del profesional también por API. No
acredita revisión manual con lector de pantalla ni zoom nativo para este cambio.

Ejecutar una vez y secuencialmente `npm.cmd test`,
`npm.cmd run build:frontend`, `npm.cmd run test:frontend`; después OpenSpec
estricto del cambio/global y `git diff --check`. No hacen inferencia externa ni
consumen cuotas pagas. Persistencia/reinicio de reservas, presupuesto y proveedor
real no están implementados ni se consideran validados en esta primera etapa.
