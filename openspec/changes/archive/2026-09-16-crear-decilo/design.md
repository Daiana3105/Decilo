## Context

La aplicacion actual es una pagina HTML estatica con contenido introductorio y no tiene aun una arquitectura de aplicacion, persistencia ni autenticacion. Este cambio cruza las areas de identidad, permisos, comunicacion con pictogramas, actividades, gamificacion y seguimiento. Las reglas observables estan definidas en `specs/comunicacion-fonoaudiologica/spec.md`.

## Goals / Non-Goals

**Goals:**

- Establecer una base de aplicacion web por roles, con limites de acceso claros y una experiencia accesible.
- Modelar las relaciones entre profesionales, pacientes, familiares, tableros, pictogramas, actividades, entregas, progreso y comentarios.
- Mantener separados los flujos de configuracion profesional, practica del paciente y acompanamiento familiar.
- Permitir que el mecanismo de reproduccion de frases pueda cambiar sin alterar el modelo de pictogramas ni las actividades.
- Preparar una evolucion posterior hacia grabaciones, analitica avanzada y recomendaciones de IA.

**Non-Goals:**

- Almacenar o gestionar grabaciones de voz en el MVP.
- Implementar graficos avanzados, recomendaciones automaticas o modelos de inteligencia artificial.
- Definir diagnosticos clinicos, evaluaciones fonoaudiologicas o decisiones terapeuticas automaticas.
- Resolver en esta etapa integraciones externas de identidad, repositorios de pictogramas o notificaciones.

## Decisions

### Separacion por dominios funcionales

La aplicacion se organizara en dominios de identidad y acceso, pacientes y vinculaciones, comunicacion, actividades y progreso. Cada dominio tendra contratos claros para evitar que las vistas de un rol accedan directamente a datos de otro. Esta separacion permite evolucionar el MVP sin mezclar reglas clinicas con detalles de presentacion.

Se descarta concentrar toda la logica en una sola pagina o componente porque dificultaria aplicar permisos consistentes y probar los flujos de los tres roles.

### Modelo de datos centrado en relaciones autorizadas

Los registros de paciente, profesional y familiar se relacionaran explicitamente, y cada tablero, actividad, entrega y comentario se asociara al paciente correspondiente. Las consultas de progreso filtraran por esas relaciones antes de construir la respuesta.

Se descarta inferir permisos solo desde la interfaz: ocultar controles no evita accesos no autorizados y no protege los datos sensibles del paciente.

### Pictogramas como unidades reutilizables

Un tablero almacenara una coleccion ordenada de referencias a pictogramas y los metadatos de texto necesarios para construir una frase. La frase mantendra tanto la secuencia de pictogramas como el texto derivado, de modo que la reproduccion sea reemplazable y auditable.

Se descarta guardar una frase unicamente como texto libre porque se perderia la relacion con las selecciones visuales del paciente.

### Adaptador de reproduccion de voz

La reproduccion se implementara detras de una interfaz de servicio que reciba el texto de la frase y reporte disponibilidad o error. El primer adaptador podra usar una capacidad de sintesis de voz del navegador, sin persistir audio ni grabaciones.

Se descarta acoplar el flujo a un proveedor de audio remoto en el MVP porque agregaria dependencia, costos y requisitos de privacidad sin ser necesario para validar la construccion de frases.

### Progreso derivado de eventos de actividad

Cada completado de actividad sera un registro historico inmutable con paciente, actividad, origen, fecha y resultado minimo. Los resumenes de pendientes, completados y puntos se calcularan desde esos registros o desde proyecciones equivalentes, evitando que una nueva consulta sobrescriba el historial.

La otorgacion de puntos e insignias sera idempotente: una misma entrega no podra generar recompensas duplicadas.

### Accesibilidad como restriccion transversal

Las interfaces deberan ser navegables por teclado, usar etiquetas y nombres accesibles para controles, conservar una jerarquia semantica y comunicar estados de actividades y errores sin depender solo del color. Los pictogramas tendran texto alternativo o etiqueta asociada.

## Risks / Trade-offs

- [Riesgo] Los pictogramas pueden tener licencias, calidad o metadatos inconsistentes -> Definir una fuente inicial controlada y validar texto alternativo, identificador y licencia antes de publicarlos.
- [Riesgo] La sintesis de voz varia entre navegadores y dispositivos -> Detectar disponibilidad, ofrecer un mensaje comprensible y mantener la frase visible aunque el audio falle.
- [Riesgo] Los datos de pacientes requieren especial cuidado de privacidad -> Aplicar autorizacion en cada consulta y mutacion, minimizar datos almacenados y registrar acciones relevantes.
- [Riesgo] Los roles familiares pueden generar ambiguedad cuando hay varios cuidadores -> Modelar vinculaciones explicitas y no conceder acceso por coincidencia de nombre o correo sin confirmar la relacion.
- [Riesgo] El modelo de recompensas puede incentivar completar actividades sin calidad clinica -> Mantener la puntuacion como apoyo motivacional y no presentarla como medida diagnostica o terapeutica.
- [Riesgo] Partir de una pagina estatica puede ocultar decisiones de infraestructura pendientes -> Mantener el diseño independiente del framework y convertir las decisiones de despliegue y persistencia en tareas explicitas antes de implementar.