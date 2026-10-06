# Demo familiar aislada

Solo cuentas y datos ficticios. No acredita relaciones clínicas reales ni resuelve
consentimiento o representación. No importar `localStorage`.

La demo local usa un proyecto Docker independiente `decilo-family-demo`, frontend
en `http://localhost:58088`, PostgreSQL en loopback 55440, red y volumen propios.
El archivo privado de Compose, el marcador y las credenciales de prueba se guardan
fuera del repositorio, en `%TEMP%\decilo-family-demo`. No publicar ese directorio
ni ejecutar `docker compose config` sin `--quiet`: contiene configuración privada.
Los contenedores habituales y la vista previa Gemini no se reemplazan.

## Preparación y repetición

Se crea explícitamente una base vacía `decilo_family_demo` en el volumen nuevo,
con `family_demo_guard` y un marcador aleatorio de 32 caracteres hexadecimales.
No se agrega este marcador a una base habitual. La API exige
`FAMILY_DEMO_ENABLED=true`, `FAMILY_DEMO_MARKER`, `DB_NAME=decilo_family_demo`,
host local/contenedor `postgres`, sin DATABASE_URL, y NODE_ENV distinto de
production. Todo se configura en ejecución; no se incorpora a la imagen.

Con el archivo privado ya preparado, PowerShell:

```powershell
docker compose -p decilo-family-demo -f "$env:TEMP\decilo-family-demo\compose.json" config --quiet
docker compose -p decilo-family-demo -f "$env:TEMP\decilo-family-demo\compose.json" up --build -d --wait
docker compose -p decilo-family-demo -f "$env:TEMP\decilo-family-demo\compose.json" exec -T api node scripts/seed-family-demo.js
```

El seed verifica marcador antes de DDL y crea un profesional, un familiar y dos
pacientes: `professional@family-demo.test`, `family@family-demo.test`,
`patient1@family-demo.test`, `patient2@family-demo.test`. La contraseña ficticia
se suministra por `FAMILY_DEMO_PASSWORD`, nunca se imprime ni se guarda en Git.
El acceso local está en `acceso-demo.txt` dentro del directorio privado anterior.
Repetir el seed conserva IDs, contraseñas, actividades, entregas y revocaciones;
rechaza cuentas preexistentes no registradas como propiedad de la fixture.

El seed solo crea relaciones profesional-paciente. Entra como profesional,
selecciona el paciente, introduce el correo del familiar ficticio y crea un
código. Entrégalo manualmente; el familiar debe iniciar sesión y aceptarlo.
Repite para el segundo paciente. El código se muestra una vez, vence a las 24 h,
solo su hash se guarda, y reemitir invalida códigos pendientes del mismo par.
No se envían correos. Al revocar se impiden nuevas lecturas y escrituras aunque
el JWT siga vigente. El navegador revalida al navegar/recuperar visibilidad;
no puede borrar información ya entregada a una pantalla inactiva.

## Frontera de datos y pruebas

Las vistas conservan el paciente activo al navegar. Resumen muestra asignadas,
completadas, pendientes y puntos reales de la API, con accesos a Actividades y
Progreso. Actividades muestra el listado paginado y las acciones de asignar o
completar según rol. Progreso muestra el porcentaje real, las insignias existentes
y los comentarios compartidos; sin actividades no se inventa un porcentaje.
El profesional gestiona invitaciones y revocaciones en Pacientes. El familiar
conserva aceptación de invitaciones y puede dejar de acompañar desde Progreso.
Los filtros de Hogar se aplican en backend también a los indicadores. El texto
lateral indica que tableros, actividades y progreso de esta demo están en PostgreSQL.

Las nuevas rutas viven bajo `/api/family-demo` y usan JWT/usuario vigente,
pertenencia a fixture, relación persistente, SQL parametrizado y UoW con una
conexión. Bloqueo por paciente serializa completados y revocaciones. Un familiar
solo recibe Hogar; progreso y recompensas derivan de esas entregas, nunca de
Consulta. Comentarios del nuevo flujo son compartidos explícitamente. No se
crea un modelo de notas privadas ni se importan comentarios locales.

La insignia básica se deriva del umbral existente de 25 puntos de entregas
visibles, sin otra escritura ni duplicación. No hay borrado/edición de entregas
en esta etapa. Los contratos de auth, notificaciones y ayudante no cambian;
ningún paciente seleccionado se incorpora al prompt de Gemini. El simulador
sigue disponible; esta nueva demo no copia la clave de la otra vista previa.

Para cuentas de la demo las vistas de acompañamiento usan exclusivamente la API.
Si está deshabilitada explícitamente, se conserva el antiguo dominio local de
demostración; un fallo de capacidades no activa ese fallback. En la demo habilitada,
el profesional carga pacientes autorizados desde la API al crear un tablero. Nombre,
paciente y pictogramas quedan persistidos en `patient_boards`; otra sesión del paciente
los obtiene en Mi comunicador sin depender de localStorage. No se importan tableros
anteriores locales. La frase en construcción permanece transitoria en el navegador.

Las rutas GET/POST `/api/family-demo/patients/:patient/boards` y POST
`/api/family-demo/patients/:patient/boards/:board` validan identidad y permisos en
backend. El paciente solo lee sus tableros; el profesional actualmente vinculado
puede leer y crear, y solo el autor vinculado puede editar. El familiar no accede
a estas rutas. Un profesional desvinculado pierde acceso; el paciente conserva
el tablero que ya le fue asignado. La edición conserva el paciente original:
para otro paciente se crea un tablero separado. No se incorporan notificaciones
de tableros ni se envían tableros/frases a Gemini.

La demo admite hasta 100 tableros por paciente; cada tablero tiene nombre de
1–120 caracteres y hasta 64 pictogramas únicos del catálogo, agrupados en
emociones, necesidades, lugares, personas, acciones y objetos cotidianos. El
editor permite buscar/filtrar, agregar, reordenar, quitar y escuchar pictogramas;
Mi comunicador permite filtrarlos y construir una frase reordenable, removible y
reproducible. Se conserva el orden enviado en PostgreSQL. Vacíos, errores y
vínculos revocados no recurren a datos locales como alternativa.

`npm.cmd test` usa únicamente PostgreSQL efímero. Las suites se ejecutan
secuencialmente para evitar saturación local; los escenarios concurrentes dentro
de cada suite siguen activos. `npm.cmd run test:frontend` ejecuta Playwright con
fixtures independientes. Pruebas nuevas incluyen otras familias exclusivamente
en esas bases efímeras, no en la demo de cuatro cuentas.

Pendientes para uso real: acreditación profesional-paciente, consentimiento,
representación y política de autoridades de revocación; límites durables entre
instancias. Los límites de invitaciones de esta demo son en memoria y se
reinician con la API. No habilitar este flujo en producción.

## Verificación local de tableros (2026-10-06)

Se reconstruyeron únicamente API y frontend del proyecto `decilo-family-demo`;
PostgreSQL y su volumen existente se conservaron. El frontend responde en
`http://localhost:58088/` y `/health` respondió 200 después de la actualización.
No se volvió a ejecutar el seed ni se modificaron tableros de la fixture local.

`npm.cmd run test:frontend -- e2e/patient-boards.spec.js`: 2/2 aprobadas en
PostgreSQL efímero. La primera crea y edita como profesional, y confirma que
otra sesión independiente del paciente ve y usa el tablero después de recargar.
La segunda verifica cierre del editor con Escape tras un rechazo, ninguna
escritura local y ningún fallback a tableros de `localStorage`.

## Avisos de acompañamiento

Solo las operaciones nuevas de esta API generan avisos; el seed y las actividades
de localStorage no generan historia. Se reutilizan la campana, REST y las salas
personales de Socket.IO:

| Operación | Destinatarios, excluyendo a quien actuó |
| --- | --- |
| Actividad nueva | Paciente; familiares vigentes solo para Hogar |
| Invitación | Familiar destinatario, sin código ni datos del paciente |
| Aceptación | Profesional invitante todavía autorizado |
| Primera entrega | Profesional asignador todavía autorizado |
| Revocación | Familiar afectado y profesional del vínculo todavía autorizado |

Los textos son genéricos: no contienen nombres, notas, instrucciones, códigos,
hashes ni secretos. Después de revocar, el historial no otorga acceso al paciente.
Evento y destinatario tienen unicidad durable; repetir entrega, aceptación con
el mismo profesional o revocación no duplica avisos ni revisiones. Una reactivación
o aceptación con otro profesional autorizado identifica una nueva generación.

Se usa la conexión del UoW y un SAVEPOINT después de la operación principal.
Si falla la persistencia secundaria, se descartan todos sus avisos/revisiones
parciales y se confirma la operación principal; solo se registra etapa/correlación.
Si se pierde la conexión no puede prometerse esa recuperación ni el COMMIT.
Socket.IO publica únicamente tras resolver el UoW; un fallo de emisión no invalida
la operación. REST/reconexión recupera avisos confirmados, pero no recupera avisos
cuya persistencia falló: no hay cola durable de reintentos en esta etapa.

Al arrancar con `FAMILY_DEMO_ENABLED=true`, la API verifica el marcador de
propiedad y aplica las migraciones aditivas de la demo, incluidas las tablas de
tableros y generaciones/eventos, sin recrear cuentas ni avisos históricos. El
seed protegido también puede aplicarlas de forma idempotente. La inicialización
normal amplía los tipos admitidos por notificaciones preservando los avisos de
login. Las pruebas ejecutan estas migraciones sobre bases efímeras.

Cobertura nueva: `test/accompaniment-notifications.test.js` y
`e2e/accompaniment-notifications.spec.js`, junto con las regresiones existentes de
notificaciones, autenticación y UoW. Las políticas de uso real siguen pendientes.
