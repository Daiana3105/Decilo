## ADDED Requirements

### Requirement: Identidad consistente y no exclusivamente cromática
El sistema MUST distinguir profesional con azul, paciente con verde y familiar con violeta mediante variables CSS y MUST acompañar la identidad con texto e ícono.

#### Scenario: Identidad de cada rol
- **WHEN** inicia sesión un profesional, paciente o familiar
- **THEN** la selección y el indicador de sesión muestran el nombre e ícono correspondientes y la navegación activa usa su acento azul, verde o violeta respectivamente

#### Scenario: Cambio de cuenta
- **WHEN** una persona sale y accede con otro rol
- **THEN** se elimina la identidad anterior y se utiliza el rol validado de la nueva sesión

### Requirement: Legibilidad y adaptación
La presentación MUST mantener contraste de texto normal de al menos 4.5:1, texto grande de 3:1 y controles e indicadores necesarios de 3:1 contra su entorno; MUST conservar teclado, foco visible y lectura sin depender del color.

#### Scenario: Pantallas pequeñas y ampliación
- **WHEN** se recorren los tres roles a 320, 768 y 1280 px y con zoom 200%
- **THEN** etiquetas, controles y navegación permanecen visibles y utilizables sin desbordamiento horizontal nuevo

#### Scenario: Sin percepción del color
- **WHEN** se utiliza teclado, lector de pantalla o colores forzados
- **THEN** el nombre del rol y los estados seleccionado y activo siguen siendo identificables

### Requirement: Compatibilidad funcional
El cambio MUST preservar permisos, rutas, JWT, contratos públicos, funcionalidades y marca PWA; MUST conservar el tema claro y cualquier modo oscuro existente al implementar.

#### Scenario: Manipulación visual
- **WHEN** se altera un atributo de rol del DOM o se selecciona otro rol antes del login
- **THEN** no se obtienen permisos ni navegación autorizada adicionales

#### Scenario: Regresión de recorridos
- **WHEN** cada rol utiliza sus funciones actuales, el comunicador y las notificaciones
- **THEN** los resultados, controles de acceso y gestión del foco permanecen iguales
