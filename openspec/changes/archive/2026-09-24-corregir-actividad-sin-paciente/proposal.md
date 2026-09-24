## Why

El issue [#2](https://github.com/Daiana3105/Decilo/issues/2) documenta que un profesional sin pacientes puede confirmar una actividad con `patientId` nulo y recibir «Actividad asignada». La corrección debe evitar registros sin destinatario válido y confirmaciones engañosas, conservando la asignación autorizada.

## What Changes

- Mostrar un estado explicativo cuando no existen pacientes disponibles para el profesional y bloquear la confirmación.
- Exigir una selección y comprobar al enviar que el paciente existe y mantiene una relación con el profesional actual.
- Rechazar identificadores vacíos, inexistentes o ajenos antes de modificar datos o almacenamiento; mostrar un error sin mensaje de éxito.
- Mantener la asignación válida, sus campos y su persistencia.
- Agregar regresiones para entradas inválidas y válidas, teclado, mensajes accesibles y tamaños de pantalla.
- Esta entrega contiene únicamente planificación; las tareas de implementación y sus pruebas quedan pendientes de autorización.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `comunicacion-fonoaudiologica`: precisar las precondiciones de asignación y el rechazo sin efectos del requisito «Actividades asignadas y completado», conservando sus escenarios de completado.

## Impact

La implementación prevista afecta el flujo de actividades en `app.js`, sus pruebas de regresión y, solo si es necesario para ese formulario, estilos en `styles.css`. Se reutilizan las herramientas de prueba existentes. Las actividades y relaciones siguen en el almacenamiento local del MVP; no se agregan endpoints, dependencias, migraciones ni cambios de autenticación.

La rama de trabajo es `hotfix/2-actividad-sin-paciente`, creada desde `main`. Esta etapa publica únicamente los artefactos de `openspec/changes/corregir-actividad-sin-paciente/`. Quedan fuera los otros ocho issues, la implementación, los PR, los merges, el despliegue y el cierre del issue.
