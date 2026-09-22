## ADDED Requirements

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
