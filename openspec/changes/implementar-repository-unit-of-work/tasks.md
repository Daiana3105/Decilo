## 1. Caracterización antes de implementar

Seguir la migración incremental de design.md, verificando cada paso. No superponer el helper transaccional anterior y el UoW en una operación; retirar el helper al terminar sus consumidores. Ninguna tarea autoriza commit automático, merge, despliegue ni archivo OpenSpec.

- [x] 1.1 Registrar ejecución base de las 73 pruebas con npm.cmd test mediante PostgreSQL temporal; investigar diferencias sin eliminar cobertura.
- [ ] 1.2 Fijar matriz de contratos y consultas de auth, salud, notificaciones y Socket.IO a partir del inventario de design.md; conservar firmas usadas por las pruebas.

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

- [ ] 4.1 Migrar createLogin al UoW: asegurar/bloquear estado, insertar aviso, incrementar solo ante cambio y resumir antes de confirmar.
- [ ] 4.2 Migrar list, unreadCount, markRead y markAllRead preservando snapshots, concurrencia, fechas, idempotencia y errores existentes.
- [ ] 4.3 Mantener login no bloqueante, pool secundario acotado y publicación fuera del UoW; usar una barrera de COMMIT pendiente para verificar cero llamadas a publish antes de confirmar y ninguna ante rechazo; comprobar emisión fallida sin perder datos. Conservar notifications:ready independiente.
- [ ] 4.4 Agregar integración real de commit visible desde otra conexión y rollback en incremento de revisión con estado nuevo y previo, sin exigir secuencias consecutivas.
- [ ] 4.5 Comprobar nueva adquisición tras éxito/fallo con pool max 1 y timeout; conservar pruebas concurrentes, deduplicación y regresiones actuales de rollback.

## 5. Empaquetado y validación de la implementación futura

- [ ] 5.1 Incluir módulos nuevos en Dockerfile.api y verificar arranque en entorno aislado; mantener DDL, esquema público y dist sin archivos privados.
- [ ] 5.2 Documentar Repository/UoW, flujo atómico, excepción DDL, errores de commit incierto y pruebas en ARCHITECTURE.md y test/README.md.
- [ ] 5.3 Ejecutar npm.cmd test: conservar las 73 pruebas de referencia y aprobar nuevas pruebas; registrar totales y fallos sin ocultarlos.
- [ ] 5.4 Ejecutar secuencialmente npm.cmd run build:frontend y npm.cmd run test:frontend; conservar las 32 regresiones Playwright y registrar resultados reales.
- [ ] 5.5 Ejecutar openspec.cmd status --change implementar-repository-unit-of-work, validación estricta del cambio y global, y git diff --check.
- [ ] 5.6 Revisar diff, ausencia de secretos/generados y alcance exclusivo #17; comprobar que contratos, esquema y cambio PWA permanecen sin alteraciones ajenas.

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
