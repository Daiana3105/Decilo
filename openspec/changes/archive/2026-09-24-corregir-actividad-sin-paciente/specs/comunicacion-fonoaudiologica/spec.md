## MODIFIED Requirements

### Requirement: Actividades asignadas y completado

El sistema MUST permitir al profesional asignar actividades a uno o mas pacientes con instrucciones y fecha o estado de disponibilidad, y MUST permitir al paciente completar las actividades asignadas. Cada asignación MUST requerir un paciente seleccionado, existente y vinculado al profesional que confirma la operación. El sistema MUST rechazar un identificador vacío, inexistente o no autorizado antes de modificar datos o escribir en almacenamiento, y MUST comunicar el rechazo sin mostrar éxito. El flujo de asignación MUST ofrecer mensajes comprensibles, controles etiquetados y operables por teclado y una presentación utilizable en móvil, tablet y escritorio.

#### Scenario: Profesional asigna una actividad
- **WHEN** el profesional selecciona un paciente, define una actividad valida y la confirma
- **THEN** la actividad queda asociada al paciente con su instruccion y disponibilidad, y aparece en su lista de actividades
- **AND** se conservan los puntos y demás campos válidos, se persiste una actividad y se muestra la confirmación de éxito
- **AND** la asignación sigue disponible después de recargar

#### Scenario: Profesional sin pacientes disponibles
- **WHEN** un profesional sin pacientes autorizados accede al flujo de asignación
- **THEN** se muestra un estado que explica que necesita un paciente vinculado para asignar actividades
- **AND** no se permite confirmar una asignación ni se guardan datos o muestra éxito

#### Scenario: Envío sin selección válida
- **WHEN** se intenta confirmar una actividad con un identificador de paciente ausente, vacío o compuesto solo por espacios, incluso mediante un envío directo que omite la validación del formulario
- **THEN** la operación se rechaza con una indicación visible y accesible para seleccionar un paciente
- **AND** no se modifican datos en memoria, no se escribe en almacenamiento y no se muestra éxito

#### Scenario: Paciente inexistente
- **WHEN** se confirma una actividad con un identificador que no corresponde a un paciente existente
- **THEN** se informa que el paciente no está disponible para la asignación
- **AND** no se modifican datos en memoria, no se escribe en almacenamiento y no se muestra éxito

#### Scenario: Paciente no autorizado
- **WHEN** se intenta asignar una actividad a un paciente que no está vinculado al profesional actual
- **THEN** se rechaza la operación sin revelar datos del paciente ajeno
- **AND** se comunica el rechazo sin modificar datos en memoria, escribir en almacenamiento ni mostrar éxito

#### Scenario: Relación retirada antes de confirmar
- **WHEN** un paciente era seleccionable al abrir el formulario pero ya no existe o su relación con el profesional fue retirada del estado vigente antes de confirmar
- **THEN** la operación se rechaza utilizando el estado vigente al enviar y se informa el problema
- **AND** no se modifican datos en memoria, no se escribe en almacenamiento y no se muestra éxito

#### Scenario: Sesión sin autorización profesional al enviar
- **WHEN** se intenta confirmar una asignación sin una sesión profesional autorizada, aunque el formulario se haya abierto anteriormente
- **THEN** se rechaza la asignación con información visible del problema, sin modificar datos ni escribir en almacenamiento o mostrar éxito

#### Scenario: Corrección posterior a un rechazo
- **WHEN** el profesional corrige la selección rechazada eligiendo un paciente existente y autorizado y confirma datos válidos
- **THEN** se conserva el resto de los campos del formulario y se asigna la actividad únicamente al paciente seleccionado
- **AND** se muestra éxito solamente para la operación aceptada

#### Scenario: Asignación accesible en distintos tamaños
- **WHEN** el profesional utiliza el flujo de asignación con teclado, en pantallas de 320, 768 o 1280 píxeles de ancho, o con zoom al 200 %
- **THEN** puede identificar el selector por su etiqueta, alcanzar los controles habilitados con foco visible y comprender el estado vacío o el rechazo anunciado
- **AND** los textos y controles siguen siendo legibles y utilizables sin desbordamiento horizontal

#### Scenario: Paciente completa una actividad
- **WHEN** el paciente finaliza una actividad asignada y confirma el resultado
- **THEN** el sistema registra la entrega como completada con fecha y la excluye de la lista de pendientes sin borrar su historial

#### Scenario: Familiar marca ejercicio de hogar
- **WHEN** un familiar vinculado marca como completado un ejercicio habilitado para el hogar
- **THEN** el sistema registra el completado en nombre del paciente y lo hace visible para el profesional
