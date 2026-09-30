## Why

Issue relacionado: [#17 — Implementar Repository y Unit of Work en DECILO](https://github.com/Daiana3105/Decilo/issues/17), clase 10 de MetroDev.

DECILO mezcla SQL con rutas y lógica de autenticación y notificaciones. Ya existen transacciones correctas para notificaciones y para inicializar el esquema; el problema es su acoplamiento y la falta de una abstracción reutilizable con pruebas explícitas del ciclo de conexión. Este cambio hará visible la separación entre acceso a datos, reglas de negocio y control transaccional sin agregar funcionalidades públicas.

## What Changes

- Extraer SQL parametrizado de usuarios y notificaciones a repositorios que reciban un ejecutor `query`, tanto pool como cliente transaccional.
- Incorporar Unit of Work que adquiera exactamente un cliente por ejecución, controle BEGIN/COMMIT/ROLLBACK y libere o descarte ese cliente en todos los caminos posteriores a la adquisición.
- Migrar incrementalmente las transacciones del servicio de notificaciones conservando bloqueos por usuario, snapshots, límites de tiempo, idempotencia y contratos. No reescribir SQL de infraestructura ni dominios ajenos.
- Demostrar atomicidad con `createLogin`: creación perezosa de estado, inserción de aviso y aumento de revisión en la misma conexión. El login y la emisión Socket.IO permanecen fuera de esa transacción.
- Encapsular la consulta de salud en un adaptador de persistencia. Mantener el DDL de inicialización en `db.js`, con su transacción existente, sin cambiar esquema.
- Conservar las 73 pruebas generales de referencia y añadir pruebas de repositorios, commit, rollback, errores y liberación; ejecutar también build y regresiones de navegador en la etapa de implementación.

## Capabilities

### New Capabilities
- `repository-unit-of-work`: separación de persistencia, ciclo transaccional, atomicidad y compatibilidad verificable.

### Modified Capabilities
Ninguna modificación de contratos vigentes. La capacidad nueva complementa `persistencia-postgresql`, `autenticacion-segura`, `notificaciones-usuario` y `notificaciones-tiempo-real`, sin reemplazar sus requisitos.

## Impact

Ninguna tarea autoriza commit automático, merge, despliegue o archivo OpenSpec; requieren autorización posterior explícita.

Implementación futura en repositorios nuevos, Unit of Work, `auth.js`, `server.js` y `notifications.js`; integración indirecta de autenticación Socket.IO y preservación de trabajos secundarios. Ajuste futuro de la copia explícita de `Dockerfile.api`, pruebas y documentación de arquitectura. No se requieren paquetes nuevos, ORM, variables nuevas ni migraciones.

Fuera de alcance: frontend, PWA, datos demostrativos en localStorage, endpoints nuevos, cambios JWT/roles, esquema público, colas durables, outbox, reintentos automáticos, transacciones distribuidas o anidadas y refactorizaciones ajenas. Esta etapa crea solo planificación: sin código de producción, commit, despliegue ni archivo OpenSpec. El cambio PWA activo se conserva intacto.
