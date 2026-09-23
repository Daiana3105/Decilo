# autenticacion-segura Specification

## Purpose

Esta capacidad permite que las personas usuarias creen una cuenta, autentiquen su identidad y mantengan una sesión segura para utilizar DECILO desde una API persistente.

## Requirements

### Requirement: Registro de cuentas por rol

El sistema MUST permitir registrar una cuenta con nombre, correo electrónico, contraseña, confirmación de contraseña y uno de los roles válidos: profesional, paciente o familiar. El correo MUST ser único sin distinguir mayúsculas y las contraseñas MUST coincidir y cumplir la política mínima definida por la aplicación.

#### Scenario: Registro válido
- **WHEN** una persona envía todos los campos requeridos con un correo no registrado, contraseñas coincidentes y un rol válido
- **THEN** el sistema crea la cuenta persistente, responde con la identidad pública y una sesión autenticada, y no expone la contraseña ni su hash

#### Scenario: Correo duplicado
- **WHEN** una persona intenta registrarse con un correo ya existente
- **THEN** el sistema rechaza la solicitud con un error de validación y no crea una segunda cuenta

#### Scenario: Datos de registro inválidos
- **WHEN** faltan campos, el correo tiene formato inválido, las contraseñas no coinciden o el rol no pertenece a los tres valores permitidos
- **THEN** el sistema rechaza la solicitud, identifica los datos a corregir mediante un mensaje accesible y no persiste una cuenta parcial

### Requirement: Inicio y consulta de sesión

El sistema MUST autenticar mediante correo y contraseña, emitir un JWT firmado con un secreto configurado fuera del código fuente y permitir consultar la identidad autenticada mediante la sesión vigente.

#### Scenario: Inicio de sesión válido
- **WHEN** una persona envía credenciales que coinciden con una cuenta registrada
- **THEN** `POST /api/auth/login` responde con un JWT y la identidad pública incluyendo su rol, sin devolver la contraseña ni el hash

#### Scenario: Credenciales inválidas
- **WHEN** una persona envía un correo no registrado o una contraseña incorrecta
- **THEN** `POST /api/auth/login` responde con un error de autenticación sin revelar cuál dato falló

#### Scenario: Consulta de usuario autenticado
- **WHEN** una persona envía un JWT válido a `GET /api/auth/me`
- **THEN** el sistema responde con la identidad pública correspondiente y su rol

#### Scenario: Sesión ausente o inválida
- **WHEN** una persona solicita `GET /api/auth/me` sin un JWT válido, vencido o verificable
- **THEN** el sistema responde como no autenticado y no revela datos de usuario

### Requirement: Persistencia y protección de credenciales

El sistema MUST persistir las cuentas en PostgreSQL y conservar el contrato existente de registro, login, JWT, `GET /api/auth/me`, roles `profesional`, `paciente` y `familiar`, y `GET /api/health` cuando la API se ejecuta localmente o como Web Service público. En Render, la conexión MUST configurarse mediante `DATABASE_URL` y los secretos MUST obtenerse de variables de entorno, sin incluir credenciales reales en GitHub ni exponerlas al frontend.

#### Scenario: Cuenta persistida en producción
- **WHEN** se completa un registro válido mediante la API pública y se reinicia o redeploya el Web Service
- **THEN** la cuenta continúa disponible para iniciar sesión porque PostgreSQL administrado conserva los datos

#### Scenario: Cuenta persistida
- **WHEN** se completa un registro válido y se reinician los contenedores
- **THEN** la cuenta continúa disponible para iniciar sesión y conserva sus datos no sensibles en PostgreSQL mediante el volumen persistente

#### Scenario: Inspección de almacenamiento
- **WHEN** se consulta el registro persistido de una cuenta
- **THEN** existe `password_hash`, existe `created_at` y no existe una contraseña en texto plano

#### Scenario: Contrato público conservado
- **WHEN** una persona usa registro, login, `/api/auth/me` o healthcheck en la API pública
- **THEN** recibe los mismos campos públicos, códigos de autenticación y roles que en el entorno local, sin contraseña ni `password_hash`

#### Scenario: Configuración de producción ausente
- **WHEN** el Web Service inicia sin `DATABASE_URL` o `JWT_SECRET`
- **THEN** informa un error de configuración y no opera con credenciales predeterminadas inseguras

#### Scenario: Configuración insegura ausente
- **WHEN** la API inicia sin las variables de entorno obligatorias para firmar JWT o conectarse a PostgreSQL
- **THEN** el servicio informa el error de configuración y no opera como si tuviera secretos predeterminados inseguros

#### Scenario: Inicialización idempotente
- **WHEN** la API inicia contra una base PostgreSQL vacía o ya inicializada
- **THEN** crea la tabla `users` de forma segura si falta y puede reiniciarse sin duplicar el esquema ni perder cuentas existentes

#### Scenario: Consultas parametrizadas
- **WHEN** una operación de registro, login, consulta de sesión o healthcheck recibe valores externos
- **THEN** la API ejecuta la operación mediante consultas SQL parametrizadas y no concatena esos valores en el SQL

#### Scenario: Secretos fuera del frontend
- **WHEN** se inspecciona el bundle y las solicitudes del Static Site
- **THEN** no contienen `DATABASE_URL`, `JWT_SECRET`, contraseñas ni credenciales de PostgreSQL

### Requirement: API de salud y contrato de errores

El sistema MUST exponer `GET /api/health` para informar si la API está disponible y MUST devolver respuestas JSON consistentes para errores de validación, autenticación y configuración sin filtrar secretos ni datos sensibles.

#### Scenario: API saludable
- **WHEN** se solicita `GET /api/health` con la API y su base de datos disponibles
- **THEN** responde exitosamente con un estado de salud que puede utilizarse en el healthcheck del contenedor

#### Scenario: Error de validación accesible
- **WHEN** una ruta de autenticación recibe una solicitud inválida
- **THEN** responde con un código HTTP apropiado, un mensaje legible y detalles suficientes para que el frontend identifique los campos corregibles

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
