## Context

DECILO usa frontend estático y Express con inyección de dependencias, JWT verificado contra usuarios PostgreSQL y CORS explícito. El dominio demostrativo vive en localStorage; no es contexto clínico autorizado. Repository/UoW proporciona transacciones cortas. El build publica una allowlist y genera config.js solo con configuración pública; config.js de raíz es privado. No existe proveedor IA ni service worker. Las pruebas usan PostgreSQL efímero mediante scripts/run-tests.js; no deben contactar servicios pagos.

## Goals / Non-Goals

Ayudar a entender funciones y formular frases como «Necesito descansar». Paciente: máximo tres frases sencillas, 400 caracteres; familiar: hasta 700 caracteres para apoyo de uso y comunicación. No diagnosticar, prescribir, modificar tratamiento, analizar historias clínicas, sustituir al profesional, consultar pacientes vinculados, conservar conversaciones ni ejecutar acciones. No agregar voz, adjuntos, búsqueda web, herramientas, RAG privado ni streaming en esta etapa inicial.

## Decisions

### Interfaz y comportamiento

Entrada «Ayudante» solo para paciente/familiar, identificada como IA que puede equivocarse. Botones con texto y área mínima 48×48 px, opciones locales «Cómo usar DECILO» y «Ayudarme a expresar una necesidad». Las sugerencias completan el campo y requieren envío explícito; no escriben en el comunicador ni guardan frases. Mostrar aviso de no introducir nombres, contactos, credenciales o información clínica antes de enviar. El texto libre puede contener datos personales voluntariamente escritos: no prometer anonimización infalible. Incorporar detección de patrones evidentes (tokens, correos, teléfonos) que rechace localmente y en backend; este filtro no sustituye la revisión de privacidad.

Respuesta como texto inerte, sin HTML, enlaces activos o instrucciones ejecutables. Estados esperando, error, límite y desactivado mantienen la ayuda local disponible y no bloquean funciones actuales. aria-live polite, foco estable y navegación por teclado; al salir/cambiar de cuenta cancelar solicitud y descartar respuestas tardías, borrando texto de memoria. No persistir conversación en localStorage/sessionStorage, BD, cachés o logs.

### Contrato aditivo y autorización

Proponer `POST /api/assistant/messages` con JSON `{ message }`, sin historial, userId, rol ni archivos; rechazar campos desconocidos. El backend deriva el rol del usuario actual mediante authMiddleware, no de la petición. Solo paciente/familiar; profesional recibe 403. Usar CORS existente, no-store y autenticación antes de consumir cuota o llamar al proveedor. El JWT solo llega a DECILO.

Respuesta 200 `{ reply }`. Errores `{ error, message }` con códigos estables: 400 entrada inválida, 413 cuerpo excesivo, 401 autenticación actual, 403 rol, 429 cuota/concurrencia con Retry-After, 503 desactivado/presupuesto/dependencia, 504 timeout y 502 respuesta del proveedor inválida. No devolver errores crudos ni URLs/claves del proveedor. Mantener sin cambios errores/rutas actuales; parser y manejo de errores de esta ruta deben ser acotados, incluso frente al parser global existente de 32 kb.

### Límites y costo

Valores iniciales propuestos verificables con simulador: cuerpo 8 KiB, mensaje no vacío de hasta 800 puntos de código Unicode; una petición en curso por usuario, cinco por minuto y treinta por día UTC; dos llamadas globales concurrentes, sin cola no acotada. Timeout total 15 segundos con AbortController, también ante desconexión del cliente. No reintentar automáticamente ni cambiar a otro proveedor.

Limitar salida del proveedor a 256 tokens y contexto público completo a un presupuesto fijo de entrada documentado al elegir modelo. Validar salida por rol; si supera tamaño o formato, usar respuesta local segura sin una segunda llamada. Una reserva atómica de cuota/presupuesto precede toda llamada. Guardar solo contadores técnicos y reservas (usuario interno, ventana UTC, importe máximo y estado), nunca mensajes, respuestas o identificadores enviados al proveedor. Es una tabla técnica nueva, a diseñar aditivamente con Repository/UoW; no alterar tablas existentes. Liberar conexión antes de HTTP externo. Contadores deben resistir reinicios y concurrencia. Retener detalle técnico un máximo propuesto de 48 horas; agregado global diario sin usuario puede mantenerse para costo.

Presupuesto global diario en unidad monetaria explícita y precios máximos por tokens deben configurarse antes de habilitar proveedor real. Reservar costo máximo de entrada/salida; rechazar si no alcanza. Reconciliar uso reportado, conservando reserva completa si timeout, error o costo incierto. No liberar reservas inciertas al reiniciar. Fallar cerrado si cuota/BD/configuración está indisponible o si el modelo/precio no coincide con lo aprobado. Los topes del proveedor complementan el control local; alertas de facturación no son un corte garantizado. Presupuesto monetario concreto pendiente, por defecto cero llamadas reales.

### Adaptador y privacidad

Servicio recibe un adaptador `generate({ message, audience, publicHelp, maxOutputTokens, signal })` que devuelve `{ text, usage }`. Solo una implementación seleccionada, inyectada desde backend; no aceptar URL/modelo del cliente. Endpoint HTTPS fijo permitido para evitar SSRF. Payload permitido: instrucción de alcance, categoría paciente/familiar, ayuda pública curada y mensaje explícito. Nunca adjuntar nombre, ID, email, JWT, IP del usuario, historia, actividades, vínculos ni notificaciones. No consultar esos datos para enriquecer prompts.

El modelo no recibe herramientas ni acceso a BD, archivos, red interna o mutaciones. Separar instrucciones del texto no confiable; solicitudes clínicas o fuera de alcance reciben una respuesta breve de límite y orientación de uso. Aplicar comprobaciones de entrada/salida y pruebas adversariales; un prompt no garantiza seguridad. La revisión humana de respuestas sintéticas en español es requisito antes de habilitar uso real. Los errores y métricas registran código, duración, tokens/costo y correlación opaca, sin cuerpo ni excepción completa.

Variables propuestas solo backend: AI_ENABLED (false por defecto), AI_PROVIDER, AI_MODEL, AI_API_KEY, AI_TIMEOUT_MS, AI_MAX_OUTPUT_TOKENS, AI_DAILY_BUDGET y precios de entrada/salida configurados. Documentar nombres sin valores secretos. No incluirlas en dist, config pública, logs, fixtures ni repositorio. El simulador no requiere claves; en tests rechazar cualquier intento de cargar un adaptador real.

### Proveedores examinados y decisión pendiente

Ambos candidatos permiten una integración HTTP desde Node mediante adaptador específico; no se presupone compatibilidad de sus formatos entre sí:

- Gemini API: comparar modelo y tarifa vigentes; la documentación distingue uso de contenido entre nivel gratuito y pago. No seleccionar el nivel gratuito por costo sin revisar tratamiento de datos. Fuente: [precios y tratamiento por nivel](https://ai.google.dev/gemini-api/docs/pricing).
- Anthropic API: revisar retención y elegibilidad de modelo/contrato; la documentación explica retención habitual y excepciones, por lo que no prometer retención cero. Fuente: [retención de datos de organizaciones](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data).

Fuentes consultadas al preparar la propuesta; revalidarlas antes de contratar. No se selecciona modelo ni se fija una tarifa cambiante. No hubo llamadas de inferencia. Elegir según español sencillo, latencia, precio máximo, región, retención, entrenamiento, borrado y condiciones de uso aplicables a pacientes y posibles menores. El mock permite desarrollar y validar contratos sin resolver una contratación.

## Risks / Open Questions

- ¿Qué proveedor/modelo, región y política de retención/tratamiento acepta el responsable del proyecto?
- ¿Cuál es el presupuesto diario y mensual aprobado, moneda y responsable de alertas? El límite mensual también deberá reservarse si se aprueba como tope adicional.
- ¿Cuál es el público etario y quién aprueba el aviso de privacidad y las condiciones de uso antes de envío externo?
- ¿Son adecuados 800 caracteres de entrada, límites 5/minuto y 30/día y las respuestas propuestas para usuarios reales? Validar con pacientes/familiares sin recopilar datos personales de prueba.

Estas decisiones bloquean activar un proveedor real, no la planificación ni futuras pruebas con simulador. El envío explícito no elimina el riesgo de información sensible en texto libre. No afirmar cumplimiento legal ni seguridad clínica por pasar pruebas técnicas.

## Validation Strategy

Unitarias con adaptador falso y reloj controlado: límites exactos, timeout/cancelación, error, salida inválida y presupuesto. Integración con BD efímera: autorización real de los tres roles, reservas atómicas, reinicios y rollback sin consumir proveedor. Inspeccionar payload saliente y logs con valores centinela para demostrar ausencia de datos privados automáticos. Probar prompt injection, solicitudes clínicas, HTML y respuestas sobredimensionadas sin ejecutar acciones. Playwright para ambos públicos, teclado, foco, estados, 320/768/1280 px y zoom 200%; profesional sin acceso y logout durante petición. Denegar red externa en suites IA. Conservar regresiones actuales ejecutando Node, build y frontend secuencialmente. No probar una API paga ni desplegar para cerrar tareas técnicas.
