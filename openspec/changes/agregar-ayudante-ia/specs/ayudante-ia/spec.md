## ADDED Requirements

### Requirement: Ayuda acotada según audiencia
El ayudante MUST servir únicamente para explicar DECILO y ayudar a expresar necesidades; MUST usar lenguaje sencillo, hasta tres frases y 400 caracteres para pacientes y hasta 700 caracteres para familiares. MUST rechazar diagnóstico, prescripción y modificación de tratamientos sin ofrecer instrucciones clínicas.

#### Scenario: Necesidad cotidiana
- **WHEN** un paciente pide ayuda para expresar que necesita descansar
- **THEN** recibe una propuesta breve de frase que no se envía ni guarda automáticamente

#### Scenario: Acompañamiento familiar
- **WHEN** un familiar pregunta cómo usar una función disponible
- **THEN** recibe ayuda basada en documentación pública sin consultar datos del paciente

#### Scenario: Solicitud clínica
- **WHEN** se solicita diagnóstico, medicación o cambio de tratamiento
- **THEN** se muestra una respuesta de límite sin recomendación clínica personalizada

### Requirement: Autorización y backend exclusivo
El sistema MUST verificar sesión y usuario actual, autorizar solo paciente/familiar y llamar al proveedor únicamente desde backend. MUST mantener claves fuera de frontend, repositorio y logs, preservando contratos existentes.

#### Scenario: Usuario no autorizado
- **WHEN** falta sesión válida o el usuario es profesional
- **THEN** responde 401 o 403 respectivamente y no llama al proveedor ni consume presupuesto

#### Scenario: Manipulación de identidad
- **WHEN** el cliente incluye rol, usuario, historial o URL de proveedor en el cuerpo
- **THEN** se rechaza la entrada y no se usa esa información para autorización o envío

### Requirement: Minimización y ausencia de acciones
El sistema MUST enviar solo mensaje explícito, audiencia e instrucciones/ayuda públicas; MUST NOT adjuntar automáticamente JWT, identidad, historias, datos de otros usuarios o información autenticada. MUST NOT habilitar herramientas, ejecutar instrucciones del modelo ni modificar datos del paciente. MUST tratar respuesta como texto inerte y no persistir conversaciones ni cachearlas.

#### Scenario: Envío explícito
- **WHEN** la persona envía su mensaje tras ver el aviso de privacidad
- **THEN** el payload externo contiene únicamente los campos permitidos y ningún dato tomado de almacenamiento o sesión salvo categoría de audiencia

#### Scenario: Respuesta maliciosa
- **WHEN** el proveedor devuelve HTML o pide cambiar datos
- **THEN** no se ejecuta código, navegación ni escritura y la salida inválida se sustituye por ayuda local segura

#### Scenario: Cambio de sesión
- **WHEN** hay logout o cambio de cuenta durante una respuesta pendiente
- **THEN** se cancela la petición y se borran mensajes en memoria sin mostrar respuestas de la sesión anterior

### Requirement: Límites y presupuesto previo
El sistema MUST limitar cuerpo a 8 KiB, mensaje a 800 puntos de código, salida a 256 tokens, concurrencia a una solicitud por usuario y dos globales, uso a cinco solicitudes por minuto y treinta por día UTC y duración a 15 segundos. Para producción MUST reservar cuota y costo máximo atómicamente antes de llamar, sin reintentos automáticos y conservando reservas inciertas ante fallo. La demo local autorizada MUST identificar sus cuotas en memoria como no durables y MUST NOT presentarlas como control de presupuesto de producción.

#### Scenario: Límite alcanzado
- **WHEN** se supera longitud, cuota o concurrencia
- **THEN** se devuelve error acotado 400/413 o 429 según corresponda sin llamada adicional al proveedor

#### Scenario: Presupuesto agotado o desconocido
- **WHEN** se intenta habilitar producción sin presupuesto/configuración válida o falla su almacenamiento
- **THEN** no se llama al proveedor, se responde 503 y se mantiene ayuda local

#### Scenario: Concurrencia y reinicio
- **WHEN** en producción dos solicitudes compiten por el último saldo o reinicia el proceso
- **THEN** las reservas persistentes impiden gastar dos veces el saldo o recuperar presupuesto incierto

#### Scenario: Timeout y fallo
- **WHEN** vence el plazo o falla el proveedor
- **THEN** se aborta la llamada cuando sea posible y se devuelve 504, 502 o 503 saneado según causa sin reintento automático ni liberar costo incierto

### Requirement: Interfaz accesible y alternativa local
La interfaz MUST ofrecer controles de al menos 48×48 px, nombres claros, teclado, foco visible y anuncios de estado; MUST mantener navegación y comunicador utilizables cuando la IA no está disponible.

#### Scenario: Móvil y teclado
- **WHEN** pacientes y familiares usan 320/768/1280 px, zoom 200% o teclado
- **THEN** pueden enviar, cancelar y leer estados sin pérdida de foco ni desbordamientos nuevos

### Requirement: Activación y pruebas sin consumo pago
La integración de producción MUST permanecer desactivada hasta aprobar proveedor/modelo, tratamiento de datos, público etario y presupuesto. La demo local con cuentas ficticias MAY usar Gemini con configuración y aceptación explícita según el requisito de demo. Las pruebas MUST usar un adaptador simulado o transporte mock sin claves reales ni solicitudes externas y MUST comprobar privacidad, autorización, errores, límites y ausencia de acciones.

#### Scenario: Configuración inicial
- **WHEN** no se habilita explícitamente la demo local o falta su clave backend
- **THEN** la función mantiene ayuda local sin llamadas externas

#### Scenario: Suite automatizada
- **WHEN** se ejecutan las pruebas del ayudante
- **THEN** se verifican escenarios con proveedor falso y cualquier intento de inferencia externa falla la prueba

### Requirement: Demo local Gemini con aceptación y secretos backend
La demo MUST conservar el modo simulado predeterminado y claramente identificado. Gemini MUST requerir usuario paciente/familiar con correo .test o .invalid, GEMINI_DEMO_ENABLED, GEMINI_API_KEY solo en backend y aceptación google-demo-v1 por envío. MUST usar GEMINI_MODEL configurable, por defecto gemini-3.5-flash-lite, sin cambio automático de proveedor/modelo. MUST informar envío a Google, posible revisión humana y uso para mejora de productos, y exigir únicamente datos ficticios.

#### Scenario: Falta aceptación
- **WHEN** se solicita Gemini sin aceptar el aviso vigente
- **THEN** la API rechaza antes de llamar a Google y la interfaz permite usar el simulador

#### Scenario: Envío consentido en la demo
- **WHEN** una cuenta ficticia autorizada acepta y envía una pregunta
- **THEN** solo la pregunta y una guía pública por rol integran el contenido enviado a Google, sin JWT, identidad, pacientes ni historial

#### Scenario: Configuración y cambio de sesión
- **WHEN** se abre la pantalla, consulta disponibilidad o cambia la sesión
- **THEN** no se hace inferencia y no se conserva la aceptación anterior ni la conversación

#### Scenario: Fallo del proveedor o salida bloqueada
- **WHEN** Google limita cuota, falla, bloquea o entrega respuesta inválida
- **THEN** se muestra error saneado o ayuda local segura sin reintentar ni exponer contenido interno

#### Scenario: Distribución de secretos
- **WHEN** se construye el frontend o la imagen Docker
- **THEN** la clave no aparece en archivos Git, dist, capas o configuración de imagen; solo se inyecta a la API en ejecución


### Requirement: Acceso externo en demo pública restringida
En entorno alojado el sistema MUST exigir habilitación explícita y una lista privada de IDs de pacientes/familiares ficticios autorizados para Gemini. MUST validar JWT, rol actual, correo reservado .test/.invalid, confirmación de mayoría de edad para la demo y consentimiento explícito antes de transmitir. MUST NOT permitir acceso externo por solo registrar un correo ficticio, ni transmitir edad, IDs o JWT al proveedor. La clave MUST permanecer exclusivamente en la API; el simulador MUST seguir disponible.

#### Scenario: Cuenta ficticia no autorizada
- **WHEN** una cuenta registrada usa dominio de prueba pero no pertenece a la lista permitida
- **THEN** Gemini se rechaza antes de llamar al proveedor y el simulador permanece disponible

#### Scenario: Preparación sin clave ni configuración remota verificadas
- **WHEN** no se verificaron las variables privadas y una respuesta real del proveedor en Render
- **THEN** la documentación conserva esa validación pendiente y no afirma que Gemini público fue probado
