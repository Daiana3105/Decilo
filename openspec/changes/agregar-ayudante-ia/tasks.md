## 1. Decisiones previas a integración real
- [ ] 1.1 Aprobar proveedor/modelo, región, retención, tratamiento y condiciones para el público etario; revalidar fuentes oficiales.
- [ ] 1.2 Aprobar presupuesto monetario, precios máximos configurables y responsable de alertas; revisar límites propuestos.
- [ ] 1.3 Revisar aviso de privacidad y contenido público de ayuda con pacientes/familiares usando ejemplos sintéticos.

## 2. Backend futuro con simulador
- [x] 2.1 Definir servicio/adaptador inyectable y mock determinista; bloquear adaptadores reales y red externa en pruebas.
- [x] 2.2 Implementar endpoint aditivo, JWT/usuario actual, autorización paciente/familiar, CORS, parser acotado y errores saneados.
- [x] 2.3 Implementar validación de mensaje, payload mínimo, límites de salida, rechazo clínico y texto inerte sin herramientas.
- [ ] 2.4 Diseñar e implementar persistencia técnica aditiva de cuotas/reservas, retención y presupuesto con transacciones cortas; nunca mantener conexión durante llamada externa.
- [ ] 2.5 Implementar concurrencia, timeout, cancelación, no reintento y conservación de costo incierto ante fallo/reinicio.
- [ ] 2.6 Preparar configuración privada desactivada por defecto y documentación de variables sin secretos; revisar Docker API y allowlist del build.

## 3. Interfaz futura
- [x] 3.1 Crear acceso para paciente/familiar, botones grandes, mensajes breves y aviso previo al envío; preservar navegación existente.
- [x] 3.2 Agregar estados accesibles y ayuda local, cancelación/logout y descarte de respuestas tardías, sin persistir conversaciones.

## 4. Verificación futura
- [x] 4.1 Probar autorización de tres roles, entradas límite, errores, salida maliciosa, peticiones clínicas e inyección de instrucciones con mock.
- [ ] 4.2 Probar reservas concurrentes, costo agotado, reinicio, timeout y fallo de BD exclusivamente con base efímera protegida.
- [x] 4.3 Inspeccionar payload, logs y dist con centinelas; comprobar ausencia de secretos, contexto privado automático, caché y escrituras del modelo.
- [ ] 4.4 Probar ambos públicos en Playwright: teclado/foco, 320/768/1280 px, zoom 200%, logout y red fallida; revisión manual accesible.
- [x] 4.5 Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend secuencialmente sin perder regresiones existentes.
- [x] 4.6 Actualizar documentación de arquitectura, privacidad, costos y pruebas sin atribuir validación real al simulador.
- [x] 4.7 Validar OpenSpec del cambio y global en modo estricto y git diff --check; revisar alcance y ausencia de secretos/generados.

## 5. Puerta previa al proveedor real
- [ ] 5.1 Tras resolver 1.1–1.3, especificar adaptador concreto y revisar respuestas sintéticas, precios y controles antes de solicitar autorización separada para integración real.

## Evidencia: primera etapa simulada — 2026-10-05

Implementación autorizada en feature/ayudante-ia, limitada al simulador local.
assistant.js no importa clientes de red ni SDK, no usa claves y rechaza un
adaptador que no sea simulado. Solo devuelve respuestas predefinidas de ayuda o
el mensaje de alcance, nunca orientación clínica. El backend autentica al usuario
actual y no acepta rol/identidad/historial del cliente. Se conservan CORS,
identidad visual, contratos previos y PWA. Dockerfile.api incorpora el módulo;
dist mantiene su allowlist pública y excluye el backend.

La interfaz muestra «Demostración: respuestas simuladas». Las sugerencias solo
completan el campo; enviar es explícito. Tiene botones de al menos 48 px,
aria-live, foco estable, carga/error y ayuda local. Respuestas con textContent,
sin conversaciones persistidas. Cancelar, navegar, logout o cambio de sesión
aborta y elimina el contenido; se descartan respuestas tardías.

Pruebas ejecutadas una vez por comando, secuencialmente:
- npm.cmd test: 110 aprobadas, 0 fallidas (102 previas y 8 nuevas).
- npm.cmd run build:frontend: correcto.
- npm.cmd run test:frontend: 40 aprobadas, 0 fallidas (36 previas y 4 nuevas).
- Validación estricta del cambio y global, y git diff --check: verificados al
  finalizar esta actualización documental; sin modificar código tras las suites.

Node cubre payload permitido con centinelas de identidad privada, contenido
clínico/adversarial, Unicode, entradas inválidas, límites, cancelación, timeout,
ausencia de reintentos, errores saneados y HTTP autenticado. La prueba del
simulador bloquea fetch; no hay implementación de proveedor externo. Playwright
verifica ambos públicos a 320/768/1280 px, ampliación CSS 200%, teclado,
texto inerte, almacenamiento sin cambios, carga/error, cancelación y cambio de
cuenta. La API rechaza al profesional aunque intente acceder directamente.
No se incorporaron conversaciones a logs ni cachés; no hay herramientas,
consultas de contexto privado ni mutaciones del simulador.

Pendientes y avances parciales:
- 1.1–1.3 y 5.1: proveedor/modelo, privacidad, público etario, presupuesto y
  validación humana del contenido. No hay integración real habilitable.
- 2.4 y 4.2: reservas durables/costos/reinicio/fallo de BD no implementados.
  La demo usa contadores acotados en memoria: 5/minuto, 30/día UTC, una solicitud
  por usuario y dos globales. Se reinician con la API; no sirven como control de
  presupuesto real ni para réplicas. No se modificó el esquema.
- 2.5: concurrencia, timeout de 15 s, cancelación y ausencia de reintentos
  comprobados; conservación de costo incierto/reinicio queda pendiente.
- 2.6: Docker y exclusión del módulo backend de dist comprobados; configuración
  privada de proveedor real sigue pendiente. No se agregaron claves ni variables
  que permitan activar inferencia externa.
- 4.4: automatización completada; falta revisión manual accesible y zoom nativo
  de esta nueva interfaz. No se reutiliza la aceptación manual del cambio visual.

No se autoriza consumir una API paga, activar proveedor, hacer commit, push,
merge, archivo OpenSpec ni despliegue.
## Preparación Render — 2026-10-07 (sin publicación)

Se prepararon opt-in público, lista privada de cuentas ficticias, confirmación de
edad en backend y corrección del payload GenerateContent. La validación final se
registra en `RENDER_RELEASE_CHECKLIST.md`. No se completan las tareas productivas
de cuotas durables, presupuesto, políticas ni revisión manual por esta preparación.
Pendientes: revisar variables reales de Render, lista de cuentas autorizadas,
cuotas del proyecto Google y prueba pública con consentimiento tras autorización.
