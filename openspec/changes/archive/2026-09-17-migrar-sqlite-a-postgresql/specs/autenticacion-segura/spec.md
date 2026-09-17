## MODIFIED Requirements

### Requirement: Persistencia y protección de credenciales

El sistema MUST persistir las cuentas en PostgreSQL en una tabla `users` con `id`, `nombre`, `email` único, `password_hash`, `rol` y `created_at`. El sistema MUST reemplazar SQLite y `better-sqlite3` por el acceso PostgreSQL configurado para la API, MUST ejecutar las consultas con parámetros separados de los valores recibidos y MUST almacenar contraseñas únicamente mediante un hash seguro. Los secretos JWT y las credenciales de PostgreSQL MUST obtenerse desde variables de entorno, sin incluir secretos reales en Git.

#### Scenario: Cuenta persistida
- **WHEN** se completa un registro válido y se reinician los contenedores
- **THEN** la cuenta continúa disponible para iniciar sesión y conserva sus datos no sensibles en PostgreSQL mediante el volumen persistente

#### Scenario: Inspección de almacenamiento
- **WHEN** se consulta el registro persistido de una cuenta
- **THEN** existe `password_hash`, existe `created_at` y no existe una contraseña en texto plano

#### Scenario: Configuración insegura ausente
- **WHEN** la API inicia sin las variables de entorno obligatorias para firmar JWT o conectarse a PostgreSQL
- **THEN** el servicio informa el error de configuración y no opera como si tuviera secretos predeterminados inseguros

#### Scenario: Inicialización idempotente
- **WHEN** la API inicia contra una base PostgreSQL vacía o ya inicializada
- **THEN** crea la tabla `users` de forma segura si falta y puede reiniciarse sin duplicar el esquema ni perder cuentas existentes

#### Scenario: Consultas parametrizadas
- **WHEN** una operación de registro, login, consulta de sesión o healthcheck recibe valores externos
- **THEN** la API ejecuta la operación mediante consultas SQL parametrizadas y no concatena esos valores en el SQL
