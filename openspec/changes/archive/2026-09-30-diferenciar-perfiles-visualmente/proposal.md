## Why

DECILO identifica los roles con etiquetas y símbolos, pero comparte los acentos de navegación y selección. Una identidad consistente por rol ayudará a reconocer el espacio sin cambiar lo que cada persona puede hacer.

## What Changes

- Proponer azul para profesional, verde para paciente y violeta para familiar mediante variables CSS semánticas.
- Mantener texto e ícono junto al color en selección de rol e identidad de sesión.
- Comprobar contraste, teclado, zoom y responsive para los tres roles.
- Conservar marca naranja, permisos, navegación, comunicador, notificaciones y contratos públicos.
- Esta entrega es exclusivamente planificación; no modifica la PWA ni implementa estilos.

## Capabilities

### New Capabilities
- `identidad-visual-por-rol`: presentación accesible y consistente del rol.

### Modified Capabilities
Ninguna: no cambia la autorización ni el comportamiento de las capacidades actuales.

## Impact

La implementación futura se limitará principalmente a `app.js`, `styles.css` y pruebas de frontend/navegador. No requiere dependencias, cambios de esquema, API, JWT, íconos PWA ni manifest. Es independiente del ayudante de IA.
