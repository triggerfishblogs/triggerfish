# Comandos del CLI

Triggerfish provee un CLI para administrar tu agente, daemon, canales y
sesiones. Esta página cubre cada comando disponible y acceso directo
en el chat.

## Comandos principales

### `triggerfish dive`

Ejecuta el asistente de configuración interactivo. Este es el primer comando que ejecutas después
de la instalación y se puede volver a ejecutar en cualquier momento para reconfigurar.

```bash
triggerfish dive
```

El asistente te guía por 8 pasos: proveedor de LLM, nombre y personalidad del agente, configuración
de canal, plugins opcionales, conexión a Google Workspace, conexión a GitHub, proveedor de
búsqueda e instalación del daemon. Consulta [Inicio rápido](./quickstart) para
un recorrido completo.

### `triggerfish chat`

Inicia una sesión de chat interactiva en tu terminal. Este es el comando por defecto
cuando ejecutas `triggerfish` sin argumentos.

```bash
triggerfish chat
```

La interfaz de chat incluye:

- Barra de entrada de ancho completo en la parte inferior del terminal
- Respuestas en streaming con visualización de tokens en tiempo real
- Visualización compacta de llamadas a herramientas (alternar con Ctrl+O)
- Historial de entrada (persistente entre sesiones)
- ESC para interrumpir una respuesta en curso
- Compactación de conversación para gestionar sesiones largas

### `triggerfish run`

Inicia el servidor gateway en primer plano. Útil para desarrollo y
depuración.

```bash
triggerfish run
```

El gateway gestiona conexiones WebSocket, adaptadores de canal, el motor de políticas
y el estado de sesión. En producción, usa `triggerfish start` para ejecutar como daemon
en su lugar.

### `triggerfish start`

Instala e inicia Triggerfish como daemon en segundo plano usando el gestor de servicios
de tu sistema operativo.

```bash
triggerfish start
```

| Plataforma | Gestor de servicios                |
| ---------- | ---------------------------------- |
| macOS      | launchd                            |
| Linux      | systemd                            |
| Windows    | Windows Service / Task Scheduler   |

El daemon se inicia automáticamente al iniciar sesión y mantiene tu agente ejecutándose en
segundo plano.

### `triggerfish stop`

Detiene el daemon en ejecución.

```bash
triggerfish stop
```

### `triggerfish status`

Verifica si el daemon está ejecutándose actualmente y muestra información básica de
estado.

```bash
triggerfish status
```

Ejemplo de salida:

```
Triggerfish daemon is running
  PID: 12345
  Uptime: 3d 2h 15m
  Channels: 3 active (CLI, Telegram, Slack)
  Sessions: 2 active
```

### `triggerfish logs`

Muestra la salida de logs del daemon.

```bash
# Mostrar logs recientes
triggerfish logs

# Transmitir logs en tiempo real
triggerfish logs --tail
```

### `triggerfish patrol`

Ejecuta una verificación de salud de tu instalación de Triggerfish.

```bash
triggerfish patrol
```

Ejemplo de salida:

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 3d 2h)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  3 channels active (CLI, Telegram, Slack)
  Policy engine loaded (12 rules, 3 custom)
  5 skills installed (2 bundled, 1 managed, 2 workspace)
  Secrets stored securely (macOS Keychain)
  2 cron jobs scheduled
  Webhook endpoints configured (2 active)

Overall: HEALTHY
```

Patrol verifica:

- Estado del proceso del gateway y tiempo de actividad
- Conectividad del proveedor de LLM
- Salud de los adaptadores de canal
- Carga de reglas del motor de políticas
- Skills instalados
- Almacenamiento de secrets
- Programación de tareas cron
- Configuración de endpoints de webhook
- Detección de puertos expuestos

### `triggerfish config`

Administra tu archivo de configuración. Usa rutas con puntos dentro de `triggerfish.yaml`.

```bash
# Establecer cualquier valor de configuración
triggerfish config set <clave> <valor>

# Leer cualquier valor de configuración
triggerfish config get <clave>

# Validar sintaxis y estructura de la configuración
triggerfish config validate

# Agregar un canal de forma interactiva
triggerfish config add-channel [tipo]
```

Ejemplos:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migra credenciales en texto plano de `triggerfish.yaml` al keychain del sistema operativo.

```bash
triggerfish config migrate-secrets
```

Esto escanea tu configuración en busca de API keys, tokens y contraseñas en texto plano,
los almacena en el keychain del sistema operativo y reemplaza los valores en texto plano con referencias
`secret:`. Se crea una copia de seguridad del archivo original antes de cualquier cambio.

Consulta [Gestión de secrets](/pt-BR/security/secrets) para más detalles.

### `triggerfish connect`

Conecta un servicio externo a Triggerfish.

```bash
triggerfish connect google    # Google Workspace (flujo OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- Inicia el flujo OAuth2. Solicita tu Google Cloud
OAuth Client ID y Client Secret, abre un navegador para autorización y almacena
los tokens de forma segura en el keychain del sistema operativo. Consulta
[Google Workspace](/pt-BR/integrations/google-workspace) para instrucciones completas de configuración
incluyendo cómo crear credenciales.

**GitHub** -- Te guía para crear un Personal Access Token de alcance preciso,
lo valida contra la API de GitHub y lo almacena en el keychain del sistema operativo. Consulta
[GitHub](/pt-BR/integrations/github) para más detalles.

### `triggerfish disconnect`

Elimina la autenticación de un servicio externo.

```bash
triggerfish disconnect google    # Eliminar tokens de Google
triggerfish disconnect github    # Eliminar token de GitHub
```

Elimina todos los tokens almacenados del keychain. Puedes reconectar en cualquier momento.

### `triggerfish healthcheck`

Ejecuta una verificación rápida de conectividad contra el proveedor de LLM configurado. Devuelve
éxito si el proveedor responde, o un error con detalles.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Muestra las notas de la versión actual o de una versión específica.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Busca actualizaciones disponibles e instálalas.

```bash
triggerfish update
```

### `triggerfish version`

Muestra la versión actual de Triggerfish.

```bash
triggerfish version
```

## Comandos de skills

Administra skills desde el marketplace The Reef y tu workspace local.

```bash
triggerfish skill search "calendar"     # Buscar skills en The Reef
triggerfish skill install google-cal    # Instalar un skill
triggerfish skill list                  # Listar skills instalados
triggerfish skill update --all          # Actualizar todos los skills instalados
triggerfish skill publish               # Publicar un skill en The Reef
triggerfish skill create                # Crear la estructura de un nuevo skill
```

## Comandos de sesión

Inspecciona y administra sesiones activas.

```bash
triggerfish session list                # Listar sesiones activas
triggerfish session history             # Ver transcripción de sesión
triggerfish session spawn               # Crear una sesión en segundo plano
```

## Comandos de Buoy <ComingSoon :inline="true" />

Administra conexiones de dispositivos companion. Buoy aún no está disponible.

```bash
triggerfish buoys list                  # Listar buoys conectados
triggerfish buoys pair                  # Vincular un nuevo dispositivo buoy
```

## Comandos en el chat

Estos comandos están disponibles durante una sesión de chat interactiva (vía
`triggerfish chat` o cualquier canal conectado). Son exclusivos del propietario.

| Comando                 | Descripción                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `/help`                 | Mostrar comandos disponibles en el chat                         |
| `/status`               | Mostrar estado de la sesión: modelo, conteo de tokens, costo, nivel de taint |
| `/reset`                | Reiniciar taint de sesión e historial de conversación           |
| `/compact`              | Comprimir historial de conversación usando resumen por LLM      |
| `/model <nombre>`       | Cambiar el modelo LLM para la sesión actual                     |
| `/skill install <nombre>` | Instalar un skill desde The Reef                              |
| `/cron list`            | Listar tareas cron programadas                                  |

## Atajos de teclado

Estos atajos funcionan en la interfaz de chat del CLI:

| Atajo    | Acción                                                                        |
| -------- | ----------------------------------------------------------------------------- |
| ESC      | Interrumpir la respuesta actual del LLM                                       |
| Ctrl+V   | Pegar imagen del portapapeles (ver [Imagen y visión](/pt-BR/features/image-vision)) |
| Ctrl+O   | Alternar visualización compacta/expandida de llamadas a herramientas          |
| Ctrl+C   | Salir de la sesión de chat                                                    |
| Up/Down  | Navegar historial de entrada                                                  |

::: tip La interrupción con ESC envía una señal de cancelación a través de toda la cadena -- desde
el orquestador hasta el proveedor de LLM. La respuesta se detiene limpiamente y puedes
continuar la conversación. :::

## Salida de depuración

Triggerfish incluye logging detallado de depuración para diagnosticar problemas de proveedores LLM,
análisis de llamadas a herramientas y comportamiento del bucle del agente. Actívalo configurando la
variable de entorno `TRIGGERFISH_DEBUG` en `1`.

::: tip La forma preferida de controlar la verbosidad del log es a través de
`triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose o debug
```

La variable de entorno `TRIGGERFISH_DEBUG=1` aún es compatible por
compatibilidad hacia atrás. Consulta [Logging estructurado](/pt-BR/features/logging) para todos los detalles. :::

### Modo en primer plano

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

O para una sesión de chat:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Modo daemon (systemd)

Agrega la variable de entorno a tu unidad de servicio systemd:

```bash
systemctl --user edit triggerfish.service
```

Agrega bajo `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Luego reinicia:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Visualiza la salida de depuración con:

```bash
journalctl --user -u triggerfish.service -f
```

### Qué se registra

Cuando el modo de depuración está habilitado, lo siguiente se escribe en stderr:

| Componente      | Prefijo del log | Detalles                                                                                                                       |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Orquestador     | `[orch]`        | Cada iteración: longitud del prompt del sistema, conteo de entradas del historial, roles/tamaños de mensajes, conteo de llamadas a herramientas parseadas, texto de respuesta final |
| OpenRouter      | `[openrouter]`  | Payload completo de la solicitud (modelo, conteo de mensajes, conteo de herramientas), cuerpo de respuesta sin procesar, longitud del contenido, razón de finalización, uso de tokens |
| Otros proveedores | `[provider]`  | Resúmenes de solicitud/respuesta (varía por proveedor)                                                                         |

Ejemplo de salida de depuración:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning La salida de depuración incluye payloads completos de solicitud y respuesta del LLM. No
la dejes habilitada en producción ya que puede registrar contenido sensible de la conversación en
stderr/journal. :::

## Referencia rápida

```bash
# Configuración y administración
triggerfish dive              # Asistente de configuración
triggerfish start             # Iniciar daemon
triggerfish stop              # Detener daemon
triggerfish status            # Verificar estado
triggerfish logs --tail       # Transmitir logs
triggerfish patrol            # Verificación de salud
triggerfish config set <k> <v> # Establecer valor de config
triggerfish config get <clave> # Leer valor de config
triggerfish config add-channel # Agregar un canal
triggerfish config migrate-secrets  # Migrar secrets al keychain
triggerfish update            # Buscar actualizaciones
triggerfish version           # Mostrar versión

# Uso diario
triggerfish chat              # Chat interactivo
triggerfish run               # Modo en primer plano

# Skills
triggerfish skill search      # Buscar en The Reef
triggerfish skill install     # Instalar skill
triggerfish skill list        # Listar instalados
triggerfish skill create      # Crear nuevo skill

# Sesiones
triggerfish session list      # Listar sesiones
triggerfish session history   # Ver transcripción
```
