# Esquema de configuración

Triggerfish se configura a través de `triggerfish.yaml`, ubicado en `~/.triggerfish/triggerfish.yaml` tras ejecutar `triggerfish dive`. Esta página documenta cada sección de configuración.

::: info Referencias a secretos Cualquier valor de cadena en este archivo puede usar el prefijo `secret:` para referenciar una credencial almacenada en el llavero del SO. Por ejemplo, `apiKey: "secret:provider:anthropic:apiKey"` resuelve el valor desde el llavero al inicio. Consulte [Gestión de secretos](/es-ES/security/secrets#referencias-a-secretos-en-la-configuración) para más detalles. :::

## Ejemplo completo anotado

```yaml
# =============================================================================
# triggerfish.yaml -- Referencia completa de configuración
# =============================================================================

# ---------------------------------------------------------------------------
# Models: Configuración de proveedores LLM y failover
# ---------------------------------------------------------------------------
models:
  # El modelo primario usado para las completaciones del agente
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Opcional: modelo de visión separado para descripción de imágenes
  # Cuando el modelo primario no soporta visión, las imágenes se describen
  # automáticamente por este modelo antes de llegar al primario.
  # vision: glm-4.5v

  # Respuestas en streaming (predeterminado: true)
  # streaming: true

  # Configuración específica de proveedor
  # Las claves API se referencian vía sintaxis secret: y se resuelven desde el llavero del SO.
  # Ejecute `triggerfish dive` o `triggerfish config migrate-secrets` para configurar.
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Cadena de failover ordenada -- se prueban en secuencia cuando el primario falla
  failover:
    - claude-haiku-4-5 # Primer respaldo
    - gpt-4o # Segundo respaldo
    - ollama/llama3 # Respaldo local (no requiere internet)

  # Comportamiento de failover
  failover_config:
    max_retries: 3 # Reintentos por proveedor antes de pasar al siguiente
    retry_delay_ms: 1000 # Retardo entre reintentos
    conditions: # Qué activa el failover
      - rate_limited # El proveedor devolvió 429
      - server_error # El proveedor devolvió 5xx
      - timeout # La solicitud excedió el timeout

# ---------------------------------------------------------------------------
# Logging: Salida de registros estructurados
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Conexiones a plataformas de mensajería
# ---------------------------------------------------------------------------
# Los secretos (tokens de bot, claves API, contraseñas) se almacenan en el llavero del SO.
# Ejecute `triggerfish config add-channel <nombre>` para introducirlos de forma segura.
# Solo la configuración no secreta aparece aquí.
channels:
  telegram:
    ownerId: 123456789 # Su ID numérico de usuario de Telegram
    classification: INTERNAL # Predeterminado: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # Endpoint del daemon signal-cli
    account: "+14155552671" # Su número de teléfono Signal (E.164)
    classification: PUBLIC # Predeterminado: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Predeterminado: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Su ID de usuario de Discord
    classification: PUBLIC # Predeterminado: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Desde el panel de Meta Business
    classification: PUBLIC # Predeterminado: PUBLIC

  webchat:
    port: 8765 # Puerto WebSocket para el cliente web
    classification: PUBLIC # Predeterminado: PUBLIC (visitantes)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Predeterminado: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Modelo de sensibilidad de datos
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" o "enterprise" (próximamente)
# Niveles: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: Reglas de aplicación personalizadas (válvula de escape empresarial)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # Patrón de SSN
      action: REDACT
      message: "PII redactada para destinatario externo"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Límite de tasa de herramienta browser excedido"

# ---------------------------------------------------------------------------
# MCP Servers: Servidores de herramientas externos
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Scheduler: Trabajos cron y triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM diariamente
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Cada 4 horas
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Cada 15 minutos
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # Comprobar cada 30 minutos
    classification: INTERNAL # Techo máximo de taint para triggers
    quiet_hours: "22:00-07:00" # Suprimir durante estas horas

# ---------------------------------------------------------------------------
# Notifications: Preferencias de entrega
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Canal de entrega predeterminado
  quiet_hours: "22:00-07:00" # Suprimir prioridad normal/baja
  batch_interval: 15m # Agrupar notificaciones de baja prioridad

# ---------------------------------------------------------------------------
# Agents: Enrutamiento multiagente (opcional)
# ---------------------------------------------------------------------------
agents:
  default: personal # Agente por defecto
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: Configuración de voz (opcional)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Tamaño del modelo Whisper
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: Endpoints de eventos entrantes (opcional)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # El secreto del webhook se almacena en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "pull_request_review"
          task: "A PR review was submitted. Read tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read tracking file, address comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address feedback."
        - event: "pull_request.closed"
          task: "PR closed or merged. Clean up branches and archive tracking file."
        - event: "issues.opened"
          task: "Triage new issue"

# ---------------------------------------------------------------------------
# GitHub: Ajustes de integración de GitHub (opcional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Predeterminado: false. Establezca true para auto-merge de PRs aprobados.

# ---------------------------------------------------------------------------
# Groups: Comportamiento de chats grupales (opcional)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Remote: Acceso remoto (opcional)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web: Configuración de búsqueda y obtención
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Backend de búsqueda (brave es el predeterminado)
# La clave API se almacena en el llavero del SO

# ---------------------------------------------------------------------------
# Remote: Acceso remoto (opcional)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# El token de autenticación se almacena en el llavero del SO
```

## Referencia por sección

### `models`

| Clave                              | Tipo     | Descripción                                                                                              |
| ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `primary`                          | object   | Referencia del modelo primario con campos `provider` y `model`                                           |
| `primary.provider`                 | string   | Nombre del proveedor (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`) |
| `primary.model`                    | string   | Identificador del modelo usado para completaciones del agente                                            |
| `vision`                           | string   | Modelo de visión opcional para descripción automática de imágenes (ver [Imagen y visión](/es-ES/features/image-vision)) |
| `streaming`                        | boolean  | Habilitar respuestas en streaming (predeterminado: `true`)                                               |
| `providers`                        | object   | Configuración específica de proveedor (ver abajo)                                                        |
| `failover`                         | string[] | Lista ordenada de modelos de respaldo                                                                    |
| `failover_config.max_retries`      | number   | Reintentos por proveedor antes del failover                                                              |
| `failover_config.retry_delay_ms`   | number   | Retardo entre reintentos en milisegundos                                                                 |
| `failover_config.conditions`       | string[] | Condiciones que activan el failover                                                                      |

### `channels`

Cada clave de canal es el tipo de canal. Todos los tipos de canal admiten un campo `classification` para anular el nivel de clasificación predeterminado.

::: info Todos los secretos (tokens, claves API, contraseñas) se almacenan en el llavero del SO, no en este archivo. Ejecute `triggerfish config add-channel <nombre>` para introducir credenciales de forma segura. :::

### `classification`

| Clave  | Tipo                             | Descripción                                                                         |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------- |
| `mode` | `"personal"` o `"enterprise"`   | Modo de despliegue (próximamente -- actualmente ambos usan los mismos niveles de clasificación) |

### `policy`

Reglas personalizadas evaluadas durante la ejecución de hooks. Cada regla especifica un tipo de hook, prioridad, condiciones y acción. Los números de prioridad más altos se evalúan primero.

### `mcp_servers`

Servidores de herramientas MCP externos. Cada servidor especifica un comando para lanzarlo, variables de entorno opcionales, un nivel de clasificación y permisos por herramienta.

### `scheduler`

Definiciones de trabajos cron y temporización de triggers. Consulte [Cron y triggers](/es-ES/features/cron-and-triggers) para más detalles.

### `notifications`

Preferencias de entrega de notificaciones. Consulte [Notificaciones](/es-ES/features/notifications) para más detalles.

### `web`

| Clave                 | Tipo   | Descripción                                                     |
| --------------------- | ------ | --------------------------------------------------------------- |
| `web.search.provider` | string | Backend de búsqueda para la herramienta `web_search` (actualmente: `brave`) |

Consulte [Búsqueda y obtención web](/es-ES/features/web-search) para más detalles.

### `logging`

| Clave   | Tipo   | Predeterminado | Descripción                                                                                             |
| ------- | ------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"`     | Verbosidad del registro: `quiet` (solo errores), `normal` (info), `verbose` (debug), `debug` (trace)   |

Consulte [Registro estructurado](/es-ES/features/logging) para detalles sobre la salida de registros y la rotación de archivos.

### `github`

| Clave        | Tipo    | Predeterminado | Descripción                                                                                                                                                                        |
| ------------ | ------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`        | Cuando es `true`, el agente auto-fusiona PRs tras recibir una aprobación. Cuando es `false` (predeterminado), el agente notifica al propietario y espera una instrucción explícita de merge. |

Consulte la guía de [Integración de GitHub](/es-ES/integrations/github) para instrucciones completas de configuración.
