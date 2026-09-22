## Why

DECILO no conserva avisos consultables ni sincroniza novedades entre sesiones abiertas. La clase 7 incorporará notificaciones personales persistentes y en tiempo real sobre un evento que la API ya verifica: un inicio de sesión exitoso en la propia cuenta.

## What Changes

- Intentar crear y emitir una notificación «Se inició sesión en tu cuenta» por cada login aceptado, para el mismo usuario, como operación secundaria controlada. El login devuelve normalmente el JWT sin esperar el aviso; fallos de guardado o emisión se registran sin datos sensibles y nunca invalidan el login ni provocan un 503 en su respuesta.
- Persistir notificaciones y una revisión por usuario en PostgreSQL; consultar listado paginado y cantidad global de no leídas; marcar una o todas como leídas de forma idempotente.
- Conectar Socket.IO con JWT y salas privadas determinadas por el servidor. Una sesión ya abierta recibe el aviso persistido de otro login del mismo usuario. Recuperar el estado real por REST al cargar la sesión, conectar/reconectar y volver a estar visible la pestaña, sin sondeo periódico; descartar respuestas antiguas.
- Agregar campana con contador y panel accesible para los tres roles. PostgreSQL será la fuente de verdad; el navegador no incrementará ni decrementará el contador por su cuenta.
- Incluir pruebas automatizadas de API, base, transporte real y navegador, validación futura con Docker Compose y preparación del Web Service y Static Site existentes en Render.
- Esta entrega crea solamente planificación. La ejecución de pruebas de implementación, Docker, migraciones y despliegues corresponde a la etapa posterior.

## Capabilities

### New Capabilities

- `notificaciones-usuario`: persistencia personal, consultas, lectura, aislamiento, campana y panel.
- `notificaciones-tiempo-real`: conexión JWT, sincronización entre pestañas, recuperación y consistencia del estado.

### Modified Capabilities

- `autenticacion-segura`: agregar el aviso personal de inicio de sesión sin cambiar los campos públicos de autenticación.
- `despliegue-produccion`: agregar condiciones de transporte, build y verificación para notificaciones en Compose y Render.

## Impact

La implementación futura afectará `server.js`, `auth.js`, `db.js`, nuevos módulos de notificaciones/transporte, `app.js`, `index.html`, `styles.css`, `package.json` y lockfile; incorporará Socket.IO servidor/cliente y herramientas de prueba de navegador. También ajustará build estático, copias de Dockerfiles, proxy Nginx, Compose y documentación de arquitectura/despliegue.

El esquema actual tiene solamente `users`; las relaciones, tableros, actividades y comentarios viven en `localStorage` como MVP local. Aunque `comunicacion-fonoaudiologica` especifica esos flujos, no existe una API de relaciones verificables que permita usarlos como disparadores remotos. Quedan fuera de este cambio la migración de esos dominios, avisos entre personas, correo/push, recuperación de contraseña, revocación global de JWT, escalado horizontal y retención automática de notificaciones. REST recupera avisos persistidos cuya señal se perdió; no reconstruye avisos que no pudieron guardarse. No se crean recursos Render ni se hace commit o push.
