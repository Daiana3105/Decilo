## Context

Plan del issue [#17](https://github.com/Daiana3105/Decilo/issues/17). Inspección realizada sobre `feature/17-repository-unit-of-work`, inicialmente limpia. Node.js CommonJS, Express 5 y `pg`; sin ORM.

| Ubicación actual | Acceso y responsabilidad |
| --- | --- |
| `db.js` | Crea pools y esquema; usa un cliente, BEGIN, advisory lock, DDL idempotente, backfill de estado, COMMIT/ROLLBACK y finally/release. Mantiene `publicUser`. |
| `auth.js` | SELECT por ID para JWT, INSERT de usuario; normalización, bcrypt, firma y validación fuera de SQL. |
| `server.js` | SELECT de usuario por email y SELECT 1 del healthcheck; traducción a HTTP y composición de dependencias. |
| `notifications.js` | SQL de avisos/estado, validación, serialización FOR UPDATE, incremento de revisión, resumen y transacción en el mismo módulo. |
| `login-notifications.js` | Trabajo secundario acotado; publica después de persistir, sanea errores y no invalida el login. |
| `realtime.js` | Reutiliza authenticateToken; salas y eventos privados, sin SQL propio. |

Las mutaciones de notificaciones ya son atómicas: BEGIN, timeouts locales, estado perezoso, bloqueo de usuario, operación, revisión condicional, resumen y COMMIT. Las lecturas usan `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`. No se presentará esta refactorización como reparación de una falta de atomicidad existente.

`createServer` conserva dos pools: principal y secundario de hasta dos conexiones; este último evita que los avisos bloqueen la autenticación. Los datos de actividades/pacientes del MVP están en el navegador y no son candidatos PostgreSQL para este ejercicio.

## Goals / Non-Goals

Separar SQL de reglas, reutilizar el control de transacciones y demostrar la propiedad de una conexión por operación. Mantener rutas, payloads, estados HTTP, errores, JWT, roles, CORS, no-store de notificaciones, BIGINT como string y eventos existentes. No cambiar tablas, columnas, índices, restricciones ni inicialización. No incluir nuevas funcionalidades o dependencias.

## Decisions

### Repositorios concretos con inyección explícita

Proponer módulos CommonJS en `repositories/`:

- `user-repository.js`: `findById`, `findByEmail` e `insert` (recibe hash ya calculado); filas internas sin publicar hashes en HTTP.
- `notification-repository.js`: `insert({ userId, eventId, type, title, body })`, `listBefore(userId, { before, limit })`, `findOwnedById(userId, id)`, `markRead(userId, id)` y `markAllRead(userId)`; limitan el acceso al usuario y conservan rowCount. El servicio elige tipo, título y cuerpo del aviso, solicita limit + 1 para paginar y decide changed; el repositorio no define esas reglas.
- `notification-state-repository.js`: `ensure`, `lock`, `increment`, `summary`; summary conserva consulta única de revisión y COUNT del estado actual.
- `database-health.js`: adaptador mínimo `check` para SELECT 1, sin convertir salud en un repositorio de dominio artificial.

Cada factory recibe un ejecutor `{ query }` y no adquiere, confirma, revierte, libera ni cierra conexiones. No hay repositorio global mutable ni pool oculto como fallback. SQL parametrizado; nombres de tablas estáticos. Los servicios conservan validación, decisiones `changed`, DTO públicos y errores de negocio. El usuario destino procede de la identidad ya validada, nunca del cuerpo HTTP.

Conservar las firmas consumidas por las pruebas (`createApp`, `createServer`, `registerUser`, `authenticateToken`, `createNotificationService`); las factories internas permiten inyección para pruebas sin alterar rutas ni requerir reescribir las 73 regresiones. Construir adaptadores sin consultas ni `connect` anticipados para admitir los dobles actuales de salud. `db.js` mantiene DDL, pools y exportaciones existentes; sus consultas de infraestructura son una excepción explícita a la extracción de SQL de negocio.

### Unit of Work genérico y limitado

Proponer `unit-of-work.js`: factory sobre un pool y método `run(operation, options)`; opciones internas cerradas para lectura/escritura y timeouts, nunca texto SQL proveniente de HTTP. El callback recibe el cliente transaccional y el servicio construye sobre él todos sus repositorios. No contiene conocimiento de usuarios, revisiones o publicación.

1. Adquirir una sola vez con `pool.connect()`. Si falla, propagar sin callback ni release de un cliente inexistente.
2. En try/finally, ejecutar BEGIN en ese cliente; en lecturas usar REPEATABLE READ READ ONLY. Conservar en notificaciones `SET LOCAL statement_timeout = '5s'` y `lock_timeout = '2s'`, incluidos pools inyectados.
3. Esperar todas las operaciones del callback sobre ese mismo cliente; nunca `pool.query` dentro de la unidad ni tareas SQL sin await. No exponer ni reutilizar repositorios después de finalizar el callback.
4. Esperar COMMIT antes de resolver el resultado. No permitir publicación dentro del callback.
5. Ante error tras adquirir, intentar ROLLBACK en ese mismo cliente y rechazar con el error original. Un error de rollback no debe ocultarlo. Descartar con `release(true)` cuando falle BEGIN, COMMIT o ROLLBACK, o la conexión sea inválida; en error de negocio con rollback exitoso devolver el cliente sano normalmente.
6. Un único finally efectúa exactamente un release por cliente adquirido, también si fallan configuración, callback, COMMIT o ROLLBACK. No cerrar el pool por operación; la propiedad de los pools sigue en `createServer`.

El UoW es el único responsable de BEGIN, COMMIT, ROLLBACK y client.release() en cada flujo migrado. La transacción DDL de db.js sigue independiente, sin participar ni anidarse en el UoW. No soportar anidamiento ni savepoints: es un contrato de uso que se revisará, no una garantía de aislamiento de closures de JavaScript. No agregar reintentos implícitos. Si se pierde la respuesta a COMMIT, el resultado puede ser incierto: no prometer rollback de un commit ya aplicado, no emitir éxito ni repetir automáticamente; conservar idempotencia por eventId y reconciliación REST.

### Migración incremental

Primero migrar usuarios y salud con sus regresiones; después crear y probar el UoW; luego migrar createLogin y, una por una, las restantes operaciones de notificaciones. Durante la transición el helper antiguo solo sirve operaciones aún no migradas: nunca envolver el UoW en él ni duplicar BEGIN/release. Retirarlo cuando no tenga consumidores. Comprobar cada paso y ejecutar la suite completa al finalizar.

No reescribir DDL/backfill, fixtures, runner, consultas educativas ni dominios fuera del inventario. Ningún paso autoriza commit automático, merge, despliegue o archivo OpenSpec.

La prueba de publicación mantendrá pendiente COMMIT mediante una barrera controlada: cero llamadas a publish antes de resolverla, publicación tras confirmar y ninguna ante rechazo. Esto se aplica a notifications:changed; notifications:ready es un evento de conexión preexistente y conserva su comportamiento independiente.

### Flujo elegido: aviso de login más revisión

El login HTTP conserva su respuesta y luego agenda el aviso en el pool secundario. `createLogin(userId, eventId)` ejecuta en una única unidad:

1. Crear `notification_state` si no existe y bloquear su fila con FOR UPDATE.
2. Insertar `notifications` con ON CONFLICT por `(user_id, event_id)` y el mismo contenido actual.
3. Si rowCount indica inserción, incrementar `notification_state.revision`; si es duplicado, no incrementar.
4. Leer contador y revisión dentro de la misma transacción, confirmar y devolver el DTO actual.
5. El trabajo secundario publica solo si la unidad confirmó y `changed` es verdadero.

Un fallo entre la inserción y el aumento de revisión revierte aviso y estado recién creado; con estado existente conserva revisión y datos previos. No esperar IDs consecutivos: las secuencias pueden avanzar tras rollback. Las lecturas y las otras mutaciones migran al mismo UoW conservando el bloqueo, snapshots, primera fecha de lectura y contador. No unir autenticación y aviso: haría depender el JWT de una operación secundaria, violando el contrato actual.

### Distribución e integración

`Dockerfile.api` copia actualmente una lista cerrada de archivos: la implementación deberá incluir `unit-of-work.js` y `repositories/` sin copiar secretos. Conservar allowlist de frontend; ningún repositorio ni SQL debe llegar a dist. No modificar Compose, servicios Render ni volúmenes operativos. La documentación futura describirá capas y excepciones de infraestructura.

## Risks / Trade-offs

- Liberación temprana, pool.query accidental o emisión previa al COMMIT: cubrir identidad de cliente y orden con dobles instrumentados y PostgreSQL real.
- Pérdida de serialización/snapshot al extraer consultas: conservar orden FOR UPDATE, opciones y pruebas concurrentes existentes.
- Reutilización de conexión dañada: descarte explícito y prueba de capacidad recuperada del pool.
- Sobreabstracción: factories pequeñas específicas; sin repositorio genérico CRUD, contenedor DI ni nueva jerarquía de servicios.
- Errores de persistencia: mantener códigos SQL internos necesarios (por ejemplo 23505), mapeos HTTP y logs saneados de notificaciones. No registrar parámetros, credenciales o errores completos nuevos.

## Validation and implementation sequence

Evidencia previa: 73 pruebas generales y 32 Playwright documentadas; esta planificación no afirma reejecutarlas. `test/notifications.test.js` ya fuerza rollback por trigger sobre revisión; `test/realtime.test.js` comprueba ausencia de emisión y validez del login; `test/login-notifications.test.js` verifica trabajo secundario y orden. Conservarlas sin eliminar ni debilitar aserciones.

Agregar pruebas unitarias de UoW (éxito, fallo connect/BEGIN/SET LOCAL/callback/COMMIT/ROLLBACK, release exactamente una vez, aislamiento entre ejecuciones) y repositorios (SQL parametrizado, ejecutor inyectado, límites de usuario). Integración real: commit visible desde otra conexión, fallo en segunda escritura con estado nuevo y previo, deduplicación/concurrencia y adquisición posterior con pool de max 1 y timeout para detectar fugas. Verificar ausencia de efectos Socket.IO antes del commit y ante rollback; emisión fallida posterior no deshace datos confirmados.

Usar exclusivamente el runner y `isolatedDatabase` con guard de propiedad, no la base local de desarrollo. Triggers de fallo solo en esquema temporal y retirados en finally. Ejecutar secuencialmente npm.cmd test (73 existentes más nuevas), npm.cmd run build:frontend y npm.cmd run test:frontend (32 regresiones existentes); no invocar Playwright directamente sin base aislada. Verificar empaquetado API y arranque en entorno aislado, sin despliegue. Validar el cambio y todo OpenSpec con --strict y git diff --check. Sin migración de datos; revertir la implementación futura sería revertir archivos, no borrar tablas.

## Open Questions

Ninguna decisión de producto bloqueante: flujo y límites definidos por los contratos actuales. Cualquier ampliación a otros dominios o cambio de contrato requerirá otra autorización. Los pendientes móviles/públicos de la PWA no forman parte del issue #17.
