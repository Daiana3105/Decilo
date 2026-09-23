# despliegue-produccion Specification

## Purpose
Esta capacidad define el despliegue público de DECILO en Render con PostgreSQL administrado, una API Node/Express y un frontend estático, manteniendo una configuración segura y verificaciones reproducibles de los flujos principales.

## Requirements

### Requirement: Servicios públicos de Render

El sistema MUST poder desplegar PostgreSQL como base administrada, la API Node/Express como Web Service y el frontend como Static Site. Durante la planificación no se crearán servicios ni se configurarán secretos; durante la implementación se prepararán el código y la documentación, y después la persona usuaria creará y configurará manualmente los tres servicios en Render con los comandos derivados de la estructura real del proyecto.

#### Scenario: Preparación de la API como Web Service
- **WHEN** se configura el servicio API con el repositorio del proyecto y sus comandos documentados
- **THEN** Render instala las dependencias del `package.json`, inicia `server.js` y expone la API en una URL HTTPS pública

#### Scenario: Frontend publicado como Static Site
- **WHEN** se configura el Static Site con el directorio y comando de build documentados
- **THEN** Render sirve `index.html`, `app.js`, `styles.css` y los recursos actuales en una URL HTTPS pública sin cambiar el diseño visual

#### Scenario: PostgreSQL administrado
- **WHEN** la API se conecta a la base PostgreSQL administrada de Render
- **THEN** usa la URL de conexión provista por Render y conserva las cuentas entre reinicios o nuevos despliegues del Web Service

#### Scenario: Creación manual posterior
- **WHEN** la implementación del cambio ya preparó código y documentación, y la persona usuaria crea manualmente PostgreSQL, el Web Service y el Static Site en Render
- **THEN** puede configurar los servicios siguiendo el procedimiento documentado sin que la planificación haya creado recursos remotos

### Requirement: Configuración segura por entorno

El sistema MUST recibir `DATABASE_URL` y `JWT_SECRET` mediante variables de entorno del servicio API, sin incluir valores reales en el repositorio, en `.env.example`, en los artefactos de planificación ni en la configuración pública del frontend. El frontend MUST resolver la URL pública de la API mediante una configuración explícita y no depender de secretos.

#### Scenario: Conexión mediante DATABASE_URL
- **WHEN** el Web Service recibe una `DATABASE_URL` válida de PostgreSQL administrado
- **THEN** la API puede inicializar `users`, ejecutar autenticación y consultar salud sin requerir credenciales separadas en el código

#### Scenario: Variables documentadas sin secretos
- **WHEN** una persona sigue la documentación de Render y del entorno local
- **THEN** conoce los nombres de `DATABASE_URL`, `JWT_SECRET`, `PORT`, `API_PUBLIC_URL`, `FRONTEND_PUBLIC_URL` y las variables de prueba sin obtener valores secretos reales

#### Scenario: Credenciales fuera de todos los artefactos
- **WHEN** se inspecciona el repositorio, GitHub, capturas y documentación del despliegue
- **THEN** `.env`, credenciales, tokens, `DATABASE_URL` privada y secretos quedan ignorados o ausentes, mientras `.env.example` y las guías contienen solo marcadores seguros

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

### Requirement: Transporte de notificaciones en Compose y Render

El sistema MUST poder servir HTTP y conexión de notificaciones desde la misma API y puerto configurado, usando el proxy del frontend local en Compose y el origen público de API en Render. MUST permitir HTTPS/WSS en producción y aplicar orígenes explícitos en HTTP, polling y WebSocket. MUST preparar una configuración de una instancia de API con PostgreSQL persistente, sin requerir crear recursos remotos durante planificación o preparación.

#### Scenario: Proxy local completo
- **WHEN** el frontend de Compose realiza consultas y abre su conexión en tiempo real por el puerto público del frontend
- **THEN** el proxy enruta `/api/` y `/socket.io/`, permite polling y upgrade a WebSocket y conserva healthchecks operativos

#### Scenario: Static Site y API públicos
- **WHEN** se configura `API_PUBLIC_URL` con el origen HTTPS de API y `FRONTEND_PUBLIC_URL` con el origen del Static Site
- **THEN** el frontend puede consultar y conectar por transporte seguro al mismo Web Service que escucha en `PORT`, sin secretos en el artefacto público

### Requirement: Artefacto estático reproducible para notificaciones

El build del frontend MUST incluir todos los recursos de notificaciones y su cliente de transporte, así como configuración pública, tanto para Nginx como para Static Site. MUST cargar las dependencias antes de usarlas y MUST excluir archivos de backend, credenciales y secretos. El entorno local MUST resolver la API por mismo origen cuando no se configure una URL pública.

#### Scenario: Build y contenedor frontend
- **WHEN** se construye el frontend para Compose o Render
- **THEN** todos los scripts necesarios responden como JavaScript real, la campana puede inicializarse y ningún recurso de transporte cae en el fallback HTML

#### Scenario: Inspección del artefacto
- **WHEN** se inspeccionan archivos publicados y configuración pública
- **THEN** contienen únicamente recursos necesarios de frontend y no contienen `JWT_SECRET`, credenciales PostgreSQL, tokens operativos ni módulos privados

### Requirement: Verificación reproducible de notificaciones

La implementación MUST incorporar pruebas automatizadas de PostgreSQL, API, transporte real e interacción de navegador, sobre datos de prueba aislados. MUST ejecutar y documentar validación con Docker Compose de aislamiento, múltiples pestañas, lecturas, reconexión, recursos frontend y persistencia. MUST preparar en la guía de Render los comandos, variables, límite de una instancia y checklist de HTTPS/WSS y reinicios; la publicación real MUST quedar como paso posterior.

#### Scenario: Pruebas sin tocar datos operativos
- **WHEN** se ejecutan pruebas que limpian cuentas o notificaciones
- **THEN** usan una base o esquema explícitamente aislado, sin truncar la base de desarrollo/producción ni interferir entre suites

#### Scenario: Validación de varias pestañas en Compose
- **WHEN** dos pestañas de A y una de B completan login con operación secundaria exitosa, listado y lectura individual/general
- **THEN** las pestañas de A convergen dentro del plazo local especificado y B conserva su estado independiente, con pruebas automatizadas y evidencia reproducible

#### Scenario: Persistencia tras reinicio
- **WHEN** se reinician API y PostgreSQL conservando el volumen y luego se restaura sesión o se inicia una nueva
- **THEN** permanecen avisos previos y fechas de lectura, REST recupera el contador al cargar la sesión o reconectar y solo un login explícito intenta agregar un nuevo aviso mediante su operación secundaria

#### Scenario: Fallo secundario y recuperación por REST
- **WHEN** se simulan fallos de guardado y de emisión después de validar credenciales en el entorno aislado
- **THEN** ambos logins conservan 200 y JWT válido, los errores se registran sin datos sensibles y solo el aviso persistido se recupera por REST al cargar sesión, conectar/reconectar o recuperar visibilidad, sin sondeo periódico

#### Scenario: Preparación de Render terminada
- **WHEN** se entrega la implementación preparada para desplegar
- **THEN** existe guía de build, configuración, WSS, reconexión y persistencia sin afirmar un despliegue público no ejecutado ni publicar secretos
