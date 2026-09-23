# notificaciones-tiempo-real Specification

## Purpose
Mantener sincronizados los avisos personales y sus lecturas entre pestañas autenticadas, recuperando el estado persistente después de interrupciones sin duplicados ni filtraciones entre usuarios.

## Requirements

### Requirement: Conexión en tiempo real autenticada y privada

El servidor MUST validar JWT, expiración, subject y existencia del usuario antes de habilitar su canal personal. MUST obtener el token como credencial de conexión, sin incluirlo en la URL, y MUST rechazar orígenes de navegador no autorizados también en el upgrade. El cliente MUST NOT poder elegir otra sala o destinatario, crear notificaciones ni cambiar lecturas mediante mensajes de transporte.

#### Scenario: Conexiones de varias cuentas
- **WHEN** dos pestañas de A y una de B se conectan con credenciales válidas
- **THEN** las actualizaciones de A llegan únicamente a sus dos conexiones y B no obtiene sus avisos, contador ni revisión

#### Scenario: Conexión inválida
- **WHEN** se conecta sin JWT, con firma inválida, token vencido, subject inválido o usuario inexistente
- **THEN** se rechaza la conexión autenticada sin habilitar recepción de notificaciones

#### Scenario: Intento de elegir sala
- **WHEN** un cliente autenticado envía otro userId, rol o un mensaje para unirse al canal de B
- **THEN** no obtiene suscripciones ni información adicional y no cambia estado persistido

#### Scenario: Origen arbitrario
- **WHEN** un navegador intenta conectar desde un origen ajeno a la lista autorizada mediante polling o WebSocket
- **THEN** el servidor rechaza el acceso en ambos transportes aunque el cliente suministre JWT

### Requirement: Vigencia de sesión durante la conexión

El servidor MUST dejar de entregar avisos al expirar el JWT de una conexión y MUST volver a autenticar cada reconexión. El frontend MUST cerrar transporte y limpiar listeners, temporizadores y operaciones pendientes al cerrar o reemplazar sesión. MUST evitar reconectar indefinidamente con credenciales rechazadas.

#### Scenario: Expiración con conexión abierta
- **WHEN** vence el JWT mientras permanece conectado el cliente
- **THEN** se cierra su acceso autenticado, no recibe actualizaciones posteriores y necesita iniciar sesión de nuevo

#### Scenario: Recarga o cierre de sesión
- **WHEN** la aplicación restaura una sesión válida o la persona cierra sesión
- **THEN** la restauración crea como máximo una conexión por pestaña y el cierre no deja conexiones ni callbacks de la sesión anterior

### Requirement: Actualizaciones posteriores a persistencia

El sistema MUST señalar las creaciones y cambios efectivos de lectura solo después de confirmar PostgreSQL, a todas las conexiones del destinatario incluyendo la que originó la operación. MUST incluir una revisión durable y contador calculado por el servidor. En el entorno local saludable, con operación secundaria exitosa y pestañas activas, todas MUST converger al estado confirmado dentro de 5 segundos después del login o lectura. La emisión secundaria MUST NOT condicionar la respuesta ni la validez del login.

#### Scenario: Login en otra pestaña
- **WHEN** A ya está conectado en una pestaña, completa un login desde otra y la creación y emisión secundarias terminan correctamente
- **THEN** ambas muestran el nuevo aviso persistido y el mismo contador sin recarga manual; B no recibe actualización

#### Scenario: Lectura sincronizada
- **WHEN** una pestaña marca uno o todos los avisos y PostgreSQL confirma cambios
- **THEN** todas las pestañas activas de esa cuenta actualizan sus lecturas y contador desde el estado del servidor

#### Scenario: Fallo antes de confirmar
- **WHEN** falla la transacción que debía crear o marcar una notificación
- **THEN** no se emite actualización de notificaciones ni se expone contador correspondiente a datos no confirmados; si era el aviso secundario de un login, ese login mantiene su respuesta exitosa y el fallo se registra de forma segura

### Requirement: Recuperación y deduplicación

El frontend MUST consultar por REST el estado real persistido al cargar o restaurar la sesión autenticada, sin depender de la disponibilidad del socket, al conectar o reconectar su canal y cuando la pestaña vuelve a estar visible. MUST también reconciliar ante señales de cambio, recuperación de conectividad y apertura del panel. MUST NOT usar sondeo periódico de notificaciones; los reintentos acotados de una solicitud fallida y el polling de transporte de Socket.IO no constituyen ese sondeo. MUST deduplicar por ID, ignorar revisiones antiguas y respuestas de sesiones previas, y no modificar el contador con aritmética local. El servidor MUST conservar revisiones entre reinicios y la reconexión MUST NOT generar avisos de login. REST MUST recuperar únicamente datos confirmados, sin reconstruir avisos cuya escritura falló.

#### Scenario: Carga de sesión sin transporte disponible
- **WHEN** se carga o restaura una sesión válida y Socket.IO todavía no conecta
- **THEN** el frontend consulta lista y contador por REST sin esperar el transporte, y vuelve a consultar cuando el canal esté listo

#### Scenario: Retorno a pestaña visible
- **WHEN** la pestaña vuelve a estar visible después de cambios persistidos en otra sesión
- **THEN** consulta por REST y actualiza lista, lecturas y contador reales sin requerir una nueva señal ni sondeo periódico

#### Scenario: Sesión estable sin cambios
- **WHEN** la sesión permanece visible y conectada sin señales, acciones ni solicitudes fallidas pendientes
- **THEN** no se programan consultas REST periódicas para actualizar las notificaciones

#### Scenario: Actualizaciones durante desconexión
- **WHEN** una pestaña se desconecta, otra crea o lee avisos y la primera reconecta con JWT válido
- **THEN** recupera lecturas, lista y contador confirmados dentro de 5 segundos desde canal listo en el entorno local saludable, sin duplicar filas ni crear avisos por reconexión

#### Scenario: Evento repetido y snapshot atrasado
- **WHEN** se recibe dos veces una señal o llega un snapshot de revisión menor después de uno nuevo
- **THEN** no se repiten avisos ni retrocede el contador o estado de lectura

#### Scenario: Carrera durante carga inicial
- **WHEN** ocurre una creación o lectura después de habilitar el canal mientras se obtiene el primer snapshot
- **THEN** el cliente vuelve a consultar si la revisión anunciada supera la respuesta, hasta converger al estado confirmado

#### Scenario: Cambio durante paginación
- **WHEN** una lectura o creación invalida el estado de páginas cargadas o en vuelo
- **THEN** el frontend descarta las páginas antiguas y recupera la primera página coherente sin reintroducir lecturas anteriores

#### Scenario: Commit sin señal entregada
- **WHEN** PostgreSQL confirma una notificación pero se pierde la señal sin desconectar al cliente
- **THEN** el siguiente disparador REST, como volver a estar visible o abrir el panel, recupera lista y contador confirmados; no se garantiza reparación en un intervalo fijo mientras no ocurra ese disparador

#### Scenario: Reinicio del servidor
- **WHEN** la API se reinicia con notificaciones leídas y pendientes
- **THEN** las pestañas reautentican y recuperan el mismo estado durable, sin depender de memoria del proceso anterior
