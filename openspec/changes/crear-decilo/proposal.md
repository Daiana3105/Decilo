## Why

Las personas que necesitan apoyo para comunicarse y entrenar habilidades fonoaudiologicas requieren una experiencia accesible que conecte la practica del paciente, la supervision profesional y el acompanamiento familiar. DECILO propone centralizar esas interacciones en una plataforma web inclusiva para que el MVP permita comenzar con ejercicios concretos, comunicacion mediante pictogramas y seguimiento basico del progreso.

## What Changes

- Incorporar tres roles de usuario: profesional, paciente y familiar, con experiencias y permisos diferenciados.
- Permitir al profesional registrar pacientes, crear tableros personalizados de pictogramas, asignar actividades y consultar el progreso.
- Permitir al paciente seleccionar pictogramas para construir frases, reproducirlas en voz alta, completar actividades y obtener puntos o insignias.
- Permitir al familiar consultar las actividades para el hogar, marcar ejercicios como completados y enviar comentarios al profesional.
- Incluir en el MVP el registro de pacientes, el tablero de pictogramas, la construccion y reproduccion de frases, la asignacion de actividades y el seguimiento basico del progreso.
- Dejar fuera del MVP las grabaciones de voz, los graficos avanzados y las recomendaciones mediante inteligencia artificial; se reservaran para futuras capacidades.

## Capabilities

### New Capabilities

- `comunicacion-fonoaudiologica`: Gestiona los roles, el registro y acompanamiento de pacientes, los tableros de pictogramas, la construccion y reproduccion de frases, las actividades asignadas y el seguimiento basico del progreso.

### Modified Capabilities

No aplica: no existen capacidades especificadas previamente en `openspec/specs/`.

## Impact

- La pagina inicial actual evolucionara hacia una aplicacion web con flujos autenticados y vistas diferenciadas por rol.
- Se requeriran modelos y persistencia para usuarios, pacientes, pictogramas, tableros, frases, actividades, entregas, progreso, puntos, insignias y comentarios.
- Se requeriran mecanismos de control de acceso por rol y validacion de permisos sobre pacientes y actividades.
- La reproduccion de frases dependera inicialmente de las capacidades de sintesis de voz disponibles en el navegador o en una integracion definida durante la implementacion; no se almacenaran grabaciones de voz en este MVP.
- El alcance futuro debera poder incorporar grabaciones, analitica avanzada y recomendaciones de IA sin alterar los flujos basicos definidos para el MVP.