## ADDED Requirements

### Requirement: Tableros persistentes y autorizados en la demo
Los tableros de cuentas ficticias habilitadas MUST persistir en PostgreSQL y MUST obtener pacientes autorizados del backend. Un profesional actualmente vinculado MUST poder crear/asignar tableros; solo el autor vinculado MUST poder editarlos sin cambiar de paciente. Cada paciente MUST leer exclusivamente sus propios tableros desde otra sesión y seleccionar entre los disponibles. Familiares MUST NOT acceder a estas rutas. Errores, denegaciones y datos vacíos MUST NOT activar tableros de localStorage. Cambiar de cuenta o tablero MUST limpiar la frase anterior; respuestas tardías MUST NOT mezclar pacientes.

#### Scenario: Profesional y paciente en sesiones independientes
- **WHEN** un profesional vinculado guarda un tablero con pictogramas válidos
- **THEN** queda persistido y el paciente lo obtiene en Mi comunicador desde otra sesión y tras recargar, sin compartir almacenamiento local

#### Scenario: Acceso cruzado y revocación profesional
- **WHEN** otro paciente, familiar o profesional ajeno intenta leer o modificar el tablero, o el autor pierde su vínculo
- **THEN** se deniega sin revelar datos ajenos ni escribir; el paciente propietario conserva los tableros ya asignados

#### Scenario: Guardado rechazado
- **WHEN** no hay paciente autorizado, pictogramas válidos o falla la API
- **THEN** no se anuncia éxito ni se escribe un tablero local como alternativa

### Requirement: Provisionamiento explícito de relaciones ficticias
La primera etapa MUST limitarse a una demo aislada con cuentas y relaciones ficticias persistidas en backend mediante un comando local reproducible e idempotente. MUST comprobar destino y propiedad de la fixture, conservar datos/revocaciones en repeticiones y rechazar bases no autorizadas. MUST NOT importar relaciones de localStorage, ejecutar el seed automáticamente o crear vínculos familiares sin aceptación.

#### Scenario: Preparación reproducible
- **WHEN** la persona operadora ejecuta dos veces el seed sobre una base aislada autorizada
- **THEN** existen las mismas cuentas ficticias y pares profesionales únicos, sin duplicados, sin reactivar revocaciones ni consumir o regenerar invitaciones
- **AND** los vínculos familiares solo se activan mediante aceptación posterior

#### Scenario: Destino o identidad ajenos
- **WHEN** el comando recibe una base no marcada, producción o una cuenta preexistente que no pertenece a la fixture
- **THEN** rechaza sin alterar cuentas, relaciones, datos o volúmenes

#### Scenario: Invitación sin vínculo persistido
- **WHEN** un profesional intenta invitar con un vínculo presente solo en localStorage, revocado o con participantes fuera de la fixture
- **THEN** el backend rechaza sin emitir código ni crear invitación

### Requirement: Código manual de un solo uso con vencimiento
Las invitaciones MUST usar un código criptográficamente aleatorio de al menos 128 bits, dirigido a una cuenta familiar ficticia y con vencimiento a las 24 horas. MUST guardar solo su hash, mostrarlo una vez al profesional para entrega manual y exigir aceptación autenticada del destinatario. MUST NOT enviar emails ni guardar códigos en logs, URLs o almacenamiento del navegador. El consumo MUST ser atómico y los intentos MUST estar limitados.

#### Scenario: Aceptación válida del código
- **WHEN** el destinatario ingresa el código vigente y confirma, manteniéndose activo el vínculo profesional-paciente
- **THEN** se consume el código y se activa un único vínculo en una transacción

#### Scenario: Reutilización, vencimiento o cuenta incorrecta
- **WHEN** se intenta aceptar un código consumido, vencido, revocado o con otra cuenta
- **THEN** se rechaza sin vínculo ni información del paciente; dos aceptaciones concurrentes no producen dos consumos exitosos

#### Scenario: Reemisión
- **WHEN** el profesional autorizado genera un nuevo código para la misma pareja
- **THEN** los códigos pendientes anteriores quedan invalidados y el nuevo requiere aceptación; no se recupera el código original desde la persistencia

### Requirement: Separación entre demo y uso real
El sistema MUST habilitar esta etapa únicamente para el entorno y participantes ficticios registrados. La documentación MUST mantener pendientes la acreditación, consentimiento y representación para uso real; el seed y la aceptación ficticia MUST NOT presentarse como solución de esas políticas.

#### Scenario: Intento fuera del alcance de demo
- **WHEN** se intenta usar el flujo fuera del entorno habilitado o con una cuenta no perteneciente a la fixture
- **THEN** se deniega el flujo de demo sin modificar autenticación, ayudante o funcionalidades existentes

### Requirement: Vínculos persistentes muchos a muchos
El sistema MUST representar varios pacientes por familiar y varios familiares por paciente mediante pares únicos persistentes. MUST derivar permisos de vínculos vigentes en backend y MUST NOT aceptar localStorage, rol enviado o coincidencias de email como autorización.

#### Scenario: Relaciones compartidas sin duplicados
- **WHEN** F1 está vinculado a P1 y P2, y F2 a P1
- **THEN** F1 puede seleccionar P1/P2 y F2 solo P1, sin duplicación de pacientes ni acceso implícito a P2

#### Scenario: Manipulación local
- **WHEN** un usuario agrega un patientId o familyId ajeno al almacenamiento o a una petición
- **THEN** el backend rechaza el acceso sin datos ni escrituras

### Requirement: Vinculación mediante otorgante acreditado y aceptación
El sistema MUST exigir profesional con relación persistente acreditada con el paciente, invitación dirigida y aceptación por el familiar destinatario autenticado. MUST revalidar estado, roles, vigencia y destinatario en la transacción. MUST NOT habilitar datos reales sin definir acreditación inicial y política de consentimiento/representación.

#### Scenario: Aceptación válida
- **WHEN** el familiar destinatario acepta una invitación vigente de un profesional aún autorizado
- **THEN** se consume y se activa un único vínculo atómicamente, disponible solo tras COMMIT

#### Scenario: Invitación inválida o usurpada
- **WHEN** se usa un token expirado, revocado, consumido o destinado a otra cuenta, o el otorgante perdió autorización
- **THEN** se rechaza sin vínculo parcial ni información del paciente

#### Scenario: Profesional autoasignado
- **WHEN** una cuenta registrada como profesional sin relación acreditada intenta invitar a un familiar para un paciente
- **THEN** no obtiene permiso por su rol y la operación se rechaza

### Requirement: Revocación independiente y efectiva
El sistema MUST permitir revocar un par por el profesional autorizado o por el propio familiar al salir, sin afectar los demás pares. MUST revalidar autorización en todas las lecturas y escrituras y serializar revocación y mutación para evitar permisos obsoletos.

#### Scenario: Revocar un paciente entre varios
- **WHEN** se revoca F1-P1 y siguen activos F1-P2 y F2-P1
- **THEN** F1 pierde acceso a P1 mientras los otros pares conservan acceso

#### Scenario: Carrera con completado
- **WHEN** la revocación confirma antes de la autorización transaccional de un completado
- **THEN** no se guarda entrega, puntos ni insignia y no se muestra éxito
- **AND** una operación confirmada antes de la revocación conserva su historial

### Requirement: Contexto de paciente activo
Las vistas familiares de seguimiento, actividades y comentarios MUST compartir un paciente activo validado. MUST NOT mezclar actividades ni totales entre pacientes.

#### Scenario: Sin pacientes
- **WHEN** la lista autorizada está vacía
- **THEN** se explica el estado y cómo aceptar un vínculo sin controles de actividad habilitados ni paciente ficticio por defecto

#### Scenario: Un paciente
- **WHEN** existe exactamente un vínculo autorizado
- **THEN** se selecciona ese paciente y se identifica por nombre sin exigir selección redundante

#### Scenario: Varios pacientes
- **WHEN** existen varios vínculos autorizados y no hay selección vigente
- **THEN** se ofrece «Paciente activo» con «Elegí un paciente» y no se muestran datos mezclados
- **AND** al elegir uno todas las vistas y acciones familiares usan únicamente ese contexto

### Requirement: Actividades autorizadas e idempotentes
La API MUST comprobar tanto la relación vigente como la pertenencia y visibilidad de la actividad. MUST conservar campos válidos y una sola entrega/recompensa por actividad, usando puntos del servidor. MUST aplicar la misma autorización a paginación, comentarios y resúmenes.

#### Scenario: Dos familiares completan la misma actividad
- **WHEN** ambos tienen vínculo activo con el paciente y confirman simultáneamente
- **THEN** se registra una sola entrega y una sola recompensa, sin duplicar insignias

#### Scenario: Recurso cruzado
- **WHEN** una petición combina un paciente autorizado con una actividad de otro paciente o actividad no compartida
- **THEN** recibe el mismo rechazo que un recurso inexistente, sin escritura ni datos ajenos

### Requirement: Progreso sustentado en hechos
El sistema MUST reutilizar únicamente seguimiento básico existente calculado sobre actividades y entregas persistidas autorizadas. MUST NOT fabricar progreso, puntos, insignias, históricos clínicos ni importar los de una demo local como reales.

#### Scenario: Datos existentes del paciente
- **WHEN** se consulta progreso de P1 con actividades y entregas persistidas
- **THEN** los totales corresponden exclusivamente a P1 y a la proyección permitida al solicitante, sin datos de P2 ni actividades ocultas

#### Scenario: Ausencia de datos o error
- **WHEN** no hay actividades o falla la carga
- **THEN** se distingue «Sin actividades» de «No disponible», sin porcentaje inventado ni éxito simulado

### Requirement: Visibilidad familiar limitada a Hogar
El sistema MUST permitir al familiar vinculado consultar actividades de Hogar y el progreso correspondiente. MUST excluir actividades de Consulta y notas privadas de Consulta desde el backend, no solo visualmente. MUST NOT revelar esos datos por comentarios, puntos, insignias, porcentajes, totales o paginación. Este alcance está confirmado; no implica que exista hoy un modelo persistente de notas privadas.

#### Scenario: Mismo paciente con Hogar y Consulta
- **WHEN** un familiar activo consulta actividades, comentarios o progreso de un paciente con datos de ambos ámbitos
- **THEN** recibe solo Hogar y datos explícitamente compartidos, con progreso derivado únicamente de Hogar y ninguna nota privada de Consulta

#### Scenario: Petición directa de Consulta
- **WHEN** el familiar intenta leer o completar una actividad de Consulta del mismo paciente vinculado
- **THEN** se rechaza sin datos privados, entrega ni recompensa, aunque el JWT y el vínculo familiar sean válidos

#### Scenario: Revocación con sesión aún válida
- **WHEN** se confirma la revocación y el familiar conserva un JWT válido y una pantalla abierta
- **THEN** sus nuevas lecturas y escrituras sobre ese paciente son rechazadas por backend
- **AND** la interfaz elimina el contexto al detectar la revocación, sin esperar al vencimiento del JWT para aplicar la autorización

### Requirement: Limpieza y respuestas tardías
El cliente MUST limpiar contexto, borradores y datos anteriores al cambiar paciente, cerrar sesión o cambiar cuenta. MUST cancelar solicitudes e ignorar respuestas de una generación anterior; MUST revalidar al recuperar visibilidad y antes de nuevas acciones.

#### Scenario: Cambio mientras carga
- **WHEN** llega una respuesta de P1 después de seleccionar P2 o iniciar otra cuenta
- **THEN** no se renderiza ni altera el estado de P2 o de la cuenta nueva

#### Scenario: Revocación detectada o servicio inaccesible
- **WHEN** la revalidación rechaza el vínculo o no puede comprobarlo
- **THEN** se ocultan datos previos, se informa el estado y no se recurre a datos locales como permisos

### Requirement: Accesibilidad y móvil
El selector y la gestión de vínculos MUST funcionar con teclado y lector de pantalla, labels y errores asociados, foco estable y anuncios de contexto. MUST conservar identidad visual por rol, nombres visibles, contraste y uso a 320 px y zoom 200 % sin depender solo del color.

#### Scenario: Selección accesible
- **WHEN** un familiar cambia de paciente por teclado en móvil o escritorio
- **THEN** el nombre activo y el resultado se anuncian sin perder el foco ni confundir acciones con el paciente anterior

### Requirement: Privacidad y preservación de capacidades
Las rutas nuevas MUST conservar JWT/roles existentes, usar no-store y errores saneados; MUST NOT exponer directorios de pacientes/familiares, tokens de invitación en logs, datos de otras familias ni enviar contexto de pacientes a Gemini. La PWA, el ayudante y notificaciones MUST conservar sus contratos.

#### Scenario: Aislamiento entre familias
- **WHEN** otra familia intenta adivinar IDs, alterar cursores o llamar directamente a lecturas/escrituras de P1
- **THEN** no recibe nombres, actividades, progreso, comentarios ni diferencias que revelen existencia

#### Scenario: Uso del ayudante tras seleccionar paciente
- **WHEN** un familiar abre el ayudante con un paciente seleccionado
- **THEN** no se agrega información de ese paciente a la pregunta o guía enviada al proveedor
