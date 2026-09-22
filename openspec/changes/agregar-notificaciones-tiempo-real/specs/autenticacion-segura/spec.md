## ADDED Requirements

### Requirement: Aviso personal por inicio de sesión aceptado

El sistema MUST devolver normalmente 200 con JWT e identidad pública después de aceptar las credenciales de `POST /api/auth/login`, sin esperar a guardar o emitir una notificación. MUST intentar crear y emitir el aviso `session.login` titulado «Se inició sesión en tu cuenta» como operación secundaria controlada para el mismo usuario. Un fallo al programar, guardar o emitir el aviso MUST NOT impedir el login, modificar su respuesta, provocar un 503 ni invalidar el JWT. MUST capturar los errores y registrarlos sin datos sensibles. MUST conservar los campos públicos `{ token, user }`, los roles y los errores existentes de credenciales inválidas. MUST usar exclusivamente la identidad verificada en el servidor, sin datos clínicos, contraseñas, hashes o tokens en el aviso. Cada solicitud de login aceptada MUST originar un intento de evento distinto; registro, `/api/auth/me`, restauración, reconexión y lecturas MUST NOT generar este aviso.

#### Scenario: Login exitoso para cualquier rol
- **WHEN** una persona profesional, paciente o familiar envía credenciales correctas
- **THEN** la API devuelve 200 con JWT e identidad pública sin depender del aviso; si la operación secundaria termina correctamente, persiste un único aviso personal por ese evento y lo emite a las sesiones abiertas de esa cuenta

#### Scenario: Selección de rol diferente en el navegador
- **WHEN** la API acepta las credenciales pero el frontend detecta luego que el rol elegido difiere del rol de la cuenta
- **THEN** el aviso sigue representando la autenticación aceptada por la API y pertenece solo a esa cuenta

#### Scenario: Credenciales incorrectas
- **WHEN** se intenta login con correo inexistente o contraseña incorrecta
- **THEN** se conserva el error 401 existente y no se crea ni emite ninguna notificación

#### Scenario: Falla la persistencia del aviso
- **WHEN** las credenciales son válidas pero no puede confirmarse la escritura del aviso
- **THEN** el login devuelve normalmente 200 con JWT válido, el fallo se registra sin datos sensibles, no queda un aviso parcial ni se emite una actualización de datos no confirmados; REST no inventa un aviso que no se guardó

#### Scenario: Falla únicamente la entrega en tiempo real
- **WHEN** el aviso está confirmado pero falla su señal de actualización
- **THEN** el login conserva 200 y JWT válido, el fallo se registra sin datos sensibles y el aviso permanece disponible mediante REST al cargar sesión, conectar/reconectar o recuperar visibilidad

#### Scenario: Operación secundaria lenta o rechazada
- **WHEN** después de validar credenciales la operación de aviso se demora o falla al programarse o ejecutarse
- **THEN** la respuesta de login no espera esa operación, conserva 200 con JWT válido y los errores quedan controlados sin rechazos asíncronos sin manejar ni cambios posteriores en la respuesta

#### Scenario: Registro seguro de errores
- **WHEN** falla la creación o emisión y el error contiene datos sensibles
- **THEN** el registro incluye solo etapa, código saneado y correlación opaca, sin cuerpos de solicitudes, cabeceras, contraseñas, hashes, JWT, correos ni credenciales de base

#### Scenario: Operaciones que no generan avisos
- **WHEN** una persona registra una cuenta, consulta `/api/auth/me`, recarga, reconecta el transporte o marca leído
- **THEN** esas operaciones no crean notificaciones `session.login`
