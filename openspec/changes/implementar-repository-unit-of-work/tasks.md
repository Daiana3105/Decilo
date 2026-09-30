## 1. Caracterización antes de implementar

Seguir la migración incremental de design.md, verificando cada paso. No superponer el helper transaccional anterior y el UoW en una operación; retirar el helper al terminar sus consumidores. Ninguna tarea autoriza commit automático, merge, despliegue ni archivo OpenSpec.

- [x] 1.1 Registrar ejecución base de las 73 pruebas con npm.cmd test mediante PostgreSQL temporal; investigar diferencias sin eliminar cobertura.
- [x] 1.2 Fijar matriz de contratos y consultas de auth, salud, notificaciones y Socket.IO a partir del inventario de design.md; conservar firmas usadas por las pruebas.

## 2. Repository

- [x] 2.1 Crear repositorio de usuarios con findById, findByEmail e insert, SQL parametrizado y ejecutor inyectado; mantener bcrypt/JWT/DTO en lógica existente.
- [x] 2.2 Crear repositorios de notificaciones y estado con métodos del diseño, filtros por usuario, rowCount, bloqueos, resumen y BIGINT sin pérdida de precisión.
- [x] 2.3 Extraer SELECT 1 a adaptador de salud; migrar consultas de auth.js y server.js conservando respuestas y dobles de prueba existentes.
- [x] 2.4 Probar repositorios con ejecutor inyectado, parámetros, aislamiento de usuario y ausencia de manejo propio de conexiones/transacciones.

## 3. Unit of Work

- [x] 3.1 Implementar run con adquisición única, BEGIN según modo, configuración local y callback esperado antes de COMMIT en el mismo cliente.
- [x] 3.2 Implementar error original, intento de ROLLBACK y release único en finally; descartar cliente inseguro sin cerrar el pool ni reintentar automáticamente.
- [x] 3.3 Probar orden y cliente único en commit, fallo connect, BEGIN, SET LOCAL, callback, COMMIT y ROLLBACK; verificar release normal/descarte exactamente una vez.
- [x] 3.4 Probar lecturas REPEATABLE READ READ ONLY, límites locales y aislamiento entre unidades concurrentes sin pool.query dentro de la unidad.

## 4. Integración transaccional

- [x] 4.1 Migrar createLogin al UoW: asegurar/bloquear estado, insertar aviso, incrementar solo ante cambio y resumir antes de confirmar.
- [x] 4.2 Migrar list, unreadCount, markRead y markAllRead preservando snapshots, concurrencia, fechas, idempotencia y errores existentes.
- [x] 4.3 Mantener login no bloqueante, pool secundario acotado y publicación fuera del UoW; usar una barrera de COMMIT pendiente para verificar cero llamadas a publish antes de confirmar y ninguna ante rechazo; comprobar emisión fallida sin perder datos. Conservar notifications:ready independiente.
- [x] 4.4 Agregar integración real de commit visible desde otra conexión y rollback en incremento de revisión con estado nuevo y previo, sin exigir secuencias consecutivas.
- [x] 4.5 Comprobar nueva adquisición tras éxito/fallo con pool max 1 y timeout; conservar pruebas concurrentes, deduplicación y regresiones actuales de rollback.

## 5. Empaquetado y validación de la implementación futura

- [x] 5.1 Incluir módulos nuevos en Dockerfile.api y verificar arranque en entorno aislado; mantener DDL, esquema público y dist sin archivos privados.
- [x] 5.2 Documentar Repository/UoW, flujo atómico, excepción DDL, errores de commit incierto y pruebas en ARCHITECTURE.md y test/README.md.
- [x] 5.3 Ejecutar npm.cmd test: conservar las 73 pruebas de referencia y aprobar nuevas pruebas; registrar totales y fallos sin ocultarlos.
- [x] 5.4 Ejecutar secuencialmente npm.cmd run build:frontend y npm.cmd run test:frontend; conservar las 32 regresiones Playwright y registrar resultados reales.
- [x] 5.5 Ejecutar openspec.cmd status --change implementar-repository-unit-of-work, validación estricta del cambio y global, y git diff --check.
- [x] 5.6 Revisar diff, ausencia de secretos/generados y alcance exclusivo #17; comprobar que contratos, esquema y cambio PWA permanecen sin alteraciones ajenas.

Etapa 1 autorizada: infraestructura base y pruebas, sin migrar consumidores. Solo las casillas marcadas cuentan con evidencia de esta etapa; las demás permanecen pendientes. No se autoriza commit, push, merge, despliegue ni archivo OpenSpec. Issue: https://github.com/Daiana3105/Decilo/issues/17.


### Evidencia de infraestructura base

- Base antes de agregar pruebas: npm.cmd test, 73 aprobadas.
- Nuevas pruebas unitarias: node --test test/unit-of-work.test.js test/repositories.test.js, 16 aprobadas. El primer intento fue bloqueado por spawn EPERM del sandbox; la ejecución autorizada terminó correctamente.
- Suite completa: npm.cmd test, 90 aprobadas (73 existentes y 17 nuevas), 0 fallidas, PostgreSQL efímero aislado. Incluye integración de repositorios/UoW sin migrar el servicio: commit, duplicado, rollback tras inserción y adquisición posterior con pool max 1.
- 2.3 parcial: creado repositories/database-health.js; auth.js y server.js no migrados.
- 4.1–4.5 siguen pendientes: la prueba base no acredita integración de createLogin, emisión Socket.IO ni todos los escenarios de estado nuevo/preexistente.
- 5.3 conserva su casilla pendiente por corresponder a la implementación completa; esta etapa sí ejecutó las 90 pruebas disponibles. No se ejecutó Playwright ni se modificó Dockerfile.api.
- El UoW conserva el error original si también falla rollback o release. Si solo falla release después de COMMIT, rechaza con ese error sin intentar revertir un commit confirmado ni liberar otra vez.
- OpenSpec estricto: cambio válido y global 8 aprobados, 0 fallidos. git diff --check correcto; avisos de conversión LF/CRLF sin errores.

### Revisión crítica de la etapa 1

- No se detectaron defectos funcionales en UoW ni repositorios; no se modificaron esos módulos ni consumidores. Se añadieron dos pruebas para comprobar BEGIN pendiente antes del callback y error original de COMMIT cuando también rechazan ROLLBACK y release.
- Nueva ejecución: 18 pruebas unitarias aprobadas; npm.cmd test con PostgreSQL efímero aislado, 92 aprobadas (73 existentes más 19 nuevas), 0 fallidas y sin rechazos no manejados reportados por el runner.
- Se confirmaron parámetros SQL, ejecutor inyectado, contratos de filas/rowCount/BIGINT, responsabilidad transaccional exclusiva del UoW y protecciones de isolatedDatabase intactas. No se marcaron tareas adicionales ni tareas dependientes de migrar consumidores.
- OpenSpec estricto del cambio y global válidos (8 aprobados); git diff --check sin errores.

### Etapa 2: consumidores de repositorios

- Salud y usuarios migrados mediante inyección explícita; firmas anteriores siguen funcionando con repositorios construidos sobre el ejecutor recibido. SQL de búsqueda por ID/email e inserción eliminado de auth.js/server.js.
- listBefore, findOwnedById, markRead, markAllRead y summary delegados a repositorios ligados al cliente del helper transaccional existente. Summary es compartido por ese helper: su consulta se delega sin cambiar orden, conexión ni resultado, también cuando el helper atiende createLogin.
- La inserción secundaria createLogin, sus bloqueos/escrituras de estado, BEGIN/COMMIT/ROLLBACK/release y emisión no se migraron. Unit of Work permanece intacto. 4.1 y 4.2 siguen pendientes porque exigen integración con UoW, no solo extracción de consultas.
- Dockerfile.api copia repositories/ para resolver los nuevos imports; 5.1 sigue parcial, sin incluir UoW ni afirmar prueba de arranque de imagen.
- Pruebas dirigidas: node --test test/repository-consumers.test.js test/repositories.test.js, 4 aprobadas. Comprueban inyección, normalización y hash, salud/registro/login/me, cliente transaccional compartido, paginación, fallback de lectura, revisiones string y resumen.
- Suite completa posterior: npm.cmd test, 94 aprobadas, 0 fallidas, base efímera aislada; conserva regresiones de autorización, 404 indistinguibles, concurrencia, login secundario y Socket.IO. OpenSpec estricto del cambio válido y global 8 aprobados; git diff --check sin errores. No se ejecutaron build Docker ni Playwright en esta etapa.

### Etapa 3: notificación secundaria de login — 2026-09-30

- createLogin usa UoW; ambos repositorios se construyen con su único cliente. Orden: BEGIN, límites locales, ensure, lock, insert, incremento condicional, summary, COMMIT, release y publicación posterior. Conserva el DTO anterior sin exponer cliente ni filas privadas.
- El helper transaccional manual permanece exclusivamente para operaciones REST todavía no migradas al UoW (4.2 pendiente). No se duplican transacciones en createLogin. notifications:ready, login-notifications.js y realtime.js no se modificaron.
- test/login-uow.test.js verifica misma conexión, COMMIT bloqueado sin publicación, publicación posterior, rechazo sin emisión, release único y logs saneados. Dirigidas junto con login-notifications y unit-of-work: 21 aprobadas.
- Integración PostgreSQL: createLogin revierte aviso y revisión con estado nuevo o previo, conserva datos anteriores, deduplica eventos y permite adquirir nuevamente con pool max 1. La suite conserva pruebas de login no bloqueante, errores secundarios que no invalidan JWT, límites de trabajo, emisión fallida, reconexión y recuperación REST.
- npm.cmd test: 97 aprobadas, 0 fallidas, PostgreSQL efímero aislado. OpenSpec estricto del cambio válido; global 8 aprobados. git diff --check sin errores.
- Dockerfile.api incluye unit-of-work.js. 5.1 permanece parcial porque no se construyó ni arrancó una imagen en esta etapa. Siguen pendientes 1.2, 4.2 y las tareas finales 5.1–5.6; las validaciones aquí registradas corresponden a esta etapa, no al cierre de toda la implementación.
- No se modificó la PWA ni se hizo commit, push, merge, despliegue o archivo OpenSpec.

### Tareas 1.2 y 4.2 — 2026-09-30

- Matriz de contratos/consultas incorporada en design.md, basada en rutas, servicios, repositorios y pruebas: salud, registro/login/me, REST de notificaciones y transporte Socket.IO; incluye errores, formas JSON, tipos, aislamiento y evidencia.
- list, unreadCount, markRead y markAllRead usan una única unidad por operación. Retirado helper manual y todo SQL directo del servicio. runOperation solo coordina reglas y repositorios, sin adquirir ni liberar conexiones. db.js conserva la inicialización DDL independiente.
- test/rest-uow.test.js comprueba una adquisición, cliente compartido, orden, snapshots de lectura, límites locales, bloqueos/incremento en escritura y rollback con 404. Ajustado doble de estado en repository-consumers para reflejar sus métodos reales, con rechazo explícito de incremento en no-op.
- Dirigidas: node --test test/rest-uow.test.js test/repository-consumers.test.js test/unit-of-work.test.js test/login-uow.test.js, 25 aprobadas. npm.cmd test, 102 aprobadas, 0 fallidas, PostgreSQL efímero aislado; incluye concurrencia, fechas, idempotencia, autorización, publicación, reconexión y login secundario.
- Las tareas 5.1–5.6 permanecen pendientes para la etapa final. No se modificó PWA ni se hizo commit, push, merge, despliegue o archivo OpenSpec. Archivos guardados en UTF-8.

### Validación final — 2026-09-30

- 5.1: Dockerfile.api incluye UoW y repositorios. Construcción y arranque correctos del Compose aislado decilo-17-final-check (58087/55437, red y volumen propios, credenciales temporales fuera de Git). API/PostgreSQL saludables; healthcheck HTTP por Nginx correcto y módulos cargados dentro de la imagen. Se detuvo solo el proyecto de prueba conservando volúmenes; contenedores habituales con IDs, arranques y montajes intactos.
- 5.2: ARCHITECTURE.md y test/README.md documentan responsabilidades, flujo atómico, DDL independiente, commit incierto, pruebas y evidencia Docker.
- 5.3: npm.cmd test, 102 aprobadas, 0 fallidas, 0 omitidas; conserva las 73 regresiones originales y las pruebas nuevas, con PostgreSQL efímero.
- 5.4: después de Node, npm.cmd run build:frontend correcto y npm.cmd run test:frontend, 32 aprobadas en 50,1 s. Sin diferencias de cobertura ni fallos; aviso NO_COLOR/FORCE_COLOR informativo.
- 5.5: status del cambio 4/4 artefactos completos, validate del cambio --strict válido, validate --all --strict 8 aprobados/0 fallidos, avisos informativos preexistentes. git diff --check sin errores, solo aviso LF/CRLF.
- 5.6: diff completo contra origin/develop limitado a #17; esquema/db.js, contratos públicos, PWA, dependencias y transporte conservados. Sin secretos operativos ni generados versionados; dist contiene 13 archivos públicos sin backend. El primer control auxiliar de archivos fue bloqueado por spawnSync git EPERM del sandbox; se repitió con permisos y pasó.
- Todas las tareas cuentan con evidencia. No se hizo commit, push, merge, despliegue ni archivo OpenSpec. Los recursos aislados quedan detenidos, con su volumen conservado.
