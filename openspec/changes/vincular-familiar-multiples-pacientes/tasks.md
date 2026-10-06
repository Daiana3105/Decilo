## 1. Decisiones y contratos previos

- [x] 1.1 Documentar configuración explícita de base aislada y marcador de propiedad para el seed de demo; impedir autoasignación por registro/rol o datos locales. La acreditación de relaciones reales queda fuera de esta etapa.
- [x] 1.2 Documentar frontera de demo y exclusión de datos reales; conservar pendientes de acreditación, consentimiento/representación y autoridades de revocación para una etapa real futura, sin darlos por resueltos.
- [x] 1.3 Cerrar DTO y límites del código de un uso con vencimiento de 24 h y entrega manual sin emails. Aplicar Hogar y su progreso sin notas privadas de Consulta ni filtraciones en agregados/comentarios.
- [x] 1.4 Registrar matriz de comportamiento actual y casos de regresión: asignación, completado idempotente, comentarios, progreso, cambio de cuenta y almacenamiento local; inventariar consumidores efectivos sin refactor general.

## 2. Persistencia y autorización

- [x] 2.1 Diseñar y probar DDL aditivo/idempotente de relaciones, invitaciones y mínimo dominio de acompañamiento con FKs, índices y unicidad; conservar tablas/datos existentes.
- [x] 2.2 Implementar repositorios parametrizados con ejecutor inyectado y servicios con authMiddleware/UserRepository/UoW existentes; una conexión, rollback y release garantizados.
- [x] 2.2a Implementar comando local explícito seed-family-demo.js: fixture de usuarios y vínculos profesionales persistentes, bcrypt, propiedad registrada, base aislada protegida, UoW e idempotencia sin sobrescribir cuentas ajenas ni reactivar revocaciones. No crear vínculos familiares activos por seed.
- [x] 2.2b Verificar pertenencia de participantes a la fixture y vínculo profesional-paciente activo en backend antes de emitir/aceptar invitaciones; rechazar fuera del modo/base de demo. No usar localStorage como permiso.
- [x] 2.3 Implementar código criptográfico dirigido, solo hash persistido, un uso, vencimiento, reemisión que invalida el anterior, límites de creación/aceptación y consumo transaccional; mostrar una vez para entrega manual, sin email, URL ni logs del código.
- [x] 2.4 Implementar revocación y salida por pareja, invalidación dependiente del otorgante y comprobación de permiso vigente en cada operación; probar concurrencia.
- [x] 2.5 Implementar listado de pacientes autorizados y rutas de actividades/comentarios con validación de paciente/recurso, DTO mínimos, paginación, no-store y errores saneados.
- [x] 2.6 Implementar entregas/recompensas atómicas e idempotentes y progreso básico calculado, sin métricas nuevas ni inferencias; snapshots consistentes y sin duplicados entre familiares.

## 3. Integración incremental de interfaz

- [x] 3.1 Sustituir solo fuentes del flujo de acompañamiento y sus escritores por API autorizada; no mezclar datos locales con permisos remotos ni importar automáticamente IDs/demo. Mantener tableros/comunicador fuera del cambio.
- [x] 3.2 Reutilizar selector en Seguimiento, Actividades de hogar y Comentarios; estados cero/uno/varios, nombre activo y listas/totales exclusivamente del paciente seleccionado.
- [x] 3.3 Incorporar invitación, aceptación, salida/revocación con confirmación y estados de carga/error; no mostrar éxito antes de confirmación backend.
- [ ] 3.4 Limpiar contexto/borradores al cambiar paciente/cuenta, cancelar peticiones y descartar respuestas tardías; restauración, 401, 404, offline y revalidación por visibilidad sin fallback local.
- [x] 3.5 Mantener roles, navegación, PWA, Gemini y notificaciones; no adjuntar paciente activo ni sus datos al ayudante.

## 4. Pruebas y evidencia

- [ ] 4.1 Unitarias de matriz de roles/permisos, entradas, estados, límites, tokens e idempotencia; repositorios sin interpolación ni transacciones propias.
- [ ] 4.2 Integración en PostgreSQL efímero protegido: F1-P1/P2, F2-P1 y F3-P3; unicidad, aceptación inválida/expirada/usada, revocación independiente, rollback completo y liberación de conexión.
- [ ] 4.2a Ejecutar seed dos veces en base efímera: misma fixture y relaciones sin duplicados; rechazo de destino no marcado/producción y colisiones con cuentas ajenas; rollback ante fallo y preservación de revocaciones, códigos consumidos y datos existentes.
- [ ] 4.2b Verificar consumo concurrente único, destinatario incorrecto, vencimiento con reloj controlado, reemisión y límites; ninguna invitación si solo existe relación local, profesional ajeno o participante fuera de fixture. Códigos no aparecen en logs, almacenamiento del navegador ni emails.
- [ ] 4.3 HTTP adversarial: IDs cruzados, paciente inexistente/ajeno/revocado indistinguibles, manipulación de actor/rol/cursores, sin escritura o recompensa ante rechazo; profesional no acreditado y familiar sin vínculo no obtienen acceso.
- [x] 4.3a Probar Hogar y Consulta del mismo paciente: familiar consulta/completa solo Hogar y su progreso; notas privadas, comentarios de Consulta y agregados derivados no aparecen en ningún DTO ni cursores. Revocación bloquea lectura y escritura aun con JWT vigente y página previamente abierta.
- [ ] 4.4 Concurrencia: dos familiares completan una actividad una sola vez; revocación contra aceptación/completado/comentario; fallos de COMMIT sin anunciar éxito o inventar rollback garantizado.
- [x] 4.5 Playwright: cero/uno/varios, selección en todas las vistas, limpieza de borrador, cambio de cuenta, recarga, respuestas lentas de paciente anterior, revocación y aislamiento de otra familia.
- [ ] 4.6 Verificar teclado, contraste, nombres/labels, errores y foco a 320/768/1280 px y zoom 200 %. Registrar lector de pantalla y aceptación manual solo cuando se realicen.
- [x] 4.7 Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend; mantener regresiones de actividades, auth, Repository/UoW, notificaciones, PWA y ayudante con proveedor mock, sin API paga.
- [x] 4.8 Documentar frontera local/remota, requisitos operativos y decisiones confirmadas; validar cambio/global OpenSpec estricto y git diff --check, revisar secretos y archivos generados. No commit, push, merge, despliegue ni archivo OpenSpec en este alcance.

## Evidencia de implementación de demo (2026-10-06)

### Ampliación autorizada: tableros persistentes

- [x] T1 Agregar tabla aditiva y repositorio de tableros; validar catálogo, nombre, límite, paciente y autor con UoW y vínculos PostgreSQL. Probar persistencia, edición y autorización por identidad, incluidos rechazo tras revocación, familia ajena y paciente cruzado.
- [x] T2 Conectar selector profesional, editor y comunicador del paciente al backend; comprobar flujo entre sesiones, sin fallback local ni mezcla entre cuentas, y regresiones de navegador.
- [x] T3 Actualizar documentación, validar OpenSpec/diff y actualizar solo API/frontend de la demo aislada preservando sus datos y volumen.

`npm.cmd test`: 135/135 aprobadas, incluida la nueva prueba integrada de tableros; build frontend y sintaxis de app.js correctos. No hay importación de tableros locales ni notificaciones nuevas para tableros. Las políticas de uso real permanecen pendientes.

Playwright completo: 49 regresiones aprobadas y dos pruebas nuevas inicialmente fallidas por el localizador del selector. Se corrigió el localizador por su rol accesible; la repetición detectó además pérdida de foco al deshabilitar Guardar ante un rechazo. Se mantuvo foco dentro del editor y se verificó cierre con Escape. Resultado dirigido final: 2/2 nuevas aprobadas en 11,8 s, sin quitar aserciones. El flujo prueba creación/edición, lectura desde otro contexto de navegador, recarga, segundo paciente, inyección local ignorada, autorización revocada, ausencia de éxito/escrituras ante rechazo y API indisponible sin fallback. La suite backend no se repitió por ajustes exclusivamente del editor/pruebas frontend.

- Backend: tablas nuevas protegidas por marcador, tres repositorios inyectados y UoW existente. `test/family-demo.test.js` prueba seed repetible, colisiones/marker incorrecto, N:M, código dirigido/expirado/reemitido, consumo concurrente único, cuotas, autorización HTTP, Hogar, comentarios, entrega única y revocación contra escritura. También fuerza un error PostgreSQL tras invalidación de una invitación y comprueba rollback sin pérdida del código anterior.
- Suite completa Node: **124/124 aprobadas**, sin omisiones. Primeras ejecuciones fallaron por doble de DOM incompleto (`addEventListener`) y timeouts al saturar PostgreSQL con suites paralelas. Se completó el doble y se acotó la concurrencia entre suites a una, manteniendo intactos los escenarios concurrentes dentro de cada suite. Resultado final: 100157,8649 ms. Tras el ajuste de foco, las 12 regresiones unitarias de asignación volvieron a pasar.
- Frontend: build correcto. Tres escenarios Playwright nuevos aprobados en la primera ejecución: invitación/aceptación/completado/revocación; selector en 320/768/1280 px, teclado, zoom 200 %, cambio de cuenta y localStorage manipulado; respuesta tardía y escritura rechazada después de revocación. Esa ejecución global tuvo **44 aprobadas y 2 fallidas**: aviso secundario de login no persistido durante la construcción Docker y foco perdido al completar capacidades. Se corrigió el render de capacidades para preservar foco y no reiniciar el ayudante; la repetición global se registra debajo al finalizar.
- Docker separado `decilo-family-demo`: frontend 58088, PostgreSQL loopback 55440, red y volumen propios; API/PostgreSQL saludables. Seed ejecutado dos veces: cuatro cuentas (profesional/familiar/dos pacientes), dos vínculos profesionales, ningún familiar activado automáticamente. HTTP raíz/health/manifest 200; login y listados verificados (profesional: dos pacientes; familiar: cero). Configuración privada y acceso fuera de Git: `%TEMP%\decilo-family-demo`. Procedimiento en `FAMILY_DEMO.md`.
- No se importó localStorage ni se modificaron credenciales/configuración de Gemini. Los datos y conversaciones del ayudante no participan del flujo familiar. No se crearon commits ni se publicaron ramas.
- Repetición final completa de Playwright: **46/46 aprobadas en 4,3 minutos**, sin modificar las dos regresiones que habían fallado ni omitir cobertura. Las pruebas familiares verifican permisos y revocación por API real, contexto por paciente y bloqueo del DOM manipulado. Persisten mensajes saneados intermitentes `NOTIFICATION_FAILED` de trabajo secundario en algunas pruebas de login; no fallaron las aserciones finales ni se ocultaron esos mensajes. No se modificó el subsistema de notificaciones para silenciarlos.
- OpenSpec estricto del cambio y global: **11 aprobados, 0 fallidos** (solo avisos informativos previos sobre longitud de requisitos). `git diff --check` correcto. Revisión de valores privados contra archivos versionados/nuevos correcta, sin imprimirlos; dist y test-results están ignorados. Los nueve contenedores habituales/Gemini/identidad conservaron sus IDs; la demo usa únicamente `decilo-family-demo_family-data` y su red separada.

## Pendientes explícitos

### Evidencia adicional de navegación (2026-10-06)

- Separación de Resumen, Actividades y Progreso en `app.js`: indicadores de API, listado/acciones y avance/comentarios respectivamente; gestión profesional en Pacientes. Paciente activo y autorización remota conservados; texto lateral corregido para PostgreSQL.
- `node --check app.js`, 12/12 pruebas dirigidas de actividades y build frontend correctos. Primer intento de Node bloqueado por `spawn EPERM` del sandbox; ejecutado correctamente con permisos.
- Playwright completo: 49/49 aprobadas, incluidas dos nuevas regresiones de vistas distintas para profesional/familiar, selección persistente, Hogar, porcentajes reales y ausencia de avance inventado sin actividades. Las tres pruebas familiares existentes se adaptaron a la navegación conservando sus aserciones de aislamiento, revocación, borradores, móvil y respuestas tardías. No se repitió la suite backend ni se cambió código del servidor.

### Cobertura y políticas aún pendientes

- 3.4: implementados cancelación, generación de sesión, limpieza y revalidación; probados cambio de cuenta/paciente y respuesta tardía/revocación. Falta un caso dirigido de desconexión/offline y 401 durante cada operación familiar.
- 4.1: políticas y consultas cubiertas por integración/HTTP; falta una suite unitaria independiente de los nuevos repositorios y su inyección, además de las pruebas generales UoW ya existentes.
- 4.2: pruebas N:M con dos familias y dos pacientes compartidos, rechazo de familia ajena y rollback; falta ampliar la matriz con un tercer familiar explícito y una familia completamente independiente con su propio vínculo activo.
- 4.2a: seed repetido en tests y Docker, preservación de revocaciones y rechazo por marcador/colisión comprobados; queda automatizar los casos CLI de destino no local y modo producción, sin probarlos sobre bases reales.
- 4.2b: probados destinatario, expiración, reemisión, consumo concurrente y cuotas. La comprobación de producción/host inseguro del comando está revisada en código; falta prueba automatizada del CLI en todos esos destinos y captura específica de logs de invitación.
- 4.4: probados completado concurrente, revocación contra comentario y rollback de invitación; falta inyección específica de COMMIT incierto en este servicio (la suite general UoW sí lo prueba).
- 4.3: permisos, IDs cruzados, actor extra y 404 indistinguibles comprobados; falta ampliar los casos HTTP de cursores manipulados/paginación extrema y fallo de dependencia. La tarea agrupada permanece pendiente por esa cobertura adicional.
- 4.6: comprobación automatizada móvil/teclado/zoom realizada; aceptación visual y lector de pantalla manual de este nuevo flujo todavía pendientes.
- Uso real: acreditación profesional-paciente, consentimiento, representación, facultades de revocación y límites durables siguen pendientes; documentarlos (1.2) no significa resolverlos ni autorizar producción.
