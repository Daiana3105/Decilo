## Context

La API actual crea y consulta `users` con `better-sqlite3` en `db.js` y `auth.js`, mientras que Compose monta `decilo-sqlite` y solo coordina frontend/API. El contrato público existente incluye registro, login, JWT, `GET /api/auth/me`, `GET /api/health`, identidad pública y los roles `profesional`, `paciente` y `familiar`; esos comportamientos deben permanecer estables. Ver `proposal.md` y las delta specs para la motivación y los contratos completos.

## Goals / Non-Goals

**Goals:**

- Sustituir el adaptador SQLite por PostgreSQL usando `pg.Pool` y consultas parametrizadas.
- Mantener la forma y semántica de las respuestas actuales de autenticación y salud, incluyendo la conversión pública de `created_at` al campo esperado por el frontend si corresponde.
- Inicializar `users` de manera idempotente con restricciones para email único y roles válidos, sin almacenar contraseñas en texto plano.
- Coordinar PostgreSQL, API y frontend con Compose, healthchecks, dependencia condicionada y volumen persistente.
- Hacer que las pruebas automatizadas puedan ejecutarse contra una instancia PostgreSQL controlada y aislar sus datos.
- Dejar documentadas consultas de solo lectura para DBeaver y actualizar la arquitectura del proyecto.

**Non-Goals:**

- Cambiar pantallas, estilos, navegación o funcionalidades de comunicación, actividades y progreso del frontend.
- Agregar funcionalidades clínicas, OAuth, recuperación de contraseña, pagos, notificaciones o despliegue en Render; Render pertenece a la clase 6.
- Eliminar el volumen SQLite existente, borrar datos locales o ejecutar `docker compose down -v` durante la implementación de este cambio.
- Diseñar una migración completa de entidades de dominio distintas de `users`; el cambio se limita a la persistencia de autenticación.

## Decisions

### Adaptador PostgreSQL y límites de conexión

Usar `pg.Pool` como único acceso compartido a PostgreSQL. `config.js` leerá host, puerto, usuario, contraseña, base de datos, límites opcionales del pool y `JWT_SECRET` desde el entorno; no se incluirán credenciales por defecto inseguras. La API obtendrá conexiones con `pool.connect()` o consultas del pool y las liberará en `finally` cuando corresponda.

Se descarta mantener una abstracción dual SQLite/PostgreSQL porque prolongaría dos esquemas y permitiría divergencias. También se descarta un ORM para mantener visibles las consultas educativas y controlar explícitamente el SQL del MVP.

### Consultas parametrizadas y contratos existentes

Todas las entradas externas de registro, login, `/me` y healthcheck que participen en SQL se enviarán como parámetros (`$1`, `$2`, etc.); no se interpolarán strings en las consultas. Las rutas conservarán códigos y cuerpos JSON actuales, incluido el error uniforme de credenciales inválidas y `EMAIL_IN_USE`, adaptando únicamente los códigos de error de PostgreSQL necesarios para restricciones únicas.

`publicUser` seguirá exponiendo solo identidad pública. El almacenamiento usará `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`; la serialización mantendrá la propiedad pública esperada por el frontend sin revelar `password_hash`.

### Esquema seguro e idempotente

La inicialización ejecutará una sentencia `CREATE TABLE IF NOT EXISTS users` con tipos PostgreSQL, `GENERATED ... AS IDENTITY` para `id`, `TEXT NOT NULL` para nombre/email/hash/rol, una restricción única sobre email normalizado y una restricción `CHECK` para los tres roles válidos. El registro normalizará el email antes de insertar y manejará la violación de unicidad como conflicto de validación.

No se usarán migraciones destructivas ni `DROP TABLE`. Si una base ya contiene el esquema, el arranque será repetible y conservará las filas.

### Compose y orden de arranque

Agregar un servicio `postgres` basado en una imagen fijada, con variables `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` y `POSTGRES_PORT`/puerto publicado según el entorno, además de un volumen nombrado independiente. Su healthcheck usará `pg_isready` con el usuario y la base configurados.

La API recibirá las mismas variables de conexión y tendrá `depends_on.postgres.condition: service_healthy`; su healthcheck seguirá consultando `/api/health`. El frontend conservará el proxy `/api` y dependerá de la API saludable. `.env.example` contendrá valores de desarrollo claramente no secretos, mientras que `.env` permanecerá ignorado.

Se conservará el volumen SQLite existente y no se eliminarán datos durante la planificación. La implementación deberá documentar que crear el volumen PostgreSQL no implica borrar el anterior; cualquier importación posterior de cuentas existentes requiere una decisión explícita y separada.

### Pruebas contra PostgreSQL

Las pruebas de API se ejecutarán con una PostgreSQL de prueba levantada por Compose o por un comando documentado, usando una base/esquema aislado y credenciales de entorno. Cada prueba limpiará o recreará sus filas sin tocar el volumen de desarrollo. Se cubrirán registro válido, duplicados, hash sin contraseña plana, login válido/ inválido, JWT válido/ausente/inválido, `/me`, healthcheck, los tres roles y login después de reiniciar los contenedores.

Se conservará `node --test` como runner y se evitará que el conjunto dependa de SQLite o de datos existentes. La validación de infraestructura incluirá `docker compose config`, `docker compose up --build -d`, `docker compose ps`, healthchecks y una prueba HTTP desde el origen del frontend.

### Consultas educativas y documentación

`ARCHITECTURE.md` incorporará la topología PostgreSQL y una sección de DBeaver con ejemplos de solo lectura, por ejemplo `SELECT`, `WHERE`, `LIKE`, `ORDER BY` y `LIMIT`, seleccionando columnas no sensibles y explicando que `password_hash` no es una contraseña recuperable. La documentación indicará cómo detener el entorno sin eliminar volúmenes y reservará Render para la clase siguiente.

## Risks / Trade-offs

- [Risk] Las diferencias entre tipos y errores de SQLite y PostgreSQL pueden alterar detalles internos del backend. → Mitigation: centralizar acceso SQL, mapear errores de unicidad explícitamente y conservar pruebas de contrato HTTP.
- [Risk] PostgreSQL requiere un servicio saludable antes de la API y puede ralentizar el primer arranque. → Mitigation: `pg_isready`, `depends_on` condicionado, reintentos/healthchecks y mensajes de diagnóstico en logs.
- [Risk] Las pruebas pueden contaminar la base de desarrollo. → Mitigation: base o esquema de prueba separado, variables específicas y limpieza por prueba; no usar el volumen de desarrollo para tests destructivos.
- [Risk] El cambio deja cuentas existentes solo en el volumen SQLite si no se define una importación. → Mitigation: conservar el volumen sin borrarlo, documentar el límite y separar cualquier migración de datos histórica como decisión explícita posterior.
- [Risk] Errores de configuración pueden exponer credenciales o hacer que la API arranque con defaults inseguros. → Mitigation: validar variables obligatorias, usar `.env.example` sin secretos reales y revisar `.gitignore`/`.dockerignore`.
- [Risk] Consultas educativas podrían mostrar información sensible si se copian sin cuidado. → Mitigation: usar columnas públicas en los ejemplos y explicar que las contraseñas nunca se almacenan en texto plano.

## Migration Plan

1. Actualizar dependencias y configuración para `pg`, definir el contrato de variables y preparar el pool sin modificar todavía el frontend.
2. Implementar el esquema PostgreSQL idempotente y adaptar las operaciones de autenticación, errores, healthcheck y serialización pública.
3. Agregar el servicio PostgreSQL, su volumen y healthcheck a Compose; hacer que API y frontend respeten la cadena de salud.
4. Adaptar las pruebas para una instancia PostgreSQL aislada y ejecutar el flujo completo para los tres roles, incluyendo reinicio sin borrar volúmenes.
5. Actualizar `.env.example` y `ARCHITECTURE.md` con operación, límites y consultas DBeaver.
6. Validar configuración, build, healthchecks, API pública y persistencia. No ejecutar Render ni `down -v`.

Para rollback durante desarrollo, detener la nueva composición sin borrar volúmenes y restaurar el código/configuración anterior. El volumen SQLite existente se conserva para inspección o una futura importación explícitamente aprobada; no se elimina como parte de este cambio.

## Open Questions

No hay preguntas abiertas que cambien el contrato o la estrategia. Los nombres finales de las variables opcionales del pool y el comando exacto para levantar la base de pruebas pueden fijarse durante la implementación sin alterar las specs ni la arquitectura.
