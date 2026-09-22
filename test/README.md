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

Las pruebas Socket.IO usan conexiones reales sobre puertos efímeros. Simulan
varias pestañas con clientes independientes, sin interfaz de navegador. Playwright,
campana/panel, proxy frontend de Compose y despliegue quedan para etapas posteriores.

Verificación de la primera etapa (2026-09-22): `npm.cmd test`, Node 22.21.1 y
PostgreSQL 16.10 local efímero: 43 pruebas aprobadas, 0 fallidas, 0 omitidas.
Incluye las regresiones existentes de autenticación, configuración y build.
