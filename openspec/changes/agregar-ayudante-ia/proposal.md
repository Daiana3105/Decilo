## Why

Pacientes y familiares necesitan ayuda breve para comprender DECILO y expresar necesidades. El MVP no tiene integración de IA: se propone una capacidad opcional y limitada, sin convertir el comunicador en una herramienta clínica ni delegar acciones al modelo.

## What Changes

- Ayudante para pacientes y familiares con respuestas breves, lenguaje sencillo y controles grandes.
- Consulta exclusivamente desde backend autenticado, con contexto público de ayuda y mensaje enviado explícitamente.
- Límites de longitud, concurrencia, tiempo, uso y presupuesto; errores saneados y alternativa local sin proveedor.
- Sin diagnóstico, prescripción, cambios de tratamiento, herramientas de ejecución ni escritura de datos del paciente.
- Proveedor inyectable simulado para pruebas sin consumo pago; integración real desactivada hasta resolver proveedor, modelo, privacidad y presupuesto.

## Capabilities

### New Capabilities
- `ayudante-ia`: ayuda acotada, accesible y protegida para pacientes y familiares.

### Modified Capabilities
Ninguna: endpoint nuevo aditivo; contratos de autenticación, comunicación y notificaciones permanecen iguales.

## Impact

La implementación futura agregará servicio/adaptador backend y ruta autenticada, interfaz en app.js/styles.css o módulo público dedicado, configuración privada y pruebas. Si se agrega módulo público se actualizará solo su inclusión explícita en build. Docker API deberá incluir los nuevos módulos. Se requerirá persistencia técnica de cuotas, sin mensajes ni cambios a tablas clínicas o contratos actuales. No modifica PWA, Socket.IO ni el flujo de login. ARCHITECTURE.md deberá distinguir esta extensión del alcance previo que excluye IA. Esta entrega solo crea planificación.
