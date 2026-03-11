# Comandos CLI

Triggerfish proporciona un CLI para gestionar su agente, daemon, canales y
sesiones. Esta pagina cubre todos los comandos disponibles y atajos dentro del
chat.

## Comandos principales

### `triggerfish dive`

Ejecute el asistente de configuracion interactivo. Es el primer comando que
ejecuta tras la instalacion y puede volver a ejecutarse en cualquier momento
para reconfigurar.

```bash
triggerfish dive
```

El asistente recorre 8 pasos: proveedor LLM, nombre/personalidad del agente,
configuracion de canales, plugins opcionales, conexion de Google Workspace,
conexion de GitHub, proveedor de busqueda e instalacion del daemon. Consulte
[Inicio rapido](./quickstart) para un recorrido completo.

### `triggerfish chat`

Inicie una sesion de chat interactiva en su terminal. Es el comando por defecto
cuando ejecuta `triggerfish` sin argumentos.

```bash
triggerfish chat
```

La interfaz de chat incluye:

- Barra de entrada a ancho completo en la parte inferior del terminal
- Respuestas en streaming con visualizacion de tokens en tiempo real
- Visualizacion compacta de llamadas a herramientas (alternar con Ctrl+O)
- Historial de entrada (persistido entre sesiones)
- ESC para interrumpir una respuesta en curso
- Compactacion de conversacion para gestionar sesiones largas

### `triggerfish run`

Inicie el servidor Gateway en primer plano. Util para desarrollo y depuracion.

```bash
triggerfish run
```

El Gateway gestiona las conexiones WebSocket, los adaptadores de canal, el motor
de politicas y el estado de sesion. En produccion, utilice `triggerfish start`
para ejecutarlo como daemon.

### `triggerfish start`

Instale e inicie Triggerfish como daemon en segundo plano utilizando el gestor
de servicios de su sistema operativo.

```bash
triggerfish start
```

| Plataforma | Gestor de servicios                     |
| ---------- | --------------------------------------- |
| macOS      | launchd                                 |
| Linux      | systemd                                 |
| Windows    | Windows Service / Programador de tareas |

El daemon se inicia automaticamente al iniciar sesion y mantiene su agente
ejecutandose en segundo plano.

### `triggerfish stop`

Detenga el daemon en ejecucion.

```bash
triggerfish stop
```

### `triggerfish status`

Compruebe si el daemon esta ejecutandose actualmente y muestre informacion
basica de estado.

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

Vea la salida de registros del daemon.

```bash
# Mostrar registros recientes
triggerfish logs

# Transmitir registros en tiempo real
triggerfish logs --tail
```

### `triggerfish patrol`

Ejecute una comprobacion de salud de su instalacion de Triggerfish.

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

Patrol comprueba:

- Estado y tiempo de actividad del proceso Gateway
- Conectividad del proveedor LLM
- Salud de los adaptadores de canal
- Carga de reglas del motor de politicas
- Skills instalados
- Almacenamiento de secretos
- Programacion de cron jobs
- Configuracion de endpoints de webhook
- Deteccion de puertos expuestos

### `triggerfish config`

Gestione su fichero de configuracion. Utiliza rutas con puntos en
`triggerfish.yaml`.

```bash
# Establecer cualquier valor de configuracion
triggerfish config set <clave> <valor>

# Leer cualquier valor de configuracion
triggerfish config get <clave>

# Validar la sintaxis y estructura de la configuracion
triggerfish config validate

# Anadir un canal de forma interactiva
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

Migre las credenciales en texto plano de `triggerfish.yaml` al llavero del
sistema operativo.

```bash
triggerfish config migrate-secrets
```

Este comando escanea su configuracion en busca de claves API, tokens y
contrasenas en texto plano, las almacena en el llavero del sistema operativo y
reemplaza los valores en texto plano con referencias `secret:`. Se crea una
copia de seguridad del fichero original antes de cualquier cambio.

Consulte [Gestion de secretos](/es-ES/security/secrets) para mas detalles.

### `triggerfish connect`

Conecte un servicio externo a Triggerfish.

```bash
triggerfish connect google    # Google Workspace (flujo OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

**Google Workspace** -- Inicia el flujo OAuth2. Solicita su Client ID y Client
Secret de Google Cloud OAuth, abre un navegador para la autorizacion y almacena
los tokens de forma segura en el llavero del sistema operativo. Consulte
[Google Workspace](/integrations/google-workspace) para instrucciones completas
de configuracion, incluyendo como crear las credenciales.

**GitHub** -- Le guia a traves de la creacion de un Personal Access Token de
permisos detallados, lo valida contra la API de GitHub y lo almacena en el
llavero del sistema operativo. Consulte [GitHub](/integrations/github) para mas
detalles.

### `triggerfish disconnect`

Elimine la autenticacion de un servicio externo.

```bash
triggerfish disconnect google    # Eliminar tokens de Google
triggerfish disconnect github    # Eliminar token de GitHub
```

Elimina todos los tokens almacenados del llavero. Puede reconectarse en
cualquier momento.

### `triggerfish healthcheck`

Ejecute una comprobacion rapida de conectividad contra el proveedor LLM
configurado. Devuelve exito si el proveedor responde, o un error con detalles.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Muestre las notas de lanzamiento para la version actual o una version
especificada.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Compruebe si hay actualizaciones disponibles e instalelas.

```bash
triggerfish update
```

### `triggerfish version`

Muestre la version actual de Triggerfish.

```bash
triggerfish version
```

## Comandos de skills

Gestione skills del mercado The Reef y su espacio de trabajo local.

```bash
triggerfish skill search "calendar"     # Buscar skills en The Reef
triggerfish skill install google-cal    # Instalar un skill
triggerfish skill list                  # Listar skills instalados
triggerfish skill update --all          # Actualizar todos los skills instalados
triggerfish skill publish               # Publicar un skill en The Reef
triggerfish skill create                # Crear la estructura de un nuevo skill
```

## Comandos de sesion

Inspeccione y gestione las sesiones activas.

```bash
triggerfish session list                # Listar sesiones activas
triggerfish session history             # Ver transcripcion de sesion
triggerfish session spawn               # Crear una sesion en segundo plano
```

## Comandos de Buoy <ComingSoon :inline="true" />

Gestione las conexiones de dispositivos complementarios. Buoy aun no esta
disponible.

```bash
triggerfish buoys list                  # Listar buoys conectados
triggerfish buoys pair                  # Vincular un nuevo dispositivo buoy
```

## Comandos dentro del chat

Estos comandos estan disponibles durante una sesion de chat interactiva (via
`triggerfish chat` o cualquier canal conectado). Son exclusivos del propietario.

| Comando                 | Descripcion                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `/help`                 | Mostrar los comandos disponibles dentro del chat                         |
| `/status`               | Mostrar estado de sesion: modelo, recuento de tokens, coste, nivel de taint |
| `/reset`                | Reiniciar el taint de sesion y el historial de conversacion              |
| `/compact`              | Comprimir el historial de conversacion mediante resumen con LLM          |
| `/model <nombre>`       | Cambiar el modelo LLM para la sesion actual                              |
| `/skill install <nombre>` | Instalar un skill desde The Reef                                       |
| `/cron list`            | Listar cron jobs programados                                             |

## Atajos de teclado

Estos atajos funcionan en la interfaz de chat del CLI:

| Atajo    | Accion                                                                         |
| -------- | ------------------------------------------------------------------------------ |
| ESC      | Interrumpir la respuesta actual del LLM                                        |
| Ctrl+V   | Pegar imagen desde el portapapeles (vease [Imagen y vision](/features/image-vision)) |
| Ctrl+O   | Alternar visualizacion compacta/expandida de llamadas a herramientas           |
| Ctrl+C   | Salir de la sesion de chat                                                     |
| Arriba/Abajo | Navegar por el historial de entrada                                        |

::: tip La interrupcion con ESC envia una senal de cancelacion a traves de toda
la cadena -- desde el orquestador hasta el proveedor LLM. La respuesta se
detiene limpiamente y puede continuar la conversacion. :::

## Salida de depuracion

Triggerfish incluye un registro de depuracion detallado para diagnosticar
problemas del proveedor LLM, analisis de llamadas a herramientas y
comportamiento del bucle del agente. Activelo estableciendo la variable de
entorno `TRIGGERFISH_DEBUG` a `1`.

::: tip La forma preferida de controlar la verbosidad de los registros es a
traves de `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose o debug
```

La variable de entorno `TRIGGERFISH_DEBUG=1` sigue siendo compatible por
retrocompatibilidad. Consulte [Registro estructurado](/features/logging) para
mas detalles. :::

### Modo en primer plano

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

O para una sesion de chat:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Modo daemon (systemd)

Anade la variable de entorno a su unidad de servicio systemd:

```bash
systemctl --user edit triggerfish.service
```

Anade bajo `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Luego reinicie:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Vea la salida de depuracion con:

```bash
journalctl --user -u triggerfish.service -f
```

### Que se registra

Cuando el modo de depuracion esta activado, lo siguiente se escribe en stderr:

| Componente      | Prefijo de registro | Detalles                                                                                                                    |
| --------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Orquestador     | `[orch]`            | Cada iteracion: longitud del system prompt, recuento de entradas del historial, roles/tamanos de mensajes, llamadas a herramientas analizadas, texto de respuesta final |
| OpenRouter      | `[openrouter]`      | Payload completo de solicitud (modelo, recuento de mensajes, recuento de herramientas), cuerpo de respuesta crudo, longitud de contenido, razon de finalizacion, uso de tokens |
| Otros proveedores | `[provider]`      | Resumenes de solicitud/respuesta (varia segun proveedor)                                                                    |

Ejemplo de salida de depuracion:

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

::: warning La salida de depuracion incluye los payloads completos de solicitud
y respuesta del LLM. No la deje activada en produccion ya que puede registrar
contenido sensible de conversaciones en stderr/journal. :::

## Referencia rapida

```bash
# Configuracion y gestion
triggerfish dive              # Asistente de configuracion
triggerfish start             # Iniciar daemon
triggerfish stop              # Detener daemon
triggerfish status            # Comprobar estado
triggerfish logs --tail       # Transmitir registros
triggerfish patrol            # Comprobacion de salud
triggerfish config set <k> <v> # Establecer valor de configuracion
triggerfish config get <key>  # Leer valor de configuracion
triggerfish config add-channel # Anadir un canal
triggerfish config migrate-secrets  # Migrar secretos al llavero
triggerfish update            # Comprobar actualizaciones
triggerfish version           # Mostrar version

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
triggerfish session history   # Ver transcripcion
```
