# Preparación de publicación — 2026-10-07

Estado: cambios preparados para revisión, **sin commit, push, merge, migración remota ni despliegue**. Rama `develop`, con trabajo previo preservado. No archivar los cambios OpenSpec incompletos.

## Condiciones antes de publicar

- Confirmar el servicio y la base destino en el Dashboard privado de Render. No se tiene acceso autenticado a ese Dashboard en esta sesión; no se verificaron sus variables privadas ni su plan.
- La demo familiar pública es opt-in mediante `FAMILY_DEMO_ENABLED` y `FAMILY_DEMO_PUBLIC_ENABLED`; exige `DATABASE_URL` y un marcador válido `FAMILY_DEMO_MARKER`. El marcador debe coincidir con la tabla `family_demo_guard` ya acreditada por el operador. No se crea automáticamente.
- Deben existir miembros ficticios acreditados en `family_demo_members` y vínculos profesionales autorizados. Registrarse con un correo de prueba no crea membresía ni relaciones. Sin esos prerrequisitos, **no habilitar el modo público**. La preparación de cuentas/vínculos remotos queda pendiente de verificar; no copiar la base local ni ejecutar el seed sobre la existente.
- Antes de habilitar Gemini, revisar IDs de cuentas ficticias paciente/familiar y configurar `GEMINI_DEMO_USER_IDS`. Lista vacía deniega el proveedor externo. Dominio reservado `.test`/`.invalid`, rol vigente y lista autorizada se verifican en backend. No admitir usuarios reales.
- `node scripts/render-demo-preflight.js` es una comprobación de solo lectura para el operador, una vez disponibles los archivos y la configuración privada en un entorno autorizado. Verifica marcador, miembros, vínculos, lista Gemini y presencia de clave; muestra solo conteos, modelo y booleanos. No llama a Google. No fue ejecutado contra Render.

## Variables (solo nombres)

| Componente | Variables |
| --- | --- |
| API / PostgreSQL | `NODE_ENV`, `PORT`, `DATABASE_URL`, `DB_POOL_MAX`, `JWT_SECRET`, `JWT_EXPIRES_IN` |
| CORS API | `FRONTEND_PUBLIC_URL`, `LOCAL_FRONTEND_URL` |
| Demo pública API | `FAMILY_DEMO_ENABLED`, `FAMILY_DEMO_PUBLIC_ENABLED`, `FAMILY_DEMO_MARKER` |
| Gemini, exclusivamente API | `GEMINI_DEMO_ENABLED`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_DEMO_USER_IDS` |
| Build del Static Site | `API_PUBLIC_URL` |

En Render, conservar los secretos existentes; no copiarlos al frontend, comandos, Git o logs. `PORT` es provisto por la plataforma. Configurar orígenes exactos; no usar comodines. `DATABASE_URL` usa la conexión PostgreSQL del servicio destino, no los datos del Docker local. Las alternativas `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` son para la instalación local, no se necesitan junto a `DATABASE_URL`. No usar `FAMILY_DEMO_PASSWORD` en el despliegue.

## Gemini y límites de la demo

Modelo predeterminado/configurable: `gemini-3.5-flash-lite`. La [documentación de precios de Google](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite) ofrece entrada/salida gratuitas con límites, consultada el 2026-10-07; el nivel efectivo depende del proyecto de Google. No se habilitó facturación ni se cambiaron cuotas.

Solo se envían pregunta y guía pública por rol; sin historial, paciente activo, JWT ni herramientas. Se requiere confirmación de edad para la demo y consentimiento explícito antes de cada envío; texto inerte y simulador alternativo. Google puede usar/revisar contenido del nivel gratuito: no se promete retención cero. Se eliminó `store` del payload porque no es un campo documentado de [GenerateContent](https://ai.google.dev/api/generate-content); no proporcionaba garantía de privacidad.

Se mantienen 5 solicitudes/minuto y 30/día por cuenta, concurrencia global 2, pregunta 800 caracteres, salida acotada y timeout 15 s, sin reintento automático. Los límites son en memoria: una sola instancia para esta demo; se reinician al reiniciar el proceso. Las cuotas externas de Google siguen siendo necesarias para limitar exposición económica. Cuotas durables, políticas de uso real y validación productiva siguen pendientes.

La API local de la demo inspeccionada no tiene clave Gemini configurada; usa el modelo predeterminado y permite el simulador. No se mostró ninguna clave: la inspección y comparación privada solo produjeron booleanos/rutas, nunca valores. La configuración real de Render y una respuesta real de Gemini **no están verificadas**; se deben comprobar manualmente después de una publicación autorizada, con pregunta sintética y consentimiento. Las pruebas automatizadas usan proveedor mock y bloquean llamadas pagas.

## Secuencia futura, todavía no ejecutada

1. Revisar diff y archivos enumerados abajo; resolver los prerrequisitos de membresía/marcador remotos. Conservar backup gestionado de la base destino. No importar volúmenes, dumps ni fixture local. Revisar auto-deploy antes de publicar una rama: un push/merge puede activarlo.
2. Tras autorización separada, publicar la API con `Dockerfile.api` (o `npm ci --omit=dev` y `npm start`). Inyectar secretos solo en ejecución. El Dockerfile copia los módulos de agenda, repositorios y preflight; no copia `.env`. El seed no forma parte del arranque y su CLI rechaza una conexión remota.
3. El arranque aplica DDL aditivo de `db.js`/`patient-scheduling-schema.js` dentro de transacción y lock de inicialización; después verifica el marcador y aplica el DDL de `family-demo-schema.js`. Conserva filas y tipos históricos; agrega tablas/columnas, incluida baja lógica. No crea cuentas, vínculos ni actividades. La restricción de invitaciones se reemplaza conservando filas válidas; el consumo ahora permite registrar al paciente. Si falla, no servir tráfico como si la migración hubiera terminado.
4. Confirmar `/api/health`, preflight de solo lectura y logs saneados; comprobar conexión PostgreSQL y membresías antes de cambiar el frontend. Un rollback de aplicación debe conservar el esquema ampliado; no volver a checks antiguos incompatibles con nuevos tipos de avisos/invitaciones.
5. Static Site: build `npm ci --include=dev && npm run build:frontend`, publicar `dist`, con `API_PUBLIC_URL` apuntando a la API HTTPS. Requiere devDependencies para empaquetar Socket.IO. Nginx es solo para Docker; Render Static Site no lo ejecuta. Mantener/configurar sus headers MIME y caché PWA en Dashboard (pendiente previo, no modificado aquí).
6. Verificar profesional → paciente/familiar con cuentas ficticias autorizadas: ficha y vínculos, actividad Hogar, baja lógica, tablero entre sesiones, turno/superposición/cancelación, avisos y revocación. Probar Gemini con consentimiento y simulador sin clave. No cerrar issues ni completar tareas manuales antes de observar resultados.

## Funciones y pendientes

Disponibles si se cumplen los prerrequisitos: fichas mínimas de pacientes ficticios ya vinculados; invitación/aceptación/revocación familiar; actividades Hogar/Consulta con permisos; baja lógica que conserva historial/puntos; tableros PostgreSQL y pictogramas; agenda mensual con creación/cancelación y rechazo transaccional de superposiciones; notificaciones persistentes y ayudante simulado/Gemini restringido.

No incluye altas de pacientes reales, acreditación clínica/representación, recurrencias, recordatorios, emails ni estados avanzados de agenda. Fallos de persistencia de avisos secundarios no tienen recuperación automática; no invalidan la operación principal. Continúan abiertos los pendientes de OpenSpec de agenda, vínculos, ayudante y pruebas públicas/móviles de PWA.

## Latencia: evidencia y límites

Mediciones públicas del 2026-10-07 sin cuentas reales ni escrituras: primer health HTTP 200 **23,208 s** (conexión 0,458 s, TLS 0,545 s); health repetido **0,335 s**; HTML público **0,736 s**. Un login deliberadamente inexistente devolvió 401 en **1,172 s**: mide petición/red/rechazo, no bcrypt de un login válido. Node fetch falló antes de obtener HTTP; se midió con las herramientas de Windows sin desactivar validación TLS.

La diferencia es compatible con arranque en frío, no prueba por sí sola el plan ni cuánto tarda internamente el proceso. [Render documenta](https://render.com/docs/free) suspensión tras 15 minutos sin tráfico en instancias gratuitas y alrededor de un minuto de reactivación. No se cambió el plan, no se añadió keep-alive y no se promete eliminar esa espera con código. Para atribuir exactamente el arranque remoto faltan timestamps de logs privados de Render y login público válido autorizado.

Login ahora muestra estado inmediato, aviso si tarda, impide duplicados y cancela solicitudes obsoletas al cambiar de pantalla. Mantiene timeout de espera acotado sin reintento automático. Socket.IO/notificaciones se inician sin esperar respuesta; Gemini solo se solicita al enviar desde Ayudante. La fuente externa ya no bloquea el primer render. Las pruebas finales registran por separado arranque local, login real en base efímera con bcrypt coste 12 y carga de UI posterior a respuesta (no extrapolar tiempos locales a Render).

## Archivos para revisar en el futuro commit

- Interfaz: `app.js`, `styles.css`, `index.html`.
- API/configuración: `config.js`, `server.js`, `assistant.js`, `gemini-provider.js`, `Dockerfile.api`, `.env.example` (solo plantilla).
- Demo/datos: `family-demo.js`, `family-demo-schema.js`, `patient-scheduling-schema.js`, `demo-agenda.js`, `repositories/demo-agenda-repository.js`, `repositories/family-link-repository.js`, `repositories/patient-activity-repository.js`, `repositories/patient-progress-repository.js`.
- Operación/pruebas: `scripts/render-demo-preflight.js`, `scripts/run-tests.js`, pruebas modificadas/nuevas de `test/` y `e2e/` según `git status --short`.
- Pruebas concretas: `test/config.test.js`, `test/family-demo.test.js`, `test/gemini-provider.test.js`, `test/patient-scheduling.test.js`, `test/demo-agenda.test.js`, `test/release-startup.test.js`, `e2e/assistant.spec.js`, `e2e/demo-agenda.spec.js`, `e2e/demo-motion.spec.js`, `e2e/login-loading.spec.js`.
- Documentación: este checklist, `FAMILY_DEMO.md`, `DEPLOY_RENDER.md`, `test/README.md`, artefactos OpenSpec de agenda/ayudante/vínculos tocados en esta preparación.

Excluir `.env`, claves, archivos privados de Compose/acceso, `dist`, `node_modules`, `test-results` y reportes generados. Todavía no se ejecutó `git add` ni commit.

## Evidencia de validación final

- Node: **149/149 aprobadas**, 0 fallidas/omitidas, una ejecución completa (57,13 s) sobre PostgreSQL efímero. Incluye migraciones repetidas, preservación, permisos/aislamiento, baja lógica, agenda/superposiciones, UoW, notificaciones secundarias y Gemini mock. Un caso de fallo secundario registra `NOTIFICATION_FAILED` saneado; es parte de la prueba de rollback, no un fallo oculto.
- Arranque del servidor local con base de test ya inicializada: **7 ms** (no incluye iniciar PostgreSQL ni DDL). Login válido con bcrypt coste 12: **431 ms**; la notificación secundaria sigue pendiente y no bloquea la respuesta.
- Navegador de prueba: petición de login **29 ms** (fixture con bcrypt coste 4), interfaz posterior **37 ms**, **0 llamadas Gemini**, con notificaciones y Socket.IO bloqueados. No se deben extrapolar estos números a usuarios públicos o bcrypt coste 12.
- OpenSpec global estricto: **13/13 válidos**. Solo avisos informativos preexistentes de requisitos extensos.
- Playwright: **55/55 aprobadas** en 2,9 min, una ejecución completa, sin omisiones ni repetición. Incluye roles, privacidad, vínculos, tableros, agenda, notificaciones, PWA, consentimiento Gemini, movimiento reducido y login no bloqueante.
- Build frontend final: correcto, con origen público de API; **13 archivos públicos**, sin nombres de variables privadas en `dist`. No se versiona el resultado. `git diff --check`: correcto.
- Imagen API `decilo-render-api-review:20261007`: construida con etiqueta separada; módulos cargan sin red/base/volúmenes, sin archivos privados ni secretos en configuración de imagen. No se reemplazaron contenedores de la demo.
- Auditoría de Git/candidatos: sin `.env` privados versionados, sin coincidencias de patrones de claves/tokens ni de 7 valores privados comparados en memoria. Se detectó y retiró una coincidencia de `.env.example`: ahora sus campos privados están vacíos. La configuración local no se modificó. Si se utiliza un valor de la plantilla histórica como secreto real, debe reemplazarse de forma privada antes de publicar; no se rotaron secretos en esta sesión.
