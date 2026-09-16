## MODIFIED Requirements

### Requirement: Acceso diferenciado por rol

El sistema MUST permitir que una persona autenticada acceda como profesional, paciente o familiar mediante una sesión JWT válida y MUST mostrar solamente las acciones y datos autorizados para su rol y sus relaciones asignadas. Las vistas del frontend MUST rechazar el acceso directo a un panel de otro rol y la API MUST aplicar la misma autorización, sin confiar únicamente en elementos ocultos de la interfaz.

#### Scenario: Profesional inicia una sesion
- **WHEN** una persona autenticada tiene rol profesional
- **THEN** puede acceder a sus pacientes, tableros, actividades y progreso asociado, pero no puede actuar como paciente o familiar

#### Scenario: Paciente consulta su espacio
- **WHEN** una persona autenticada tiene rol paciente
- **THEN** puede acceder a sus tableros, frases, actividades, puntos e insignias, pero no puede modificar la configuracion de otros pacientes

#### Scenario: Familiar consulta un paciente vinculado
- **WHEN** una persona autenticada tiene rol familiar y esta vinculada a un paciente
- **THEN** puede consultar las actividades de hogar, registrar completados y enviar comentarios para ese paciente

#### Scenario: Usuario sin sesión intenta abrir un panel
- **WHEN** una persona sin JWT válido intenta abrir una vista protegida o solicitar sus datos
- **THEN** el sistema la devuelve al acceso o responde no autorizado sin mostrar información protegida

#### Scenario: Usuario intenta cambiar de rol
- **WHEN** una persona autenticada intenta abrir directamente un panel o una operación reservada a un rol diferente del suyo
- **THEN** el sistema rechaza el acceso y conserva la sesión en el panel correspondiente a su rol
