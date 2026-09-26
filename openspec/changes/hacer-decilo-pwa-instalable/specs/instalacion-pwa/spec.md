## Purpose

Permitir instalar DECILO desde navegadores compatibles con identidad visual propia, acceso standalone e instrucciones accesibles, sin introducir caché de información privada ni soporte offline.

## ADDED Requirements

### Requirement: Identidad pública instalable

DECILO MUST ofrecer un manifest válido con name y short_name DECILO, id/start_url/scope `/`, display standalone, lang es, theme_color #e06a42 y background_color #faf8f5. MUST enlazarlo desde index.html junto con favicon PNG 32x32, apple-touch-icon PNG 180x180 y metadatos de identidad. MUST proveer íconos PNG 192x192 y 512x512 purpose any y 512x512 purpose maskable, basados en D blanca sobre naranja y esquinas redondeadas donde corresponda. El maskable MUST tener fondo opaco y símbolo dentro de su zona segura; Apple MUST poder aplicar su propia máscara. MUST NOT incluir datos privados o credenciales en recursos o URLs.

#### Scenario: Lectura de identidad
- **WHEN** un navegador carga el documento y su manifest
- **THEN** encuentra referencias públicas válidas, nombre DECILO, dimensiones reales coincidentes con sizes y tipos PNG correctos, y rutas de inicio y alcance del frontend sin parámetros de sesión

#### Scenario: Recorte del ícono
- **WHEN** el sistema aplica una máscara al ícono maskable
- **THEN** la D permanece reconocible dentro del círculo seguro central de radio 40% del lado, sin bordes transparentes indeseados

### Requirement: Instalación nativa y alternativa accesible

DECILO MUST permitir instalación desde el menú nativo de Chrome Android y escritorio y Agregar a pantalla de inicio en Safari/iPhone. MUST abrirse con identidad DECILO en modo standalone cuando el navegador lo admita. MUST proporcionar ayuda accesible desde acceso y sesión autenticada, explicar conexión requerida y conservar uso en navegador sin instalar. MUST NOT depender de beforeinstallprompt ni prometer un aviso automático.

#### Scenario: Chrome instala y abre
- **WHEN** una persona instala desde el menú de Chrome Android o escritorio y abre el acceso instalado
- **THEN** ve nombre e ícono DECILO, accede al frontend en ventana standalone y puede usar los flujos existentes según su sesión válida

#### Scenario: Safari agrega a inicio
- **WHEN** una persona sigue la ayuda en Safari/iPhone y agrega DECILO a inicio como app web
- **THEN** el acceso muestra nombre e ícono DECILO y abre la aplicación sin depender de un prompt de Chrome

#### Scenario: Navegador sin instalación disponible
- **WHEN** el navegador no ofrece instalación o la persona decide no instalar
- **THEN** la ayuda explica el uso del menú cuando esté disponible y la alternativa de continuar en navegador, sin control de instalación inoperante ni bloqueo de la aplicación

#### Scenario: Ayuda responsive por teclado
- **WHEN** se consulta la ayuda a 320, 768 o 1280 píxeles o con zoom 200%, usando teclado
- **THEN** sus controles tienen nombre accesible y foco visible, pueden operarse sin ratón y el contenido no desborda horizontalmente ni tapa los controles existentes

### Requirement: Instalación sin caché privada adicional

La funcionalidad MUST NOT registrar service workers, escribir en Cache Storage, interceptar Socket.IO/WebSocket o agregar caché de /api, JWT, notificaciones, pacientes o contenido autenticado. MUST conservar los contratos de sesión, almacenamiento demostrativo y autorización actuales sin copiar datos entre contextos instalados ni agregar soporte offline.

#### Scenario: Uso autenticado sin worker
- **WHEN** un perfil de prueba limpio carga DECILO, inicia sesión, consulta notificaciones y cierra sesión
- **THEN** no aparecen registros de service worker ni entradas Cache Storage, API y transporte continúan por red y no se agrega almacenamiento privado para instalación

#### Scenario: Apertura en otro contexto
- **WHEN** una instalación no dispone de sesión válida del navegador
- **THEN** se aplica el acceso autenticado existente sin transferir JWT ni exponer datos de otra cuenta

#### Scenario: Pérdida de conectividad
- **WHEN** el dispositivo pierde conexión
- **THEN** no se simulan respuestas privadas exitosas desde caché PWA ni se promete funcionamiento offline; se conservan los estados de error y recuperación existentes
