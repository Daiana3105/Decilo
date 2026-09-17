# DECILO MVP

## Límites de dominio

- `app.js` mantiene separadas las áreas de identidad/sesión, relaciones autorizadas, comunicación, actividades y progreso mediante funciones de acceso explícitas.
- `index.html` contiene únicamente el shell semántico y carga `styles.css` y `app.js`.
- `styles.css` concentra los tokens visuales, estados accesibles y layout responsive inspirado en `stitch_decilo`.

## Persistencia y sesión

El frontend conserva la sesión JWT en `sessionStorage` bajo `decilo-session-v1` y consulta la identidad mediante `/api/auth/me`. Las cuentas se persisten en PostgreSQL, no en el navegador. La API guarda únicamente `password_hash` generado con bcrypt y nunca contraseñas en texto plano.

La tabla `users` contiene `id`, `nombre`, `email`, `password_hash`, `rol` y `created_at`. El email se normaliza antes de insertar y la base impone unicidad y los roles válidos `profesional`, `paciente` y `familiar`.

## Despliegue

Puede servirse con cualquier servidor estático. Por ejemplo, con Node instalado: `npx serve .` o un servidor HTTP equivalente. No se incorporan dependencias de audio, grabaciones, gráficos avanzados ni recomendaciones de IA.

## Autenticacion y ejecucion local

La autenticacion se resuelve mediante la API Node.js/Express de `server.js`, usando el paquete `pg` y consultas SQL parametrizadas. La API firma JWT usando `JWT_SECRET`, que debe existir solo en un archivo `.env` local o en el entorno del contenedor. Las credenciales PostgreSQL también se configuran por entorno y no se versionan.

Para levantar el proyecto con Docker:

1. Copiar `.env.example` como `.env` y reemplazar `JWT_SECRET` por un valor aleatorio de al menos 32 caracteres. Cambiar `DB_PASSWORD` si el entorno no es exclusivamente local.
2. Ejecutar `docker compose up --build -d`.
3. Abrir `http://localhost:8080` y consultar `http://localhost:8080/api/health`. PostgreSQL queda publicado por defecto en `localhost:55432` para evitar conflictos con instalaciones locales; internamente la API usa el puerto `5432` del servicio.
4. Detener los servicios con `docker compose down`. El volumen `decilo-postgres` conserva las cuentas. El volumen legado `decilo-sqlite` no se elimina ni se usa por la nueva API; no ejecutar `docker compose down -v` durante esta migración.

Las pruebas de API se ejecutan con PostgreSQL levantado y `npm.cmd test` en Windows o `npm test` en un shell que permita el ejecutable de npm. Se pueden sobrescribir `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` y `TEST_DB_NAME` para usar una base de pruebas aislada.

## Consultas educativas para DBeaver

Conectarse a la base local usando el host, puerto, usuario y base declarados en `.env`. Las siguientes consultas son de solo lectura y no muestran contraseñas:

```sql
SELECT id, nombre, email, rol, created_at
FROM users;
```

```sql
SELECT id, nombre, email, rol
FROM users
WHERE rol = 'paciente';
```

```sql
SELECT id, nombre, email, rol
FROM users
WHERE email LIKE '%@example.com';
```

```sql
SELECT id, nombre, email, rol, created_at
FROM users
ORDER BY created_at DESC;
```

```sql
SELECT id, nombre, email, rol
FROM users
ORDER BY id
LIMIT 10;
```

`password_hash` existe para autenticación, pero no representa una contraseña recuperable y no debe incluirse en consultas educativas generales. El cambio no incluye recuperación de contraseña, OAuth, diagnósticos clínicos, inteligencia artificial, pagos, notificaciones externas ni despliegue en Render; Render corresponde a la clase 6.