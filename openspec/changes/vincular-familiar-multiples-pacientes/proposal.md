## Why

Un familiar necesita acompañar a varios pacientes y cada paciente puede necesitar varios familiares. `relationships[].familyIds` ya representa parte de esta cardinalidad, pero vive en localStorage: no constituye autorización remota. `renderActivities` mezcla todos los pacientes vinculados y `activePatientId` parte de un ID ficticio. El selector actual se utiliza en progreso, no en todas las vistas familiares.

## What Changes

- Primera etapa limitada a demo con cuentas y datos ficticios en una base aislada. Proponer un comando local explícito e idempotente que cree cuentas sintéticas y relaciones profesional-paciente persistentes, verificadas en backend antes de invitar. No ejecutar ese comando en esta planificación.
- Invitación por código aleatorio de un solo uso con vencimiento, entregado manualmente; sin envío de emails.
- Reutilizar conceptos, navegación, selector, campos de actividad y seguimiento básico existentes, con un contexto de paciente activo consistente para el familiar.
- Diseñar vínculos muchos a muchos persistentes, invitación autorizada con aceptación del familiar y revocación independiente de cada pareja.
- Decisión confirmada: el profesional invita solo para sus pacientes vinculados y el familiar acepta. El familiar ve actividades de Hogar y su progreso; no actividades ni notas privadas de Consulta. La revocación corta el acceso en backend.
- Llevar al backend la autorización y la fuente de datos mínima de actividades, entregas, comentarios y progreso utilizados en este flujo. Un selector por sí solo no cumple el aislamiento.
- Estados explícitos sin pacientes, con uno y con varios; limpieza inmediata de contexto y respuestas tardías al cambiar paciente o cuenta.
- Conservar idempotencia de completados/recompensas, accesibilidad, identidad por rol y uso móvil.

## Capabilities

### New Capabilities
- `acompanamiento-familiar`: vínculos autorizados, selección de paciente, aislamiento y revocación en las vistas familiares.

### Modified Capabilities
- Ninguna especificación principal se reemplaza en esta planificación. La nueva capacidad concreta las garantías de autorización y seguimiento básico ya descritas en `comunicacion-fonoaudiologica`; no elimina requisitos existentes.

## Impact

Implementación futura: servicios/rutas Express, repositorios inyectados, tablas aditivas en PostgreSQL, frontend de vínculos/actividades/seguimiento, pruebas aisladas y documentación. Reutilizar authMiddleware, UserRepository, Unit of Work y el runner de pruebas protegido. No modificar contratos existentes de auth, notificaciones, Gemini o PWA.

## Non-goals

No reescritura general de app.js, progreso clínico, gráficos nuevos, inferencias de IA, envío de datos a Gemini, correo automático ni relaciones inferidas por apellido/email. No importar localStorage como fuente autorizada. La ampliación de alcance solicitada después de la demo incorpora únicamente creación/asignación/edición de tableros y lectura del comunicador desde PostgreSQL para las cuentas ficticias autorizadas. No commit, push, merge, archivo OpenSpec ni despliegue externo.

## Decisiones previas a implementar

Para la demo se define un mecanismo reproducible de provisionamiento local de relaciones ficticias en backend y entrega manual del código. Es una decisión de diseño, todavía no implementada, y no acredita relaciones reales. Se mantienen N:M, aceptación familiar, acceso exclusivo a Hogar y su progreso, exclusión de notas privadas de Consulta y revocación efectiva. Para uso real siguen pendientes acreditación profesional-paciente, consentimiento/representación del paciente o menores y facultades de revocación; no bloquean las pruebas de la demo aislada pero sí su uso con personas/datos reales.
