## MODIFIED Requirements

### Requirement: Registro y vinculacion de pacientes
El sistema MUST permitir al profesional autorizado crear, leer, actualizar y archivar un perfil persistente asociado a una cuenta con rol paciente existente. El sistema MUST validar consentimiento vigente del paciente o representante verificado y vínculo profesional-paciente en cada operación; el rol profesional, correo o selección del navegador MUST NOT constituir autorización. El perfil MUST contener datos personales mínimos y contacto responsable, no credenciales ni notas clínicas. El archivo MUST ser lógico y preservar turnos e historial.

#### Scenario: Profesional registra un paciente
- **WHEN** el profesional envía los datos mínimos válidos para una cuenta paciente existente y se encuentra consentimiento vigente
- **THEN** el sistema crea el perfil PostgreSQL, lo asocia al profesional y lo deja disponible para configurar su acompañamiento y agenda

#### Scenario: Datos obligatorios incompletos
- **WHEN** el profesional intenta guardar un perfil con datos inválidos o incompletos
- **THEN** el sistema rechaza la operación, identifica los campos corregibles y no crea un registro parcial

#### Scenario: Falta consentimiento o vínculo vigente
- **WHEN** el profesional intenta crear, consultar o modificar un perfil sin autorización persistida vigente
- **THEN** se rechaza sin revelar datos del paciente ni escribir en almacenamiento local

#### Scenario: Profesional actualiza datos mínimos
- **WHEN** el profesional autorizado modifica nombre mostrado o contacto responsable
- **THEN** PostgreSQL conserva el cambio y una auditoría identifica actor, paciente, acción, fecha y campos modificados sin duplicar valores personales

#### Scenario: Archivo conserva historial
- **WHEN** el profesional archiva un perfil sin turnos futuros pendientes o confirmados
- **THEN** el perfil se excluye de nuevos turnos y listas activas, mientras turnos, consentimientos y auditoría permanecen consultables por sujetos autorizados

#### Scenario: Contacto responsable no equivale a acceso
- **WHEN** se registra una persona como contacto responsable
- **THEN** no recibe una cuenta, vínculo familiar ni permiso de agenda por ese solo hecho