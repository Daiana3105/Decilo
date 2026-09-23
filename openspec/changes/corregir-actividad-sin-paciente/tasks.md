Las tareas siguientes corresponden a la implementación futura del issue #2 y permanecen pendientes. Esta entrega autoriza únicamente la planificación.

## 1. Regresiones de asignación

- [ ] 1.1 Preparar fixtures sintéticas con profesional sin pacientes, uno o varios pacientes propios y paciente ajeno en la infraestructura existente; verificar aislamiento del almacenamiento y que reproducen el fallo actual sin usar datos reales.
- [ ] 1.2 Agregar regresiones para identificador ausente, vacío, espacios, inexistente y no vinculado, incluyendo envíos programáticos; verificar que detectan inserciones en memoria, llamadas de escritura del MVP, cambios del almacenamiento y mensajes de éxito ante rechazo.
- [ ] 1.3 Cubrir relación o paciente retirado del estado vigente y cambio de rol entre apertura y envío; comprobar rechazo visible sin efectos y sin revelar información ajena.
- [ ] 1.4 Cubrir asignación autorizada con uno y varios pacientes y corrección después de rechazo; comprobar destinatario seleccionado, título, instrucción, disponibilidad, puntos, una inserción por envío aceptado y persistencia tras recarga.

## 2. Corrección acotada del formulario

- [ ] 2.1 Incorporar el estado explicativo sin pacientes, bloqueo de confirmación y selector obligatorio con opción inicial vacía; verificar el estado vacío y que la interacción normal no permite confirmar sin selección.
- [ ] 2.2 Validar rol, identificador, existencia del paciente y relación con el profesional al enviar, antes de mutar o persistir; verificar las regresiones de entradas inválidas, envíos directos y relaciones retiradas.
- [ ] 2.3 Mostrar el rechazo accesible conservando diálogo y campos, sin éxito ni escritura; verificar que al corregir la selección se conserva la ruta válida y solo entonces aparece «Actividad asignada».

## 3. Accesibilidad y responsive

- [ ] 3.1 Agregar o extender pruebas de navegador de etiqueta asociada, teclado, foco visible, anuncio de rechazo y cierre del diálogo; verificar que el estado vacío y la recuperación son comprensibles sin depender solo del color.
- [ ] 3.2 Revisar el flujo con datos vacíos, inválidos y válidos en anchos de 320, 768 y 1280 píxeles y zoom al 200 %; registrar resultados sin desbordamiento horizontal, controles inaccesibles ni textos recortados y limitar cualquier ajuste visual al formulario de actividades.

## 4. Validación integral y revisión de alcance

- [ ] 4.1 Ejecutar secuencialmente `npm.cmd test`, `npm.cmd run test:frontend` y `npm.cmd run build:frontend` usando el runner aislado existente; registrar resultados y resolver regresiones vinculadas a este cambio antes de considerarlo completo.
- [ ] 4.2 Ejecutar `openspec.cmd status --change corregir-actividad-sin-paciente`, `openspec.cmd validate corregir-actividad-sin-paciente --strict`, `openspec.cmd validate --all --strict` y `git diff --check`; comprobar resultados satisfactorios y coherencia entre especificación, implementación y tareas.
- [ ] 4.3 Revisar el diff contra el issue #2 y registrar la evidencia de aceptación; comprobar que no se modifican otros flujos, dependencias, API, datos históricos ni requisitos de los otros issues. Mantener PR, merge, despliegue y cierre del issue sujetos a una etapa posterior autorizada.
