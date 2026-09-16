## Why

DECILO funciona hoy como un prototipo estático que guarda usuarios, contraseñas y sesión en el navegador, por lo que no ofrece autenticación segura ni persistencia compartida entre dispositivos. Este cambio establece una base ejecutable y verificable para que profesionales, pacientes y familiares puedan registrarse, iniciar sesión y conservar sus datos mediante una API y SQLite sin perder la experiencia actual.

## What Changes

- Agregar registro e inicio de sesión funcionales para los tres roles: profesional, paciente y familiar.
- Validar datos de cuenta, confirmar la contraseña y rechazar correos duplicados o credenciales inválidas con mensajes accesibles.
- Crear una API REST Node.js/Express con `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` y `GET /api/health`.
- Persistir usuarios en una tabla `users` de SQLite, guardar únicamente hashes seguros de contraseñas y emitir sesiones JWT configuradas mediante variables de entorno.
- Reemplazar la autenticación demo basada en `localStorage`/`sessionStorage` por el flujo autenticado contra la API, manteniendo el frontend y las funcionalidades actuales de comunicación, actividades y progreso.
- Dirigir al usuario autenticado al panel de su rol y bloquear el acceso a paneles o datos de otros roles.
- Incorporar Dockerfiles para API y frontend, `docker-compose.yml`, `.dockerignore`, `.env.example`, volumen persistente para SQLite y healthcheck de la API.
- Documentar el arranque, detención y pruebas del sistema, e incluir pruebas básicas de registro e inicio de sesión.
- Mantener fuera de alcance la recuperación por correo, OAuth, diagnósticos clínicos, inteligencia artificial, pagos, notificaciones externas y despliegue productivo.

## Capabilities

### New Capabilities

- `autenticacion-segura`: Registro, inicio de sesión, sesión JWT, consulta del usuario autenticado, validaciones y persistencia segura de cuentas.

### Modified Capabilities

- `comunicacion-fonoaudiologica`: Cambia el requisito de acceso diferenciado para que la identidad, el rol y la autorización de las vistas se basen en la sesión JWT y no en datos simulados locales, preservando las relaciones y funcionalidades existentes.

## Impact

- Frontend existente en `index.html`, `app.js` y `styles.css`: integración con la API, pantallas de registro/login, guardas de sesión y redirección por rol sin alterar el diseño funcional.
- Nuevo backend Node.js/Express: rutas de autenticación y salud, validación, hash de contraseñas, JWT, middleware y acceso SQLite.
- Nuevo esquema y migraciones iniciales para `users`; el volumen de Docker conservará el archivo SQLite.
- Nueva infraestructura y configuración: Dockerfiles, Compose, variables de entorno y documentación de operación.
- Nuevas dependencias de ejecución y desarrollo, junto con pruebas automatizadas del flujo de autenticación.
