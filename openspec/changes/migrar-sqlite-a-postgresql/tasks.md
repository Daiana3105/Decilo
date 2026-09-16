## 1. Dependencias y configuración

- [ ] 1.1 Reemplazar `better-sqlite3` por `pg` en `package.json` y el lockfile, manteniendo Express, bcrypt, JWT y el runner de tests; verificar instalación limpia sin dependencias SQLite.
- [ ] 1.2 Actualizar la configuración de la API para validar `JWT_SECRET`, host, puerto, usuario, contraseña y base PostgreSQL desde variables de entorno, sin defaults inseguros; verificar que el arranque falle claramente cuando falte una variable obligatoria.
- [ ] 1.3 Actualizar `.env.example`, `.gitignore` y `.dockerignore` con nombres y ejemplos no secretos para PostgreSQL y JWT; verificar que no aparezcan credenciales reales, tokens ni archivos `.env` versionados.

## 2. Persistencia PostgreSQL y autenticación

- [ ] 2.1 Reemplazar la creación de base SQLite por un pool PostgreSQL y una inicialización idempotente de `users` con `id`, `nombre`, `email` único, `password_hash`, `rol` válido y `created_at`; verificar que el esquema pueda inicializarse dos veces sin perder filas.
- [ ] 2.2 Adaptar registro, duplicados y login a consultas parametrizadas de PostgreSQL, conservando normalización de email, hash bcrypt, respuestas públicas y errores HTTP actuales; verificar registro válido, contraseña nunca plana, duplicado y credenciales inválidas.
- [ ] 2.3 Adaptar middleware JWT y `GET /api/auth/me` para consultar PostgreSQL sin cambiar el contrato de sesión ni los roles `profesional`, `paciente` y `familiar`; verificar token válido, ausente, inválido, vencido y usuario inexistente.
- [ ] 2.4 Adaptar `GET /api/health` para comprobar la conexión PostgreSQL y conservar la respuesta JSON de salud; verificar estados saludable y no disponible mediante pruebas controladas.
- [ ] 2.5 Confirmar que el frontend actual conserva sus nombres de campos, almacenamiento de sesión, redirección por rol y diseño sin cambios funcionales; verificar la suite frontend y un flujo HTTP desde el origen servido por Nginx.

## 3. Docker Compose y persistencia operativa

- [ ] 3.1 Agregar el servicio PostgreSQL con imagen fijada, usuario, contraseña, base, puerto y volumen nombrado configurables por entorno; verificar `docker compose config` y que el volumen SQLite existente no sea eliminado ni reemplazado.
- [ ] 3.2 Configurar healthcheck de PostgreSQL con `pg_isready`, dependencia `service_healthy` de la API y healthcheck HTTP de la API; verificar que Compose espere la salud de PostgreSQL antes de considerar operativa la API.
- [ ] 3.3 Ajustar variables del servicio API, Dockerfile y red interna para conectar con PostgreSQL mediante el nombre del servicio; verificar `docker compose up --build -d`, `docker compose ps` y salud de frontend, API y PostgreSQL.
- [ ] 3.4 Verificar el flujo completo por `http://localhost:<puerto>` sin CORS abierto: registro, login, `/api/auth/me` y selección de los tres roles; comprobar que el frontend siga usando el proxy `/api`.

## 4. Pruebas y documentación

- [ ] 4.1 Adaptar las pruebas automatizadas a una PostgreSQL de prueba aislada y configurable, sin depender de SQLite ni de datos existentes; verificar ejecución reproducible con `npm test` o el comando documentado para levantar la base de tests.
- [ ] 4.2 Cubrir registro válido, validaciones, email duplicado, hash seguro, login válido e inválido, JWT, `/me`, healthcheck y los roles profesional/paciente/familiar contra PostgreSQL; verificar que todos los tests pasen.
- [ ] 4.3 Agregar una prueba de persistencia que registre una cuenta, reinicie los contenedores sin borrar volúmenes y vuelva a autenticarla; verificar que PostgreSQL conserve la fila y solo exista `password_hash`.
- [ ] 4.4 Actualizar `ARCHITECTURE.md` con la topología frontend/API/PostgreSQL, variables de entorno, volumen, healthchecks, arranque/detención sin `down -v`, límites del MVP y la exclusión de Render hasta la clase 6; verificar que las instrucciones sean ejecutables desde cero.
- [ ] 4.5 Documentar consultas SQL educativas de solo lectura para DBeaver usando `SELECT`, `WHERE`, `LIKE`, `ORDER BY` y `LIMIT`, con el esquema real de `users` y sin contraseñas planas; verificar sintaxis y que los ejemplos no expongan secretos.

## 5. Validación final

- [ ] 5.1 Ejecutar `docker compose up --build -d`, `docker compose ps`, healthchecks, tests automatizados y pruebas HTTP desde el frontend; verificar que frontend, API y PostgreSQL queden operativos y que el flujo de los tres roles pase.
- [ ] 5.2 Revisar el diff y la configuración para confirmar que no se cambió el diseño visual, no se agregaron funcionalidades clínicas, no se desplegó en Render y no se ejecutaron comandos de eliminación de datos o volúmenes; registrar el resultado de la validación estricta de OpenSpec.
