## 1. Preparación futura
- [x] 1.1 Inventariar selectores y estados de selección, sesión y navegación para los tres roles; confirmar tema existente.
- [x] 1.2 Medir y ajustar contraste de los pares propuestos, incluidos hover, foco y colores forzados.

## 2. Implementación futura
- [x] 2.1 Incorporar tokens CSS por rol sin alterar marca PWA ni colores semánticos.
- [x] 2.2 Aplicar texto e íconos existentes a la identidad de sesión y selección, preservando semántica accesible.
- [x] 2.3 Verificar restauración, logout, cambio de cuenta y fallback neutral sin cambiar autorización.

## 3. Verificación futura
- [x] 3.1 Agregar pruebas de profesional, paciente y familiar, atributos accesibles, permisos y navegación.
- [x] 3.2 Probar 320/768/1280 px, zoom 200%, teclado, foco, lector de pantalla y colores forzados; registrar evidencia por rol.
- [x] 3.3 Ejecutar npm.cmd test, npm.cmd run build:frontend y npm.cmd run test:frontend secuencialmente, sin reducir cobertura existente.
- [x] 3.4 Validar OpenSpec del cambio y global en modo estricto, git diff --check y alcance del diff.

## Evidencia de implementación local

La implementación fue autorizada en feature/identidad-visual-por-rol. app.js deriva la identidad de session.user.role y elimina el atributo de presentación sin rol reconocido. No cambia la autorización. styles.css conserva el tema claro, marca y estados semánticos; usa tokens por rol en encabezados, navegación y botones, con indicador textual e ícono visible en móvil. Se ajustaron envoltura del encabezado, tarjetas y textos para evitar desbordamientos al ampliar.

Las cuatro pruebas nuevas de e2e/role-identity.spec.js aprobaron: tres roles a 320/768/1280 px, restauración, logout, cambio de cuenta, contraste calculado mínimo 4.5:1 para acento/blanco y acento/superficie, selección, hover, foco de teclado, colores forzados y rechazo de selección de rol incorrecta. Se comprueba zoom CSS 200% sin desbordamiento a 768/1280 px; a 320 px se comprueba visibilidad, manteniendo el mínimo de 320 CSS px. La manipulación visual no habilita acciones profesionales. Revisión de código confirma fallback neutral para rol desconocido.

La usuaria confirmó aceptación visual y zoom nativo al 200 %, y completó la prueba manual con Narrador de Windows en profesional, paciente y familiar, con lectura correcta de controles en los tres roles. Esta es evidencia manual reportada por la usuaria, complementaria a las pruebas automatizadas anteriores. No se informaron versiones de navegador, Windows o Narrador; no se atribuyen versiones ni recorridos adicionales.

La tarea 3.2 queda completa: los tamaños 320/768/1280 px, teclado, foco, colores forzados y ampliación CSS ya tienen evidencia automatizada para los tres roles; la confirmación de zoom nativo al 200 %, aceptación visual y lectura con Narrador en cada rol completa la evidencia manual pendiente. No se ejecutaron nuevamente las pruebas automatizadas para esta actualización documental.

Durante la verificación inicial hubo fallos de la prueba de foco por usar foco programático tras mouse; se corrigió para activar modalidad de teclado. Las pruebas ampliadas detectaron desbordamiento real y se corrigió sin eliminar aserciones. El sandbox impidió preparar PostgreSQL; las ejecuciones autorizadas fuera de él usaron exclusivamente la base efímera del runner, sin tocar la base de DECILO.

No se implementó el ayudante IA ni se modificó la PWA. No se autoriza commit, push, merge, archivo o despliegue.

Resultados finales: npm.cmd test, 102 aprobadas y 0 fallidas; build frontend correcto; npm.cmd run test:frontend, 36 aprobadas (32 regresiones y 4 nuevas), 0 fallidas. OpenSpec estricto del cambio válido y global 10 aprobados, 0 fallidos, con avisos informativos preexistentes. git diff --check correcto; dist y test-results permanecen ignorados. El diff se limita a app.js, styles.css, esta evidencia y la nueva suite de identidad. No hay cambios en contratos backend, dependencias ni datos.
