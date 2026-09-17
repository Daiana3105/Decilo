## MODIFIED Requirements

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
