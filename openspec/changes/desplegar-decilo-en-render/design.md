## Context

La aplicación actual tiene una API Node/Express iniciada por `node server.js`, configuración centralizada en `config.js`, acceso PostgreSQL mediante `pg` en `db.js`, autenticación JWT en `auth.js` y un frontend estático compuesto por `index.html`, `app.js` y `styles.css`. El entorno local usa Docker Compose, PostgreSQL como servicio interno y Nginx con proxy `/api`; el frontend actual no debe perder ese recorrido. Ver `proposal.md` y las specs de este cambio para el contrato público.

Render introduce tres límites operativos: PostgreSQL administrado entrega una `DATABASE_URL`, el Web Service asigna dinámicamente `PORT` y el Static Site tiene un origen distinto al de la API. La planificación no crea servicios, no publica secretos y no modifica código ni documentación existente.

## Goals / Non-Goals

**Goals:**

- Definir una topología Render reproducible para PostgreSQL administrado, API Web Service y frontend Static Site.
- Mantener la conexión local de Compose y agregar una ruta de configuración de producción basada en `DATABASE_URL`.
- Permitir que el frontend use una URL pública de API configurable sin exponer secretos ni alterar su diseño.
- Restringir CORS a los orígenes locales y públicos necesarios.
- Documentar comandos, variables, pruebas y verificaciones públicas con URLs reemplazables.
- Mantener persistencia, healthcheck y contratos de autenticación observables entre local y producción.

**Non-Goals:**

- Crear servicios, bases, dominios o despliegues dentro de Render durante este cambio.
- Cambiar la apariencia, navegación de dominio, pictogramas, actividades o funcionalidades clínicas.
- Migrar datos de usuarios existentes entre proveedores o diseñar alta disponibilidad, backups avanzados o escalado productivo.
- Guardar credenciales, tokens, URLs privadas o valores reales en el repositorio.

## Decisions

### Topología separada de Render

Usar un PostgreSQL administrado como dependencia persistente, un Web Service para la API Node/Express y un Static Site para los archivos actuales del frontend. La API se conectará a PostgreSQL mediante `DATABASE_URL`; no se duplicarán host, puerto, usuario y contraseña en producción si Render ya provee la URL.

Se descarta un único Web Service que sirva frontend y API porque la solicitud exige Static Site y porque separarlos conserva el modelo local frontend/Nginx/API. También se descarta una base PostgreSQL dentro del repositorio o contenedor porque no ofrece la persistencia administrada requerida.

### Comandos basados en la estructura real

El Web Service usará instalación con `npm ci` y arranque con `npm start`, que actualmente resuelve a `node server.js`. El servidor debe escuchar en `process.env.PORT` y mantener un fallback local documentado solo para desarrollo. El Static Site usará el repositorio como fuente de archivos estáticos; como no existe un bundler ni un paso de compilación en `package.json`, el build será un paso explícito y reproducible que no fabrique artefactos innecesarios, y el publish directory será la raíz que contiene `index.html`, `app.js` y `styles.css`.

La alternativa de introducir Vite, React o una nueva cadena de build se descarta porque ampliaría el cambio y no es necesaria para el frontend actual.

### Conexión y secretos

`config.js` resolverá el modo de conexión dando prioridad a `DATABASE_URL` para Render y conservará la configuración por partes para Compose local o tests. `JWT_SECRET`, `DATABASE_URL`, `API_PUBLIC_URL`, `FRONTEND_PUBLIC_URL` y las variables de tests se documentarán por nombre y ejemplos ficticios; los valores reales existirán únicamente en `.env` local ignorado o en el panel de Render.

El frontend recibirá `API_PUBLIC_URL` mediante el mecanismo de configuración pública elegido durante la implementación, sin incrustar `DATABASE_URL`, `JWT_SECRET` ni contraseñas. Para local, la URL relativa `/api` continuará pasando por Nginx; para Static Site, las solicitudes apuntarán a la URL HTTPS pública de API.

### CORS explícito

La API construirá una lista de orígenes permitidos a partir de `FRONTEND_PUBLIC_URL` y del origen local documentado, descartará valores vacíos y responderá con headers CORS solo cuando el `Origin` coincida. No se habilitará `*` junto con credenciales ni se aceptarán orígenes arbitrarios. La configuración se verificará con una solicitud permitida y otra con origen no autorizado.

### PostgreSQL administrado y salud

La inicialización idempotente de `users` seguirá siendo responsabilidad de la API al conectarse mediante el pool PostgreSQL. `GET /api/health` comprobará la base y será la URL usada por el healthcheck del Web Service. Render no recibirá una contraseña separada si la `DATABASE_URL` ya contiene la conexión completa; los parámetros SSL requeridos por el proveedor se definirán según el formato de la URL y el entorno.

### Verificación y rollback

Antes de cualquier despliegue se ejecutarán `npm test`, `docker compose config`, `docker compose up --build -d`, healthchecks y un flujo local de registro/login/`/me` para los tres roles. Después, el checklist público usará placeholders para API y frontend: healthcheck, registro controlado, login, `/api/auth/me`, CORS, refresh/redeploy y persistencia.

Como rollback, se conservarán los servicios administrados y se revertirá la versión del Web Service/Static Site a la última revisión conocida; no se borrará la base PostgreSQL. Si la URL pública cambia, se actualizará únicamente la variable de API permitida y el origen CORS correspondiente.

## Risks / Trade-offs

- [Risk] Un Static Site no puede leer secretos ni variables privadas en el navegador. → Mitigation: exponer únicamente una URL pública de API no sensible y mantener todos los secretos en el Web Service/PostgreSQL.
- [Risk] Una lista CORS incompleta puede bloquear el frontend público o abrir acceso excesivo. → Mitigation: documentar ambos orígenes, probar origen permitido/no permitido y evitar wildcard.
- [Risk] `DATABASE_URL` puede requerir SSL o parámetros específicos de Render. → Mitigation: usar la URL entregada por Render, permitir configuración SSL compatible y verificar conexión antes de probar endpoints.
- [Risk] El Web Service puede arrancar con un puerto fijo incompatible. → Mitigation: usar `process.env.PORT` como fuente primaria y comprobar el healthcheck asignado por Render.
- [Risk] Los comandos de Static Site pueden publicar un directorio incorrecto. → Mitigation: validar que el publish directory contenga `index.html`, `app.js` y `styles.css`, sin introducir un bundler nuevo.
- [Risk] El registro de verificación puede dejar cuentas de prueba en producción. → Mitigation: usar cuentas identificables de prueba, documentar su limpieza mediante una operación administrativa separada y no incluir contraseñas en logs o documentos.
- [Risk] Configurar una URL local como única API rompería la versión pública. → Mitigation: separar configuración local `/api` de `API_PUBLIC_URL` y verificar ambas URLs al final.

## Migration Plan

1. Confirmar localmente la configuración actual, los comandos de `package.json`, el healthcheck y la suite de autenticación.
2. Implementar en el código la resolución de `DATABASE_URL`, `process.env.PORT`, CORS y URL de API del frontend sin cambiar contratos visuales.
3. Actualizar la documentación de arquitectura, variables y configuración de Render con placeholders seguros.
4. Ejecutar todas las pruebas locales y verificar el entorno Docker antes de cualquier servicio remoto.
5. Crear manualmente, en la etapa de despliegue posterior, PostgreSQL, Web Service y Static Site en Render con las variables documentadas.
6. Verificar las URLs públicas y la persistencia; si falla, revertir la revisión desplegada sin eliminar PostgreSQL.

## Open Questions

No quedan decisiones abiertas que cambien el contrato o la arquitectura. El mecanismo exacto para inyectar `API_PUBLIC_URL` en el Static Site y el comando de build vacío o de copia que acepte la interfaz de Render pueden elegirse durante la implementación, siempre que mantengan el publish directory real y no expongan secretos.
