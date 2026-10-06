## Context

Inspección del código y pruebas al 2026-10-06:

| Fuente | Comportamiento comprobado | Reutilización / límite |
| --- | --- | --- |
| app.js: seed, relationshipFor, patientsForCurrentUser | Relaciones con professionalId, patientId y familyIds locales; varios familiares representables | Reutilizar cardinalidad y nombres; nunca convertirlos en permisos backend |
| app.js: openPatientModal (definición efectiva final) | Crea paciente local y busca un único familiar por email | No crea cuenta PostgreSQL ni acredita identidad; sustituir este acceso al flujo seguro sin confiar en coincidencias locales |
| app.js: patientSelect, renderActivities, renderHome | Selector en progreso; actividades y totales mezclan pacientes; selección inicial pac-1 | Centralizar contexto familiar y filtrar todas las vistas por paciente activo |
| app.js: renderProgress, completeActivity, saveComment | Seguimiento básico real del demo: asignadas/completadas, puntos, insignias, porcentaje y comentarios | Conservar cálculos, no inventar progreso clínico; migrar la fuente de este flujo |
| db.js / server.js / auth.js | PostgreSQL persiste usuarios y notificaciones; JWT se contrasta con usuario vigente; no hay API de relaciones/actividades | Agregar persistencia y rutas acotadas, reutilizar autenticación |
| repositories/, unit-of-work.js | SQL parametrizado, ejecutor inyectado; una conexión y responsabilidad transaccional única | Reutilizar para autorización y escrituras atómicas |
| e2e/activities.spec.js | Pruebas con pacientes locales sintéticos; rechazo sin escritura y asignación válida | Mantener cobertura; complementar con autorización API, no tratarlas como prueba de aislamiento remoto |
| test/README.md, ARCHITECTURE.md | Base efímera protegida; dominio local explícitamente demostrativo | Mantener protecciones y documentar frontera local/remota |

Hay declaraciones antiguas duplicadas en app.js; la implementación futura debe modificar consumidores efectivos, no aprovechar este cambio para una limpieza general. Actualmente no existe una fuente de progreso persistente remoto ni un mecanismo administrativo de acreditación profesional-paciente.

### Evidencia de acreditación actual (revisada el 2026-10-06)

- La definición efectiva final de `openPatientModal` en app.js comprueba el rol local profesional, crea un ID `pac-${Date.now()}` y agrega `{ professionalId: session.userId, patientId, familyIds }` a `data.relationships`; `persist()` escribe localStorage. No consulta una autorización remota ni requiere aceptación del paciente.
- `relationshipFor` y `canAccessPatient` leen esas relaciones locales. Las pruebas de actividades preparan esas mismas relaciones sintéticas en el navegador: prueban validaciones de interfaz, no acreditación del vínculo.
- `db.js` inicializa users, notifications y notification_state; no persiste relaciones profesional-paciente. `server.js` expone auth, salud, notificaciones y ayudante, sin alta/consulta de relaciones acreditadas.
- `validateRegistration` en auth.js permite los tres roles válidos, incluido profesional; `authenticateToken` verifica JWT y usuario vigente. Eso acredita la sesión y el rol de cuenta, no una relación profesional-paciente ni una habilitación profesional.

Faltan una fuente confiable persistente de esa relación, el procedimiento y responsable de su alta, la comprobación de identidad del paciente y su revocación. No existe evidencia de un administrador o circuito de aprobación ya implementados; no se asumen. Diseñar estos prerrequisitos antes de habilitar invitaciones reales y no importar relaciones locales como acreditadas.

## Goals / Non-Goals

Garantizar N:M, acceso explícito y revocable y contexto visual coherente. Conservar actividades y progreso básico existentes solo cuando estén respaldados por datos autorizados. No incorporar métricas clínicas, representación legal automática, catálogo público de usuarios, acceso familiar a otros familiares, nuevo rol administrador, cambios a Gemini/PWA ni migración general de todo el dominio.

## Decisions

### 1. Fuente de verdad y migración incremental

PostgreSQL será fuente exclusiva para vínculos y datos de acompañamiento. Los IDs de usuarios son los de users, no pac-1 ni IDs locales generados por Date.now. Ninguna cuenta obtiene vínculos por abrir la demo, registrar un rol profesional o compartir email/apellido. No subir ni fusionar automáticamente el localStorage existente.

Etapas: acreditar relaciones profesionales persistentes; agregar vínculos familiares; persistir actividades/entregas/comentarios y resumen mínimo; conectar vistas familiares y consumidores profesionales/paciente que escriben esos mismos registros; retirar el fallback local de esos flujos. No habilitar un modo híbrido que liste relaciones remotas y lea/escriba sus actividades desde datos locales. Datos locales previos se preservan como demo separada, sin presentarlos como datos de cuentas nuevas ni como progreso migrado. Ampliación posterior autorizada: persistir también los tableros de la demo y leerlos en el comunicador de su paciente, sin importar localStorage ni agregar permisos familiares. La frase permanece transitoria.

Tableros: tabla aditiva `patient_boards`, repositorio con ejecutor inyectado y UoW del servicio existente. Autorización con los mismos vínculos profesionales y bloqueo del paciente; paciente lee solo los propios, familiar no accede, edición limitada al autor actualmente vinculado y al paciente original. Pérdida del vínculo profesional bloquea a ese profesional, sin retirar al paciente sus tableros ya asignados. Validar nombre, catálogo, tamaño y duplicados; máximo 100 tableros por paciente. La interfaz obtiene pacientes al abrir el editor, confirma guardado solo tras respuesta exitosa, descarta respuestas tardías por sesión/vista y limpia frase al cambiar tablero/cuenta. Comunicar errores sin fallback local; permitir selección de varios tableros. Mantener rutas/semántica de actividades, avisos, Gemini y PWA.

### 2. Modelo y responsabilidades

### Primera etapa: provisionamiento reproducible de demo (propuesto, no implementado)

Crear en una etapa de implementación un comando local explícito `node scripts/seed-family-demo.js`, nunca ejecutado al arrancar la API, desde HTTP, durante el build ni por registrar una cuenta. Reutilizar bcrypt/UserRepository, repositorios de relaciones y UoW; DDL independiente. La persona operadora lo ejecutará únicamente contra una base PostgreSQL aislada de demo con nombre propio, marcador persistente de propiedad y opción explícita de modo demo. Rechazar bases sin ese marcador, modo producción, destinos no locales y cuentas ajenas al conjunto de fixtures; no seleccionar la base habitual por defecto ni leerla como fallback. Definir la configuración del destino aislado explícitamente al implementar, sin incluir credenciales en Git o en este plan.

Fixture de la demo ajustada a la instrucción de implementación: un profesional, un familiar y dos pacientes ficticios, con correos `.test` e identificadores lógicos estables. Crear solo vínculos profesionales con esos dos pacientes; ningún vínculo familiar activo hasta aceptar invitaciones. Las otras familias de las pruebas se crean exclusivamente en PostgreSQL efímero. Resolver IDs por el registro de propiedad de la fixture; no por coincidencias locales o IDs codificados. Un correo `.test` o un rol profesional no habilitan esta demo por sí solos.

Provisionamiento atómico e idempotente: usuarios con hashes bcrypt, relaciones y marca de fixture se confirman juntos. Al repetir, verificar identidad/rol/propiedad y conservar cuentas, contraseñas, datos, invitaciones consumidas y revocaciones; no reactivar relaciones revocadas ni sobrescribir una cuenta preexistente no propiedad de la fixture. Colisión o inconsistencia implica rechazo y rollback completo. Contraseñas sintéticas suministradas mediante entrada privada o archivo local excluido de Git, sin mostrarlas en logs. Reiniciar el escenario requiere otra base aislada y una acción explícita posterior; el seed no borra datos ni volúmenes.

Antes de emitir o aceptar cada invitación, el backend verifica que actor, paciente y familiar pertenecen al conjunto sintético registrado y que el vínculo profesional-paciente persistido continúa activo. El modo demo debe habilitarse solo para ese entorno y fallar cerrado fuera de él. Un vínculo falsificado en localStorage, una cuenta recién registrada como profesional o el conocimiento del código no reemplazan esa comprobación. No importar datos del navegador ni modificar configuración del ayudante o su política de cuentas.

La revisión del código anterior sigue vigente: hoy ese mecanismo no existe. El seed propuesto resuelve solo cómo preparar relaciones ficticias autorizadas para la demo, no quién acredita relaciones profesionales reales. Consentimiento y representación para uso real siguen pendientes, sin presumirlos a partir de la aceptación de un familiar ficticio.

Tablas aditivas propuestas, con FKs a users y timestamps del servidor:
- professional_patient_links: par profesional-paciente único, estado/revocación. En demo, alta por el comando local protegido y registro de propiedad de fixture; en uso real, procedimiento de acreditación aún pendiente. No exponer autoasignación por rol ni aceptar relaciones del navegador.
- family_patient_links: par paciente-familiar único, estado activo/revocado, otorgante y fechas; reactivar exige una nueva invitación aceptada. Revocar un par no afecta otros pares.
- family_link_invitations: paciente, profesional otorgante, familiar destinatario, hash del código aleatorio, expiración a las 24 h según reloj del servidor, consumo/revocación. Código de un solo uso con al menos 128 bits de entropía criptográfica, codificación legible para copiar; no PIN predecible. Guardar solo hash con índice único; mostrar el código una vez al profesional autenticado para entrega manual al familiar, sin emails. Nunca en logs/URL/localStorage. Aceptar por POST autenticado y cuerpo acotado. Reemitir invalida códigos pendientes previos del mismo par y requiere nueva aceptación; no permite recuperar el código original desde su hash.
- activities: paciente, profesional y campos ya existentes (título, instrucción, Hogar/Consulta, puntos, estado), con IDs backend.
- deliveries: actividad, paciente, autor, origen, fecha y puntos determinados por servidor; UNIQUE(activity_id) conserva una sola entrega/recompensa aunque dos familiares actúen a la vez. FK compuesta o validación equivalente impide discordancia actividad/paciente.
- patient_comments: paciente, autor y fecha del servidor, texto acotado; activity_id opcional debe pertenecer al paciente.
- Insignias: en esta demo se deriva «Primeros pasos» del umbral existente de 25 puntos en entregas visibles, sin una segunda tabla o escritura. UNIQUE(activity_id) impide duplicar entregas/puntos. No se admiten ediciones/borrado de entregas; el familiar nunca recibe insignias derivadas de Consulta.

DDL aditivo e idempotente independiente de transacciones de negocio; no modificar tablas de usuarios/notificaciones. FamilyLinkRepository concentra consultas de relaciones/invitaciones; PatientActivityRepository actividades/entregas; PatientProgressRepository comentarios e insignias/resúmenes. Reciben query(), no contienen reglas de negocio ni BEGIN/COMMIT/release. El servicio decide autorizaciones, disponibilidad, recompensa, validaciones y DTO; UoW es único responsable transaccional. UserRepository valida existencia y rol de participantes.

### 3. Alta y revocación autorizadas

Decisión confirmada: el profesional invita únicamente para sus pacientes vinculados y el familiar acepta; se admiten varios pacientes por familiar y varios familiares por paciente. En demo, comprobar en backend el vínculo ficticio persistente provisionado por el comando protegido; la acreditación para uso real sigue pendiente. Invitación dirigida a una cuenta familiar ficticia existente con código entregado manualmente. El familiar autenticado ingresa el código y confirma: tenerlo no otorga acceso a otra cuenta. No revelar listados de usuarios ni distinguir cuentas ajenas por errores detallados. La aceptación revalida profesional-paciente, pertenencia a la fixture, destinatario, rol, expiración y estado en la misma transacción que consume la invitación y activa el vínculo. Bloquear la invitación para que dos aceptaciones simultáneas no la consuman dos veces. Limitar también intentos de aceptación (propuesta 5/min por cuenta y límite global acotado); rechazos genéricos sin códigos ni contenido en logs.

Decisión confirmada: la revocación corta el acceso, no se limita a ocultar un elemento del selector. Diseño para la demo: profesional autorizado o propio familiar mediante salida del vínculo; un familiar no puede gestionar otros familiares. Al revocar el vínculo profesional otorgante se invalidan invitaciones y accesos dependientes, sin transferencia automática a otro profesional. El seed no los reactiva. La política de autoridades y la facultad del paciente/representante para aprobar o revocar requieren confirmación antes de datos reales.

Bloquear consistentemente relación profesional, pareja familiar-paciente y actividad en orden determinista para serializar aceptación, revocación y completado. Una escritura que confirma antes de revocar puede conservarse; una revocación confirmada antes de autorizar una nueva operación debe impedirla. No prometer retirar bytes ya entregados ni revertir un COMMIT incierto. Una operación rechazada no deja vínculo, entrega, comentario, puntos ni éxito parcial. No agregar eventos Socket.IO ni alterar notificaciones existentes.

### 4. Contratos propuestos (no implementados)

Todos autenticados mediante authMiddleware; actor/rol tomados del servidor, nunca de body. Respuestas privadas no-store; SQL parametrizado; entradas acotadas, sin logs de contenido ni tokens. IDs como strings en DTO, validación de tipo/rango contra persistencia. Rutas nuevas no reemplazan auth/notificaciones/assistant.

| Operación | Contrato propuesto |
| --- | --- |
| GET /api/family/patients | Familiar: { patients: [{ id, name }] } de vínculos activos, sin correos ni otros familiares |
| POST /api/patients/:patientId/family-invitations | Profesional con vínculo persistente de demo; destinatario ficticio exacto, sin búsqueda pública; 201 { invitationId, code, expiresAt } privado para entrega manual; límite propuesto 5/min por actor y 5 invitaciones pendientes por paciente |
| POST /api/family/invitations/accept | { code }; destinatario familiar ficticio; 200 { patient: { id, name } }; código usado/revocado/expirado o ajeno: mismo rechazo sin datos; consumo único transaccional |
| DELETE /api/patients/:patientId/family-links/:familyId | Profesional acreditado o familiar que sale de su propio vínculo: 204; repetición autorizada idempotente |
| GET /api/patients/:patientId/activities | { activities, nextCursor }; autorización en consulta, paginación 20/max 100, orden estable; familiar exclusivamente Hogar (decisión confirmada) |
| POST /api/patients/:patientId/activities | Profesional acreditado; mismos campos válidos del formulario actual; 201 { activity }; rechazo sin escritura |
| POST /api/patients/:patientId/activities/:activityId/complete | Paciente propio o familiar activo autorizado para esa actividad; 200 { delivery }; repetición devuelve entrega existente, sin duplicar puntos |
| GET /api/patients/:patientId/progress | { assigned, completed, points, badges, completionPercent }; solo hechos persistidos dentro de la proyección autorizada |
| GET/POST /api/patients/:patientId/comments | Listado paginado { comments, nextCursor }; familiar activo escribe { text, activityId? }, 201 { comment }; profesional acreditado/paciente propio leen |

Errores nuevos: 400 entrada inválida, 401 sesión inválida, 403 operación prohibida por rol sin revelar existencia, 404 idéntico para recurso inexistente/ajeno/revocado, 429 límite, 503 dependencia. Datos omitidos del DTO no deben filtrarse en contadores, cursores o mensajes. Puntos de la entrega provienen de actividad; no aceptar authorId, rol, recompensa ni permisos del cliente. Visibilidad confirmada: familiar solo Hogar y su progreso; excluir Consulta y sus notas privadas también de totales, porcentajes, puntos, insignias, comentarios y cursores. No entregar una insignia global si su cálculo revela entregas de Consulta; conservar las reglas existentes para usuarios autorizados y mostrar al familiar solo resultados derivables de Hogar, sin inventar recompensas.

Hoy app.js tiene comentarios locales sin clasificación de privacidad ni una entidad de notas privadas de Consulta. La exclusión es un requisito futuro, no una capacidad actual comprobada. El nuevo flujo de comentarios familiares será explícitamente compartido y solo admitirá actividad Hogar o comentario general dentro del contexto autorizado; no reutilizarlo para notas privadas. No importar comentarios locales sin clasificación ni publicar campos desconocidos por defecto. Una futura implementación de notas privadas debe quedar separada de este DTO; crearlas no forma parte de este cambio.

### 5. Selector y ciclo de sesión

Reutilizar patientSelect y activePatientId para Seguimiento, Actividades de hogar y Comentarios. Cero pacientes: explicación y acceso a aceptar invitación, sin selector vacío ni acciones sobre pac-1. Uno: seleccionar solo tras validación backend y mostrar nombre. Varios: selector nativo etiquetado «Paciente activo», opción inicial «Elegí un paciente» hasta selección explícita; no mezclar totales. Nombre activo visible junto a acciones y formularios.

Cambio: limpiar inmediatamente listas, resumen, borrador/comentario, selección de actividad y errores; abortar solicitudes y usar generación de sesión/paciente para ignorar respuestas tardías aun si la cancelación llega tarde. Capturar paciente al iniciar una mutación: nunca retargetear una escritura al nuevo seleccionado. Mantener selección solo en memoria y revalidarla al restaurar/volver a estar visible/navegar. No guardar datos de pacientes ni selector como autoridad en localStorage ni enviarlos al ayudante.

Logout, cambio de cuenta o 401: borrar contexto y generación antes de renderizar nueva sesión, manteniendo limpieza del ayudante y notificaciones. Ante 404/revocación o fallo de revalidación: ocultar datos previos, mensaje accesible, recargar vínculos sin mostrar una lista vieja como autorizada. Sin red mostrar indisponibilidad; nunca fallback local. La revocación se aplica en cada operación backend y se descubre en cliente al siguiente evento de revalidación; no prometer sincronización inmediata de pantallas inactivas sin canal nuevo.

### 6. Accesibilidad y seguimiento honesto

Conservar violeta familiar y los otros roles; nombre/texto además de color. Select/acciones con labels, teclado y foco estable, anuncios polite al cambiar contexto, errores asociados, sin selección inesperada. Verificar 320/768/1280 px, zoom 200 %, contraste y lector de pantalla manual. Confirmar revocación indicando paciente, sin impedir cancelar.

Solo asignadas/completadas, puntos e insignias derivables de persistencia autorizada; no predicciones clínicas, históricos importados ni porcentajes simulados. Cero actividades: estado «Sin actividades», completionPercent null en vez de aparentar evaluación; error de carga: «No disponible», no cero inventado. No presentar el seguimiento remoto como existente antes de implementar su persistencia.

## Risks / Trade-offs

La autorización backend amplía el trabajo más allá del selector porque el dominio actual es local. División incremental sin habilitar privacidad parcial. La demo requiere implementar y probar el provisionamiento protegido y las relaciones persistentes antes de invitar; poseer JWT profesional no es suficiente. Para uso real, acreditación y consentimiento/representación siguen bloqueados por decisiones pendientes. La entrega manual de códigos no prueba consentimiento clínico ni representación. Migración automática de demos mezclaría identidades: descartada. Revocación concurrente requiere pruebas con PostgreSQL real aislado. Preservar datos y cambios pendientes, Gemini y PWA; ningún paciente seleccionado se agrega al prompt de IA.

## Validation strategy

Unitarias de políticas/DTO; integración con base efímera para N:M, invitaciones y rollback/concurrencia; HTTP adversarial para pacientes/actividades ajenos; Playwright familiar con dos pacientes y segundo familiar compartiendo uno, más otra familia aislada. Mantener regresiones de actividad válida/rechazada, auth, notificaciones, ayudante y PWA. Build, suite Node, Playwright, OpenSpec estricto y diff-check. Pruebas manuales se registran solo al realizarlas; sin APIs pagas.

## Concreción de la demo implementada

Las rutas propuestas se agrupan bajo `/api/family-demo`: `/capabilities`, `/patients`, `/invitations/accept` y `/patients/:patientId/...`. Se añade listado de vínculos familiares para el profesional autorizado. No cambia ningún contrato previo. Las tres fábricas de repositorios tienen archivos propios; schema y seed son explícitos, protegidos por marcador. Se usa un bloqueo de fila de paciente compartido por las operaciones para serializar revocación y escrituras. Los rechazos no se registran con cuerpos/códigos privados.

Los contadores de invitaciones son limitados, en memoria; se reinician con la API y no son un mecanismo productivo distribuido. La nueva vista comprueba capacidades sin fallback local ante error; cuando la demo está deshabilitada explícitamente permanece el dominio local anterior. Cuando está habilitada, acompañamiento y sus escritores usan exclusivamente PostgreSQL. Gemini y PWA no reciben contexto de pacientes ni cambian su configuración. Detalle de acceso y aislamiento en `FAMILY_DEMO.md`.
