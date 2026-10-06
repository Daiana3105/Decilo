## Context

Inventario anterior a esta implementación, incluidos los cambios pendientes de la demo:

| Fuente | Existe hoy | Faltante para este cambio |
| --- | --- | --- |
| `notifications.js`, `login-notifications.js` | `createLogin`, deduplicación, revisión y publicación secundaria posterior a UoW | Productor reutilizable dentro de una transacción ya abierta |
| `db.js`, repositorios de notificaciones | `CHECK(type = 'session.login')`, UNIQUE(user_id,event_id), event_id UUID, estado bloqueado y revisión BIGINT | Ampliar tipos conservando login; identidad estable de eventos de dominio |
| `family-demo.js`: `assign` | Inserta actividad de Hogar o Consulta con paciente/profesional autorizados | Crear aviso a destinatarios autorizados |
| `invite` / `accept` | Código con hash, vencimiento, consumo y activación transaccionales | Aviso genérico sin código; detectar activación efectiva y conservar ID de invitación internamente |
| `complete` | Entrega única por actividad; repetición devuelve la entrega existente | Usar resultado de inserción para distinguir cambio efectivo |
| `revoke` y repositorio de vínculos | Desactiva vínculo e invalida códigos; repetición no diferencia transición | Detectar activo→revocado e identificar cada generación del vínculo |
| `realtime.js`, `server.js` | Salas personales autenticadas, `notifications:ready`, `notifications:changed` con revisión/contador | Inyectar publicación en el servicio familiar tras resolución del UoW |

Al planificar no existían eventos de dominio publicados para esos cinco flujos. La implementación los conecta ahora sin incorporar actividades locales del MVP como fuente autorizada. El progreso disponible es entregas/puntos/resumen; no se agrega progreso clínico ni eventos inferidos desde porcentajes. Las pruebas de login/UoW/notificaciones y `test/family-demo.test.js` sirven de regresión; las nuevas pruebas de acompañamiento cubren la integración.

## Decisions

### Eventos y destinatarios mínimos

Excluir al actor de avisos sobre su propia acción. Resolver cuentas, roles y vínculos vigentes en PostgreSQL bajo el bloqueo del paciente; no aceptar destinatarios del cliente.

| Tipo propuesto / transición | Destinatarios | Texto genérico orientativo |
| --- | --- | --- |
| `activity.assigned`: actividad realmente insertada | Paciente; familiares activos únicamente si es Hogar | Tenés una nueva actividad / Hay una nueva actividad de Hogar |
| `family.invited`: invitación creada | Solo familiar destinatario, sin acceso al paciente todavía | Tenés una invitación. Solicitá el código a quien te invitó |
| `family.accepted`: vínculo pasa a activo | Profesional invitante si conserva vínculo autorizado | Se aceptó una invitación familiar |
| `activity.completed`: primera entrega persistida | Profesional que asignó, si sigue vinculado al paciente | Se completó una actividad |
| `family.revoked`: vínculo pasa a inactivo | Familiar afectado; profesional registrado en el vínculo si sigue autorizado; excluir actor | Se revocó un vínculo de acompañamiento |

No se notifica a otros profesionales/familias por compartir rol o paciente. Una invitación no otorga acceso. El aviso de revocación informa al afectado sobre su propio vínculo perdido y no concede acceso residual. No enviar a familiares ningún evento de Consulta, ni siquiera un contador indirecto. Aceptación o revocación repetida sin transición no genera aviso. Invalidar invitaciones pendientes sin vínculo activo no inventa una revocación de vínculo.

### Atomicidad y publicación

El servicio de dominio mantiene las reglas de negocio y selecciona destinatarios; los repositorios solo consultan/escriben con parámetros. Extender su contexto con el mismo cliente del UoW y un escritor transaccional de avisos. No llamar `createLogin` ni abrir otro UoW desde el callback.

Orden: bloqueo del paciente → validación/transición → identidad del evento → estados de destinatarios ordenados por ID → inserciones deduplicadas → incremento de revisión solo por inserción efectiva → summaries → COMMIT → publicación privada. El UoW existente conserva responsabilidad exclusiva de BEGIN/COMMIT/ROLLBACK/release y sus límites locales. Su callback devuelve el resultado público original más summaries internos; estos no cambian las respuestas HTTP.

Decisión actualizada por instrucción explícita de implementación: una falla secundaria recuperable no invalida la operación familiar. Después de la escritura principal se abre un SAVEPOINT para selección de destinatarios, registro del evento, avisos y revisiones. Ante error se ejecuta ROLLBACK TO SAVEPOINT y RELEASE SAVEPOINT, se registra un error saneado y se confirma la operación principal sin avisos parciales. El UoW sigue siendo el único responsable del BEGIN/COMMIT/ROLLBACK global y release; el escritor secundario solo controla su savepoint. Un error principal revierte todo, incluidos los avisos.

No se promete recuperación si la conexión se pierde o no se puede restaurar el savepoint: en ese caso no puede garantizarse el COMMIT principal. El login continúa secundario y no bloqueante. No publicar si el UoW rechaza, incluso por COMMIT incierto o liberación posterior fallida. No asegurar rollback efectivo cuando el resultado de COMMIT sea incierto: reconciliar estado durable, sin reejecutar ciegamente la operación.

Fallo de Socket.IO tras COMMIT no revierte datos ni convierte la respuesta familiar exitosa en error. Registrar solo etapa/código/correlación saneados. Reutilizar recuperación REST al reconectar, abrir panel o volver a estar visible. No prometer entrega exactamente una vez del transporte ni agregar outbox/cola en esta etapa. Un aviso cuya persistencia falló no se recupera por REST ni se reintenta automáticamente; queda como limitación explícita, sin fabricar historia. `notifications:ready` y payload `{revision, unreadCount}` permanecen iguales; el cliente tolera señales repetidas/desordenadas.

### Identidad de evento y migración

Agregar registro interno con UUID de evento y clave única `(tipo, clave_origen)`, reutilizada por todos sus destinatarios/reintentos. Orígenes: ID de actividad para asignación, ID de invitación para invitación/aceptación, ID de actividad entregada para completado y generación de vínculo para revocación. Guardar una generación UUID en cada activación efectiva; no renovarla al aceptar un vínculo ya activo con el mismo profesional. Una reactivación posterior obtiene otra generación y permite una revocación nueva legítima. Aceptar una invitación de otro profesional autorizado conserva la reasignación existente y constituye una nueva generación de permiso; evita retener un profesional anterior ya desvinculado. Generaciones de vínculos existentes se inicializan sin avisos históricos.

Insertar evento, vínculo/entrega, notificaciones y revisiones en la misma conexión. Conservar UNIQUE(user_id,event_id); un INSERT del registro en conflicto no modifica el UUID durable ni vuelve a distribuirlo a destinatarios que se vincularon después. Dos actividades o invitaciones nuevas intencionales siguen siendo eventos distintos: deduplicar avisos no equivale a volver idempotentes todos los POST existentes. El registro no contiene códigos ni datos clínicos, y un evento sin destinatarios elegibles también se registra para no ampliar su audiencia después.

Ampliar la restricción de tipos idempotentemente preservando `session.login`, filas, IDs y fechas actuales; nunca borrar/recrear tablas. DDL independiente del UoW de negocio. Definir migración compatible con la marca/aislamiento de demo; el seed no produce avisos. Mantener strings para IDs BIGINT y revisiones.

### Privacidad e interfaz

Usar plantillas estáticas sin nombres de pacientes, títulos/instrucciones de actividades, notas, códigos ni hashes, emails, JWT o secretos en texto, Socket.IO o logs. Así, el historial retenido tras revocación no conserva información privada del paciente. No agregar enlaces con IDs privados ni metadatos al DTO existente. La campana reutiliza renderizado como texto, navegación actual, teclado, foco, móvil y limpieza al cambiar sesión; toda consulta a actividades revalida acceso en backend.

## Risks and verification

- Concurrencia revocación/asignación: mismo bloqueo del paciente; si revocación confirma primero, el familiar no recibe el aviso posterior. Un aviso anterior solo contiene texto genérico y nunca habilita acceso actual.
- Orden estable de bloqueos de estado evita ciclos entre destinatarios. Conservar timeouts y límites actuales, y probar fan-out a varios familiares sin suprimir destinatarios autorizados silenciosamente.
- Probar deduplicación concurrente, rollback completo, COMMIT pendiente/incierto, caída de publicación, reinicio, REST, privacidad y dos familias con pacientes diferentes.
- Pendientes antes de uso real: políticas de consentimiento/representación y habilitación productiva del flujo familiar. La matriz anterior es la propuesta concreta de alcance mínimo; cualquier ampliación de destinatarios requiere revisar autorización y privacidad.
