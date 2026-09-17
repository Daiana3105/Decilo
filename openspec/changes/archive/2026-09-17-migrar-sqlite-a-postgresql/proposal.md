## Why

DECILO actualmente persiste las cuentas en SQLite mediante `better-sqlite3`, lo que limita la evolución del backend y no coincide con la infraestructura PostgreSQL prevista para las próximas clases. La migración debe conservar el contrato de autenticación y la experiencia actual mientras incorpora una base de datos servidor, persistente, verificable y preparada para consultas educativas en DBeaver.

## What Changes

- **BREAKING** Reemplazar SQLite y `better-sqlite3` por PostgreSQL y el paquete Node.js `pg`.
- Configurar la API con conexión PostgreSQL mediante variables de entorno y consultas SQL parametrizadas.
- Crear de forma segura e idempotente la tabla `users` con `id`, `nombre`, `email` único, `password_hash`, `rol` y `created_at`.
- Mantener sin cambios funcionales el registro, login, JWT, `GET /api/auth/me`, los roles `profesional`, `paciente` y `familiar`, y el frontend actual.
- Agregar PostgreSQL a `docker-compose.yml`, con credenciales, base, puerto, volumen persistente y healthcheck configurables por entorno.
- Hacer que la API espere a que PostgreSQL esté saludable antes de iniciar el flujo operativo del conjunto.
- Actualizar `.env.example` sin secretos reales y mantener `JWT_SECRET` y credenciales fuera de Git.
- Adaptar las pruebas automatizadas para ejecutarse contra PostgreSQL y cubrir registro, duplicados, login, JWT, `/me`, healthcheck, roles y persistencia tras reiniciar contenedores.
- Documentar consultas SQL educativas para DBeaver (`SELECT`, `WHERE`, `LIKE`, `ORDER BY` y `LIMIT`) y actualizar `ARCHITECTURE.md`.
- Validar el arranque conjunto de frontend, API y PostgreSQL con `docker compose up --build -d`.
- Mantener fuera de alcance Render, el diseño visual, las funcionalidades clínicas, la eliminación de datos y la eliminación de volúmenes durante la planificación.

## Capabilities

### New Capabilities

- `persistencia-postgresql`: Servicio PostgreSQL, configuración segura, inicialización idempotente del esquema, salud, volumen persistente y consultas educativas documentadas para inspección local.

### Modified Capabilities

- `autenticacion-segura`: Sustituir el mecanismo de persistencia SQLite por PostgreSQL manteniendo el mismo contrato observable de cuentas, credenciales protegidas, sesiones JWT, roles y endpoint de salud.

## Impact

- Backend Node.js/Express en `config.js`, `db.js`, `auth.js` y `server.js`.
- Dependencias de ejecución y pruebas en `package.json` y el lockfile correspondiente.
- Infraestructura en `docker-compose.yml`, `Dockerfile.api`, `.env.example` y `.dockerignore`.
- Pruebas automatizadas en `test/auth.test.js` y cualquier helper de integración requerido para PostgreSQL.
- Documentación de arquitectura y consultas educativas en `ARCHITECTURE.md` o una guía enlazada desde ella.
- El frontend (`index.html`, `app.js`, `styles.css`) conserva su contrato y diseño; no se planifican cambios visuales ni nuevas funcionalidades clínicas.
- No se contempla despliegue en Render en este cambio; queda reservado para la clase 6.
