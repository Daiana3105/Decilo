## Why

El sistema persistente de notificaciones solo crea avisos `session.login`. La demo familiar ya permite asignar actividades, invitar, aceptar, completar y revocar en backend, pero no comunica esas transiciones mediante avisos personales.

## What Changes

- Generar avisos de actividad nueva, invitación familiar, aceptación, actividad completada y revocación desde operaciones autorizadas y confirmadas en PostgreSQL.
- Reutilizar Repository/UoW, notificaciones persistentes, revisión por usuario, campana, REST y Socket.IO. No agregar canales de correo ni notificaciones push del navegador.
- Resolver destinatarios en backend; familiares solo reciben avisos de actividades de Hogar y de sus propios vínculos. No incluir códigos, nombres de pacientes, instrucciones ni notas privadas.
- Persistir los avisos y sus revisiones sin escrituras parciales, deduplicar por evento y destinatario y publicar solo tras COMMIT. Una falla secundaria recuperable no invalida la operación principal: aislarla con SAVEPOINT. Conservar el login secundario independiente.
- Agregar una migración compatible del catálogo de tipos y la identidad durable de las transiciones; no fabricar avisos históricos ni desde el seed.

## Capabilities

### New Capabilities
- `avisos-de-acompanamiento`: generación autorizada y atómica de avisos de actividades y vínculos familiares.

### Modified Capabilities
- Ninguna: se conservan los contratos de `notificaciones-usuario`, `notificaciones-tiempo-real` y `repository-unit-of-work`; se agregan productores a su infraestructura.

## Impact

Implementación en `family-demo.js`, repositorios familiares y de notificaciones, inicialización de esquema, composición en `server.js` y pruebas aisladas. Depende del cambio activo `vincular-familiar-multiples-pacientes` y de su autorización persistida. Conservar sus cambios pendientes, Gemini, ayudante, identidad visual y PWA.

## Non-goals

Implementar solo productores existentes en backend. No hacer commit, push, merge, archivo ni despliegue. No importar localStorage, crear progreso clínico, cambiar permisos, enviar códigos por notificaciones, habilitar uso real ni resolver las políticas de consentimiento y representación pendientes de la demo familiar.
