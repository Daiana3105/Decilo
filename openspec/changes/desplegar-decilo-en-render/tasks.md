## 1. Configuración de la API y persistencia

- [ ] 1.1 Agregar resolución de `DATABASE_URL` para PostgreSQL administrado con compatibilidad explícita para la configuración local actual; verificar que la API pueda inicializar `users` idempotentemente en ambos modos sin cambiar los contratos JSON.
- [ ] 1.2 Ajustar el arranque de `server.js` para priorizar `process.env.PORT` en Render y conservar un valor local documentado; verificar que un puerto dinámico permita iniciar la API y responder `/api/health`.
- [ ] 1.3 Mantener `JWT_SECRET`, `DATABASE_URL` y credenciales fuera del código y del frontend, actualizando solo la documentación de variables durante esta etapa; verificar con una inspección de Git que no haya secretos reales.
- [ ] 1.4 Conservar registro, login, JWT, `/api/auth/me`, healthcheck y los tres roles sin cambios funcionales al cambiar el origen de conexión; verificar la suite existente contra PostgreSQL local.

## 2. CORS y configuración del frontend

- [ ] 2.1 Implementar una lista explícita de orígenes permitidos para `FRONTEND_PUBLIC_URL` y el origen local documentado, rechazando orígenes arbitrarios; verificar solicitudes CORS permitidas y no permitidas.
- [ ] 2.2 Hacer configurable la URL pública de la API para el frontend mediante `API_PUBLIC_URL`, manteniendo `/api` relativo para el proxy local cuando corresponda; verificar registro, login y `/api/auth/me` en ambos modos sin modificar `styles.css`.
- [ ] 2.3 Confirmar que el Static Site no recibe `DATABASE_URL`, `JWT_SECRET`, contraseñas ni tokens durante el build o en sus recursos publicados; verificar el bundle y la configuración pública generada.

## 3. Preparación de servicios Render

- [ ] 3.1 Documentar la creación de PostgreSQL administrado en Render, el uso de su `DATABASE_URL`, la persistencia y la ausencia de eliminación de la base durante redeploys; verificar que la guía no contenga valores reales.
- [ ] 3.2 Documentar el Web Service de la API con instalación `npm ci`, inicio `npm start`, raíz del repositorio y variables `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_PUBLIC_URL` y `API_PUBLIC_URL`; verificar que los comandos coincidan con `package.json` y `server.js`.
- [ ] 3.3 Documentar el Static Site con raíz/publicación de los archivos actuales, build reproducible y URL pública configurable de API; verificar que el publish directory contenga `index.html`, `app.js` y `styles.css`.
- [ ] 3.4 Mantener fuera de esta etapa la creación de servicios, dominios, credenciales y despliegues en Render; verificar que el diff solo contenga planificación y documentación autorizada cuando se implemente el cambio.

## 4. Pruebas locales antes del despliegue

- [ ] 4.1 Ejecutar `npm ci` y `npm test` contra PostgreSQL local aislado; verificar registro, duplicados, login válido e inválido, JWT, `/api/auth/me`, healthcheck y los tres roles.
- [ ] 4.2 Ejecutar `docker compose config` y `docker compose up --build -d`, comprobar `docker compose ps` y healthchecks; verificar que frontend, API y PostgreSQL locales sigan operativos.
- [ ] 4.3 Probar persistencia local registrando una cuenta, reiniciando o redeployando solo la API sin eliminar PostgreSQL y volviendo a iniciar sesión; verificar que la cuenta sobreviva y no se exponga la contraseña.
- [ ] 4.4 Verificar que `.env`, credenciales, tokens, `DATABASE_URL` privada y archivos de entorno no entren en GitHub; revisar `.gitignore`, el contexto de build y `git status --short` sin modificar archivos de aplicación durante la planificación.

## 5. Verificación pública posterior

- [ ] 5.1 Comprobar la URL pública de API mediante `GET /api/health` y registrar solo la URL, código HTTP y estado sin secretos; verificar que PostgreSQL administrado figure disponible.
- [ ] 5.2 Probar registro y login de una cuenta de verificación desde el frontend público o HTTP contra la API, incluyendo los roles profesional, paciente y familiar; verificar respuestas públicas sin contraseña ni hash.
- [ ] 5.3 Consultar `/api/auth/me` con el JWT de verificación y repetir login después de reiniciar o redeployar el Web Service; verificar identidad, rol y persistencia de la cuenta.
- [ ] 5.4 Verificar CORS desde la URL pública del frontend y desde el origen local, rechazar un origen arbitrario y confirmar que la URL pública de API configurada sea la efectiva; registrar los resultados sin valores secretos.
- [ ] 5.5 Completar el checklist final con URL pública del frontend, URL pública de API, healthcheck, registro, login, `/me`, CORS y persistencia; verificar que no queden referencias locales como única configuración pública y que Render no haya sido creado durante la planificación.
