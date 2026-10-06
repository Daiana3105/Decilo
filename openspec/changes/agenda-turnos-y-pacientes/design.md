## Context

Ver `proposal.md` para motivación y los deltas de `specs/` para el contrato observable. El proyecto usa `users` con roles y JWT en PostgreSQL, repositorios inyectados y un UoW de una conexión; las notificaciones actuales persisten en la misma transacción y publican Socket.IO después de COMMIT. El acceso familiar/profesional de `family-demo.js` y su DDL solo existe en la demo aislada: no puede ser autoridad de producción. No hay todavía perfiles clínicos ni calendario persistente.

## Goals / Non-Goals

**Goals:**
- Añadir dominio aditivo de perfiles, consentimiento/autorizaciones, turnos y auditoría sin migrar datos locales ni reemplazar identidades existentes.
- Revalidar rol, vínculo y consentimiento en backend en cada lectura y escritura.
- Evitar conflictos de agenda bajo concurrencia y conservar historial y avisos confirmados.
- Preparar un despliegue gradual y reversible sin eliminar datos previos.

**Non-Goals:**
- Crear cuentas, contraseñas o recuperar identidades paciente desde el CRUD clínico; el perfil se asocia a una cuenta paciente existente.
- Diagnósticos, evoluciones, notas de sesión, adjuntos, facturación, receta, teleconsulta, sincronización externa o envío de datos a Gemini.
- Usar las tablas/relaciones de la demo familiar como permiso productivo, reescribir el login, cambiar pictogramas/tableros o modificar PWA.
- Decidir por software si una persona es representante legal: se exige una verificación institucional auditable antes de habilitar esa representación.

## Decisions

### Modelo de datos

Migración PostgreSQL aditiva, idempotente y versionada por el mecanismo de inicialización elegido; nunca `DROP`, recreación ni importación de localStorage.

- `patient_profiles`: PK/FK `patient_user_id` a `users(id)` con rol paciente validado por servicio; contacto responsable mínimo (`name`, `relationship`, `phone`, `email` nullable), estado activo/archivado, timestamps y actor que creó/actualizó. No duplica email, credenciales o rol de `users`. Archivar es lógico; no hay hard delete.
- `patient_consent_invitations`: hash único de código, alcance (`professional_access`/`family_schedule`), emisor autenticado, profesional emisor cuando aplica, vencimiento/consumo/revocación y timestamps. Los códigos se entregan manualmente; nunca se guarda el código claro.
- `patient_professional_access`: vínculo único por `professional_user_id`/`patient_user_id`, estado activo/revocado, consentimiento vigente y timestamps. No reutiliza `professional_patient_links` de `family_demo_schema.js`.
- `patient_consents`: registro inmutable por concesión, con paciente, profesional nullable para consentimiento de agenda familiar, familiar nullable para consentimiento profesional, alcance, versión del aviso, otorgante autenticado o representante verificado, relación declarada, método de captura, fecha de servidor, operador y referencia opaca opcional a evidencia institucional. No almacena copia de DNI, firma, historia clínica ni texto libre. Revocar agrega evento/auditoría y cierra el grant vigente; no reescribe el consentimiento histórico.
- `patient_family_schedule_access`: grant por paciente/cuenta familiar (no por profesional), separado del contacto responsable y de las relaciones demo. Requiere rol familiar y consentimiento explícito para compartir agenda; alta/revocación queda auditada.
- `appointments`: BIGINT identity, `patient_user_id`, `professional_user_id`, `starts_at`/`ends_at TIMESTAMPTZ`, estado restringido, versión optimista, creador/actualizador y timestamps. Sin motivo clínico ni nota libre. Los FKs restringen borrado de usuarios con historial.
- `patient_audit_events`: ledger append-only de actor, paciente, recurso, acción, campos cambiados (nombres, no valores), transición de estado, fecha del servidor y correlación opaca. La API solo inserta y roles clínicos no actualizan ni eliminan eventos.

Índices propuestos: turnos por `(professional_user_id, starts_at)`, `(patient_user_id, starts_at)`, grants por destinatario/estado, y auditoría por paciente/fecha. `status='cancelado'` conserva el registro, pero no ocupa disponibilidad. La retención de historia/auditoría y el mecanismo institucional de verificación de representación son condiciones de habilitación productiva; no se inventa un plazo legal en este cambio.

### Consentimiento y autorización

Una cuenta `paciente` existente es la identidad estable. El profesional genera un código de consentimiento aleatorio de un uso, entrega el código manualmente y el paciente autenticado previsualiza la identidad pública del profesional y el alcance antes de aceptar. Solo la aceptación consume el código y asocia al paciente del JWT; emitir el código no crea perfil ni permiso. El sistema guarda versión, alcance, actor y método, no toma `users.email`, rol o contacto responsable como consentimiento. No existe directorio global ni respuesta que confirme cuentas por email.

El alcance de atención profesional y el de compartir agenda con una persona familiar son distintos. Para agenda, el paciente autenticado emite un segundo código que entrega manualmente al familiar; este previsualiza el paciente y acepta con su propia cuenta. El grant queda ligado a esa identidad familiar y al paciente, es de solo lectura y no deriva del contacto responsable. Familiar no significa representante legal. La representación debe verificarse mediante el procedimiento institucional; sin esa verificación no se admite aceptación por representación. Revocación profesional bloquea acceso/escritura inmediata y cancela turnos futuros pendiente/confirmado en la misma transacción; revocar un share familiar quita visibilidad sin cancelar el turno.

`patient_consent_invitations` persiste solo hash, alcance, emisor, expiración, consumo/revocación y fechas. El código tiene al menos 128 bits de entropía, vence a las 24 horas y se muestra una sola vez. Preview no consume ni concede acceso; aceptación verifica rol, expiración y estado y consume el código en la misma transacción que crea consentimiento/grant. Rechazar códigos inválidos/usados/expirados con respuesta genérica; limitar intentos. Nunca escribir códigos en logs, URL, localStorage o emails.

### API y autorización

Todas las rutas privadas usan JWT vigente, `Cache-Control: no-store`, DTO allowlist y errores saneados. `POST /api/patient-consent-invitations` emite código según rol emisor; `POST /api/patient-consent-invitations/preview` revela solo profesional/alcance o paciente/alcance a un receptor del rol correspondiente; `POST /api/patient-consent-invitations/accept` consume atómicamente el código autenticado. Se mantienen `GET/POST /api/patients`, `GET/PATCH/DELETE /api/patients/:id` (DELETE = archivo lógico); `GET/POST /api/appointments?from&to&patientId`, `GET/PATCH /api/appointments/:id`, `POST /api/appointments/:id/confirm|cancel|attend`; paciente usa `GET /api/me/appointments`; familiar usa `GET /api/family/appointments`. Las rutas no aceptan actor, rol ni destinatarios del body.

El profesional solo lista y opera perfiles/turnos si su `patient_professional_access` está activo y el consentimiento no está revocado. Paciente: `patient_user_id === request.user.id`. Familiar: grant de agenda activo, vínculo vigente y rol familiar comprobados en la misma lectura. IDs inexistentes, ajenos o revocados se responden de forma indistinguible (`404`) en recursos individuales. Listados devuelven únicamente filas autorizadas; no mezclan pacientes aunque llegue un filtro alterado.

### Fechas, horarios y superposición

Persistir instantes absolutos `TIMESTAMPTZ`; aceptar RFC 3339 con offset explícito. Preferencia IANA del profesional con migración por defecto `America/Argentina/Buenos_Aires`; la UI calcula límites día/semana/mes en esa zona y los convierte a instantes UTC. Si un horario local cae en una hora DST inexistente/ambigua, exigir una elección inequívoca y enviar offset. Validar `ends_at > starts_at`, 15–180 minutos, grilla de cinco minutos, inicio futuro al crear/reprogramar, confirmar solo antes del inicio y marcar atendido solo una vez transcurrido el final. Las vistas históricas sí pueden consultar intervalos pasados.

Los rangos son `[start,end)`, permitiendo turnos consecutivos. Para evitar carreras sin exigir una extensión PostgreSQL, cada escritura bloquea las filas de profesional y paciente en orden ascendente de ID dentro del UoW, verifica solapamientos contra turnos no cancelados y escribe/actualiza antes del COMMIT. Todas las rutas de mutación deben usar el mismo bloqueo. Una restricción de versión evita sobrescrituras perdidas; dos operaciones concurrentes de la misma persona/profesional no pueden confirmar intervalos solapados.

### Estados e historial

Crear en `pendiente`; transiciones únicas: `pendiente -> confirmado|cancelado`, `confirmado -> atendido|cancelado`. Turnos `atendido` y `cancelado` son terminales; edición solo sobre `pendiente`/`confirmado`, sin cambiar paciente/profesional. Reprogramar conserva el ID y audita antes/después; reemplazar paciente exige cancelar y crear otro. No se borra un turno.

### Avisos y COMMIT

El servicio persiste mutación de turno, evento de auditoría, filas `notifications` (tipo/catálogo ampliado aditivamente) y revisiones de destinatarios en la misma conexión/UoW. Tras COMMIT confirmado publica `notifications:changed`; no publica antes, ante rollback ni ante COMMIT incierto. Si la publicación Socket.IO falla, la fila sigue recuperable por REST. Los avisos usan plantillas estáticas genéricas, sin nombre, hora, contacto, motivo, nota o ID. Audiencias se resuelven desde grants dentro de la transacción y se excluye cualquier destinatario revocado. No se cambia la semántica secundaria del aviso de login.

### Privacidad, auditoría y almacenamiento cliente

Solo almacenar los campos mínimos de contacto acordados; ningún campo de motivo clínico. El profesional autorizado y paciente consultan contacto responsable; familiar no recibe ese DTO. Registrar accesos y mutaciones sensibles con actor, paciente, recurso, acción/resultado, fecha y correlación, sin valores personales, JWT, cuerpos o IP por defecto. Los errores/logs exponen código saneado. Toda lista/mutación revalida permisos y no usa respuestas anteriores como autorización.

La interfaz conserva solo selección efímera de vista; datos y formularios se recuperan de la API y respuestas son `no-store`. No copiar perfiles/agenda a localStorage, sessionStorage, caché PWA ni prompt de Gemini. El service worker y la allowlist de build no incorporan endpoints privados.

### Migración y despliegue

1. Añadir tablas, checks, índices y tipos de notificación en una transacción de DDL idempotente, bajo lock de inicialización; añadir preferencia de zona con default para usuarios existentes. No crear permisos a partir de relaciones demo ni generar consentimientos históricos.
2. Verificar esquema sobre PostgreSQL efímero y snapshots pre/post que demuestren preservación de users, avisos y datos existentes.
3. Desplegar API capaz de leer/escribir solo grants consentidos; configurar y aprobar procedimiento de consentimiento, representación, retención y recuperación de cuenta antes de admitir pacientes reales.
4. Desplegar UI después de health/API y habilitar por rol. Verificar rollback compatible con nuevas notificaciones: versiones anteriores que reduzcan el CHECK de tipos no deben arrancar sobre filas nuevas; usar release compatible o detener nuevas escrituras y mantener esquema ampliado, nunca borrar filas para volver atrás.

## Risks / Trade-offs

- [Consentimiento/representación insuficientemente verificados] → No habilitar acceso real hasta que la institución configure proceso de verificación y retención; contacto responsable no equivale a representante.
- [Carrera de reservas] → Bloqueos ordenados por paciente y profesional, consulta de solapamiento dentro del mismo UoW y pruebas concurrentes PostgreSQL.
- [Revocación con turnos futuros] → Cancelar futuro pendiente/confirmado en la transacción de revocación, avisar en genérico y conservar historia.
- [Datos sensibles en avisos/auditoría] → Plantillas genéricas, auditoría de nombres de campos y no valores, DTO mínimos, `no-store` y pruebas de ausencia de secretos.
- [Rollback con tipos de aviso nuevos] → Mantener esquema aditivo y usar versión API compatible; no revertir DDL ni eliminar datos.
- [Cuentas paciente preexistentes] → El módulo no resuelve creación de credenciales/identidad ni recuperación; el alta de cuenta sigue el flujo de autenticación existente.
