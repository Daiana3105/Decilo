# Despliegue manual de DECILO en Render

Esta guía prepara tres servicios separados. Crealos en este orden: PostgreSQL administrado → Web Service de la API → Static Site del frontend → actualizar `FRONTEND_PUBLIC_URL` en la API. Usá el mismo repositorio y la misma rama para la API y el frontend. Cargá los valores reales únicamente en el panel de Render; no los escribas en archivos versionados, capturas ni documentación.

## 1. PostgreSQL administrado

1. En Render, creá una base PostgreSQL administrada para DECILO y esperá a que esté disponible.
2. Conservá la base al reiniciar o volver a desplegar la API: las cuentas se almacenan allí. Un redeploy del Web Service no debe eliminar PostgreSQL.
3. En la configuración privada del Web Service, conectá `DATABASE_URL` con la URL de conexión que Render proporciona para esa base. Si Render permite vincular la base como origen de la variable, usá ese vínculo. No copies la URL a este repositorio ni configures usuario y contraseña por separado cuando la URL ya los contiene.

## 2. Web Service de la API

Creá un Web Service Node.js desde el repositorio con esta configuración:

| Campo | Valor |
| --- | --- |
| Root Directory | Raíz del repositorio |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

`npm start` ejecuta `node server.js`. La API escucha en `process.env.PORT`; Render proporciona `PORT` al Web Service. No hace falta fijar un valor manual para esa variable.

Configurá estas variables **solo en el Web Service**:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión privada con PostgreSQL administrado. |
| `JWT_SECRET` | Secreto privado para firmar JWT; debe tener al menos 32 caracteres. |
| `JWT_EXPIRES_IN` | Duración de los JWT, por ejemplo `1h`. |
| `FRONTEND_PUBLIC_URL` | Origen HTTPS público del Static Site para CORS, sin ruta ni barra final. |

Como el frontend todavía no existe en este paso, completá `FRONTEND_PUBLIC_URL` después de crear el Static Site y volvé a desplegar la API si Render no aplica el cambio automáticamente. `API_PUBLIC_URL` corresponde exclusivamente al build del frontend; no se configura en la API. Cuando la API esté disponible, conservá su URL HTTPS pública para el paso siguiente. El healthcheck debe responder con la API y la base disponibles.

## 3. Static Site del frontend

Creá un Static Site desde el mismo repositorio con esta configuración:

| Campo | Valor |
| --- | --- |
| Root Directory | Raíz del repositorio |
| Build Command | `npm ci && npm run build:frontend` |
| Publish Directory | `dist` |

Configurá `API_PUBLIC_URL` como **variable pública de build** con la URL HTTPS pública de la API, sin ruta `/api` ni barra final. El build genera `dist/config.js` con esa URL; el navegador la usa para llamar a los endpoints `/api`. Si cambia la URL de la API, actualizá la variable y reconstruí el Static Site.

El script `build-frontend.js` publica en `dist` únicamente `index.html`, `app.js`, `styles.css` y `config.js`. Verificá esos cuatro archivos en el resultado del build. No envíes `DATABASE_URL`, `JWT_SECRET`, contraseñas ni tokens al Static Site ni a sus recursos públicos.

## 4. Completar la conexión entre servicios

Copiá el origen HTTPS público del Static Site en `FRONTEND_PUBLIC_URL` del Web Service, sin ruta ni barra final. Comprobá que `https://<API_PUBLICA>/api/health` responda y que el frontend público pueda hacer solicitudes a la API. Las pruebas de registro, login, `/api/auth/me` y persistencia tras un redeploy corresponden a las tareas posteriores del cambio OpenSpec.

## 5. Resumen final de verificación

- Frontend: [https://decilo-web.onrender.com](https://decilo-web.onrender.com)
- API: [https://decilo-api.onrender.com](https://decilo-api.onrender.com)
- Healthcheck: `/api/health` respondió con API y base de datos en estado `ok`.
- Registro, login y `/api/auth/me`: verificados.
- Roles `profesional`, `paciente` y `familiar`: verificados.
- CORS: el frontend público y localhost fueron permitidos; un origen arbitrario fue rechazado.
- Persistencia: verificada después de redesplegar la API.
- Secretos: no se publicaron secretos, credenciales, contraseñas ni tokens.
