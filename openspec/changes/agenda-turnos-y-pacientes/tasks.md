## 1. Persistencia y autorizaciones

- [x] 1.1 Añadir migración PostgreSQL aditiva/idempotente para `patient_profiles`, autorizaciones profesional-paciente, consentimientos inmutables, permisos familiares de agenda, preferencias IANA, `appointments` y `patient_audit_events`; verificar reinicio repetido sin pérdida de users, notificaciones ni filas previas en PostgreSQL efímero.
- [x] 1.4 Ampliar idempotentemente tipos de notificación para eventos de turnos preservando login, IDs, revisiones y fechas existentes; verificar migración repetida y lecturas previas intactas.

- [x] 1.4 Ampliar idempotentemente tipos de notificación para eventos de turnos preservando login, IDs, revisiones y fechas existentes; verificar migración repetida y lecturas previas intactas.

- [ ] 2.1 Implementar validación y servicio CRUD de perfil mínimo asociado a cuenta paciente existente, con contacto responsable y archivo lógico; probar campos inválidos, límites, archivo con/sin turnos futuros y conservación del historial.
- [ ] 2.2 Añadir rutas profesionales de lista/lectura/creación/edición/archivo con JWT, consentimiento/vínculo actual, `no-store` y errores indistinguibles para paciente ajeno; probar 401/403/404, cambio de rol, revocación y aislamiento entre dos profesionales.
- [ ] 2.3 Añadir vistas de gestión de pacientes y consentimiento; verificar selector alimentado solo por API autorizada, confirmación de consentimiento/representación, foco y ausencia de datos clínicos en localStorage.

## 3. Agenda y reglas de turnos

- [ ] 3.1 Implementar repositorio/servicio de turnos y consultas acotadas por rango para vistas diaria, semanal y mensual; verificar límites semiabiertos, zona local configurada y precisión de IDs PostgreSQL.
- [ ] 3.2 Validar timestamps RFC 3339 con offset, orden/duración de 15–180 minutos, grilla de cinco minutos, inicio futuro y horas locales DST ambiguas; probar límites y errores sin escrituras.
- [ ] 3.3 Implementar creación, edición optimista, confirmación, cancelación y atención con transiciones permitidas y auditoría append-only; probar estados inválidos, version conflict y actor profesional/paciente/familiar.
- [ ] 3.4 Serializar escrituras por paciente y profesional con locks ordenados dentro del UoW y comprobar superposiciones de ambos; probar intervalos consecutivos, cancelados excluidos y solicitudes concurrentes que solo permiten una reserva.
- [ ] 3.5 Añadir lecturas propias del paciente y lecturas familiares solo con vínculo y share vigentes; probar dos pacientes, dos profesionales, familiar vinculado sin consentimiento de agenda, revocación y ausencia de contacto responsable/datos cruzados.

## 4. Notificaciones y privacidad

- [ ] 4.1 Persistir eventos/notificaciones genéricos y revisiones en la transacción del turno; publicar Socket.IO solo después de COMMIT confirmado. Probar rollback sin fila/señal, publicación fallida recuperable por REST, deduplicación y audiencias antes/después de revocación.
- [ ] 4.2 Verificar DTO, `no-store`, logs y payload Socket.IO sin motivos clínicos, contacto responsable, nombres, JWT, IDs consultables o valores de campos; verificar que Gemini no recibe paciente/agenda y que service worker no almacena rutas privadas.

## 5. Interfaz y verificación integrada

- [ ] 5.1 Construir calendario profesional día/semana/mes con paciente autorizado, filtros, estados y controles accesibles; verificar 320/768/1280 px, zoom 200 %, teclado y carga/error/vacío sin fallback local.
- [ ] 5.2 Construir vistas de solo lectura del paciente y familiar autorizado; verificar cambio de cuenta/paciente limpia la vista, respuestas tardías no se mezclan y familiar nunca ve pacientes sin share vigente.
- [ ] 5.3 Ejecutar pruebas HTTP adversariales y Playwright de CRUD/consentimiento/turnos/overlap/estados/notificaciones para profesionales, pacientes y familiares con varias identidades aisladas en PostgreSQL efímero.
- [ ] 5.4 Ejecutar `npm.cmd test`, `npm.cmd run build:frontend` y `npm.cmd run test:frontend`; verificar regresiones de auth, notificaciones, UoW, Gemini, pictogramas, tableros, vínculos familiares y PWA.
- [ ] 5.5 Antes de habilitación productiva, aprobar procedimiento institucional de representación/consentimiento, retención/borrado y recuperación; ensayar despliegue y rollback compatible sin eliminar tablas ni registros.