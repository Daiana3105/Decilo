## Purpose

Esta capacidad define la ejecución local de DECILO sobre PostgreSQL como servicio persistente, saludable y configurable, junto con consultas SQL educativas para inspeccionar las cuentas de forma segura en DBeaver.

## ADDED Requirements

### Requirement: Servicio PostgreSQL configurable y persistente

El sistema MUST incluir un servicio PostgreSQL en el entorno Compose con usuario, contraseña, base de datos y puerto configurables mediante variables de entorno. El servicio MUST conservar sus datos mediante un volumen nombrado y MUST mantener sus credenciales y secretos fuera de Git.

#### Scenario: Arranque completo del entorno
- **WHEN** una persona ejecuta `docker compose up --build -d` con la configuración requerida
- **THEN** se levantan frontend, API y PostgreSQL sin intervención interactiva y el frontend queda disponible en el puerto configurado

#### Scenario: Persistencia del volumen
- **WHEN** se registra una cuenta, se reinician los contenedores y se vuelve a iniciar sesión
- **THEN** la cuenta permanece disponible y el volumen PostgreSQL no se elimina durante el reinicio

#### Scenario: Configuración sin secretos reales
- **WHEN** se revisa `.env.example` y el contenido versionado del proyecto
- **THEN** se encuentran nombres y valores de ejemplo no sensibles, pero no contraseñas reales, `JWT_SECRET` real ni credenciales operativas

### Requirement: Salud y dependencia de la API

PostgreSQL MUST exponer un healthcheck utilizable por Compose y la API MUST depender de la condición saludable de PostgreSQL antes de considerarse operativa. La API MUST informar mediante `GET /api/health` la disponibilidad de la base de datos y devolver un estado no saludable cuando no pueda conectarse.

#### Scenario: PostgreSQL saludable
- **WHEN** PostgreSQL acepta conexiones con la configuración declarada
- **THEN** su healthcheck finaliza correctamente y Compose permite que la API continúe su arranque

#### Scenario: API espera a PostgreSQL
- **WHEN** la API y PostgreSQL se inician juntos
- **THEN** la API espera la condición saludable de PostgreSQL y no se declara operativa usando una base ausente o inaccesible

#### Scenario: Dependencia no disponible
- **WHEN** PostgreSQL no está disponible
- **THEN** la API no informa salud de base disponible y el conjunto conserva un estado diagnosticable mediante healthchecks y logs

### Requirement: Consultas SQL educativas documentadas

El proyecto MUST documentar consultas SQL seguras y de solo lectura para revisar posteriormente las cuentas en DBeaver, incluyendo ejemplos de `SELECT`, `WHERE`, `LIKE`, `ORDER BY` y `LIMIT`. Las consultas MUST referirse al esquema real de `users` y no incluir contraseñas en texto plano.

#### Scenario: Revisión básica de usuarios
- **WHEN** una persona ejecuta las consultas educativas en DBeaver contra la base local
- **THEN** puede seleccionar columnas públicas de `users`, filtrar por rol o correo, ordenar resultados y limitar la cantidad de filas

#### Scenario: Revisión sin exposición de credenciales
- **WHEN** una persona sigue los ejemplos documentados para inspeccionar usuarios
- **THEN** los ejemplos no sugieren almacenar ni mostrar contraseñas en texto plano y permiten identificar `password_hash` como único dato persistido de contraseña
