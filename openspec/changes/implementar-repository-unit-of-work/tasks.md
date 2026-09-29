## 1. Caracterización antes de implementar

Seguir la migración incremental de design.md, verificando cada paso. No superponer el helper transaccional anterior y el UoW en una operación; retirar el helper al terminar sus consumidores. Ninguna tarea autoriza commit automático, merge, despliegue ni archivo OpenSpec.

- [ ] 1.1 Registrar ejecución base de las 73 pruebas con npm.cmd test mediante PostgreSQL temporal; investigar diferencias sin eliminar cobertura.
- [ ] 1.2 Fijar matriz de contratos y consultas de auth, salud, notificaciones y Socket.IO a partir del inventario de design.md; conservar firmas usadas por las pruebas.

## 2. Repository

- [ ] 2.1 Crear repositorio de usuarios con findById, findByEmail e insert, SQL parametrizado y ejecutor inyectado; mantener bcrypt/JWT/DTO en lógica existente.
- [ ] 2.2 Crear repositorios de notificaciones y estado con métodos del diseño, filtros por usuario, rowCount, bloqueos, resumen y BIGINT sin pérdida de precisión.
- [ ] 2.3 Extraer SELECT 1 a adaptador de salud; migrar consultas de auth.js y server.js conservando respuestas y dobles de prueba existentes.
- [ ] 2.4 Probar repositorios con ejecutor inyectado, parámetros, aislamiento de usuario y ausencia de manejo propio de conexiones/transacciones.

## 3. Unit of Work

- [ ] 3.1 Implementar run con adquisición única, BEGIN según modo, configuración local y callback esperado antes de COMMIT en el mismo cliente.
- [ ] 3.2 Implementar error original, intento de ROLLBACK y release único en finally; descartar cliente inseguro sin cerrar el pool ni reintentar automáticamente.
- [ ] 3.3 Probar orden y cliente único en commit, fallo connect, BEGIN, SET LOCAL, callback, COMMIT y ROLLBACK; verificar release normal/descarte exactamente una vez.
- [ ] 3.4 Probar lecturas REPEATABLE READ READ ONLY, límites locales y aislamiento entre unidades concurrentes sin pool.query dentro de la unidad.

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

Todas las tareas anteriores corresponden a implementación futura y permanecen pendientes. La creación y validación de esta planificación no demuestra su ejecución. No se autoriza implementar, hacer commit, desplegar ni archivar en esta etapa. Issue: https://github.com/Daiana3105/Decilo/issues/17.
