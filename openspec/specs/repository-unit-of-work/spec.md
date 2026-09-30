# repository-unit-of-work Specification

## Purpose
Separar el acceso a PostgreSQL mediante repositorios con ejecutor inyectado y coordinar las operaciones relacionadas mediante una unidad de trabajo con una única conexión. Garantizar atomicidad, liberación de recursos y publicación posterior al commit, conservando los contratos públicos de autenticación y notificaciones de DECILO.

## Requirements

### Requirement: Repositorios independientes del transporte
El sistema MUST encapsular las consultas de usuarios y notificaciones en repositorios parametrizados con un ejecutor inyectado. Rutas y servicios MUST NOT ejecutar el SQL migrado. Validación, JWT, reglas de negocio y DTO públicos MUST permanecer fuera de los repositorios. DDL e inicialización siguen siendo infraestructura de db.js; salud usa un adaptador dedicado.

#### Scenario: Autenticación mediante repositorio
- **WHEN** se registra, autentica o recupera un usuario
- **THEN** las consultas pasan por el repositorio y se conservan hash, normalización, errores, JWT y representación pública sin password_hash

#### Scenario: Ejecutor transaccional inyectado
- **WHEN** un servicio construye repositorios con el cliente de una unidad activa
- **THEN** todas sus consultas usan ese cliente sin adquirir ni liberar conexiones propias y sin recurrir al pool

#### Scenario: Responsabilidad transaccional única
- **WHEN** una operación migrada usa repositorios
- **THEN** solo el UoW ejecuta pool.connect(), BEGIN, COMMIT, ROLLBACK y release; los repositorios no deciden reglas de negocio ni controlan la transacción

### Requirement: Una conexión por unidad de trabajo
La unidad de trabajo MUST adquirir un único cliente, ejecutar BEGIN, consultas y COMMIT en ese cliente y resolver solo después del COMMIT. MUST conservar REPEATABLE READ READ ONLY para snapshots y los límites locales de consultas y bloqueos de notificaciones. MUST NOT introducir transacciones anidadas ni reintentos automáticos.

#### Scenario: Confirmación completa
- **WHEN** el callback termina correctamente y COMMIT se confirma
- **THEN** todas las escrituras son visibles desde otra conexión y la unidad devuelve el resultado tras liberar su cliente exactamente una vez

#### Scenario: Lectura consistente
- **WHEN** se consulta listado o resumen durante escrituras concurrentes
- **THEN** las consultas usan el mismo cliente y snapshot REPEATABLE READ READ ONLY, conservando contador y revisión coherentes

#### Scenario: Unidades concurrentes
- **WHEN** se ejecutan dos unidades en paralelo
- **THEN** cada una conserva su propio cliente y no comparte repositorios ligados a la transacción de la otra

### Requirement: Reversión y liberación en todos los caminos
La unidad MUST intentar ROLLBACK ante errores después de adquirir el cliente y MUST liberarlo exactamente una vez en finally. MUST preservar el error original si falla ROLLBACK y descartar conexiones cuyo estado no sea seguro. Un fallo de adquisición MUST NOT ejecutar callback ni liberar un cliente inexistente.

#### Scenario: Error después de una escritura
- **WHEN** una operación posterior falla antes de COMMIT
- **THEN** ROLLBACK revierte las escrituras de esa unidad, el resultado es rechazo y el pool vuelve a admitir operaciones

#### Scenario: Fallos del ciclo transaccional
- **WHEN** falla BEGIN, la configuración local, el callback, COMMIT o ROLLBACK
- **THEN** se intenta la limpieza correspondiente, se mantiene el error original y se libera o descarta el cliente adquirido una sola vez

#### Scenario: Adquisición rechazada
- **WHEN** pool.connect rechaza
- **THEN** se propaga el fallo sin consultas, callback ni release

#### Scenario: Confirmación de resultado incierto
- **WHEN** se pierde la respuesta a COMMIT
- **THEN** la unidad rechaza, descarta la conexión y no emite éxito ni reintenta automáticamente, sin afirmar que un eventual commit aplicado haya sido revertido

### Requirement: Atomicidad del aviso y su revisión
La creación secundaria de un aviso de login MUST coordinar estado perezoso, bloqueo por usuario, inserción de aviso y aumento condicional de revisión en una sola unidad. MUST conservar deduplicación por usuario/evento, datos previos y snapshots; MUST NOT modificar el esquema público.

#### Scenario: Nuevo aviso confirmado
- **WHEN** se procesa un evento nuevo para un usuario existente
- **THEN** aviso y revisión se confirman juntos y contador y DTO conservan sus contratos actuales

#### Scenario: Fallo de incremento con estado nuevo o existente
- **WHEN** falla el aumento de revisión después de insertar el aviso
- **THEN** no queda el aviso ni el estado creado por esa unidad y, si había estado previo, conserva su revisión y notificaciones anteriores

#### Scenario: Evento duplicado
- **WHEN** se repite el mismo evento para la misma cuenta
- **THEN** no se duplica el aviso ni aumenta la revisión y no se publica un cambio inexistente

#### Scenario: Otras mutaciones concurrentes
- **WHEN** se marcan avisos leídos al mismo tiempo que se crean otros
- **THEN** se conserva la serialización por usuario, la primera fecha de lectura y el incremento de revisión solo ante cambios efectivos

### Requirement: Compatibilidad pública y efectos posteriores al commit
El cambio MUST conservar rutas, respuestas y códigos HTTP, JWT, roles, CORS, no-store de notificaciones, filtros por identidad y eventos Socket.IO. El login MUST permanecer independiente del aviso secundario y notifications:changed MUST emitirse solo después de COMMIT. notifications:ready conserva su comportamiento de conexión independiente. MUST conservar pools separados y trabajo secundario acotado.

#### Scenario: Commit pendiente
- **WHEN** una barrera de prueba mantiene pendiente la promesa de COMMIT
- **THEN** no se llama publish; solo la confirmación habilita notifications:changed y el rechazo no habilita publicación

#### Scenario: Notificación rechazada después de login válido
- **WHEN** la persistencia secundaria falla
- **THEN** el login y JWT siguen válidos y no se emite actualización de una transacción rechazada

#### Scenario: Publicación fallida después de commit
- **WHEN** Socket.IO falla después de confirmar la unidad
- **THEN** los datos permanecen confirmados y recuperables mediante REST sin intentar revertirlos

#### Scenario: Identidad y contratos conservados
- **WHEN** las suites ejercitan los tres roles, JWT inválidos, acceso cruzado y datos BIGINT
- **THEN** se conservan respuestas, permisos y precisión anteriores sin nuevas rutas ni campos públicos

### Requirement: Regresiones y pruebas aisladas
La implementación MUST conservar las 73 pruebas generales de referencia y añadir cobertura de repositorios, commit, rollback y liberación. Las pruebas PostgreSQL MUST usar el runner temporal con guard de propiedad. MUST comprobar distribución API sin publicar persistencia en el bundle frontend.

#### Scenario: Verificación de atomicidad real
- **WHEN** se inyecta un fallo en la segunda escritura en PostgreSQL temporal
- **THEN** otra conexión verifica ausencia de cambios parciales y una nueva operación con pool acotado confirma que no hay fuga

#### Scenario: Regresiones de distribución y navegador
- **WHEN** se valida la implementación completa
- **THEN** pasan las 73 regresiones más pruebas nuevas, build frontend, las 32 pruebas Playwright existentes mediante runner aislado y la comprobación de módulos necesarios para arrancar la API empaquetada

### Requirement: Migración incremental acotada
La implementación MUST migrar las operaciones inventariadas por pasos verificables sin reescritura general de SQL. MUST conservar infraestructura DDL y dominios ajenos, sin superponer helper transaccional anterior y UoW en una misma operación.

#### Scenario: Convivencia durante la migración
- **WHEN** una operación pasa al UoW mientras otras aún usan el helper anterior
- **THEN** cada operación conserva un solo responsable de conexión y transacción y sus regresiones; el helper se retira cuando deja de tener consumidores
