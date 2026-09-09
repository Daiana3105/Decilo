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