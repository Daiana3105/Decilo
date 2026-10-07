## Purpose

Permitir que profesionales autorizados administren perfiles mínimos de pacientes y coordinen turnos persistentes, con consentimiento revocable, aislamiento entre roles, agenda accesible y avisos sin revelar información clínica.

## ADDED Requirements

### Requirement: Consentimiento y autorización profesional-paciente
El sistema MUST requerir una autorización explícita y vigente para cada pareja profesional-paciente antes de crear/consultar/modificar perfiles o turnos. El paciente autenticado MUST poder conceder o revocar su consentimiento; un representante MUST estar identificado y su facultad MUST estar verificada mediante el procedimiento institucional aprobado. El rol profesional, conocer un correo o seleccionar un ID MUST NOT crear autorización. Cada consentimiento MUST registrar paciente, profesional, otorgante, rol/relación del otorgante, alcance, versión del texto, método y fecha del servidor. El sistema MUST conservar el historial de concesiones y revocaciones sin almacenar copias de documentos de identidad o firmas en esta capacidad.

#### Scenario: Paciente autoriza a un profesional
- **WHEN** el paciente autenticado confirma el consentimiento informado para un profesional identificado
- **THEN** se registra una autorización vigente y ese profesional puede crear su perfil y gestionar sus turnos

#### Scenario: Profesional intenta autoautorizarse
- **WHEN** un profesional crea una solicitud o intenta operar sin consentimiento vigente del paciente o representante verificado
- **THEN** se rechaza sin perfil, turno ni acceso, y no se revela información de la cuenta paciente

#### Scenario: Consentimiento profesional mediante código
- **WHEN** un profesional entrega un código vigente y el paciente autenticado previsualiza y acepta el profesional y alcance mostrados
- **THEN** el código se consume una sola vez, se registra consentimiento y grant ligado a la identidad paciente autenticada, y el profesional puede crear el perfil

#### Scenario: Emitir código no concede acceso
- **WHEN** un profesional emite una invitación y el paciente todavía no la aceptó
- **THEN** no existe consentimiento/grant activo y el profesional no puede leer ni crear perfil o turno

#### Scenario: Código inválido, vencido o reutilizado
- **WHEN** una cuenta con rol incorrecto o una invitación inválida, vencida o consumida intenta previsualizar o aceptar
- **THEN** la API rechaza sin consumir otro código ni revelar cuentas o pacientes ajenos

#### Scenario: Revocación del consentimiento
- **WHEN** el paciente o representante autorizado revoca el consentimiento
- **THEN** nuevas lecturas y escrituras profesionales se rechazan inmediatamente, la revocación queda auditada y los turnos futuros pendientes/confirmados se cancelan con historial preservado

### Requirement: Acceso familiar explícito a la agenda
El sistema MUST tratar el contacto responsable y el vínculo familiar como conceptos distintos. Un familiar MUST consultar turnos únicamente si tiene rol familiar, existe un vínculo persistente vigente con el paciente y el paciente o representante verificado concedió por separado el alcance de compartir agenda con esa cuenta. Revocar cualquiera de esas autorizaciones MUST retirar el acceso sin afectar otros familiares. La vista familiar MUST NOT exponer datos de contacto responsable, notas clínicas ni datos de otros pacientes.

#### Scenario: Familiar con vínculo y permiso de agenda
- **WHEN** un familiar autenticado posee vínculo vigente y permiso explícito de agenda para un paciente
- **THEN** consulta solo los turnos de ese paciente dentro del rango solicitado

#### Scenario: Familiar sin permiso de agenda
- **WHEN** existe contacto responsable o vínculo familiar pero no hay permiso vigente para compartir agenda
- **THEN** no obtiene nombres, turnos ni diferencias que revelen si el paciente tiene citas

#### Scenario: Se revoca el acceso familiar
- **WHEN** el paciente revoca compartir agenda o se retira el vínculo familiar
- **THEN** la siguiente lectura devuelve acceso denegado sin datos y no afecta permisos de otros familiares

#### Scenario: Permiso familiar mediante invitación separada
- **WHEN** el paciente autenticado emite un código de agenda, el familiar autenticado previsualiza qué paciente comparte y acepta
- **THEN** se crea un grant de solo lectura para esa cuenta familiar concreta, independiente del consentimiento profesional y del contacto responsable

### Requirement: Gestión de perfiles mínimos de pacientes
El sistema MUST permitir a un profesional con autorización vigente crear, leer y actualizar el perfil de la cuenta autenticada con rol paciente vinculada a ese profesional. El perfil MUST limitarse al nombre mostrado y contacto responsable (nombre, relación, teléfono y correo opcional); MUST NOT exigir ni almacenar diagnósticos, notas clínicas, documentos de identidad o datos no necesarios para turnos. El profesional MUST NOT cambiar correo de login, contraseña o rol mediante el CRUD clínico. El borrado MUST ser archivo lógico: conservar consentimientos, turnos y auditoría; MUST impedir archivar mientras haya turnos futuros pendientes/confirmados, salvo que se cancelen en una operación autorizada.

#### Scenario: Profesional crea un perfil autorizado
- **WHEN** un profesional autorizado registra los campos mínimos válidos para un usuario paciente existente
- **THEN** se guarda un perfil PostgreSQL asociado a esa identidad y queda disponible para su agenda

#### Scenario: Profesional edita contacto responsable
- **WHEN** el profesional actualmente autorizado cambia campos del perfil
- **THEN** se guarda el cambio, se registra una auditoría con campos modificados y no se alteran la identidad ni credenciales de la cuenta

#### Scenario: Perfil no autorizado o archivado
- **WHEN** se consulta, edita o archiva un paciente sin autorización vigente, o el perfil ya está archivado
- **THEN** la API rechaza la operación sin revelar datos ni crear escrituras parciales

#### Scenario: Archivo conserva historial
- **WHEN** un profesional archiva un perfil sin turnos futuros activos
- **THEN** el perfil deja de estar disponible para nuevos turnos y permanece el historial de turnos, consentimientos y auditoría

### Requirement: Agenda profesional diaria, semanal y mensual
El sistema MUST ofrecer vistas de agenda diaria, semanal y mensual basadas en turnos persistidos. Toda lista MUST filtrarse por profesional y autorización vigente; la selección de paciente MUST provenir de pacientes autorizados por el servidor. Los rangos MUST tener límites claros y no MUST devolver pacientes ajenos por alterar filtros o cursores.

#### Scenario: Profesional consulta períodos
- **WHEN** un profesional autorizado abre día, semana o mes
- **THEN** recibe únicamente turnos propios del intervalo solicitado y cada turno identifica paciente, horario local y estado

#### Scenario: Filtro de paciente manipulado
- **WHEN** un profesional pide agenda para un paciente no autorizado
- **THEN** la API deniega la lectura sin nombres, conteos ni turnos ajenos

#### Scenario: Cambio de autorización durante la sesión
- **WHEN** se revoca la autorización después de cargar la agenda
- **THEN** las lecturas posteriores se rechazan y la interfaz oculta los datos al revalidar, sin usar una copia local como respaldo

### Requirement: Crear, editar y cambiar estado de turnos
El sistema MUST permitir al profesional actualmente autorizado crear y editar turnos, y confirmar, cancelar o marcar atendido mediante transiciones válidas. Todo turno nuevo MUST comenzar pendiente. Las transiciones permitidas MUST ser pendiente→confirmado/cancelado y confirmado→atendido/cancelado; atendido y cancelado son estados terminales. El paciente y familiar MUST tener acceso de solo lectura. Editar MUST conservar profesional y paciente; cambiar paciente requiere cancelar el turno anterior y crear otro. El sistema MUST conservar el historial y MUST NOT borrar turnos.

#### Scenario: Creación y confirmación
- **WHEN** el profesional autorizado crea un turno válido y luego confirma uno pendiente
- **THEN** se persiste con identidad estable, estado correspondiente y auditoría de ambas acciones

#### Scenario: Edición de turno activo
- **WHEN** el profesional autorizado edita fecha u horario de un turno pendiente o confirmado usando su versión vigente
- **THEN** se actualiza el mismo turno, se registra la edición y no se crea un duplicado

#### Scenario: Conflicto de edición concurrente
- **WHEN** una edición se basa en una versión anterior a una modificación ya confirmada
- **THEN** se responde conflicto y no se sobrescribe el cambio confirmado

#### Scenario: Cancelación y atención
- **WHEN** un profesional cancela un turno pendiente/confirmado o marca atendido un turno confirmado ya finalizado
- **THEN** se registra la transición válida y se conserva su historial

#### Scenario: Transición o actor inválido
- **WHEN** paciente/familiar intenta mutar un turno, se marca atendido antes de finalizar o se altera directamente el estado terminal
- **THEN** la API rechaza sin modificar el turno ni mostrar éxito

### Requirement: Validación temporal y prevención de superposiciones
El sistema MUST aceptar fechas RFC 3339 con offset explícito, conservar instantes inequívocos y presentar la agenda en la zona horaria IANA configurada para el profesional (por defecto `America/Argentina/Buenos_Aires`). MUST validar fin posterior al inicio, duración entre 15 y 180 minutos, intervalos alineados a cinco minutos y ausencia de inicio pasado al crear o reprogramar. Los intervalos MUST interpretarse como semiabiertos `[inicio, fin)`: turnos consecutivos pueden tocar sus extremos. MUST impedir superposición con cualquier turno no cancelado del mismo profesional o paciente, incluso ante escrituras concurrentes.

#### Scenario: Fecha inválida o ambigua
- **WHEN** se envía fecha sin offset, formato inválido, fin anterior/igual al inicio o duración fuera del límite
- **THEN** se responde validación 400 sin escritura y el mensaje identifica el campo corregible

#### Scenario: Turnos consecutivos
- **WHEN** un nuevo turno empieza exactamente al finalizar otro activo
- **THEN** se acepta porque los intervalos semiabiertos no se superponen

#### Scenario: Superposición profesional o paciente
- **WHEN** una creación o edición solapa un turno no cancelado del mismo profesional o paciente
- **THEN** se responde conflicto sin escritura ni notificación de éxito

#### Scenario: Dos solicitudes concurrentes
- **WHEN** dos profesionales intentan reservar al mismo paciente en intervalos coincidentes al mismo tiempo
- **THEN** como máximo una operación confirma y la otra recibe conflicto

#### Scenario: Horario con cambio estacional
- **WHEN** una fecha local coincide con hora inexistente o ambigua por cambio de zona horaria
- **THEN** la interfaz exige una selección inequívoca y la API recibe un instante con offset explícito

### Requirement: Notificaciones de turnos posteriores al COMMIT
El sistema MUST crear avisos genéricos para creación, confirmación, reprogramación y cancelación, dirigidos únicamente a las cuentas autorizadas al momento de la operación. Los eventos y la revisión del destinatario MUST confirmarse junto al cambio de turno; Socket.IO MUST publicar solo después de un COMMIT exitoso. Un rollback o COMMIT rechazado MUST NOT emitir avisos ni éxito. Los mensajes MUST NOT contener nombre, horario, contacto responsable, motivo clínico, token ni nota; los detalles se consultan por API reautorizada.

#### Scenario: Turno confirmado y avisado
- **WHEN** una creación o transición válida confirma su transacción
- **THEN** se persisten los avisos genéricos de destinatarios permitidos y después del COMMIT se publica la actualización privada

#### Scenario: Operación revertida
- **WHEN** falla la transacción de un turno antes o durante COMMIT
- **THEN** no queda turno/auditoría/aviso parcial ni se publica señal de éxito

#### Scenario: Destinatario pierde autorización
- **WHEN** se resuelve el conjunto de destinatarios o se entrega una actualización
- **THEN** solo se avisa a cuentas con permiso vigente y no se revela el turno mediante sala, REST o mensaje genérico con metadatos

### Requirement: Persistencia, privacidad y auditoría
El sistema MUST guardar perfiles, permisos, turnos y eventos de auditoría en PostgreSQL con timestamps del servidor, consultas parametrizadas y respuestas privadas `no-store`. El frontend MUST NOT leer ni escribir esos datos clínicos en localStorage, sessionStorage, cachés PWA o prompts de Gemini. La auditoría MUST registrar actor, paciente, recurso, acción, fecha y campos modificados, sin valores de contacto, contenido clínico, secretos o cuerpo HTTP; MUST ser append-only para la aplicación. Migraciones MUST ser aditivas, idempotentes y conservar usuarios, notificaciones y datos previos.

#### Scenario: Recarga y cambio de cuenta
- **WHEN** se recarga la agenda o cambia la sesión
- **THEN** los datos se vuelven a obtener de PostgreSQL con autorización actual y no aparecen datos de otra identidad desde almacenamiento del navegador

#### Scenario: Inspección de logs y auditoría
- **WHEN** se revisan registros operativos o auditoría
- **THEN** se identifica quién realizó qué acción y cuándo, sin encontrar contacto responsable, notas, credenciales, JWT ni payload clínico

#### Scenario: Migración sobre base existente
- **WHEN** se inicializa por primera vez o repetidamente una base con usuarios y notificaciones
- **THEN** aparecen las nuevas tablas/índices y tipos de aviso sin borrar, recrear o reordenar los datos anteriores
### Requirement: Etapa m?nima exclusivamente ficticia
La etapa local de demo MUST limitar fichas y turnos a miembros ficticios verificados y v?nculos vigentes de PostgreSQL; MUST NOT crear cuentas, importar permisos locales ni acreditar consentimiento productivo. MUST permitir agregar/editar nombre, apellido y contacto ficticio opcional y consultar un calendario mensual por paciente. MUST crear y cancelar turnos de 15?180 minutos con locks y UoW, rechazando superposiciones profesionales y del paciente. Los requisitos productivos anteriores quedan pendientes fuera de esta etapa; la excepci?n MUST NOT habilitar acceso real.

#### Scenario: Reserva ficticia concurrente
- **WHEN** dos profesionales autorizados reservan simult?neamente el mismo paciente y horario
- **THEN** una sola reserva confirma y la otra recibe conflicto sin escritura parcial

#### Scenario: Cuenta ajena o v?nculo revocado
- **WHEN** una cuenta no ficticia o un familiar sin v?nculo vigente consulta turnos
- **THEN** se rechaza sin datos, contactos ni fallback local

#### Scenario: Consulta mensual y cancelaci?n
- **WHEN** el profesional crea un turno del paciente ficticio vinculado y luego lo cancela
- **THEN** la fila persiste como cancelada y el paciente o familiar autorizado la consulta sin poder modificarla
