## Context

Ver `proposal.md` para motivación. Revisión previa del 2026-09-22:

- Árbol Git inicialmente limpio. `openspec list`: sin cambios activos. Validación estricta de los cuatro archivados: 4 aprobados, 0 fallidos; sin tareas abiertas.
- Revisadas las cuatro capacidades vigentes: autenticación, comunicación fonoaudiológica, persistencia y despliegue. Las especificaciones de comunicación describen relaciones y actividades, pero `server.js` solo expone health, register, login y me. No se toma esa descripción como evidencia de vínculos persistidos.
- `db.js` crea `users` mediante `pg.Pool`; no hay migrador, repositorio de notificaciones ni transporte persistente. `auth.js` firma JWT con `sub` y `rol`; `/me` verifica firma y existencia de usuario.
- `app.js` es una IIFE de JavaScript sin framework. Conserva JWT en `sessionStorage`, identidad normalizada a string y dominio de demostración en `localStorage`. Existen declaraciones antiguas y posteriores de funciones de autenticación/render; deben tocarse las efectivamente activas, sin ampliar el cambio a una refactorización general. La selección de rol se contrasta en el navegador después del login de la API.
- `index.html` carga configuración y aplicación; `styles.css` aporta topbar y accesibilidad. Los HTML y diseños de `stitch_decilo` son referencias visuales, no una segunda aplicación desplegada.
- Node/Express/CommonJS, Node 22 en Docker, bcrypt/JWT/pg, pruebas `node --test` y Supertest. Las pruebas de frontend actuales inspeccionan fuentes/build; no prueban interacción real. `test/auth.test.js` trunca `users` y permite caer en la base de desarrollo: se debe aislar antes de ampliar pruebas con claves foráneas.
- Compose tiene PostgreSQL 16 y volumen persistente, API y Nginx. El proxy solo enruta `/api/`. El Dockerfile de API copia explícitamente cuatro módulos; el frontend copia archivos sin ejecutar build y no genera el `config.js` público que sí genera `build-frontend.js` para Render. Debe unificarse el artefacto estático.
- Render ya tiene guía para PostgreSQL, Web Service y Static Site; la última especificación está archivada. `ARCHITECTURE.md` conserva texto anterior que excluye Render, por lo que requerirá actualización acotada en implementación.

## Goals / Non-Goals

**Goals:** consistencia persistida y verificable entre sesiones del mismo usuario, aislamiento por identidad del servidor y entrega inmediata mientras existe conexión. Contratos simples de lectura por HTTP y señales de actualización por Socket.IO.

**Non-Goals:** convertir el dominio local en backend, registrar sesiones/dispositivos como nueva entidad, revocar todas las sesiones, garantizar entrega exactamente una vez del transporte, alertas fuera de DECILO, Redis, múltiples instancias de API o retención automática de notificaciones. No ejecutar cambios de esquema, Docker ni despliegues durante esta planificación.

## Decisions

### 1. Evento real: login de la propia cuenta

Después de verificar credenciales de `POST /api/auth/login`, devolver normalmente 200 con JWT e identidad pública, sin esperar a guardar o emitir el aviso. Ejecutar la creación de una notificación `session.login` como operación secundaria controlada, con título «Se inició sesión en tu cuenta» y texto informativo sin IP, agente de usuario ni datos clínicos. El dueño es el `id` de `users` encontrado por el servidor. La fecha es del servidor. El aviso representa credenciales aceptadas por la API, incluso si el frontend luego detecta una selección de rol incorrecta.

Cada solicitud de login aceptada es un evento distinto. Una reconexión, recarga, restauración `/me`, registro o lectura no genera avisos. El frontend no reintenta automáticamente el POST de login: no se promete deduplicar dos solicitudes HTTP de login independientes. Un UUID interno identifica el evento y permite reintentos internos de persistencia con unicidad.

Programar el trabajo secundario sin esperarlo en el camino de respuesta y controlar tanto errores síncronos al programarlo como rechazos asíncronos al ejecutarlo. La operación secundaria nunca debe modificar la respuesta HTTP ni invalidar el JWT, y ningún fallo de guardado o emisión provoca un 503 en el login. Se conserva `{ token, user }` y las respuestas existentes de credenciales inválidas.

Dentro del trabajo secundario, guardar en transacción y emitir solo después del commit. Ante fallo de escritura, rollback sin actualización de contador ni emisión. Ante fallo de emisión, conservar el aviso persistido para recuperarlo por REST. Registrar fallos con campos permitidos (código de error saneado, etapa e identificador opaco de correlación); no volcar excepciones completas, cuerpos HTTP, cabeceras, SQL con valores, correo, contraseña, hash, token ni credenciales de base. El manejo del error y del log tampoco debe lanzar hacia el flujo de login ni dejar promesas rechazadas sin controlar.

Acotar concurrencia y tiempo de adquisición/conexión/consulta del trabajo secundario para evitar acumular operaciones pendientes o agotar recursos de autenticación; si se supera el límite, descartar el trabajo con registro seguro. Sin cola durable ni garantía de recuperación de trabajos no persistidos en este MVP. Un fallo o reinicio antes del commit puede perder el aviso, sin afectar el login. REST solo recupera el estado confirmado en PostgreSQL. Una sesión abierta recibe en tiempo real el aviso de otro login cuando la operación secundaria persiste y emite correctamente.

Alternativas: bienvenida por registro no permite demostrar fácilmente una creación posterior con pestañas ya conectadas; actividades/comentarios requieren entidades y autorización que el backend no tiene. El login permite iniciar sesión en B y observar un aviso real en A.

### 2. Esquema aditivo y serialización por destinatario

| Tabla | Campos y restricciones propuestas |
| --- | --- |
| `notifications` | `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `event_id UUID NOT NULL`, `type TEXT NOT NULL` limitado inicialmente a `session.login`, `title TEXT NOT NULL`, `body TEXT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`, `read_at TIMESTAMPTZ NULL`; `UNIQUE(user_id, event_id)` |
| `notification_state` | `user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`, `revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0)` |

Índices: listado `(user_id, id DESC)` y parcial `(user_id) WHERE read_at IS NULL`. Identificadores y revisiones BIGINT viajan como strings decimales para evitar pérdida de precisión en JavaScript; comparar revisiones como enteros grandes, nunca lexicográficamente. El contador se devuelve como entero no negativo.

Inicialización transaccional e idempotente desde la infraestructura actual, sin eliminar usuarios. Crear estado de cuentas existentes sin notificaciones históricas; inicializar estado para nuevas cuentas o perezosamente con `ON CONFLICT DO NOTHING`.

Todas las mutaciones adquieren `SELECT ... FOR UPDATE` sobre el estado del usuario en el mismo cliente de `pg` entre BEGIN y COMMIT. Insertar aviso o actualizar `read_at`, incrementar revisión solo ante cambio real y calcular `COUNT(*) WHERE user_id = $1 AND read_at IS NULL` dentro de esa transacción. Liberar conexión en `finally`; nunca mezclar consultas del pool dentro de la transacción. No mantener contador acumulativo separado que pueda desviarse.

Una lectura HTTP devuelve página, contador y revisión del mismo snapshot mediante transacción de solo lectura REPEATABLE READ (o una consulta única equivalente). La revisión sobrevive a reinicios. Las escrituras concurrentes quedan ordenadas por usuario; una lectura repetida mantiene `read_at` original y no aumenta revisión.

Alternativas: marcas de tiempo no ofrecen orden total ante concurrencia; memoria se pierde en redeploy; contador local no puede reconciliar pestañas.

### 3. Contrato HTTP

Todas las rutas usan Bearer JWT, verificación de firma/expiración, `sub` entero positivo válido y usuario existente. Toda consulta y actualización incluye `user_id` derivado de la sesión. Parámetros `userId`, `rol`, destinatario o sala enviados por el cliente no conceden autorización. No habrá ruta pública para crear avisos.

| Método y ruta | Respuesta exitosa |
| --- | --- |
| `GET /api/notifications?limit=20&before=<id>` | `{ notifications: [{ id, type, title, body, createdAt, readAt }], unreadCount, revision, nextCursor }` |
| `GET /api/notifications/unread-count` | `{ unreadCount, revision }` |
| `POST /api/notifications/:id/read` | `{ notification: { ... }, unreadCount, revision }` |
| `POST /api/notifications/read-all` | `{ updatedCount, unreadCount, revision }` |

Listado por `id DESC`, límite predeterminado 20, máximo 100; cursor decimal positivo exclusivo, `nextCursor` nulo al final. En estas rutas de notificaciones, validar identificadores/límites/cursor, devolver 400 con error JSON; 401 por JWT ausente/inválido/vencido o usuario inexistente; 404 uniforme para ID inexistente o ajeno; 503 por dependencia indisponible. Ese 503 corresponde a una consulta o lectura solicitada explícitamente, nunca al fallo del aviso secundario de un login válido. Respuestas privadas con `Cache-Control: no-store`. El contador cubre todos los avisos del usuario, no solo la página.

Lectura general afecta todas las notificaciones no leídas existentes al adquirir el bloqueo del usuario, incluso páginas no cargadas. Una creación que se serializa después permanece no leída; su revisión posterior prevalece aunque las respuestas lleguen en otro orden. Sin operaciones offline en cola ni lectura automática al abrir el panel.

POST para lectura conserva la lista CORS actual GET/POST/OPTIONS. Registrar `read-all` sin colisionar con rutas parametrizadas. El acceso REST seguirá disponible si se interrumpe el socket.

### 4. Socket.IO y ciclo de autenticación

Crear un servidor HTTP compartido con Express y Socket.IO, usando el `PORT` existente. Mantener `createApp` utilizable por Supertest y exponer una fábrica que permita iniciar/cerrar el servidor real con puerto efímero en pruebas. Separar servicio de notificaciones y transporte para no emitir dentro de transacciones.

Usar `socket.io` y `socket.io-client` de una versión compatible fijada en lockfile. Cliente local empaquetado en el build, sin CDN. Path `/socket.io/`, transportes WebSocket y polling. JWT en `handshake.auth.token`, nunca query string; sala interna `user:<id>` elegida exclusivamente tras verificar JWT y usuario. No aceptar eventos de cliente para unirse a salas, elegir destinatario, crear o marcar avisos.

Aplicar lista explícita de orígenes también al handshake/upgrade (`allowRequest`), además de CORS de polling. Un cliente sin Origin puede conectarse con JWT válido para pruebas/herramientas; Origin no sustituye autenticación. Rechazar JWT malformado, firma incorrecta, expiración, `sub` inválido y usuario ausente. Configurar algoritmo esperado HS256 al reutilizar verificación JWT para REST y socket.

Al conectarse: unirse a sala y emitir `notifications:ready`; el cliente inicia entonces snapshot HTTP, con listeners ya instalados. Cada commit efectivo emite a esa sala `notifications:changed` con `{ revision, unreadCount }`; no contiene tokens, emails ni destinatarios ajenos. Es señal para recuperar estado, no instrucción para sumar uno. Comprobar expiración antes de cada emisión al socket y programar desconexión al vencer `exp`; reautenticar cada reconexión, sin recuperación que saltee middleware.

Logout/cambio de cuenta: desconectar socket, eliminar listeners/timers, cancelar HTTP pendiente, aumentar generación de sesión y borrar lista/contador en memoria. Las respuestas de generaciones previas nunca se aplican. Una pestaña nueva inicia sesión por sí misma porque `sessionStorage` no es almacenamiento compartido; sincronizar las que tienen la misma identidad no implica compartir tokens ni cerrar todas las sesiones.

La documentación de Socket.IO indica que el middleware corre una vez por conexión: por eso la expiración posterior requiere control explícito ([middleware](https://socket.io/docs/v4/middlewares/)).

### 5. Consistencia, desconexiones y varias pestañas

Mantener por sesión `appliedRevision`, revisión objetivo máxima y una única reconciliación HTTP en curso. Al recibir señales, cargar un snapshot fresco; si llega otra revisión durante la solicitud, repetir hasta alcanzarla. Un snapshot con revisión menor a la aplicada o a la objetivo no reemplaza estado. Las respuestas de lectura y contador tampoco pueden revertir una revisión mayor; si anuncian una revisión nueva, refrescar listado antes de presentar el conjunto como sincronizado.

Nunca usar `contador++`, `contador--` ni longitud de página como total. Reemplazar desde snapshot aceptado y deduplicar filas por ID persistido. Invalidar páginas cargadas al cambiar revisión y volver a primera página; se permite navegar de nuevo para evitar combinar páginas de snapshots distintos. Una respuesta paginada vieja no debe introducir un `readAt` anterior.

Cargar o restaurar una sesión autenticada dispara una consulta REST sin depender de que Socket.IO esté disponible. Repetir la reconciliación al conectar/reconectar tras ready, al volver a estar visible la pestaña, recuperar conectividad y abrir el panel. Las señales changed también disparan consulta. No incorporar temporizadores de sondeo periódico de notificaciones; el polling de transporte propio de Socket.IO es distinto y sigue permitido. Ante errores de red, mantener último estado rotulado como desactualizado, nunca mostrar cero como si fuera una respuesta exitosa; reintentos de solicitudes fallidas acotados con espera creciente, sin bucle ante 401. Sin JWT válido se requiere nuevo login.

Socket.IO reconecta con backoff y jitter; el frontend conserva un solo socket y un juego de listeners por sesión fuera de `render()`. Renderizar una actualización de campana/panel no reconstruye la frase del comunicador ni roba foco. El protocolo no reenvía operaciones de negocio en la reconexión.

En funcionamiento local saludable y con operación secundaria exitosa, criterio de pruebas: todas las pestañas conectadas convergen dentro de 5 segundos después de login/lectura y después de la señal ready o del disparador de recuperación REST. La carga inicial puede preceder al guardado del aviso secundario; changed provoca otra consulta cuando se confirma. Si se pierde una señal sin desconexión, el aviso persistido se recupera ante el siguiente disparador REST (por ejemplo, volver a estar visible o abrir el panel); no se promete reparación en un intervalo fijo sin ese disparador. Tampoco se promete ese plazo con pestaña suspendida o red caída, ni recuperar por REST un aviso que nunca se guardó.

Socket.IO no persiste automáticamente eventos perdidos: el diseño usa recuperación HTTP y revisiones durables, no un supuesto de entrega exactamente una vez ([garantías de entrega](https://socket.io/docs/v4/delivery-guarantees/)).

### 6. Interfaz y pruebas

Campana común a profesional/paciente/familiar, con nombre accesible que incluya contador exacto. Panel con título, mensaje, fecha, estado leído/no leído, cargar más, lectura individual y general, carga/vacío/error/reintentar y estado de conexión. Abrir no marca leído. Controles de teclado, foco visible, Escape para cerrar y retorno de foco a campana; anuncio moderado en región viva sin repetir cada evento duplicado. Texto renderizado escapado o por `textContent`; sin HTML remoto. No persistir avisos ni contador en `localStorage`.

Mantener node:test y Supertest; sumar integración Socket.IO con cliente real y PostgreSQL aislado. Pruebas de navegador con Playwright como dependencia de desarrollo, comando separado y fixture contra stack de pruebas. Cubrir dos pestañas de A y una de B, tres roles, JWT vencido conectado, lecturas concurrentes con nuevo login, snapshots retrasados, cambio de identidad, reinicio, evento duplicado, señal perdida, paginación y contenido escapado. Inyectar retrasos/fallos con fixtures de prueba, sin endpoints públicos de simulación.

Antes de truncar, exigir base de pruebas explícita distinta de desarrollo/producción; adaptar limpieza por claves foráneas y aislar suites mediante base/esquema por suite o ejecución serial documentada. Los asserts de regex existentes no sustituyen estas pruebas. Usar esperas por eventos y condiciones con timeout; cerrar sockets, servidor y pool al terminar.

### 7. Compose y preparación Render

Generar el mismo `dist` público para ambos entornos: incluir cliente Socket.IO y cualquier módulo frontend nuevo; configuración local con URL vacía para mismo origen y `API_PUBLIC_URL` HTTPS para Render. Dockerfile frontend multietapa Node build + Nginx copia `dist`; Dockerfile API incorpora nuevos módulos. El test de build debe actualizar su allowlist, comprobar orden de scripts, ausencia de secretos y que el recurso de cliente devuelva JavaScript real (no fallback HTML).

Agregar location `/socket.io/` en Nginx con proxy HTTP/1.1, headers Upgrade/Connection y timeout mayor que heartbeat; conservar `/api/`. Pasar el origen frontend configurado en Compose si cambia el puerto. Probar polling y upgrade por el puerto público del frontend, no solo contra API interna. Mantener healthchecks y volúmenes.

Render usa el mismo Web Service para HTTP y WebSocket en `PORT`; Static Site conecta al origen de `API_PUBLIC_URL` por HTTPS/WSS. Mantener `DATABASE_URL`, `JWT_SECRET` privados y `FRONTEND_PUBLIC_URL` explícito. Preparar despliegue de una sola instancia/proceso de API, sin adapter distribuido. Reconectar y consultar PostgreSQL después de reinicio/redeploy. La documentación oficial describe WebSockets en Web Services y reconexión ante interrupciones ([Render WebSockets](https://render.com/docs/websocket)). No se crea ni se publica ningún servicio en esta etapa.

## Risks / Trade-offs

- Fallo del trabajo secundario o reinicio antes de guardar → el login mantiene 200 y JWT válido; log saneado, errores capturados y recursos acotados. Se acepta perder avisos no persistidos; no se presentan como un registro de auditoría infalible.
- Avisos en cada login pueden producir ruido → texto breve sin toast invasivo, paginación; retención automática queda fuera de alcance.
- Commit y emisión no son atómicos → recuperar por REST al cargar sesión, conectar/reconectar, volver a estar visible, recuperar conectividad o abrir panel. Una señal perdida puede dejar la vista antigua hasta el siguiente disparador; sin sondeo periódico ni outbox.
- Adaptador en memoria no distribuye eventos entre procesos → limitar a una instancia; no declarar soporte horizontal. El escalado requerirá otro cambio.
- JWT no se revoca al cerrar una pestaña → respetar comportamiento actual, detener ese cliente y aplicar expiración en servidor; no prometer logout global.
- Render/reinicio/pestañas suspendidas pueden interrumpir transporte → conservar datos en PostgreSQL y señalizar estado desactualizado hasta reconciliar.
- Pruebas existentes pueden truncar desarrollo → aislamiento explícito obligatorio antes de pruebas destructivas, sin usar la base operativa.

## Migration Plan

1. Implementar esquema aditivo e inicialización idempotente; verificar contra PostgreSQL vacío y con cuentas anteriores, sin backfill de avisos inventados.
2. Implementar servicio, endpoints y transporte; desplegar en futuro backend compatible antes del frontend. Conservar contratos de autenticación y salud.
3. Construir frontend y validar automatización en stack Compose aislado. Ejecutar `docker compose up --build -d`, comprobar salud, flujo A/B, proxy y persistencia tras reiniciar API y PostgreSQL sin borrar volúmenes. Documentar comandos exactos del stack de pruebas y evidencias.
4. Actualizar `ARCHITECTURE.md`, `DEPLOY_RENDER.md` y ejemplos públicos sin secretos: variables, una instancia, comandos, WSS y checklist de reconexión/persistencia. La publicación real y verificación pública quedan para una solicitud posterior.
5. Rollback de aplicación: volver a artefactos previos de API/frontend conservando las tablas nuevas y sus datos. No usar DROP, recrear `users`, borrar volúmenes ni `down -v` para revertir.
