# DECILO MVP

## Límites de dominio

- `app.js` maneja sesión y navegación del frontend estático. Relaciones, tableros, actividades y progreso son datos de demostración en `localStorage`; no representan relaciones clínicas autorizadas por una API persistente.
- `notifications-client.js` mantiene conexión, reconciliación REST y panel fuera del render general, sin reconstruir la frase ni robar el foco del comunicador.
- `index.html` carga `styles.css` y, en orden, configuración pública, cliente Socket.IO local, módulo de notificaciones y `app.js`.
- `styles.css` concentra los tokens visuales, estados accesibles y layout responsive inspirado en `stitch_decilo`.

## Persistencia y sesión

El frontend conserva la sesión JWT en `sessionStorage` bajo `decilo-session-v1` y consulta la identidad mediante `/api/auth/me`. Las cuentas se persisten en PostgreSQL, no en el navegador. La API guarda únicamente `password_hash` generado con bcrypt y nunca contraseñas en texto plano.

La tabla `users` contiene `id`, `nombre`, `email`, `password_hash`, `rol` y `created_at`. El email se normaliza antes de insertar y la base impone unicidad y los roles válidos `profesional`, `paciente` y `familiar`.

## Notificaciones persistentes

El único evento del MVP es `session.login`: «Se inició sesión en tu cuenta», para
el mismo usuario cuyas credenciales aceptó la API. Aplica a los tres roles y no
depende de relaciones profesional/paciente/familiar. Registro, `/me`, restauración,
recarga y reconexión no crean avisos. Un rol seleccionado incorrectamente en el
frontend no cambia el hecho de que la API aceptó las credenciales.

| Tabla | Estructura y relación |
| --- | --- |
| `notifications` | `id BIGINT` identity PK; `user_id INTEGER NOT NULL` FK a `users(id)` con `ON DELETE CASCADE`; `event_id UUID NOT NULL`; `type TEXT` restringido a `session.login`; `title` y `body` obligatorios; `created_at TIMESTAMPTZ` del servidor; `read_at TIMESTAMPTZ` nullable. Unicidad `(user_id, event_id)`. |
| `notification_state` | `user_id` PK y FK a `users(id)` con `ON DELETE CASCADE`; `revision BIGINT NOT NULL DEFAULT 0`, no negativa. |

Una cuenta tiene muchos avisos y un estado de revisión. Índices: `(user_id, id DESC)`
para listar y parcial `(user_id) WHERE read_at IS NULL` para pendientes. `db.js`
inicializa el esquema aditivamente en una transacción idempotente, conserva datos
y crea estado para usuarios existentes sin inventar avisos históricos; las nuevas
cuentas obtienen el estado perezosamente en su primera mutación.

`notifications.js` serializa escrituras bloqueando el estado del usuario con
`FOR UPDATE`. Solo cambios efectivos incrementan la revisión; lectura individual
repetida conserva la primera fecha. La lectura general incluye páginas no cargadas;
una creación serializada después queda pendiente. Listado y resumen usan snapshots
`REPEATABLE READ`. PostgreSQL y la API son la fuente de verdad: el servidor calcula
el contador con `COUNT`, sin acumuladores del navegador. IDs y revisiones BIGINT
viajan como strings decimales, comparadas con `BigInt` en el cliente.

### Endpoints REST

Todas estas rutas exigen `Authorization: Bearer <JWT>`, derivan el dueño de la
identidad validada y devuelven `Cache-Control: no-store`. No aceptan destinatarios
elegidos por el cliente ni ofrecen una ruta pública para crear avisos.

| Método y ruta | Respuesta |
| --- | --- |
| `GET /api/notifications?limit=20&before=<id>` | `{ notifications, unreadCount, revision, nextCursor }` |
| `GET /api/notifications/unread-count` | `{ unreadCount, revision }` |
| `POST /api/notifications/:id/read` | `{ notification, unreadCount, revision }` |
| `POST /api/notifications/read-all` | `{ updatedCount, unreadCount, revision }` |

Cada aviso expone `id`, `type`, `title`, `body`, `createdAt`, `readAt`. Orden por ID
descendente, cursor exclusivo, límite por defecto 20 y máximo 100. El contador es
global, no la longitud de página. Entradas inválidas producen 400; JWT inválido,
vencido o usuario inexistente, 401; ID inexistente o ajeno, el mismo 404. Fallos de
dependencia en las operaciones de notificaciones producen errores JSON saneados
503; esto no convierte en 503 un login válido por fallo de su aviso secundario.

### Login y trabajo secundario

`server.js` valida las credenciales y devuelve normalmente `{ token, user }` antes
de programar el aviso. `login-notifications.js` controla el trabajo secundario:
dos operaciones pendientes como máximo, pool separado de hasta dos conexiones,
adquisición y consultas con tiempos acotados. Un fallo al programar, guardar, emitir
o registrar el error nunca invalida el JWT ni modifica la respuesta del login.
Los errores del aviso se registran con código saneado, etapa y correlación opaca,
sin cuerpos, tokens, contraseñas, datos clínicos ni excepciones completas.

El aviso se emite solo después del commit. Si falla el guardado, no hay aviso ni
incremento de revisión; si falla la emisión, REST recupera lo persistido. No hay
cola durable: saturación o reinicio antes del commit pueden perder un aviso.
Recuperar avisos que nunca se guardaron y retención automática están fuera de alcance.
Los avisos no se eliminan por antigüedad ni por estar leídos.

### Socket.IO y sincronización

Express y Socket.IO comparten el servidor HTTP de `createServer`, puerto `PORT`
y ruta de transporte `/socket.io/`, con polling y WebSocket. `realtime.js` valida
JWT HS256 mediante `handshake.auth.token` (nunca en la URL), expiración, subject
positivo y usuario existente. La sala privada `user:<id>` se determina solo en
el servidor. Se verifican orígenes permitidos en HTTP, polling y upgrade; CORS no
sustituye al JWT. La conexión se cierra al expirar y se reautentica al reconectar.

| Evento servidor → cliente | Significado |
| --- | --- |
| `notifications:ready` | Emitido después de unir la conexión a su sala; solicita recuperar estado por REST. |
| `notifications:changed` | `{ revision, unreadCount }` tras un commit efectivo, a todas las conexiones propias, incluida la que originó la lectura. Es señal de reconciliación, no una instrucción para sumar/restar. |

El cliente mantiene un socket por sesión, una operación HTTP a la vez y la revisión
objetivo máxima. Rechaza snapshots antiguos y respuestas de otra generación de
sesión, deduplica por ID e invalida páginas al cambiar la revisión. Contador y
filas se reemplazan desde un snapshot aceptado, nunca por aritmética local.
Recupera por REST al iniciar/restaurar sesión sin esperar al socket, conectar o
reconectar, recibir ready/changed, volver a estar visible, recuperar conectividad
y abrir el panel. No hay sondeo periódico REST; el polling del transporte es distinto.

Los errores conservan el último estado como desactualizado. Hay dos reintentos
acotados de lectura y cinco intentos de reconexión Socket.IO con backoff y jitter;
los disparadores de recuperación permiten nuevos intentos. Un 401 o rechazo JWT
limpia la sesión sin bucles. Logout/cambio de cuenta cancela HTTP, socket, listeners
y timers, borrando lista y contador. Los JWT siguen en `sessionStorage` por pestaña;
sincronizar avisos no comparte tokens ni implica logout global.

### Límites operativos

Una sola instancia/proceso de API: salas y emisión viven en memoria, sin adaptador
distribuido. No usar réplicas ni cluster de procesos con esta implementación.
En entorno local saludable las pestañas convergen en cinco segundos; una señal
perdida sin desconexión se recupera en el siguiente disparador REST, no en un plazo
fijo sin actividad. La red suspendida, arranque en frío y trabajos no persistidos
quedan fuera de esa garantía. No hay correo, push, revocación global ni avisos entre personas.

## Build y despliegue

Publicar solo `dist`, generado con `npm run build:frontend`; nunca servir la raíz
del repositorio, cuyo `config.js` es privado del backend. El build incluye siete
archivos públicos: `index.html`, `app.js`, `styles.css`, `config.js`,
`notifications-client.js`, `vendor/socket.io.min.js` y su licencia
`vendor/socket.io.LICENSE.txt`. Socket.IO se copia de la dependencia fijada, sin CDN.
El `config.js` generado solo contiene `API_PUBLIC_URL`; no lleva secretos.

Compose construye el frontend en una etapa Node y lo sirve con Nginx: `/api/`
y `/socket.io/` se enrutan a la API, con upgrade y timeout 75s. Sin URL pública,
el frontend usa el mismo origen. Para ejecución local separada, iniciar API y
`npm run dev:frontend`, que construye y sirve solo `dist` en el puerto 8080.
Para Render, ver [DEPLOY_RENDER.md](DEPLOY_RENDER.md): API y Static Site separados,
HTTPS/WSS, una instancia y PostgreSQL persistente. La preparación documental no
equivale a desplegar ni verificar públicamente las notificaciones.

## Autenticacion y ejecucion local

La autenticacion se resuelve mediante la API Node.js/Express de `server.js`, usando el paquete `pg` y consultas SQL parametrizadas. La API firma JWT usando `JWT_SECRET`, que debe existir solo en un archivo `.env` local o en el entorno del contenedor. Las credenciales PostgreSQL también se configuran por entorno y no se versionan.

Para levantar el proyecto con Docker:

1. Copiar `.env.example` como `.env` y reemplazar `JWT_SECRET` por un valor aleatorio de al menos 32 caracteres. Cambiar `DB_PASSWORD` si el entorno no es exclusivamente local.
2. Ejecutar `docker compose up --build -d`.
3. Abrir `http://localhost:8080` y consultar `http://localhost:8080/api/health`. PostgreSQL queda publicado por defecto en `localhost:55432` para evitar conflictos con instalaciones locales; internamente la API usa el puerto `5432` del servicio.
4. Detener los servicios con `docker compose down`. El volumen `decilo-postgres` conserva las cuentas. El volumen legado `decilo-sqlite` no se elimina ni se usa por la nueva API; no ejecutar `docker compose down -v` durante esta migración.

## Aislamiento de pruebas

`npm.cmd test` ejecuta node:test y `npm.cmd run test:frontend` ejecuta Playwright
en comandos separados. Requieren binarios locales PostgreSQL, no la base de
desarrollo ni Docker; se pueden localizar con `TEST_PG_BIN`. El runner crea un
clúster temporal en loopback con puerto, base y contraseña propios y marcador
aleatorio de propiedad. No usa `DATABASE_URL`, `DB_*`, `PG*` ni `TEST_DB_*`.
Cada suite verifica la identidad de la base y el marcador antes de crear o limpiar
su esquema exclusivo. Sin la configuración interna del runner falla antes del DDL;
no configurar manualmente `DECILO_TEST_DATABASE`. El runner detiene y elimina
solo su clúster al finalizar. Nunca trunca desarrollo o producción como fallback.

Las suites cubren persistencia, JWT, aislamiento, concurrencia, transporte real,
frontend, build y navegador. No ejecutarlas simultáneamente: ambas pueden generar
`dist`. [test/README.md](test/README.md) detalla requisitos y Compose manual aislado
con proyecto, volumen y credenciales propios. La evidencia manual local documentada
incluye varias sesiones, responsive y persistencia tras reinicios.

## Consultas educativas para DBeaver

Conectarse a la base local usando el host, puerto, usuario y base declarados en `.env`. Las siguientes consultas son de solo lectura y no muestran contraseñas:

```sql
SELECT id, nombre, email, rol, created_at
FROM users;
```

```sql
SELECT id, nombre, email, rol
FROM users
WHERE rol = 'paciente';
```

```sql
SELECT id, nombre, email, rol
FROM users
WHERE email LIKE '%@example.com';
```

```sql
SELECT id, nombre, email, rol, created_at
FROM users
ORDER BY created_at DESC;
```

```sql
SELECT id, nombre, email, rol
FROM users
ORDER BY id
LIMIT 10;
```

`password_hash` existe para autenticación, pero no representa una contraseña recuperable y no debe incluirse en consultas educativas generales. Recuperación de contraseña, OAuth, diagnósticos clínicos, inteligencia artificial, pagos y notificaciones externas permanecen fuera del alcance. La publicación y verificación integral de este cambio en Render son pasos posteriores.
