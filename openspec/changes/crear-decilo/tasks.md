## 1. Base de la aplicacion

- [x] 1.1 Definir la estructura de la aplicacion web y sus limites de dominio para reemplazar la pagina estatica sin mezclar identidad, comunicacion, actividades y progreso; verificar que el proyecto pueda iniciar y que cada modulo tenga una ubicacion documentada.
- [x] 1.2 Elegir y documentar la estrategia inicial de persistencia, autenticacion y despliegue compatible con el entorno del proyecto; verificar una instalacion limpia y un arranque reproducible.
- [x] 1.3 Establecer la estrategia de pictogramas, incluyendo identificador, texto asociado, texto alternativo y licencia; verificar que el catalogo inicial no publique elementos sin metadatos obligatorios.

## 2. Identidad, permisos y relaciones

- [x] 2.1 Implementar los roles profesional, paciente y familiar junto con autenticacion de sesion; verificar que una cuenta solo pueda iniciar el flujo correspondiente a su rol.
- [x] 2.2 Implementar autorizacion por relacion profesional-paciente-familiar para lecturas y mutaciones; verificar con pruebas de acceso permitido y denegado que no se revelen datos de pacientes no vinculados.
- [x] 2.3 Implementar el registro de pacientes, la validacion de campos obligatorios y la vinculacion explicita de familiares; verificar que los datos invalidos no creen registros parciales.

## 3. Tableros y comunicacion

- [x] 3.1 Implementar la creacion y edicion profesional de tableros personalizados con pictogramas ordenados por paciente; verificar que el tablero guardado conserve su orden y sea visible solo al paciente autorizado.
- [x] 3.2 Implementar la vista del paciente para seleccionar, reordenar y quitar pictogramas de una frase en construccion; verificar que la secuencia visual y el texto asociado permanezcan sincronizados.
- [x] 3.3 Implementar el adaptador de reproduccion de frases con deteccion de disponibilidad y manejo de error, sin almacenar audio; verificar reproduccion en un entorno compatible y mensaje comprensible en uno no compatible.

## 4. Actividades y gamificacion

- [x] 4.1 Implementar la creacion y asignacion profesional de actividades con instruccion, paciente y disponibilidad; verificar que una actividad confirmada aparezca en la lista correcta y respete permisos.
- [x] 4.2 Implementar el flujo del paciente para consultar y completar actividades, conservando el historial de entregas; verificar que una entrega confirmada pase a completada y no duplique su registro al repetirse la solicitud.
- [x] 4.3 Implementar el completado de ejercicios de hogar por parte del familiar vinculado; verificar que el origen del completado quede registrado y sea visible para el profesional.
- [x] 4.4 Implementar puntos e insignias con reglas configurables e idempotencia; verificar que una actividad puntuable otorgue la recompensa una sola vez y que una insignia no se duplique.

## 5. Seguimiento y comentarios

- [x] 5.1 Implementar el resumen basico de progreso por paciente con actividades asignadas, pendientes, completadas y puntos; verificar que los totales coincidan con el historial de entregas.
- [x] 5.2 Implementar comentarios familiares asociados al paciente, actividad opcional, autor y fecha; verificar que el profesional vinculado pueda consultarlos y que otros usuarios no autorizados no puedan hacerlo.
- [x] 5.3 Implementar estados vacios, errores de validacion y fallos de red para los flujos de seguimiento; verificar que el usuario conserve contexto y que no se presenten datos incompletos como confirmados.

## 6. Experiencia inclusiva y validacion

- [x] 6.1 Aplicar navegacion por teclado, jerarquia semantica, etiquetas accesibles, texto alternativo de pictogramas y estados no dependientes del color; verificar la interfaz con auditoria automatizada y recorrido manual por teclado.
- [x] 6.2 Cubrir con pruebas los escenarios normativos de `specs/comunicacion-fonoaudiologica/spec.md` para los tres roles y los limites del MVP; verificar que la suite pase en un entorno limpio.
- [x] 6.3 Ejecutar una prueba integrada de extremo a extremo desde el registro del paciente hasta la consulta de progreso y comentario familiar; verificar que el flujo completo respete permisos, persistencia y recompensas.
- [x] 6.4 Confirmar que no se incorporen almacenamiento de grabaciones, graficos avanzados ni recomendaciones de IA en el MVP; verificarlo mediante revision de dependencias, rutas y datos persistidos antes de publicar.