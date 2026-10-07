## Why

Pacientes y familiares necesitan ayuda breve para comprender DECILO y expresar necesidades. El MVP no tiene integración de IA: se propone una capacidad opcional y limitada, sin convertir el comunicador en una herramienta clínica ni delegar acciones al modelo.

## What Changes

- Ayudante para pacientes y familiares con respuestas breves, lenguaje sencillo y controles grandes.
- Consulta exclusivamente desde backend autenticado, con contexto público de ayuda y mensaje enviado explícitamente.
- Límites de longitud, concurrencia, tiempo, uso y presupuesto; errores saneados y alternativa local sin proveedor.
- Sin diagnóstico, prescripción, cambios de tratamiento, herramientas de ejecución ni escritura de datos del paciente.
- Proveedor simulado disponible y Gemini opcional exclusivamente para demo local con cuentas ficticias, aceptación explícita por envío y clave solo en backend. Producción permanece pendiente de privacidad, presupuesto y controles durables.

## Capabilities

### New Capabilities
- `ayudante-ia`: ayuda acotada, accesible y protegida para pacientes y familiares.

### Modified Capabilities
Ninguna: endpoint nuevo aditivo; contratos de autenticación, comunicación y notificaciones permanecen iguales.

## Impact

La implementación agrega servicio/adaptador backend y ruta autenticada, interfaz en app.js/styles.css, configuración privada y pruebas. Docker API incluye los módulos, sin secretos en la imagen. La persistencia técnica de cuotas sigue pendiente para producción, sin mensajes ni cambios a tablas clínicas o contratos actuales. No modifica PWA, Socket.IO ni el flujo de login. Esta etapa autoriza únicamente actualizar la demo local aislada, sin commit, push ni despliegue externo.
## Preparación de demo pública — 2026-10-07

Alcance autorizado: preparar Render, sin publicar todavía. Gemini requiere
habilitación explícita, clave privada de API y lista de IDs ficticios autorizados,
además de JWT, rol, dominio reservado, confirmación de edad y consentimiento.
El simulador se conserva. No acredita producción ni resuelve las políticas/cuotas
durables pendientes. Ver `RENDER_RELEASE_CHECKLIST.md`.
