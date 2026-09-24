Implementación del issue #2 autorizada y verificada en hotfix/2-actividad-sin-paciente. Las comprobaciones y sus límites se registran al final; no se abre PR, integra, archiva ni despliega el cambio.

## 1. Regresiones de asignación

- [x] 1.1 Preparar fixtures sintéticas con profesional sin pacientes, uno o varios pacientes propios y paciente ajeno en la infraestructura existente; verificar aislamiento del almacenamiento y que reproducen el fallo actual sin usar datos reales.
- [x] 1.2 Agregar regresiones para identificador ausente, vacío, espacios, inexistente y no vinculado, incluyendo envíos programáticos; verificar que detectan inserciones en memoria, llamadas de escritura del MVP, cambios del almacenamiento y mensajes de éxito ante rechazo.
- [x] 1.3 Cubrir relación o paciente retirado del estado vigente y cambio de rol entre apertura y envío; comprobar rechazo visible sin efectos y sin revelar información ajena.
- [x] 1.4 Cubrir asignación autorizada con uno y varios pacientes y corrección después de rechazo; comprobar destinatario seleccionado, título, instrucción, disponibilidad, puntos, una inserción por envío aceptado y persistencia tras recarga.

## 2. Corrección acotada del formulario

- [x] 2.1 Incorporar el estado explicativo sin pacientes, bloqueo de confirmación y selector obligatorio con opción inicial vacía; verificar el estado vacío y que la interacción normal no permite confirmar sin selección.
- [x] 2.2 Validar rol, identificador, existencia del paciente y relación con el profesional al enviar, antes de mutar o persistir; verificar las regresiones de entradas inválidas, envíos directos y relaciones retiradas.
- [x] 2.3 Mostrar el rechazo accesible conservando diálogo y campos, sin éxito ni escritura; verificar que al corregir la selección se conserva la ruta válida y solo entonces aparece «Actividad asignada».

## 3. Accesibilidad y responsive

- [x] 3.1 Agregar o extender pruebas de navegador de etiqueta asociada, teclado, foco visible, anuncio de rechazo y cierre del diálogo; verificar que el estado vacío y la recuperación son comprensibles sin depender solo del color.
- [x] 3.2 Revisar el flujo con datos vacíos, inválidos y válidos en anchos de 320, 768 y 1280 píxeles y zoom al 200 %; registrar resultados sin desbordamiento horizontal, controles inaccesibles ni textos recortados y limitar cualquier ajuste visual al formulario de actividades.

## 4. Validación integral y revisión de alcance

- [x] 4.1 Ejecutar secuencialmente `npm.cmd test`, `npm.cmd run test:frontend` y `npm.cmd run build:frontend` usando el runner aislado existente; registrar resultados y resolver regresiones vinculadas a este cambio antes de considerarlo completo.
- [x] 4.2 Ejecutar `openspec.cmd status --change corregir-actividad-sin-paciente`, `openspec.cmd validate corregir-actividad-sin-paciente --strict`, `openspec.cmd validate --all --strict` y `git diff --check`; comprobar resultados satisfactorios y coherencia entre especificación, implementación y tareas.
- [x] 4.3 Revisar el diff contra el issue #2 y registrar la evidencia de aceptación; comprobar que no se modifican otros flujos, dependencias, API, datos históricos ni requisitos de los otros issues. Mantener PR, merge, despliegue y cierre del issue sujetos a una etapa posterior autorizada.

## Evidencia de validación (2026-09-24)

- Rama verificada: hotfix/2-actividad-sin-paciente, upstream origin/hotfix/2-actividad-sin-paciente y commit de planificación 381df27 incluido.
- Regresión previa: las 12 pruebas nuevas del manejador fallaron sobre el código anterior, incluyendo inserciones inválidas y excepción con sesión terminada. Después de la corrección, las 12 pasan.
- npm.cmd test: 64 aprobadas, 0 fallidas, 0 omitidas. Última ejecución sobre el estado final, después del ajuste responsive.
- npm.cmd run build:frontend: correcto; genera dist, excluido por .gitignore.
- npm.cmd run test:frontend: 26 aprobadas, 0 fallidas, con Edge headless y PostgreSQL efímero aislado. Incluye 13 pruebas nuevas del issue #2 y las 13 existentes de notificaciones.
- Cobertura: cero pacientes; identificadores ausentes, vacíos, espacios, inexistentes o ajenos; paciente y relación retirados del estado vigente; rol cambiado o sesión terminada; rechazo sin mutación, escritura ni éxito; recuperación y asignación válida con uno o varios pacientes y persistencia tras recarga.
- Accesibilidad básica comprobada: nombres accesibles, asociación del mensaje, role=alert, aria-invalid, foco visible, recorrido Tab/Shift+Tab contenido, Escape y restitución del foco.
- Responsive: estados vacío, inválido y válido comprobados a 320, 768 y 1280 px. Ampliación al 200 % comprobada mediante CSS zoom en navegador automatizado; no equivale a una revisión manual con lector de pantalla ni a activar el zoom nativo del navegador. El modal permite desplazar su contenido y alcanzar la confirmación.
- OpenSpec status: 4/4 artefactos completos; validación estricta del cambio correcta; validate --all --strict: 7 elementos aprobados, 0 fallos. Los avisos informativos por requisitos extensos corresponden a especificaciones existentes.
- git diff --check: correcto. Revisión de alcance: únicamente app.js, dos reglas acotadas a .activity-modal en styles.css, las dos suites nuevas de actividades y este archivo. Sin dependencias nuevas, secretos ni archivos generados incluidos.

### Incidencias investigadas

- El primer intento de node --test dentro del sandbox falló con spawn EPERM antes de ejecutar las pruebas. Se repitió fuera del sandbox con autorización; las suites completas usaron exclusivamente PostgreSQL temporal aislado, sin bases operativas.
- La primera ejecución Playwright usaba localizadores getByLabel exactos que incluían el texto de opciones. Se corrigieron a rol combobox y nombre accesible; se detuvo la ejecución que conservaba los localizadores antiguos y se repitió.
- La ampliación CSS al 200 % detectó que la altura anterior dejaba la confirmación fuera del viewport. Se acotó la fila del contenedor y la altura del modal de actividades al espacio disponible. La prueba focalizada y la suite completa posterior pasaron.
- Playwright emitió un aviso de precedencia FORCE_COLOR sobre NO_COLOR; no afectó las pruebas. El log NOTIFICATION_FAILED de la suite general corresponde al escenario deliberado de fallo secundario de notificaciones, cuya prueba pasó.

Todas las tareas de implementación y validación de esta lista están comprobadas con el alcance automatizado descrito. PR, merge, cierre del issue, archivo OpenSpec y despliegue no se realizaron.
