# DECILO MVP

## Límites de dominio

- `app.js` mantiene separadas las áreas de identidad/sesión, relaciones autorizadas, comunicación, actividades y progreso mediante funciones de acceso explícitas.
- `index.html` contiene únicamente el shell semántico y carga `styles.css` y `app.js`.
- `styles.css` concentra los tokens visuales, estados accesibles y layout responsive inspirado en `stitch_decilo`.

## Persistencia y sesión

El MVP es una aplicación estática desplegable como archivos HTML/CSS/JS. Los datos de demostración y las mutaciones se guardan en `localStorage` bajo `decilo-mvp-v1`; la sesión activa se guarda en `sessionStorage` bajo `decilo-session-v1`. Esto permite un arranque reproducible sin backend, pero no sustituye una autenticación de producción.

Las cuentas demo son `sofia@decilo.test`, `mateo@decilo.test` y `carla@decilo.test`, todas con clave `decilo`. La autorización se evalúa en cada consulta o mutación contra `relationships`; ocultar una vista no es el mecanismo de seguridad.

## Despliegue

Puede servirse con cualquier servidor estático. Por ejemplo, con Node instalado: `npx serve .` o un servidor HTTP equivalente. No se incorporan dependencias de audio, grabaciones, gráficos avanzados ni recomendaciones de IA.

## Autenticacion y ejecucion local

La autenticacion se resuelve mediante la API Node.js/Express de `server.js`. Las cuentas se guardan en SQLite en la tabla `users`; `password_hash` contiene un hash bcrypt y nunca se persiste una contraseña en texto plano. La API firma JWT usando `JWT_SECRET`, que debe existir solo en un archivo `.env` local o en el entorno del contenedor.

Para levantar el proyecto con Docker:

1. Copiar `.env.example` como `.env` y reemplazar `JWT_SECRET` por un valor aleatorio de al menos 32 caracteres.
2. Ejecutar `docker compose up --build -d`.
3. Abrir `http://localhost:8080` y consultar `http://localhost:8080/api/health`.
4. Detener los servicios con `docker compose down`. El volumen `decilo-sqlite` conserva las cuentas; usar `docker compose down -v` solo cuando se quiera borrar la base de desarrollo.

Las pruebas de API se ejecutan con `npm.cmd test` en Windows o `npm test` en un shell que permita el ejecutable de npm. El cambio no incluye recuperación de contraseña, OAuth, diagnósticos clínicos, inteligencia artificial, pagos, notificaciones externas ni despliegue productivo.