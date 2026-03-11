# Esquema de Configuracion

Triggerfish se configura a traves de `triggerfish.yaml`, ubicado en
`~/.triggerfish/triggerfish.yaml` despues de ejecutar `triggerfish dive`. Esta
pagina documenta cada seccion de configuracion.

::: info Referencias de Secretos Cualquier valor de string en este archivo puede
usar el prefijo `secret:` para hacer referencia a una credencial almacenada en
el keychain del SO. Por ejemplo,
`apiKey: "secret:provider:anthropic:apiKey"` resuelve el valor desde el keychain
al iniciar. Vea
[Gestion de Secretos](/pt-BR/security/secrets#secret-references-in-configuration)
para detalles. :::

## Ejemplo Completo Anotado

```yaml
# =============================================================================
# triggerfish.yaml -- Referencia completa de configuracion
# =============================================================================

# ---------------------------------------------------------------------------
# Models: Configuracion de proveedores LLM y failover
# ---------------------------------------------------------------------------
models:
  # El modelo principal usado para completaciones del agente
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Opcional: modelo de vision separado para descripcion de imagenes
  # Cuando el modelo principal no soporta vision, las imagenes se describen
  # automaticamente por este modelo antes de llegar al principal.
  # vision: glm-4.5v

  # Respuestas en streaming (predeterminado: true)
  # streaming: true

  # Configuracion especifica por proveedor
  # Las API keys se referencian via sintaxis secret: y se resuelven desde el keychain del SO.
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

  # Cadena de failover ordenada -- se prueban en secuencia cuando el principal falla
  failover:
    - claude-haiku-4-5 # Primer respaldo
    - gpt-4o # Segundo respaldo
    - ollama/llama3 # Respaldo local (no requiere internet)

  # Comportamiento de failover
  failover_config:
    max_retries: 3 # Reintentos por proveedor antes de pasar al siguiente
    retry_delay_ms: 1000 # Retraso entre reintentos
    conditions: # Que dispara el failover
      - rate_limited # El proveedor retorno 429
      - server_error # El proveedor retorno 5xx
      - timeout # La solicitud excedio el timeout

# ---------------------------------------------------------------------------
# Logging: Salida de log estructurado
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Conexiones de plataformas de mensajeria
# ---------------------------------------------------------------------------
# Los secretos (tokens de bot, API keys, contrasenas) se almacenan en el keychain del SO.
# Ejecute `triggerfish config add-channel <nombre>` para ingresarlos de forma segura.
# Solo la configuracion no secreta aparece aqui.
channels:
  telegram:
    ownerId: 123456789 # Su ID numerico de usuario de Telegram
    classification: INTERNAL # Predeterminado: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # Endpoint del daemon signal-cli
    account: "+14155552671" # Su numero de telefono Signal (E.164)
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
    phoneNumberId: "your-phone-number-id" # Desde el Meta Business Dashboard
    classification: PUBLIC # Predeterminado: PUBLIC

  webchat:
    port: 8765 # Puerto WebSocket para cliente web
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
  mode: personal # "personal" o "enterprise" (proximamente)
# Niveles: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: Reglas de cumplimiento personalizadas (escape hatch enterprise)
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
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # Patron SSN
      action: REDACT
      message: "PII redacted for external recipient"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Browser tool rate limit exceeded"

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
# Scheduler: Cron jobs y triggers
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
    interval: 30m # Verificar cada 30 minutos
    classification: INTERNAL # Techo maximo de taint para triggers
    quiet_hours: "22:00-07:00" # Suprimir durante estas horas

# ---------------------------------------------------------------------------
# Notifications: Preferencias de entrega
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Canal de entrega predeterminado
  quiet_hours: "22:00-07:00" # Suprimir prioridad normal/low
  batch_interval: 15m # Agrupar notificaciones de baja prioridad

# ---------------------------------------------------------------------------
# Agents: Enrutamiento multi-agente (opcional)
# ---------------------------------------------------------------------------
agents:
  default: personal # Agente de respaldo
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
# Voice: Configuracion de voz (opcional)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Tamano del modelo Whisper
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
      # El secreto del webhook se almacena en el keychain del SO
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
# GitHub: Configuracion de integracion GitHub (opcional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Predeterminado: false. Establecer true para auto-merge de PRs aprobados.

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
# Web: Configuracion de busqueda y fetch
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Backend de busqueda (brave es el predeterminado)
# La API key se almacena en el keychain del SO

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
# El token de autenticacion se almacena en el keychain del SO
```

## Referencia de Secciones

### `models`

| Clave                            | Tipo     | Descripcion                                                                                            |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | Referencia de modelo principal con campos `provider` y `model`                                         |
| `primary.provider`               | string   | Nombre del proveedor (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`) |
| `primary.model`                  | string   | Identificador del modelo usado para completaciones del agente                                          |
| `vision`                         | string   | Modelo de vision opcional para descripcion automatica de imagenes (vea [Imagen y Vision](/pt-BR/features/image-vision)) |
| `streaming`                      | boolean  | Habilitar respuestas en streaming (predeterminado: `true`)                                             |
| `providers`                      | object   | Configuracion especifica por proveedor (ver abajo)                                                     |
| `failover`                       | string[] | Lista ordenada de modelos de respaldo                                                                  |
| `failover_config.max_retries`    | number   | Reintentos por proveedor antes del failover                                                            |
| `failover_config.retry_delay_ms` | number   | Retraso entre reintentos en milisegundos                                                               |
| `failover_config.conditions`     | string[] | Condiciones que disparan el failover                                                                   |

### `channels`

Cada clave de canal es el tipo de canal. Todos los tipos de canal soportan un
campo `classification` para anular el nivel de clasificacion predeterminado.

::: info Todos los secretos (tokens, API keys, contrasenas) se almacenan en el
keychain del SO, no en este archivo. Ejecute
`triggerfish config add-channel <nombre>` para ingresar credenciales de forma
segura. :::

### `classification`

| Clave  | Tipo                           | Descripcion                                                                              |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------- |
| `mode` | `"personal"` o `"enterprise"` | Modo de despliegue (proximamente -- actualmente ambos usan los mismos niveles de clasificacion) |

### `policy`

Reglas personalizadas evaluadas durante la ejecucion de hooks. Cada regla
especifica un tipo de hook, prioridad, condiciones y accion. Los numeros de
prioridad mas altos se evaluan primero.

### `mcp_servers`

Servidores de herramientas MCP externos. Cada servidor especifica un comando
para ejecutarlo, variables de entorno opcionales, un nivel de clasificacion y
permisos por herramienta.

### `scheduler`

Definiciones de cron jobs y temporizacion de triggers. Vea
[Cron y Triggers](/pt-BR/features/cron-and-triggers) para detalles.

### `notifications`

Preferencias de entrega de notificaciones. Vea
[Notificaciones](/pt-BR/features/notifications) para detalles.

### `web`

| Clave                 | Tipo   | Descripcion                                                      |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `web.search.provider` | string | Backend de busqueda para la herramienta `web_search` (actualmente: `brave`) |

Vea [Busqueda Web y Fetch](/pt-BR/features/web-search) para detalles.

### `logging`

| Clave   | Tipo   | Predeterminado | Descripcion                                                                                      |
| ------- | ------ | -------------- | ------------------------------------------------------------------------------------------------ |
| `level` | string | `"normal"`     | Verbosidad del log: `quiet` (solo errores), `normal` (info), `verbose` (debug), `debug` (trace) |

Vea [Logging Estructurado](/pt-BR/features/logging) para detalles sobre salida
de log y rotacion de archivos.

### `github`

| Clave        | Tipo    | Predeterminado | Descripcion                                                                                                                                                                              |
| ------------ | ------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`        | Cuando es `true`, el agente auto-merge PRs despues de recibir una revision aprobatoria. Cuando es `false` (predeterminado), el agente notifica al propietario y espera una instruccion de merge explicita. |

Vea la guia de [Integracion GitHub](/pt-BR/integrations/github) para
instrucciones completas de configuracion.
