## Context

Ver `proposal.md` para la motivación y el alcance del issue #2. En `app.js`, `openActivityModal()` comprueba el rol al abrir el diálogo, pero genera un selector sin `required` y su manejador de envío inserta directamente en `data.activities`, llama a `persist()`, cierra el diálogo y muestra éxito. Con cero opciones, `FormData.get("patientId")` puede devolver `null`.

Las actividades, usuarios locales y relaciones se conservan en `localStorage` bajo `decilo-mvp-v1`. `patientsForCurrentUser()` proporciona candidatos; `canAccessPatient()` contempla varios roles y no sustituye por sí solo la comprobación de asignación profesional. La API existente no administra actividades. Las pruebas usan Node y Playwright; `scripts/run-tests.js` proporciona PostgreSQL efímero aislado y `test/README.md` describe su uso.

## Goals / Non-Goals

**Goals:** validar la precondición antes de cualquier mutación, comunicar el rechazo en el mismo formulario y conservar la ruta de éxito. Cubrir tanto interacción normal como envío programático que omita la validación HTML.

**Non-Goals:** migrar actividades al servidor, establecer seguridad remota sobre datos locales manipulables, reparar actividades históricas, cambiar completados/puntos/comentarios, refactorizar formularios ajenos o resolver otros issues. No implementar durante esta entrega.

## Decisions

### 1. Validación de interfaz y de la operación

El diálogo mostrará un texto explicativo y la confirmación deshabilitada cuando no haya pacientes. Con pacientes, el selector tendrá etiqueta asociada, selección vacía inicial y validación obligatoria. La validación HTML mejora la interacción, pero el manejador volverá a comprobar los datos al enviar; depender solo de `required` o de un botón deshabilitado dejaría abierto el envío programático.

Antes de construir o insertar la actividad, se comprobará que la sesión actual siga siendo profesional, que `patientId` sea una cadena no vacía tras quitar espacios y que identifique un usuario existente con rol paciente y una relación cuyo `professionalId` coincida con la sesión. La comprobación usará el estado vigente en memoria, sin confiar en las opciones capturadas al abrir el diálogo. Esto cubre una relación o paciente retirado de ese estado antes del envío. No se ampliará el alcance a sincronización entre pestañas del dominio local.

### 2. Rechazo sin efectos

Toda precondición se evaluará antes de `data.activities.push()` y de `persist()`. Ante rechazo, el manejador terminará conservando el diálogo y los campos para corregirlos, con un mensaje visible y anunciado mediante `role="alert"`, asociado al selector cuando corresponda. No habrá llamadas de persistencia, inserción en memoria, cierre exitoso ni toast «Actividad asignada». Un mensaje genérico para pacientes inexistentes o no autorizados evitará mostrar información de otra relación.

No se propone insertar y después revertir: eso permitiría escrituras transitorias y complicaría la comprobación de ausencia de efectos. La ruta válida conservará los campos actuales, una sola inserción por envío aceptado, persistencia y confirmación existente.

### 3. Regresiones y experiencia de uso

Se reutilizará la infraestructura de pruebas sin agregar dependencias. Las fixtures representarán profesional sin pacientes, pacientes propios, paciente ajeno e identificador inexistente, con datos sintéticos. Se comprobará el rechazo mediante un envío programático además de los controles HTML, incluyendo selección vacía, ausente y espacios, rol cambiado y relación retirada del estado vigente.

Las aserciones compararán el contenido almacenado antes/después, registrarán las llamadas a escritura de la clave del MVP durante la operación y comprobarán que tampoco se inserta una actividad en memoria ni aparece éxito. La asignación válida conservará título, instrucción, disponibilidad, puntos y destinatario; seguirá visible después de recargar. Con varios pacientes se comprobará que se guarda el seleccionado.

Las pruebas de navegador cubrirán etiqueta del selector, foco visible y alcanzable por teclado, confirmación bloqueada, anuncio del error, corrección posterior y cierre del diálogo. Se revisarán anchos de 320, 768 y 1280 píxeles y zoom al 200 %, con textos legibles, controles utilizables y sin desbordamiento horizontal. Cualquier ajuste de accesibilidad o estilos se limitará al flujo de asignación.

### 4. Verificación por etapas

Esta etapa ejecuta estado y validaciones estrictas de OpenSpec y `git diff --check`. La futura implementación ejecutará secuencialmente `npm.cmd test`, `npm.cmd run test:frontend` y `npm.cmd run build:frontend`, además de ambas validaciones OpenSpec y revisión del diff. No se ejecutarán suites de build y navegador en paralelo porque comparten `dist`; se utilizará el aislamiento existente sin conectarse a bases de desarrollo o producción. Los resultados de implementación no se darán por obtenidos en la planificación.

## Risks / Trade-offs

- Los datos locales pueden ser manipulados fuera del flujo de la aplicación → delimitar esta corrección a la validación funcional del MVP; no afirmar autorización garantizada por servidor.
- Las opciones del selector pueden quedar obsoletas mientras el diálogo permanece abierto → resolver nuevamente el paciente y su relación contra el estado vigente al confirmar.
- Un botón deshabilitado no explica el problema ni protege envíos directos → mantener el texto explicativo y la validación del manejador.
- Un rechazo podría modificar datos sin que cambie el número de actividades visibles → comparar almacenamiento completo y escrituras, además de estado en memoria y mensajes.

## Migration Plan

No se requiere migración ni limpieza de registros históricos. La implementación futura se revisará y publicará en una etapa separada; si se revierte, bastará revertir el cambio de código sin transformar datos. En esta etapa se publica solo el commit de planificación en la rama hotfix, sin PR, merge, despliegue ni archivo del cambio OpenSpec.
