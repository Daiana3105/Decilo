# Pruebas de backend

Ejecutar `npm.cmd test` en Windows o `npm test` en otros sistemas.

Se necesitan binarios locales de PostgreSQL (`initdb`, `pg_ctl`). En Windows se
detectan en `C:/Program Files/PostgreSQL`; en otros sistemas se usa `pg_config`.
Para otra ubicación, definir `TEST_PG_BIN` con el directorio de binarios.
En Unix ejecutar como usuario sin privilegios (PostgreSQL rechaza iniciar como root).

El runner crea un clúster temporal con contraseña aleatoria, puerto libre en
loopback y base exclusiva. No lee `.env` ni usa `DATABASE_URL`, `DB_*`, `PG*` o
`TEST_DB_*` para elegir una base. No necesita Docker ni un servicio PostgreSQL activo.
Cada suite crea un esquema aleatorio después de verificar la identidad y marcador
de propiedad de la base. La limpieza solo afecta a ese esquema. La ejecución
directa de una suite sin la configuración interna del runner se rechaza antes de
crear tablas o truncar datos. No configurar manualmente `DECILO_TEST_DATABASE`.

Al finalizar se detiene y elimina únicamente el clúster temporal creado por el
runner. Si faltan binarios o falla el arranque, las pruebas fallan; no se omiten
pruebas de integración ni se cambia a la base de desarrollo.

Las pruebas Socket.IO usan conexiones reales sobre puertos efímeros. `npm test`
incluye además pruebas del controlador de frontend, revisiones, recuperación,
aislamiento de sesión y build público. Solo descubre `test/*.test.js`.

`npm run test:frontend` ejecuta Playwright en un clúster PostgreSQL temporal con
la misma protección y aislamiento. Cada prueba abre una API real y un servidor
estático en puertos efímeros distintos; prueba CORS, JWT y Socket.IO entre orígenes.
No utiliza la base configurada para DECILO. El fixture cierra las pestañas antes
de cerrar API y conexiones de base. No ejecutar ambos comandos simultáneamente:
las pruebas de build y navegador generan `dist`.

En Windows se usa Edge instalado, en modo headless. Se puede seleccionar Chrome
con `PLAYWRIGHT_CHANNEL=chrome`. En Linux instalar Chromium con
`npx playwright install --with-deps chromium` antes de ejecutar. No se descargan
navegadores durante las pruebas. `npm ci` instala las dependencias fijadas.

La suite de navegador cubre varias pestañas y cuentas, roles, paginación, lectura,
foco/teclado, Escape, viewport móvil, texto HTML inerte, comunicador, reconexión,
visibilidad, JWT vencido, respuestas demoradas, revisiones concurrentes y fallos
secundarios de persistencia/emisión sin invalidar el login. El límite de las
aserciones de convergencia es de cinco segundos; no usa polling REST de aplicación.

Para desarrollo local, iniciar la API y ejecutar `npm run dev:frontend`. Este
comando construye y sirve únicamente `dist` en `http://localhost:8080`, con API
en `http://localhost:3000` por defecto. Se pueden configurar `API_PUBLIC_URL` y
`FRONTEND_PORT`; autorizar ese origen en `LOCAL_FRONTEND_URL` de la API. No servir
la raíz del repositorio: su `config.js` es privado del backend.

El build normal sin `API_PUBLIC_URL` usa el mismo origen, como Compose/Nginx.
Para frontend y API separados usar un origen HTTP(S) público sin ruta, credenciales
ni parámetros. El cliente Socket.IO y su licencia se copian desde la dependencia
local a `dist/vendor`; no se carga código de transporte desde una CDN.

La configuración de Nginx permite polling y upgrade en `/socket.io/` y conserva
`/api/`; los recursos JavaScript inexistentes devuelven 404. La validación de
directivas/build no sustituye ejecutar Compose, sus healthchecks y reinicios con
volumen persistente. Esas comprobaciones siguen pendientes si el motor Docker
está detenido. No se realizó despliegue ni se archivó el cambio OpenSpec.

Verificación de la primera etapa (2026-09-22): `npm.cmd test`, Node 22.21.1 y
PostgreSQL 16.10 local efímero: 43 pruebas aprobadas, 0 fallidas, 0 omitidas.
Incluye las regresiones existentes de autenticación, configuración y build.

Verificación de frontend (2026-09-22): `npm.cmd ci` completado; `npm.cmd test`:
52 aprobadas, 0 fallidas; `npm.cmd run test:frontend`: 13 aprobadas, 0 fallidas
con Edge headless y PostgreSQL 16 efímero. La primera ejecución de navegador
detectó escape de foco y cierre prematuro del fixture; ambos fueron corregidos
antes de esos resultados. Build verificado con mismo origen y origen HTTPS de
ejemplo; allowlist pública de siete archivos. `docker compose config` verificó
orígenes y puerto configurable. No se validó el proxy en contenedores: el motor
Docker Desktop estaba detenido. No confundir esta comprobación de configuración
con las tareas que estaban pendientes 6.2, 6.3, 7.4 y 7.5 de OpenSpec.

Actualización local posterior (2026-09-22): el usuario confirmó build y arranque
de Compose exitosos, healthchecks saludables y sincronización manual del aviso
de login, badge y lecturas individual/general entre dos sesiones de la misma
cuenta. Se corroboraron mediante solo lectura `docker compose ps`, el healthcheck
público y handshakes de polling y WebSocket por `localhost:8080`. Quedan completas
6.2 y 6.3. En esa fecha faltaban la configuración aislada documentada y la revisión
manual responsive de 7.4, y persistencia tras reinicios de 7.5. El bloqueo anterior
por Docker detenido ya no aplica. Render no fue validado ni desplegado.

## Docker Compose aislado para validación manual

Esta receta reproduce la validación sin compartir contenedores, red, volumen ni
credenciales con el proyecto de desarrollo `decilo`. No cambia el aislamiento
automático de `npm test` y `npm run test:frontend`, que no utilizan Compose.

Desde la raíz del repositorio, usar una terminal PowerShell sin variables de
DECILO heredadas: las variables del proceso tienen precedencia sobre `--env-file`.
En esa terminal dedicada, retirarlas antes de cargar la configuración de pruebas:

```powershell
Get-ChildItem Env: | Where-Object { $_.Name -match '^(DB_|JWT_|FRONTEND_|LOCAL_FRONTEND_URL$|API_PUBLIC_URL$|DATABASE_URL$|COMPOSE_)' } | Remove-Item
node -e "const fs=require('node:fs'),c=require('node:crypto');fs.writeFileSync('.env.notifications-test',['DB_USER=decilo_notifications_test','DB_NAME=decilo_notifications_test','DB_PASSWORD='+c.randomBytes(32).toString('hex'),'JWT_SECRET='+c.randomBytes(32).toString('hex'),'JWT_EXPIRES_IN=1h','DB_PORT=55433','FRONTEND_PORT=58080','DB_POOL_MAX=4','LOCAL_FRONTEND_URL=http://localhost:58080,http://127.0.0.1:58080','API_PUBLIC_URL='].join('\n')+'\n',{flag:'wx'});"
docker compose -p decilo-notifications-test --env-file .env.notifications-test up --build -d
docker compose -p decilo-notifications-test --env-file .env.notifications-test ps
Invoke-RestMethod http://localhost:58080/api/health
```

El archivo privado está excluido por `.gitignore` y `.dockerignore`; el comando
no imprime secretos ni sobrescribe un archivo existente. Reutilizarlo en futuras
ejecuciones del mismo proyecto, sin regenerar credenciales para su volumen.
Comprobar que los puertos 55433 y 58080 estén libres antes del arranque; si se
cambian, actualizar también el origen autorizado y las URLs de esta receta.
No usar cuentas ni datos reales. No publicar el archivo ni la salida completa de
`docker compose config`, que incluye credenciales interpoladas.

El volumen resultante es `decilo-notifications-test_decilo-postgres`, distinto de
`decilo_decilo-postgres`. La API conecta al servicio `postgres` de su propia red;
Compose no pasa `DATABASE_URL` al contenedor. Mantener siempre el mismo `-p` y
`--env-file` en los comandos; no conectar las pruebas a una base externa.

Abrir `http://localhost:58080`, crear cuentas de prueba y comprobar campana/panel
en escritorio, móvil y tablet. Con dos sesiones de A y una de B, verificar aviso
por login, contador y lecturas sincronizadas solo para A, sin recarga. Revisar
polling y upgrade WebSocket en Network y confirmar que los scripts son JavaScript.
Antes de reiniciar, registrar IDs, fechas de creación/lectura y contador sin JWT
ni datos personales. Se puede contrastar la persistencia con esta consulta local:

```powershell
docker compose -p decilo-notifications-test --env-file .env.notifications-test exec -T postgres psql -U decilo_notifications_test -d decilo_notifications_test -c "SELECT id, user_id, created_at, read_at FROM notifications ORDER BY id; SELECT user_id, count(*) FILTER (WHERE read_at IS NULL) AS unread_count FROM notifications GROUP BY user_id;"
docker compose -p decilo-notifications-test --env-file .env.notifications-test restart api
docker compose -p decilo-notifications-test --env-file .env.notifications-test stop api
docker compose -p decilo-notifications-test --env-file .env.notifications-test restart postgres
docker compose -p decilo-notifications-test --env-file .env.notifications-test up -d --wait
```

Comparar la consulta y la interfaz después de cada reinicio, esperando healthchecks
saludables. Restaurar la sesión no debe crear avisos; un login explícito posterior
intenta crear uno nuevo. Los avisos previos y fechas deben conservarse, incluidos
los leídos, sin retención automática. Para detener el entorno, usar `stop` con
los mismos argumentos de proyecto y archivo. No usar `down -v` ni borrar el volumen.

## Evidencia manual completada (2026-09-23)

El usuario confirmó escritorio, móvil y tablet sin desbordamiento horizontal,
textos/fechas/botones correctos y apertura/cierre normal. Confirmó también que los
avisos, el estado leído, la fecha de lectura y el contador permanecieron tras
reiniciar la API y tras reiniciar PostgreSQL y volver a iniciar la API.
Junto con la evidencia anterior y esta documentación, se completan 7.4 y 7.5.
La receta aislada queda documentada para reproducción; no se afirma haberla
ejecutado nuevamente ni que la prueba reportada usara sus puertos específicos.
Las tareas 8.1–8.4 siguen pendientes. No se desplegó en Render.
