## 1. Contratos y esquema
- [x] 1.1 Contrastar la matriz propuesta con la versión actual de la demo familiar y fijar pruebas de destinatarios por cada evento; conservar políticas de uso real pendientes.
- [x] 1.2 Implementar migración idempotente de tipos, registro de eventos y generación de vínculos; probar conservación de datos, reinicialización y ausencia de avisos históricos/seed.

## 2. Integración incremental
- [x] 2.1 Crear escritor de avisos con repositorios inyectados en la conexión existente, deduplicación durable y bloqueos de estado ordenados; sin UoW anidado, con SAVEPOINT para aislar fallos secundarios.
- [x] 2.2 Conectar asignación e invitación a destinatarios autorizados; limitar familiares a Hogar y nunca incluir códigos ni datos privados.
- [x] 2.3 Conectar aceptación, primera entrega y revocación con detección de transición efectiva y generación del vínculo; conservar respuestas y límites actuales.
- [x] 2.4 Inyectar publicación posterior al UoW, sanear errores y conservar recuperación REST, login no bloqueante y notifications:ready.

## 3. Pruebas y documentación
- [x] 3.1 Probar cada evento y ausencia de avisos en denegaciones, Consulta para familiares, otras familias, profesional desvinculado y actor; probar paciente con varios familiares y familiar con varios pacientes.
- [x] 3.2 Probar reintentos concurrentes, revisiones/contadores exactos, entregas repetidas, reactivación/revocación y carreras con revocación bajo bloqueo del paciente.
- [x] 3.3 Probar una conexión, COMMIT pendiente, rollback principal sin datos parciales, liberación, COMMIT incierto y fallo de emisión con recuperación REST; probar fallo secundario con HTTP exitoso y sin avisos/revisiones parciales; sin regresión del login.
- [x] 3.4 Probar ausencia de códigos/datos privados en avisos, logs y eventos; comprobar historial genérico tras revocación, cambio de cuenta y respuestas tardías.
- [x] 3.5 Verificar campana mediante Playwright en escritorio/móvil, teclado/foco, lectura y paginación; conservar Gemini, ayudante, identidad y PWA.
- [x] 3.6 Ejecutar pruebas dirigidas dentro de la suite npm.cmd test en base efímera protegida, npm.cmd run build:frontend y npm.cmd run test:frontend; documentar resultados reales sin APIs pagas.
- [x] 3.7 Actualizar documentación de eventos, destinatarios, atomicidad, recuperación y limitaciones de demo; ejecutar validación OpenSpec estricta del cambio/global y git diff --check sobre la implementación.

## Evidencia y límites

- 2026-10-06: `npm.cmd test`: 134/134 aprobadas, incluidas 10 pruebas nuevas en `test/accompaniment-notifications.test.js`. Base efímera protegida; ningún acceso a bases habituales ni proveedores externos.
- `npm.cmd run build:frontend`: correcto. El arranque de PostgreSQL para tests fue bloqueado inicialmente por el sandbox; las ejecuciones con permisos finalizaron correctamente.
- Primera ejecución Playwright: 45 aprobadas y 2 fallidas. Se corrigió la ruta de invitaciones en la prueba nueva y se agregó una espera explícita del rechazo por rol antes del segundo login en la prueba existente; no se quitó cobertura.
- Ejecución final `npm.cmd run test:frontend`: 47/47 aprobadas (1,8 minutos), incluida la nueva prueba de avisos familiares con desconexión, Consulta excluida, revocación y cambio de cuenta. Regresiones del ayudante/Gemini simulado, PWA, identidad y notificaciones conservadas. Se observó un registro saneado `NOTIFICATION_FAILED`, etapa `request`, durante la prueba existente de identidad; no hubo aserciones fallidas ni se imprimieron secretos. No se afirma ausencia de errores transitorios.
- La instrucción actual reemplaza la decisión original de revertir la operación por un fallo de avisos: ahora un SAVEPOINT conserva la operación principal ante fallos secundarios recuperables. La pérdida de conexión no permite prometer COMMIT.
- Sin cola durable de reintentos: REST recupera avisos confirmados, no avisos cuya persistencia falló. Sin notificaciones retroactivas ni de operaciones locales del navegador.
- Demo existente verificada en `http://localhost:58088`: `/api/health` HTTP 200, base `ok`, API y PostgreSQL saludables. Se comprobó que su imagen aún NO contiene `accompaniment-notifications.js`; no sirve para probar los nuevos avisos hasta actualizar la API y ejecutar la migración aditiva mediante el seed protegido. No se actualizaron contenedores ni volúmenes. Las otras vistas previas, incluida Gemini, permanecen activas.
- Políticas de consentimiento, representación y habilitación para uso real siguen pendientes en el cambio familiar. No se certificó manualmente lector de pantalla ni dispositivos físicos para estos nuevos textos.
- Sin commit, push, merge, archivo OpenSpec ni despliegue.
- OpenSpec: 4/4 artefactos presentes, cambio válido en modo estricto y validación global 12/12 sin fallos (solo observaciones informativas de longitud). `git diff --check` correcto; también se verificó whitespace de los archivos nuevos sin seguimiento. Sin repetir Node durante el cierre: se conserva la evidencia 134/134 anterior.
