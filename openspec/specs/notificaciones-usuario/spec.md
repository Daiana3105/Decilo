# notificaciones-usuario Specification

## Purpose
Permitir que cada persona autenticada consulte y gestione sus propios avisos persistentes de DECILO mediante una interfaz accesible y un estado verificable en PostgreSQL.

## Requirements

### Requirement: Persistencia personal de notificaciones

El sistema MUST guardar las notificaciones en PostgreSQL con identificador estable, usuario destinatario existente, identificador de evento, tipo, título, mensaje, fecha del servidor y fecha de lectura inicialmente nula. MUST impedir duplicar el mismo evento para un destinatario y MUST conservar las notificaciones confirmadas y lecturas después de reinicios. La creación por login MUST ser secundaria y su fallo MUST NOT afectar la autenticación; solo los avisos confirmados forman parte del listado y contador. Las cuentas existentes MUST iniciar sin avisos históricos inventados. La retención automática queda fuera del alcance: el sistema MUST NOT eliminar notificaciones por antigüedad ni por haber sido leídas en este cambio.

#### Scenario: Evento persistido
- **WHEN** la operación secundaria de un nuevo inicio de sesión confirma la escritura de su aviso
- **THEN** existe una notificación no leída de esa cuenta con ID estable y fecha del servidor antes de emitir la actualización, sin que el login haya esperado esa escritura

#### Scenario: Sin retención automática
- **WHEN** una notificación persiste durante un período prolongado o se marca como leída
- **THEN** permanece consultable y no se elimina automáticamente por su edad o estado de lectura

#### Scenario: Reintento interno del mismo evento
- **WHEN** se intenta persistir nuevamente el mismo identificador de evento para el mismo usuario
- **THEN** se conserva una sola notificación y no se incrementa nuevamente la revisión ni la cantidad de no leídas

#### Scenario: Inicialización y reinicio
- **WHEN** la API inicializa una base con cuentas existentes o se reinicia sobre un esquema ya preparado
- **THEN** conserva las cuentas, notificaciones, revisiones y fechas de lectura, sin duplicar esquema ni crear avisos retroactivos

### Requirement: Aislamiento de consultas y operaciones

El sistema MUST autenticar todas las operaciones de notificaciones mediante JWT vigente y usuario existente, y MUST derivar el destinatario exclusivamente de esa identidad. MUST limitar toda consulta y mutación a ese usuario para los tres roles. MUST usar SQL parametrizado y respuestas privadas sin caché compartida, sin exponer secretos o información de otras cuentas.

#### Scenario: Acceso no autenticado
- **WHEN** se consulta el listado, contador o se marca leído sin JWT, con firma inválida, token vencido, subject inválido o usuario inexistente
- **THEN** la API responde 401 sin devolver ni modificar notificaciones

#### Scenario: Acceso cruzado
- **WHEN** A intenta marcar un ID de B o enviar un destinatario o rol de B en la solicitud
- **THEN** no modifica ni obtiene datos de B y un ID ajeno produce el mismo 404 que un ID inexistente

#### Scenario: Cuenta sin relaciones clínicas
- **WHEN** una cuenta profesional, paciente o familiar sin relaciones persistidas consulta sus notificaciones
- **THEN** accede a su propio estado sin depender de los vínculos de demostración del navegador

### Requirement: Listado paginado y contador global coherente

El sistema MUST ofrecer `GET /api/notifications` con orden descendente por ID, límite predeterminado 20 y máximo 100, cursor exclusivo `before` y `nextCursor`. MUST devolver `notifications`, `unreadCount` global y `revision` del mismo snapshot. MUST ofrecer `GET /api/notifications/unread-count` con cantidad y revisión coherentes. IDs y revisiones MUST representarse sin pérdida de precisión; entradas inválidas MUST producir 400 JSON.

#### Scenario: Páginas con avisos no leídos fuera de la primera
- **WHEN** una cuenta con más de 20 avisos consulta la primera página y después su siguiente cursor
- **THEN** obtiene páginas ordenadas sin repetir IDs en estado estable y un contador que incluye todos sus avisos no leídos, incluso los no cargados

#### Scenario: Cuenta sin avisos
- **WHEN** una cuenta sin notificaciones consulta listado y contador
- **THEN** recibe lista vacía, `nextCursor` nulo, contador cero y revisión válida

#### Scenario: Parámetros inválidos
- **WHEN** se envía un ID o cursor no positivo o no decimal, o un límite fuera del intervalo 1 a 100
- **THEN** se responde 400 con error legible y no se ejecuta una operación sobre otro usuario

#### Scenario: Lectura durante una escritura
- **WHEN** se consulta el listado mientras se crea o marca una notificación
- **THEN** página, contador y revisión describen un mismo estado confirmado y el contador nunca es negativo

### Requirement: Lectura individual y general idempotente

El sistema MUST permitir `POST /api/notifications/:id/read` y `POST /api/notifications/read-all`. MUST conservar la fecha de primera lectura y responder con contador y revisión del servidor después de la operación. La lectura general MUST cubrir todas las no leídas existentes al serializar la operación, incluyendo páginas no cargadas; las creaciones posteriores MUST permanecer no leídas. Solo cambios efectivos MUST aumentar la revisión.

#### Scenario: Lectura repetida
- **WHEN** dos pestañas marcan la misma notificación propia y repiten la solicitud
- **THEN** se registra una única transición a leído, se conserva `readAt` y ambas reciben estado confirmado sin restar dos veces

#### Scenario: Lectura general repetida
- **WHEN** se marcan todas con avisos en varias páginas y se repite sin nuevas creaciones
- **THEN** la primera operación marca todas las pendientes y la segunda informa cero cambios, con contador cero y sin alterar fechas anteriores

#### Scenario: Nueva notificación concurrente
- **WHEN** la creación secundaria del aviso de un login se serializa después de una lectura general
- **THEN** su aviso permanece no leído y su revisión posterior permite a todas las pestañas mostrar el contador correcto

### Requirement: Campana y panel accesibles

El frontend MUST mostrar una campana con contador del servidor a los tres roles autenticados y permitir abrir un panel con título, mensaje, fecha y estado leído de cada aviso, cargar más, marcar uno y marcar todos. MUST diferenciar carga, vacío, error, desconexión y estado desactualizado; MUST ofrecer reintento y no convertir errores en contador cero. MUST admitir teclado, foco visible, cierre con Escape, retorno de foco y nombres accesibles. MUST escapar contenido y mantener el estado de notificaciones separado de los datos locales del MVP.

#### Scenario: Apertura del panel
- **WHEN** una persona activa la campana con teclado
- **THEN** puede consultar avisos y acciones con foco accesible; abrir no marca automáticamente como leído y cerrar devuelve el foco a la campana

#### Scenario: Lectura desde la interfaz
- **WHEN** la persona marca uno o todos y el servidor confirma
- **THEN** el panel y contador muestran estado confirmado sin incrementos ni decrementos calculados por el navegador

#### Scenario: Fallo de red o dependencia
- **WHEN** falla una carga o una lectura por red o PostgreSQL indisponible
- **THEN** se informa el error, se conserva el último estado identificado como desactualizado y se permite reintentar sin simular una lectura exitosa

#### Scenario: Texto y comunicador protegidos
- **WHEN** llega contenido con caracteres HTML o una actualización mientras se construye una frase
- **THEN** se muestra texto sin ejecutar HTML y se conserva la frase y el foco de la tarea activa sin reconstruir toda la vista

#### Scenario: Cierre o cambio de cuenta
- **WHEN** la persona cierra sesión o inicia otra cuenta en esa pestaña
- **THEN** se eliminan lista y contador anteriores y ninguna respuesta pendiente de la cuenta previa aparece en la nueva sesión
