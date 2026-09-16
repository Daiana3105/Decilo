## Purpose

Esta capacidad permite que las personas usuarias creen una cuenta, autentiquen su identidad y mantengan una sesión segura para utilizar DECILO desde una API persistente.

## ADDED Requirements

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

El sistema MUST persistir las cuentas en SQLite en una tabla `users` con `id`, `nombre`, `email` único, `password_hash`, `rol` y fecha de creación. El sistema MUST almacenar contraseñas únicamente mediante un hash seguro y MUST obtener los secretos y parámetros sensibles desde variables de entorno, sin incluir secretos reales en Git.

#### Scenario: Cuenta persistida
- **WHEN** se completa un registro válido y se reinicia el servicio
- **THEN** la cuenta continúa disponible para iniciar sesión y conserva sus datos no sensibles

#### Scenario: Inspección de almacenamiento
- **WHEN** se consulta el registro persistido de una cuenta
- **THEN** existe `password_hash` y no existe una contraseña en texto plano

#### Scenario: Configuración insegura ausente
- **WHEN** la API inicia sin las variables de entorno obligatorias para firmar JWT o acceder a la base configurada
- **THEN** el servicio informa el error de configuración y no opera como si tuviera secretos predeterminados inseguros

### Requirement: API de salud y contrato de errores

El sistema MUST exponer `GET /api/health` para informar si la API está disponible y MUST devolver respuestas JSON consistentes para errores de validación, autenticación y configuración sin filtrar secretos ni datos sensibles.

#### Scenario: API saludable
- **WHEN** se solicita `GET /api/health` con la API y su base de datos disponibles
- **THEN** responde exitosamente con un estado de salud que puede utilizarse en el healthcheck del contenedor

#### Scenario: Error de validación accesible
- **WHEN** una ruta de autenticación recibe una solicitud inválida
- **THEN** responde con un código HTTP apropiado, un mensaje legible y detalles suficientes para que el frontend identifique los campos corregibles
