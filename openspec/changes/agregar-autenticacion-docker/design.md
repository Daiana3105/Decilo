## Context

El frontend actual es una aplicación estática compuesta por `index.html`, `app.js` y `styles.css`. `app.js` inicializa cuentas demo y guarda usuarios y sesión en `localStorage`/`sessionStorage`; también concentra las vistas de los tres roles y las reglas de relación. No hay `package.json`, servidor HTTP propio ni base de datos. La solución debe conservar esa experiencia visual y sus flujos de comunicación, actividades y progreso mientras reemplaza la identidad local por una fuente autenticada.

## Goals / Non-Goals

**Goals:**

- Separar una API Node.js/Express del frontend estático con contratos JSON estables para autenticación.
- Persistir cuentas en SQLite con una inicialización idempotente y un volumen Docker.
- Hashar contraseñas con un algoritmo seguro, firmar JWT con configuración externa y evitar secretos en el repositorio.
- Integrar el frontend sin rediseñar sus vistas: registro, login, sesión actual, redirección por rol y bloqueo de rutas/vistas no autorizadas.
- Hacer reproducible el arranque local mediante `docker compose up --build -d`, con healthcheck y pruebas básicas.

**Non-Goals:**

- Migrar en esta iteración cada entidad de dominio del MVP a la API; las funcionalidades existentes deben seguir operativas y sus datos actuales no se rediseñan.
- Recuperación de contraseña, OAuth, diagnósticos clínicos, IA, pagos, notificaciones externas o despliegue de producción.
- Resolver autorización avanzada entre profesionales, pacientes y familiares más allá de conservar y aplicar las relaciones que el MVP ya conoce.

## Decisions

### API y estructura de ejecución

Se agregará un servicio Node.js/Express con módulos separados para configuración, SQLite, esquema inicial, autenticación, middleware JWT y rutas. La API será la única responsable de validar credenciales, consultar usuarios y emitir/verificar tokens; el frontend será un cliente HTTP. Se elegirán dependencias maduras para Express, SQLite, hash de contraseñas y JWT, fijando versiones en el manifiesto del backend.

Alternativas consideradas: mantener la autenticación en `app.js` (descartado porque no protege credenciales ni permite persistencia compartida) o introducir un proveedor externo (descartado porque añade infraestructura y contradice el alcance del MVP).

### Modelo y seguridad de usuarios

SQLite se inicializará al arrancar con una tabla `users` y una restricción única normalizada sobre email. La contraseña recibida se procesará antes de insertar y solo se comparará contra `password_hash` al iniciar sesión. El secreto JWT, la duración del token y la ruta de la base se leerán desde variables de entorno; la API fallará de forma explícita si falta una configuración crítica. Las respuestas serializarán únicamente campos públicos.

Alternativas consideradas: texto plano o cifrado reversible (descartados porque no cumplen el requisito de seguridad) y una base externa (descartada por complejidad innecesaria para este MVP).

### Sesión y autorización del frontend

El frontend enviará `Authorization: Bearer <token>` a `/api/auth/me` y conservará solo el token y la identidad mínima necesarios para la sesión en el navegador. Al cargar, validará la sesión; ante un token inválido limpiará el estado y mostrará el acceso. El rol recibido de la API será la fuente de verdad para seleccionar el panel inicial y para filtrar navegación; las comprobaciones de API evitarán depender únicamente de la interfaz.

Alternativas consideradas: confiar en `sessionStorage` como autoridad (descartado porque puede ser manipulado) o cookies HttpOnly desde el primer corte (válidas para una evolución posterior, pero requieren configurar CSRF y una frontera de dominio distinta; el contrato actual especifica JWT).

### Frontend y red entre contenedores

El frontend se servirá como archivos estáticos desde un contenedor web ligero. El servidor web reenviará `/api` al servicio API de Compose, de modo que el navegador use un origen único y no requiera una política CORS amplia. La imagen de API tendrá un healthcheck HTTP; Compose esperará la salud de la API antes de considerar operativo el conjunto. SQLite se montará en un volumen nombrado en la ruta configurada por la API.

Alternativas consideradas: servir ambos componentes desde un único proceso (reduce separación y dificulta el despliegue) o habilitar CORS abierto (menos restrictivo y más propenso a errores de configuración).

### Compatibilidad de datos demo

Se retirarán las contraseñas demo del camino de autenticación. La interfaz conservará el diseño y los componentes de dominio actuales; el nuevo flujo no asumirá que una cuenta recién registrada tiene relaciones, tableros o actividades y mostrará estados vacíos accesibles hasta que existan. La creación o migración completa de datos de dominio queda fuera de este cambio y se documentará como límite del MVP si resulta visible durante la integración.

## Risks / Trade-offs

- [Riesgo] Los tokens almacenados en el navegador quedan expuestos si aparece una vulnerabilidad XSS. → Mitigación: conservar solo el token, escapar contenido dinámico existente, evitar secretos en el frontend y documentar que esta configuración es de MVP; evaluar cookies HttpOnly para producción futura.
- [Riesgo] SQLite admite una concurrencia menor que una base servidor. → Mitigación: usar transacciones para registro, volumen persistente y mantener el modelo acotado a usuarios en esta iteración.
- [Riesgo] El cambio de cuentas demo a cuentas reales puede dejar estados locales incompatibles. → Mitigación: detectar sesiones antiguas, limpiarlas y mostrar un acceso nuevo sin borrar silenciosamente datos de dominio no relacionados.
- [Riesgo] El proxy del frontend puede ocultar errores de configuración entre servicios. → Mitigación: probar el healthcheck, el endpoint `/api/health` y un flujo completo dentro de Compose.
- [Riesgo] Una política de contraseña demasiado exigente puede bloquear el registro accesible. → Mitigación: definir una regla mínima clara, validarla igual en cliente y servidor y anunciar el error campo por campo.

## Migration Plan

1. Crear el backend, el esquema SQLite y las pruebas aisladas de rutas.
2. Agregar la configuración Docker y verificar salud, persistencia del volumen y proxy `/api`.
3. Integrar el cliente de autenticación y conservar el renderizado de las vistas actuales, limpiando sesiones demo incompatibles.
4. Ejecutar pruebas de registro, login, `/me`, roles, errores y reinicio del contenedor; documentar los comandos de uso.
5. Para revertir, detener Compose y volver a servir el frontend estático anterior; el volumen SQLite puede conservarse para inspección o eliminarse explícitamente durante una reinstalación de desarrollo.

## Open Questions

No hay decisiones pendientes que cambien el contrato o el enfoque. La política exacta de longitud mínima de contraseña y la duración concreta del JWT se fijarán como configuración documentada durante la implementación, manteniendo la validación mínima definida por la especificación.
