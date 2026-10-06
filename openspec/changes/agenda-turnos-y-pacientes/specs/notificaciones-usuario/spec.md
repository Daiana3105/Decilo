## ADDED Requirements

### Requirement: Notificaciones genéricas de agenda
El sistema MUST persistir avisos genéricos asociados a creación, confirmación, reprogramación y cancelación de turnos, conservando las notificaciones de login. MUST deduplicar cada evento por destinatario y MUST derivar destinatarios del servidor según el rol, vínculo y consentimiento vigentes. El contenido MUST NOT incluir nombres, horarios, datos de contacto, detalles clínicos, motivos, JWT ni IDs que permitan consultar sin autorización. La señal Socket.IO MUST emitirse solamente después de que el cambio de turno y sus avisos hayan confirmado COMMIT.

#### Scenario: Aviso a paciente y profesional autorizados
- **WHEN** un turno cambia correctamente y la transacción confirma
- **THEN** se persisten avisos genéricos solo para los participantes autorizados y se publica su revisión después del COMMIT

#### Scenario: Aviso a familiar con agenda compartida
- **WHEN** hay un familiar con vínculo activo y permiso explícito vigente de agenda
- **THEN** recibe un mensaje genérico sin detalles del turno y puede consultar detalles solo mediante una lectura API reautorizada

#### Scenario: Familiar sin permiso o revocado
- **WHEN** el familiar no tiene permiso de agenda o lo perdió antes de resolver destinatarios
- **THEN** no recibe aviso del turno ni una señal que revele su existencia

#### Scenario: Rollback o evento repetido
- **WHEN** la mutación del turno revierte o se procesa nuevamente el mismo evento para un destinatario
- **THEN** no se publica un aviso no confirmado ni se duplica el registro o contador