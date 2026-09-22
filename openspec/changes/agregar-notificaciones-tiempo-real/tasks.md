## 1. Infraestructura de pruebas y dependencias

- [ ] 1.1 Configurar base PostgreSQL explícita de pruebas y aislamiento entre suites; retirar fallback destructivo a desarrollo en `test/auth.test.js` y adaptar limpieza con claves foráneas. Verificar que una configuración operativa o ausente se rechace antes de TRUNCATE y que la suite existente funcione en su base aislada.
- [ ] 1.2 Agregar Socket.IO servidor/cliente y Playwright de desarrollo con lockfile y comandos separados para node:test y navegador; verificar instalación reproducible con `npm ci` y arranque del runner sin incorporar fixtures E2E accidentalmente al descubrimiento de node:test.

## 2. Persistencia y servicio de notificaciones

- [ ] 2.1 Incorporar esquema aditivo `notifications` y `notification_state`, FK, unicidad por evento, índices y estado inicial de cuentas anteriores/nuevas; verificar inicialización repetida en base vacía y con usuarios existentes sin pérdida ni avisos retroactivos.
- [ ] 2.2 Implementar creación idempotente por evento en transacción con un solo cliente `pg`, bloqueo por usuario, revisión durable y COUNT de pendientes; probar evento repetido, rollback y liberación de conexión sin cambios parciales.
- [ ] 2.3 Implementar listado por cursor y resumen con snapshot coherente, validación de límites/IDs y representación segura de BIGINT; probar más de 20 filas, páginas vacías, entradas inválidas y contador global independiente de la página.
- [ ] 2.4 Implementar lectura individual/general idempotente y serialización con creación; probar primera fecha de lectura estable, lectura general de páginas no cargadas y creación posterior que queda pendiente, con contador y revisión correctos.

## 3. API e integración del evento funcional

- [ ] 3.1 Reutilizar verificación JWT con algoritmo esperado, subject válido y usuario existente para notificaciones; añadir las cuatro rutas HTTP definidas en diseño con SQL acotado por dueño, no-store y errores JSON. Verificar 400/401/404/503 en las rutas explícitas de notificaciones, tres roles y acceso cruzado por ID/parámetros sin filtración; no propagar estos errores al login por su aviso secundario.
- [ ] 3.2 Integrar `session.login` como operación secundaria controlada sin esperar guardado/emisión para devolver 200 con `{ token, user }`; acotar recursos y capturar errores de programación, persistencia y emisión con logs saneados. Verificar JWT válido aun con fallos o demoras, sin 503 por el aviso, sin promesas rechazadas sin manejar ni secretos en logs, y emisión únicamente después del commit.
- [ ] 3.3 Cubrir disparadores y no disparadores con pruebas de regresión: login por los tres roles intenta crear un aviso por solicitud y lo persiste/emite si la operación secundaria tiene éxito; credenciales inválidas, registro, `/me`, recarga y reconexión no crean avisos. Verificar recepción en una sesión ya abierta tras otro login, rol seleccionado incorrectamente en el frontend y contratos de salud/registro/login conservados.

## 4. Transporte autenticado

- [ ] 4.1 Incorporar fábrica de servidor HTTP compartido Express/Socket.IO y cierre controlado conservando `createApp` para Supertest; verificar inicio en puerto efímero, `PORT`, health y cierre de sockets/pool sin procesos pendientes.
- [ ] 4.2 Implementar handshake JWT por `auth.token`, orígenes para polling/upgrade y sala exclusiva derivada del usuario; probar clientes reales sin token, firma inválida, vencido, subject inválido, usuario inexistente, origen ajeno e intento de unirse a otra sala.
- [ ] 4.3 Emitir ready tras suscripción y changed con revisión/contador solo después de commit a todas las conexiones propias; verificar dos conexiones de A y una de B, emisor incluido, sin emisión ante rollback ni datos secretos.
- [ ] 4.4 Aplicar expiración también a sockets abiertos y reautenticación en cada reconexión; verificar con JWT de vida corta que no recibe avisos después de expirar y que credenciales rechazadas no causan bucles.

## 5. Estado e interfaz del frontend

- [ ] 5.1 Integrar un solo cliente Socket.IO por sesión fuera de render, con listeners/timers estables y limpieza en logout/cambio de cuenta; verificar recargas, navegación repetida y respuestas en vuelo de otra identidad sin conexiones duplicadas ni filtraciones.
- [ ] 5.2 Implementar reconciliación por revisión, generación de sesión y snapshot HTTP, deduplicación de IDs e invalidación de páginas; probar respuestas fuera de orden, eventos repetidos y mutación durante carga inicial/paginación sin retroceso de lecturas o contador.
- [ ] 5.3 Incorporar recuperación REST al cargar/restaurar sesión sin esperar socket, en ready/conexión/reconexión, retorno a visibilidad, online y apertura de panel; permitir reintentos acotados de fallos, sin sondeo periódico. Probar señal perdida después de commit y su recuperación en esos disparadores, sesión cargada sin socket, ausencia de consultas periódicas y que no se inventan avisos no guardados ni se calcula localmente el contador.
- [ ] 5.4 Agregar campana y panel común a los tres roles con listado, cargar más, lectura individual/general y estados carga/vacío/error/desactualizado; verificar interacción real, contador exacto del servidor y que abrir no marque leído.
- [ ] 5.5 Completar accesibilidad y renderizado seguro del panel: teclado, Escape, retorno de foco, etiquetas, anuncios moderados y contenido escapado; verificar con navegador que no se ejecuta HTML ni se pierde frase o foco del comunicador al actualizar avisos.

## 6. Build y contenedores

- [ ] 6.1 Actualizar build e `index.html` para empaquetar cliente y módulos públicos antes de usarlos; adaptar prueba de allowlist y configuración. Verificar `npm run build:frontend` con URL local vacía y URL HTTPS de ejemplo, sin CDN, secretos ni módulos privados en dist.
- [ ] 6.2 Actualizar Dockerfiles para copiar módulos de API y usar build frontend multietapa con configuración pública; verificar imágenes reproducibles y que scripts devuelvan JavaScript real en Nginx, no HTML de fallback.
- [ ] 6.3 Configurar proxy `/socket.io/` con upgrade y timeout compatible, conservar `/api/` y pasar orígenes locales configurables en Compose; verificar polling y WebSocket a través del puerto público del frontend y healthchecks saludables.

## 7. Validación automatizada y Docker Compose

- [ ] 7.1 Ejecutar todas las pruebas node:test sobre PostgreSQL aislado incluyendo concurrencia, aislamiento y transporte real; registrar comandos y resultados, sin secretos y con cierre completo de recursos. Confirmar que regresiones de autenticación/configuración/build siguen aprobadas.
- [ ] 7.2 Ejecutar E2E contra stack de prueba con dos pestañas autenticadas de A y una de B, cubriendo login, listado, contador y lectura individual/general; verificar que una sesión abierta recibe el aviso de otro login, convergencia en menos de 5 segundos con operación secundaria exitosa en entorno local saludable y ausencia de cambios para B.
- [ ] 7.3 Ejecutar pruebas E2E de reconexión, JWT vencido, logout/cambio de cuenta, respuestas HTTP retrasadas, evento repetido, pérdida de señal y lectura general concurrente con creación secundaria; verificar revisión dominante y recuperación REST en carga/conexión/reconexión/visibilidad sin sondeo periódico ni duplicados. Simular fallos secundarios de escritura/emisión y comprobar login 200 con JWT válido, logs seguros y recuperación solo de avisos persistidos.
- [ ] 7.4 Ejecutar `docker compose up --build -d` con configuración aislada documentada, `docker compose ps` y healthcheck público; validar manualmente campana/panel responsive y transporte real por proxy, y registrar evidencia sin credenciales.
- [ ] 7.5 Reiniciar API y PostgreSQL preservando volumen, recuperar sesiones y comparar avisos/fechas/contador con la base; verificar que solo un login explícito posterior intenta agregar un aviso secundario y que los avisos previos, antiguos o leídos, permanecen sin retención automática; no usar `down -v`.

## 8. Documentación y preparación Render

- [ ] 8.1 Actualizar `ARCHITECTURE.md` con dominio real, aviso secundario de login, errores seguros, recuperación REST por disparadores, endpoints, revisiones, límites y comandos de pruebas aisladas; explicitar que retención automática y recuperación de avisos no persistidos quedan fuera de alcance. Verificar correspondencia con implementación y retirar texto desactualizado sobre Render sin ampliar el dominio clínico.
- [ ] 8.2 Actualizar `DEPLOY_RENDER.md` y ejemplos públicos con build/arranque, recursos estáticos, `DATABASE_URL`, `JWT_SECRET`, `PORT`, `API_PUBLIC_URL`, `FRONTEND_PUBLIC_URL`, HTTPS/WSS y una instancia; verificar configuración sin secretos y sin crear recursos ni publicar cambios.
- [ ] 8.3 Documentar checklist posterior de Render para orígenes autorizados, dos sesiones, desconexión/redeploy y persistencia, junto con rollback de aplicación que conserve tablas y datos; verificar que diferencia preparación completada de despliegue real no ejecutado.
- [ ] 8.4 Ejecutar `openspec validate agregar-notificaciones-tiempo-real --strict --no-interactive` y revisar diff/status de la implementación contra estas especificaciones; entregar resultados automatizados y Compose, limitaciones pendientes y preparación Render sin commit ni push salvo instrucción posterior explícita.
