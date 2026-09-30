## 1. Decisiones previas a integración real
- [ ] 1.1 Aprobar proveedor/modelo, región, retención, tratamiento y condiciones para el público etario; revalidar fuentes oficiales.
- [ ] 1.2 Aprobar presupuesto monetario, precios máximos configurables y responsable de alertas; revisar límites propuestos.
- [ ] 1.3 Revisar aviso de privacidad y contenido público de ayuda con pacientes/familiares usando ejemplos sintéticos.

## 2. Backend futuro con simulador
- [ ] 2.1 Definir servicio/adaptador inyectable y mock determinista; bloquear adaptadores reales y red externa en pruebas.
- [ ] 2.2 Implementar endpoint aditivo, JWT/usuario actual, autorización paciente/familiar, CORS, parser acotado y errores saneados.
- [ ] 2.3 Implementar validación de mensaje, payload mínimo, límites de salida, rechazo clínico y texto inerte sin herramientas.
- [ ] 2.4 Diseñar e implementar persistencia técnica aditiva de cuotas/reservas, retención y presupuesto con transacciones cortas; nunca mantener conexión durante llamada externa.
- [ ] 2.5 Implementar concurrencia, timeout, cancelación, no reintento y conservación de costo incierto ante fallo/reinicio.
- [ ] 2.6 Preparar configuración privada desactivada por defecto y documentación de variables sin secretos; revisar Docker API y allowlist del build.

## 3. Interfaz futura
- [ ] 3.1 Crear acceso para paciente/familiar, botones grandes, mensajes breves y aviso previo al envío; preservar navegación existente.
- [ ] 3.2 Agregar estados accesibles y ayuda local, cancelación/logout y descarte de respuestas tardías, sin persistir conversaciones.

## 4. Verificación futura
- [ ] 4.1 Probar autorización de tres roles, entradas límite, errores, salida maliciosa, peticiones clínicas e inyección de instrucciones con mock.
- [ ] 4.2 Probar reservas concurrentes, costo agotado, reinicio, timeout y fallo de BD exclusivamente con base efímera protegida.
- [ ] 4.3 Inspeccionar payload, logs y dist con centinelas; comprobar ausencia de secretos, contexto privado automático, caché y escrituras del modelo.
- [ ] 4.4 Probar ambos públicos en Playwright: teclado/foco, 320/768/1280 px, zoom 200%, logout y red fallida; revisión manual accesible.
- [ ] 4.5 Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend secuencialmente sin perder regresiones existentes.
- [ ] 4.6 Actualizar documentación de arquitectura, privacidad, costos y pruebas sin atribuir validación real al simulador.
- [ ] 4.7 Validar OpenSpec del cambio y global en modo estricto y git diff --check; revisar alcance y ausencia de secretos/generados.

## 5. Puerta previa al proveedor real
- [ ] 5.1 Tras resolver 1.1–1.3, especificar adaptador concreto y revisar respuestas sintéticas, precios y controles antes de solicitar autorización separada para integración real.

Todas las tareas permanecen pendientes: esta entrega solo planifica. No se autoriza consumir una API paga, activar proveedor, hacer commit, push, merge, archivo OpenSpec ni despliegue.
