## 1. Base del backend y configuración

- [ ] 1.1 Crear el manifiesto del backend Node.js con Express, SQLite, hash seguro de contraseñas, JWT y herramientas de prueba; verificar que la instalación limpia complete sin errores y que las versiones queden fijadas.
- [ ] 1.2 Crear la estructura de configuración, arranque y manejo JSON de errores; validar variables obligatorias para JWT y SQLite sin incluir valores secretos en el repositorio, y verificar que la API falle claramente ante configuración crítica ausente.
- [ ] 1.3 Implementar la inicialización idempotente de SQLite y la tabla `users` con id, nombre, email único normalizado, `password_hash`, rol, fecha de creación y restricciones válidas; verificar el esquema en una base temporal.

## 2. API de autenticación

- [ ] 2.1 Implementar validación de registro para nombre, email, contraseña, confirmación y rol profesional/paciente/familiar; verificar errores de campo, contraseñas no coincidentes, rol inválido y email duplicado sin escrituras parciales.
- [ ] 2.2 Implementar `POST /api/auth/register` con hash seguro, inserción transaccional y respuesta pública con JWT; verificar que la respuesta no contenga contraseña ni hash y que la base solo guarde `password_hash`.
- [ ] 2.3 Implementar `POST /api/auth/login` comparando la contraseña contra el hash y emitiendo JWT con identidad pública; verificar credenciales válidas, respuesta uniforme para credenciales inválidas y ausencia de información sensible.
- [ ] 2.4 Implementar middleware de JWT y `GET /api/auth/me`; verificar token válido, ausente, vencido, malformado y usuario inexistente con códigos y cuerpos JSON consistentes.
- [ ] 2.5 Implementar `GET /api/health` con comprobación de disponibilidad de la API y SQLite; verificar una respuesta exitosa utilizable por un healthcheck y una respuesta de error cuando la dependencia no está disponible.

## 3. Integración del frontend

- [ ] 3.1 Sustituir el login demo de `app.js` por cliente HTTP contra la API y agregar la pantalla funcional de registro con nombre, email, contraseña, confirmación y rol; verificar mensajes accesibles de validación y error.
- [ ] 3.2 Implementar almacenamiento de sesión JWT, consulta inicial a `/api/auth/me`, cierre de sesión y limpieza de sesiones demo incompatibles; verificar que una sesión válida sobreviva una recarga y que una inválida devuelva al acceso.
- [ ] 3.3 Dirigir al usuario al panel de profesional, paciente o familiar según el rol devuelto por la API, conservando el diseño y las vistas actuales; verificar cada flujo con una cuenta recién registrada y el estado vacío correspondiente.
- [ ] 3.4 Aplicar guardas de rol y autorización en la navegación y acciones existentes para impedir acceso directo a paneles de otro rol; verificar que la interfaz no habilite operaciones ajenas y que las respuestas no autorizadas no expongan datos.
- [ ] 3.5 Mantener operativas comunicación por pictogramas, reproducción de frases, actividades, progreso, comentarios y relaciones existentes sin contraseñas locales; verificar los recorridos principales para los tres roles.

## 4. Contenedores y persistencia

- [ ] 4.1 Crear el Dockerfile de la API con ejecución no interactiva, configuración por entorno y exposición del puerto documentado; verificar que la imagen construya y que el contenedor responda a `/api/health`.
- [ ] 4.2 Crear el Dockerfile y configuración del servidor web del frontend para servir los archivos actuales y reenviar `/api` al servicio API; verificar login y registro desde el origen del frontend sin CORS abierto.
- [ ] 4.3 Crear `docker-compose.yml` con servicios frontend/API, variables de entorno, dependencia condicionada por salud, healthcheck y volumen nombrado para SQLite; verificar `docker compose up --build -d` y la disponibilidad de ambos servicios.
- [ ] 4.4 Crear `.dockerignore` y `.env.example` sin secretos reales, y revisar que bases locales, dependencias, tokens y archivos de entorno no entren en las imágenes ni en Git; verificar con una inspección del contexto de build y del diff.
- [ ] 4.5 Verificar persistencia reiniciando los contenedores y autenticando una cuenta creada antes del reinicio; confirmar que el volumen conserva SQLite y que no se almacenan contraseñas en texto plano.

## 5. Pruebas y documentación

- [ ] 5.1 Agregar pruebas automatizadas de API para registro válido, validaciones, email duplicado, hash, login válido e inválido, `/me`, roles y healthcheck; verificar que el conjunto pase contra una base SQLite temporal.
- [ ] 5.2 Agregar una prueba básica de integración del frontend o flujo HTTP que cubra registro, inicio de sesión, redirección por rol, cierre de sesión y bloqueo de un rol incorrecto; verificar mensajes accesibles y ausencia de regresión visual funcional.
- [ ] 5.3 Documentar en la guía del proyecto los requisitos, `docker compose up --build -d`, detención, logs, variables de entorno, pruebas, persistencia del volumen y límites del MVP; verificar que otra persona pueda seguir los comandos desde cero.
- [ ] 5.4 Ejecutar la validación final con Compose, healthcheck, pruebas automatizadas y una comprobación manual de los tres roles; registrar el resultado y confirmar que no se implementaron las funcionalidades excluidas.
