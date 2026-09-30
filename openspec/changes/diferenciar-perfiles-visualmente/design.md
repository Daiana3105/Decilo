## Context

Se revisaron ARCHITECTURE.md, app.js, styles.css, autenticación y documentación de pruebas. `roleLabels`, `renderLogin`, `authRoleButtons` y `renderApp` centralizan la presentación; `restoreSession` obtiene el rol desde `/api/auth/me`. Ya existen símbolos ✦, ◉ y ⌂ y etiquetas. El CSS tiene tokens globales y tema claro; no se encontró un modo oscuro implementado. Los datos demostrativos en localStorage no constituyen autorización remota.

## Goals / Non-Goals

Reconocer los tres espacios sin depender del color, manteniendo las interacciones actuales. No rediseñar pantallas, introducir modo oscuro, cambiar permisos, refactorizar el render ni modificar instalación/identidad PWA.

## Decisions

1. Agregar tokens acotados `--role-accent`, `--role-surface`, `--role-text` y `--role-focus`. Paleta propuesta: profesional #1d4ed8 sobre #eff6ff; paciente #166534 sobre #f0fdf4; familiar #6b21a8 sobre #faf5ff. Texto blanco sobre acento sólido. Son propuestas, no evidencia de contraste: medir todas las combinaciones y estados antes de aprobarlas.
2. Aplicar tokens a tarjetas de selección, indicador de sesión y navegación activa. Conservar tokens institucionales naranja y los colores semánticos de error, éxito y advertencia. No recolorear pictogramas ni datos de progreso.
3. Selección previa al login es solo una vista previa. La sesión usa `session.role` normalizado desde el usuario de API; atributos CSS no conceden permisos. Limpiar el tema al salir o cambiar de cuenta; rol desconocido usa aspecto neutral, sin inventar permisos.
4. Reutilizar símbolos existentes junto a Profesional/Paciente/Familiar; símbolo decorativo con aria-hidden cuando el texto ya identifica el rol. Mantener aria-pressed y aria-current, foco visible, nombres accesibles y orden de tabulación.
5. Exigir contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande y límites/indicadores necesarios de controles. Revisar estados activo, hover y foco. Comprobar colores forzados sin depender de sombras. Mantener tema claro actual; si aparece soporte oscuro antes de implementar, inventariarlo y comprobar pares equivalentes antes de modificarlo.

## Risks / Validation

Los selectores compartidos pueden afectar botones ajenos: acotar al contenedor del rol y probar los tres recorridos. El render completo puede perder foco: no añadir reconstrucciones para cambiar únicamente colores. Probar 320, 768 y 1280 px, zoom 200%, teclado, texto ampliado y nombres accesibles. Ejecutar secuencialmente Node, build y Playwright con el runner aislado del proyecto; conservar regresiones de autenticación, comunicador, notificaciones y PWA sin modificar esa capacidad.

## Open Questions

Confirmar aceptación visual de la paleta propuesta con usuarios de los tres roles; el contraste medido prevalece sobre un tono exacto. No hay decisión técnica bloqueante para desarrollar posteriormente esta propuesta.
