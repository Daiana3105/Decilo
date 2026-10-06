## ADDED Requirements

### Requirement: Destinatarios autorizados por transición
El backend MUST generar avisos solo desde transiciones persistidas y autorizadas: actividad nueva para paciente y familiares activos solo en Hogar; invitación para su familiar destinatario; aceptación para profesional invitante todavía vinculado; primera actividad completada para profesional asignador todavía vinculado; revocación para familiar afectado y profesional del vínculo todavía autorizado. MUST excluir al actor, otras familias y profesionales ajenos. MUST NOT confiar en localStorage o destinatarios suministrados por el cliente.

#### Scenario: Hogar y Consulta
- **WHEN** un profesional autorizado asigna actividades de Hogar y Consulta
- **THEN** el paciente recibe sus avisos y solo los familiares vinculados reciben el de Hogar, sin señales ni cambios de contador por Consulta

#### Scenario: Invitación y aceptación
- **WHEN** se crea una invitación y luego su destinatario la acepta activando el vínculo
- **THEN** el familiar recibe el aviso genérico de invitación y el profesional autorizado recibe el de aceptación, sin divulgar códigos ni permitir acceso antes de aceptar

#### Scenario: Completado y revocación
- **WHEN** se persiste la primera entrega o se revoca un vínculo activo
- **THEN** se notifica únicamente a los destinatarios definidos para esa transición, excluyendo al actor

#### Scenario: Acceso ajeno o revocado
- **WHEN** otra familia intenta completar, aceptar o consultar una actividad, o un familiar revocado intenta acceder
- **THEN** se rechaza sin mutaciones ni avisos y un aviso anterior no concede acceso

### Requirement: Persistencia atómica y publicación confirmada
La operación familiar, sus avisos y revisiones MUST compartir una conexión del UoW. El UoW MUST controlar la transacción global y liberar la conexión. Las escrituras secundarias MUST aislarse mediante SAVEPOINT: un fallo recuperable de avisos MUST NOT invalidar la operación principal. La publicación MUST ocurrir únicamente tras resolución exitosa de la promesa del UoW. MUST conservar login secundario, `notifications:ready`, contratos REST y payloads Socket.IO existentes.

#### Scenario: COMMIT pendiente
- **WHEN** las escrituras finalizaron pero COMMIT sigue pendiente
- **THEN** no se emite `notifications:changed`; después de confirmar se emiten summaries solo a las salas personales correspondientes

#### Scenario: Error de persistencia
- **WHEN** falla insertar un aviso o actualizar una revisión antes de COMMIT
- **THEN** se descartan evento, avisos y revisiones parciales mediante el savepoint, se conserva la operación principal y se libera la conexión tras COMMIT, sin emitir avisos fallidos
- **AND** si se pierde la conexión o no puede recuperarse el savepoint, no se inventa confirmación de la operación

#### Scenario: Error principal
- **WHEN** falla la operación principal o COMMIT antes de confirmar realmente
- **THEN** se revierte toda la transacción, sin operación ni avisos parciales y sin emisión

#### Scenario: Aviso no persistido
- **WHEN** la persistencia secundaria falla pero la operación principal confirma
- **THEN** se registra solo un error saneado; no se promete recuperar por REST un aviso inexistente ni se fabrica un aviso retroactivo

#### Scenario: Resultado incierto o fallo de transporte
- **WHEN** el UoW rechaza por COMMIT incierto o falla publicar tras una confirmación
- **THEN** no se inventa éxito transaccional ni se reejecuta ciegamente; un rechazo del UoW no publica y las filas realmente confirmadas se recuperan por REST sin duplicarlas
- **AND** un fallo solo de transporte después del UoW exitoso no invalida la operación confirmada

### Requirement: Deduplicación durable y cambios efectivos
El sistema MUST conservar una identidad durable por transición y una única notificación por evento/destinatario. MUST aumentar revisiones únicamente por avisos insertados. MUST distinguir repetición de completado/revocación/aceptación de una transición nueva y una revocación posterior a reactivación. MUST NOT crear avisos retrospectivos, desde seed o al agregar destinatarios después del evento.

#### Scenario: Reintentos concurrentes
- **WHEN** se intenta registrar dos veces el mismo evento para una cuenta
- **THEN** existe un único aviso, incremento de revisión y aporte al contador, conservando fechas e IDs

#### Scenario: Ciclo del vínculo
- **WHEN** un vínculo se revoca, se repite la revocación y luego se reactiva y revoca nuevamente
- **THEN** se generan dos eventos de revocación distintos para las dos transiciones reales y ninguno por la repetición

#### Scenario: Renovación con otro profesional autorizado
- **WHEN** el familiar acepta una invitación válida de otro profesional vinculado al paciente
- **THEN** se conserva la reasignación del permiso al nuevo profesional y se registra una nueva generación, sin mantener una autorización dependiente del profesional anterior

#### Scenario: Migración y reinicio
- **WHEN** se migra y reinicia una base con avisos de login y vínculos existentes
- **THEN** se conservan sus datos y contratos, se admiten los cinco tipos nuevos y no aparecen avisos históricos

### Requirement: Contenido mínimo y experiencia existente
Los avisos MUST usar texto genérico sin códigos, hashes, JWT, nombres de pacientes, notas privadas ni contenido de actividades. MUST conservar consulta por identidad, revisiones BIGINT como strings, recuperación REST, renderizado seguro y limpieza al cambiar cuenta. MUST mantener campana accesible, responsive y colores por rol, sin nuevos permisos.

#### Scenario: Historia después de revocación
- **WHEN** el familiar consulta sus avisos anteriores después de perder el vínculo
- **THEN** solo ve textos genéricos sin información privada del paciente y el backend deniega el acceso actual a sus actividades

#### Scenario: Sesiones y accesibilidad
- **WHEN** se reciben avisos en móvil/escritorio, se usa teclado o se cambia de cuenta con consultas en vuelo
- **THEN** se conservan foco y lectura de controles y no aparecen datos, contadores ni respuestas de la sesión anterior
