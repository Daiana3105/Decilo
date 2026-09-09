## Purpose

Esta capacidad permite coordinar la comunicacion aumentativa y el entrenamiento fonoaudiologico entre profesionales, pacientes y familiares mediante pictogramas, actividades asignadas y un seguimiento basico, con una experiencia accesible para el uso cotidiano.

## ADDED Requirements

### Requirement: Acceso diferenciado por rol

 El sistema MUST permitir que una persona acceda como profesional, paciente o familiar y MUST mostrar solamente las acciones y datos autorizados para su rol y sus relaciones asignadas.

#### Scenario: Profesional inicia una sesion
- **WHEN** una persona autenticada tiene rol profesional
- **THEN** puede acceder a sus pacientes, tableros, actividades y progreso asociado, pero no puede actuar como paciente o familiar

#### Scenario: Paciente consulta su espacio
- **WHEN** una persona autenticada tiene rol paciente
- **THEN** puede acceder a sus tableros, frases, actividades, puntos e insignias, pero no puede modificar la configuracion de otros pacientes

#### Scenario: Familiar consulta un paciente vinculado
- **WHEN** una persona autenticada tiene rol familiar y esta vinculada a un paciente
- **THEN** puede consultar las actividades de hogar, registrar completados y enviar comentarios para ese paciente

### Requirement: Registro y vinculacion de pacientes

 El sistema MUST permitir al profesional registrar un paciente con los datos minimos necesarios y vincularlo con familiares autorizados, manteniendo la asociacion entre profesional, paciente y familiar.

#### Scenario: Profesional registra un paciente
- **WHEN** el profesional envia los datos obligatorios validos de un nuevo paciente
- **THEN** el sistema crea el registro, lo asocia al profesional y lo deja disponible para configurar su acompanamiento

#### Scenario: Datos obligatorios incompletos
- **WHEN** el profesional intenta registrar un paciente sin un dato obligatorio o con un dato invalido
- **THEN** el sistema rechaza la operacion, identifica los campos a corregir y no crea un registro parcial

### Requirement: Tableros personalizados de pictogramas

 El sistema MUST permitir al profesional crear y editar tableros de pictogramas para un paciente, organizando pictogramas en un orden y una estructura que el paciente pueda utilizar para comunicarse.

#### Scenario: Profesional guarda un tablero
- **WHEN** el profesional agrega pictogramas y guarda un tablero asociado a un paciente
- **THEN** el sistema conserva el tablero, sus pictogramas y su orden, y lo hace visible al paciente autorizado

#### Scenario: Paciente selecciona pictogramas
- **WHEN** el paciente selecciona uno o mas pictogramas de su tablero
- **THEN** el sistema muestra la secuencia seleccionada como una frase en construccion y permite modificarla antes de reproducirla

### Requirement: Construccion y reproduccion de frases

 El sistema MUST permitir al paciente construir una frase a partir de pictogramas y solicitar su reproduccion audible sin almacenar una grabacion de voz en el MVP.

#### Scenario: Paciente reproduce una frase
- **WHEN** el paciente tiene una secuencia de pictogramas y solicita reproducirla
- **THEN** el sistema intenta reproducir en voz alta el texto asociado a la secuencia y conserva la frase en el contexto de la sesion

#### Scenario: Reproduccion no disponible
- **WHEN** el entorno del paciente no ofrece una capacidad compatible de reproduccion de voz
- **THEN** el sistema informa que la reproduccion no esta disponible y mantiene visible la frase construida

### Requirement: Actividades asignadas y completado

 El sistema MUST permitir al profesional asignar actividades a uno o mas pacientes con instrucciones y fecha o estado de disponibilidad, y MUST permitir al paciente completar las actividades asignadas.

#### Scenario: Profesional asigna una actividad
- **WHEN** el profesional selecciona un paciente, define una actividad valida y la confirma
- **THEN** la actividad queda asociada al paciente con su instruccion y disponibilidad, y aparece en su lista de actividades

#### Scenario: Paciente completa una actividad
- **WHEN** el paciente finaliza una actividad asignada y confirma el resultado
- **THEN** el sistema registra la entrega como completada con fecha y la excluye de la lista de pendientes sin borrar su historial

#### Scenario: Familiar marca ejercicio de hogar
- **WHEN** un familiar vinculado marca como completado un ejercicio habilitado para el hogar
- **THEN** el sistema registra el completado en nombre del paciente y lo hace visible para el profesional

### Requirement: Puntos e insignias del MVP

 El sistema MUST otorgar puntos por completar actividades y MUST mostrar al paciente las insignias obtenidas cuando alcance los criterios definidos para el MVP.

#### Scenario: Paciente completa una actividad puntuable
- **WHEN** se registra correctamente el completado de una actividad puntuable
- **THEN** el sistema suma los puntos definidos una sola vez y actualiza el resumen de gamificacion del paciente

#### Scenario: Paciente alcanza una insignia
- **WHEN** el progreso acumulado del paciente cumple el criterio de una insignia
- **THEN** el sistema otorga la insignia y la muestra en su perfil sin duplicarla en evaluaciones posteriores

### Requirement: Seguimiento basico y comentarios

 El sistema MUST permitir al profesional consultar el estado de actividades, completados y puntos de sus pacientes, y MUST permitir al familiar enviar comentarios vinculados a un paciente y una actividad cuando corresponda.

#### Scenario: Profesional consulta progreso
- **WHEN** el profesional abre el seguimiento de un paciente
- **THEN** el sistema muestra un resumen verificable de actividades asignadas, pendientes, completadas y puntos acumulados

#### Scenario: Familiar envia un comentario
- **WHEN** un familiar vinculado envia un comentario valido sobre una actividad o sobre la practica del hogar
- **THEN** el sistema guarda el comentario con autor, paciente y fecha, y lo pone a disposicion del profesional

#### Scenario: Usuario no autorizado solicita progreso
- **WHEN** una persona intenta consultar el progreso de un paciente con quien no tiene una relacion autorizada
- **THEN** el sistema rechaza la consulta sin revelar datos del paciente

### Requirement: Alcance explicito del MVP

 El sistema MUST limitar el MVP a la reproduccion de frases en tiempo real y al seguimiento basico, sin requerir almacenamiento de grabaciones, graficos avanzados ni recomendaciones generadas mediante inteligencia artificial.

#### Scenario: Se utiliza el MVP sin funcionalidades futuras
- **WHEN** un usuario completa los flujos incluidos en el MVP
- **THEN** puede realizar comunicacion con pictogramas, actividades y seguimiento basico sin que las funcionalidades futuras sean necesarias para completar el flujo