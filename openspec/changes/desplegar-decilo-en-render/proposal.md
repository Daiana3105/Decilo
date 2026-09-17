## Why

DECILO ya funciona localmente con Node/Express, PostgreSQL y un frontend estático, pero todavía no tiene un entorno público reproducible para que otras personas puedan probarlo fuera de la máquina de desarrollo. Esta etapa prepara el despliegue en Render con secretos y URLs configurables, manteniendo los flujos actuales de autenticación y dejando la creación de servicios para la ejecución posterior.

## What Changes

- Publicar PostgreSQL como base administrada de Render y conectar la API mediante `DATABASE_URL`.
- Publicar la API Node/Express como Web Service usando los comandos compatibles con el `package.json` real y `process.env.PORT`.
- Publicar el frontend como Static Site con una URL pública de API configurable.
- Definir CORS para el origen público del frontend y para el entorno local, sin abrirlo indiscriminadamente.
- Mantener `JWT_SECRET`, `DATABASE_URL` y cualquier credencial únicamente en variables de entorno de Render o locales, nunca en GitHub.
- Documentar variables, instalación, build, inicio, pruebas locales y verificación final de URLs públicas sin escribir valores secretos.
- Verificar públicamente healthcheck, registro, login, `/api/auth/me` y persistencia PostgreSQL.
- Mantener fuera de alcance cambios visuales, funcionalidades clínicas, migraciones de dominio adicionales y la creación efectiva de servicios en Render durante esta planificación.

## Capabilities

### New Capabilities

- `despliegue-produccion`: Contrato de despliegue público de DECILO en Render, incluyendo PostgreSQL administrado, API Web Service, frontend Static Site, configuración segura, CORS y verificaciones públicas.

### Modified Capabilities

- `autenticacion-segura`: Mantener el registro, login, JWT, `/api/auth/me`, roles y persistencia existentes al conectar la API publicada a PostgreSQL mediante `DATABASE_URL`.

## Impact

- API Node/Express en `server.js`, `config.js`, `db.js` y `auth.js`, incluyendo origen permitido, `DATABASE_URL` y escucha en `process.env.PORT`.
- Frontend en `app.js` y configuración de Static Site para resolver la URL pública de la API sin modificar el diseño visual.
- Comandos de despliegue derivados de `package.json`, `Dockerfile.api` y la estructura actual del repositorio.
- Documentación de arquitectura y operación, sin guardar URLs privadas, contraseñas, tokens ni otros secretos.
- Pruebas locales y comprobaciones públicas de salud, autenticación, sesión y persistencia.
- No se crearán servicios en Render, ni se hará commit, push o despliegue real como parte de esta planificación.
