## Why

DECILO ya funciona localmente con Node/Express, PostgreSQL y un frontend estático, pero todavía no tiene un entorno público reproducible para que otras personas puedan probarlo fuera de la máquina de desarrollo. Este cambio prepara el código y la documentación durante su implementación, y deja definido el procedimiento para que la persona usuaria cree y configure manualmente los servicios de Render después, sin exponer secretos durante la planificación.

## What Changes

- Publicar PostgreSQL como base administrada de Render y conectar la API mediante `DATABASE_URL`.
- Publicar la API Node/Express como Web Service usando los comandos compatibles con el `package.json` real y `process.env.PORT`.
- Publicar el frontend como Static Site con una URL pública de API configurable.
- Definir CORS para el origen público del frontend y para el entorno local, sin abrirlo indiscriminadamente.
- Mantener `JWT_SECRET`, `DATABASE_URL` y cualquier credencial únicamente en variables de entorno de Render o locales, nunca en archivos, GitHub, capturas ni documentación.
- Documentar variables, instalación, build, inicio, pruebas locales y verificación final de URLs públicas sin escribir valores secretos.
- Verificar públicamente healthcheck, registro, login, `/api/auth/me` y persistencia PostgreSQL.
- Durante la planificación no crear servicios en Render ni configurar secretos; durante la implementación preparar el código y la documentación para el despliegue.
- Después de la implementación, crear y configurar manualmente en Render PostgreSQL administrado, el Web Service de la API y el Static Site del frontend, junto con sus variables de entorno.
- Mantener fuera de alcance cambios visuales, funcionalidades clínicas y migraciones de dominio adicionales.

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
- La planificación no crea servicios ni configura secretos en Render. La implementación preparará el repositorio y la documentación; la creación manual de PostgreSQL, Web Service, Static Site y variables del panel se realizará después, seguida de la verificación de URLs públicas. No se hará commit ni push como parte de esta planificación.
