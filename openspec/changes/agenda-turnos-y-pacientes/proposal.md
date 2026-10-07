## Why

DECILO no tiene una fuente persistente para administrar pacientes y coordinar turnos; la interfaz demostrativa local no puede autorizar ni conservar información clínica. Un módulo PostgreSQL con consentimiento vigente, permisos comprobados en cada solicitud y auditoría mínima permite organizar la atención sin convertir roles, correos o datos locales en acreditación.

## What Changes

- Incorporar perfiles de paciente asociados a cuentas paciente existentes, con datos mínimos y contacto responsable, CRUD profesional y archivo lógico; sin crear credenciales ni borrar historial desde esta capacidad.
- Registrar y revocar consentimiento/autorización profesional-paciente, con alcance y evidencia mínima auditables; requerir autorización activa para gestionar perfiles y turnos.
- Agregar agenda profesional diaria, semanal y mensual, con creación, edición, confirmación, cancelación y marcado como atendido, estados persistentes y prevención transaccional de superposiciones.
- Permitir al paciente consultar únicamente sus turnos y al familiar consultar únicamente turnos con vínculo familiar vigente y autorización explícita de compartir agenda.
- Persistir turnos, permisos y auditoría en PostgreSQL mediante migraciones aditivas; mantener los datos clínicos fuera de localStorage.
- Crear avisos genéricos para cambios de turnos, persistidos con la operación y publicados en tiempo real solo después del COMMIT.
- Preservar contratos y datos de autenticación, Gemini, pictogramas, tableros, vínculos familiares existentes y PWA.

## Capabilities

### New Capabilities
- `agenda-turnos-pacientes`: perfiles mínimos de pacientes, consentimiento/autorizaciones y turnos persistentes con agenda, estados, privacidad y aislamiento por rol.

### Modified Capabilities
- `comunicacion-fonoaudiologica`: acotar el registro/gestión profesional de pacientes a perfiles persistentes con autorización consentida y reglas de archivo sin borrado clínico.
- `notificaciones-usuario`: admitir avisos genéricos de turnos con destinatarios autorizados y publicación posterior al COMMIT, preservando el aviso de login.

## Impact

Afecta nuevas rutas/servicios/repositorios en Express, esquema PostgreSQL y migraciones aditivas, vistas de pacientes y calendario en `app.js`, y notificaciones REST/Socket.IO. Reutiliza JWT, `UserRepository`, Unit of Work y el mecanismo de publicación actual. No altera el dominio de Gemini, tableros/pictogramas, vínculos familiares actuales ni PWA. Las identidades paciente deben existir en `users`; el módulo no crea ni modifica credenciales.
## Etapa m?nima de demo autorizada

Esta entrega se limita al entorno local protegido por FAMILY_DEMO y su marcador, a miembros ficticios registrados en backend y a v?nculos activos. No habilita pacientes reales, no crea cuentas ni concede consentimiento. En Pacientes se agregan/editan fichas de cuentas ficticias ya vinculadas: nombre, apellido y contacto opcional ficticio; sin DNI, diagn?stico ni historia cl?nica. La ficha queda separada por profesional y paciente en demo_patient_details; no modifica identidad ni credenciales.

Agenda mensual por paciente: crear turnos pendientes y cancelar conservando filas, sin edici?n, confirmaci?n, recurrencias, recordatorios ni emails. Horario fijo de Buenos Aires (UTC?3); duraci?n 15?180 minutos en m?ltiplos de cinco. Reutiliza appointments, repositorios, locks ordenados de usuarios y una conexi?n UoW. Los intervalos son semiabiertos y se comprueban conflictos del profesional y del paciente dentro de la misma transacci?n.

Cada solicitud verifica fixture y v?nculos en PostgreSQL. Profesionales ven solo turnos propios; pacientes solo los propios; familiares solo los del paciente vinculado y del profesional que autoriz? su v?nculo vigente. Revocaci?n corta nuevas consultas. Contacto de ficha es exclusivo del profesional. No se a?ade almacenamiento de agenda en navegador ni se env?a a Gemini.

El alcance productivo de consentimiento profesional y permiso familiar separado de agenda permanece pendiente: los v?nculos ficticios no equivalen a consentimiento cl?nico. Se mantienen pendientes altas reales, consentimiento/representaci?n, archivo, auditor?a productiva, estados adicionales, configuraci?n de zona, vistas diaria/semanal y avisos. No se deben habilitar estas rutas fuera de la demo ficticia.
