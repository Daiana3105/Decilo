## Purpose

Esta capacidad define el despliegue público de DECILO en Render con PostgreSQL administrado, una API Node/Express y un frontend estático, manteniendo una configuración segura y verificaciones reproducibles de los flujos principales.

## ADDED Requirements

### Requirement: Servicios públicos de Render

El sistema MUST poder desplegar PostgreSQL como base administrada, la API Node/Express como Web Service y el frontend como Static Site. La configuración MUST usar los comandos derivados de la estructura real del proyecto y MUST permitir verificar las URLs públicas resultantes sin crear servicios durante la planificación.

#### Scenario: API publicada como Web Service
- **WHEN** se configura el servicio API con el repositorio del proyecto y sus comandos documentados
- **THEN** Render instala las dependencias del `package.json`, inicia `server.js` y expone la API en una URL HTTPS pública

#### Scenario: Frontend publicado como Static Site
- **WHEN** se configura el Static Site con el directorio y comando de build documentados
- **THEN** Render sirve `index.html`, `app.js`, `styles.css` y los recursos actuales en una URL HTTPS pública sin cambiar el diseño visual

#### Scenario: PostgreSQL administrado
- **WHEN** la API se conecta a la base PostgreSQL administrada de Render
- **THEN** usa la URL de conexión provista por Render y conserva las cuentas entre reinicios o nuevos despliegues del Web Service

### Requirement: Configuración segura por entorno

El sistema MUST recibir `DATABASE_URL` y `JWT_SECRET` mediante variables de entorno del servicio API, sin incluir valores reales en el repositorio, en `.env.example`, en los artefactos de planificación ni en la configuración pública del frontend. El frontend MUST resolver la URL pública de la API mediante una configuración explícita y no depender de secretos.

#### Scenario: Conexión mediante DATABASE_URL
- **WHEN** el Web Service recibe una `DATABASE_URL` válida de PostgreSQL administrado
- **THEN** la API puede inicializar `users`, ejecutar autenticación y consultar salud sin requerir credenciales separadas en el código

#### Scenario: Variables documentadas sin secretos
- **WHEN** una persona sigue la documentación de Render y del entorno local
- **THEN** conoce los nombres de `DATABASE_URL`, `JWT_SECRET`, `PORT`, `API_PUBLIC_URL`, `FRONTEND_PUBLIC_URL` y las variables de prueba sin obtener valores secretos reales

#### Scenario: Credenciales fuera de GitHub
- **WHEN** se inspecciona el repositorio y el contenido que se enviará a GitHub
- **THEN** `.env`, credenciales, tokens y URLs privadas quedan ignorados o ausentes, mientras `.env.example` contiene solo marcadores seguros

### Requirement: Escucha, CORS y URL pública de API

La API MUST escuchar en `process.env.PORT` cuando Render lo provea y MUST permitir solicitudes del Static Site público y del origen local documentado mediante una lista explícita de orígenes CORS. El frontend MUST construir sus solicitudes usando la URL pública de API configurable, conservando el proxy local existente cuando corresponda.

#### Scenario: Puerto asignado por Render
- **WHEN** Render inicia el Web Service con un valor dinámico en `PORT`
- **THEN** la API escucha en ese puerto y responde al healthcheck del servicio

#### Scenario: Frontend público autorizado
- **WHEN** el Static Site solicita registro, login o `/api/auth/me` desde `FRONTEND_PUBLIC_URL`
- **THEN** la API acepta el origen configurado y responde sin habilitar CORS abierto para orígenes arbitrarios

#### Scenario: Entorno local autorizado
- **WHEN** el frontend local solicita la API desde el origen local documentado
- **THEN** la API acepta ese origen mediante configuración explícita y mantiene operativos los flujos locales

#### Scenario: URL pública configurable
- **WHEN** se cambia `API_PUBLIC_URL` para apuntar a otra URL pública de API
- **THEN** el frontend dirige allí sus solicitudes sin modificar su diseño ni requerir secretos en el navegador

### Requirement: Verificación pública y persistencia

El despliegue MUST documentar y permitir verificar públicamente `GET /api/health`, registro, login, `GET /api/auth/me` y persistencia de una cuenta después de reiniciar o redeployar el Web Service, sin exponer contraseñas ni hashes en respuestas públicas.

#### Scenario: Healthcheck público
- **WHEN** se solicita la URL pública de API `/api/health`
- **THEN** responde exitosamente e informa la disponibilidad de la API y PostgreSQL administrado

#### Scenario: Autenticación pública
- **WHEN** se registra una cuenta y se inicia sesión desde el frontend público o mediante HTTP contra la API pública
- **THEN** el sistema devuelve la identidad pública y un JWT sin devolver contraseña ni `password_hash`

#### Scenario: Consulta de sesión pública
- **WHEN** se envía el JWT obtenido a la URL pública `/api/auth/me`
- **THEN** responde con la identidad pública y el rol correspondiente

#### Scenario: Persistencia tras redeploy
- **WHEN** se crea una cuenta, se reinicia o redeploya el Web Service y se vuelve a iniciar sesión
- **THEN** la cuenta continúa disponible porque PostgreSQL administrado conserva los datos

#### Scenario: Verificación final de URLs
- **WHEN** se completa el checklist con la URL pública de API y la URL pública del frontend
- **THEN** ambas URLs responden, el frontend puede comunicarse con la API y no quedan URLs locales como única configuración de producción
