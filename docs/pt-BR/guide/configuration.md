# Configuración

Triggerfish se configura a través de un único archivo YAML en
`~/.triggerfish/triggerfish.yaml`. El asistente de configuración (`triggerfish dive`) crea
este archivo por ti, pero puedes editarlo manualmente en cualquier momento.

## Ubicación del archivo de configuración

```
~/.triggerfish/triggerfish.yaml
```

Puedes establecer valores individuales desde la línea de comandos usando rutas con puntos:

```bash
triggerfish config set <clave> <valor>
triggerfish config get <clave>
```

Los valores booleanos y enteros se convierten automáticamente. Los secrets se enmascaran en la salida.

Valida tu configuración con:

```bash
triggerfish config validate
```

## Modelos

La sección `models` configura tus proveedores de LLM y el comportamiento de failover.

```yaml
models:
  # Qué proveedor y modelo usar por defecto
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Opcional: modelo de visión para descripción automática de imágenes cuando el modelo
  # primario no tiene soporte de visión
  # vision: gemini-2.0-flash

  # Respuestas en streaming (por defecto: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Puerto por defecto de Ollama

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # Puerto por defecto de LM Studio

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Cadena de failover: si el primario falla, probar estos en orden
  failover:
    - openai
    - google
```

Las API keys se almacenan en el keychain del sistema operativo, no en este archivo. El asistente de configuración
(`triggerfish dive`) te solicita tu API key y la almacena de forma segura. Ollama y
LM Studio son locales y no requieren autenticación.

## Canales

La sección `channels` define a qué plataformas de mensajería se conecta tu agente
y el nivel de clasificación para cada una.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

Los tokens, contraseñas y API keys de cada canal se almacenan en el keychain del sistema operativo.
Ejecuta `triggerfish config add-channel <nombre>` para ingresar credenciales de forma interactiva
-- se guardan en el keychain, nunca en este archivo.

### Claves de configuración de canales

Configuración no secreta en `triggerfish.yaml`:

| Canal    | Claves de config                                                | Claves opcionales                                                        |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| CLI      | `enabled`                                                       | `classification`                                                         |
| Telegram | `enabled`, `ownerId`                                            | `classification`                                                         |
| Signal   | `enabled`, `endpoint`, `account`                                | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing`  |
| Slack    | `enabled`                                                       | `classification`, `ownerId`                                              |
| Discord  | `enabled`, `ownerId`                                            | `classification`                                                         |
| WhatsApp | `enabled`, `phoneNumberId`                                      | `classification`, `ownerPhone`, `webhookPort`                            |
| WebChat  | `enabled`                                                       | `classification`, `port`, `allowedOrigins`                               |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress`  | `classification`, `ownerEmail`, `imapPort`, `pollInterval`               |

Los secrets (tokens de bot, API keys, contraseñas, signing secrets) se ingresan durante
la configuración del canal y se almacenan en el keychain del sistema operativo.

### Niveles de clasificación por defecto

| Canal    | Por defecto    |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

Todos los valores por defecto son configurables. Puedes asignar cualquier nivel de clasificación a cualquier canal.

## Servidores MCP

Conecta servidores MCP externos para dar a tu agente acceso a herramientas adicionales. Consulta
[MCP Gateway](/pt-BR/integrations/mcp-gateway) para el modelo de seguridad completo.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

Cada servidor debe tener un nivel de `classification` o será rechazado (denegación
por defecto). Usa `command` + `args` para servidores locales (ejecutados como subprocesos) o
`url` para servidores remotos (HTTP SSE). Los valores de entorno con prefijo
`keychain:` se resuelven desde el keychain del sistema operativo.

Para ayuda al elegir niveles de clasificación, consulta la
[Guía de clasificación](./classification-guide).

## Clasificación

La sección `classification` controla cómo Triggerfish clasifica y protege
los datos.

```yaml
classification:
  mode: personal # "personal" o "enterprise" (próximamente)
```

**Niveles de clasificación:**

| Nivel          | Descripción        | Ejemplos                                                |
| -------------- | ------------------ | ------------------------------------------------------- |
| `RESTRICTED`   | Más sensible       | Documentos de M&A, PII, cuentas bancarias, registros médicos |
| `CONFIDENTIAL` | Sensible           | Datos de CRM, finanzas, contratos, registros fiscales   |
| `INTERNAL`     | Solo interno       | Wikis internos, notas personales, contactos             |
| `PUBLIC`       | Seguro para todos  | Materiales de marketing, información pública, contenido web general |

Para orientación detallada sobre cómo elegir el nivel correcto para tus integraciones,
canales y servidores MCP, consulta la
[Guía de clasificación](./classification-guide).

## Políticas

La sección `policy` configura reglas de aplicación personalizadas más allá de las protecciones
incorporadas.

```yaml
policy:
  # Acción por defecto cuando ninguna regla coincide
  default_action: ALLOW

  # Reglas personalizadas
  rules:
    # Bloquear respuestas de herramientas que contengan patrones de SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTADO]"
      log_level: ALERT

    # Limitar la tasa de llamadas a APIs externas
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Las reglas de seguridad fundamentales -- no write-down, escalamiento de taint de sesión,
logging de auditoría -- siempre se aplican y no se pueden deshabilitar. Las reglas de políticas personalizadas
agregan controles adicionales sobre estas protecciones fijas. :::

## Búsqueda y obtención web

La sección `web` configura la búsqueda web y obtención de contenido, incluyendo controles
de seguridad de dominios.

```yaml
web:
  search:
    provider: brave # Backend de búsqueda (brave es el actualmente soportado)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Solicitudes por minuto
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability o raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Vacío = permitir todo (menos la denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Configura la búsqueda desde la línea de comandos:

```bash
triggerfish config set web.search.provider brave
```

La API key de Brave se ingresa durante `triggerfish dive` y se almacena en el keychain
del sistema operativo.

::: tip Obtén una API key de Brave Search en
[brave.com/search/api](https://brave.com/search/api/). El plan gratuito incluye
2,000 consultas/mes. :::

## Tareas cron

Programa tareas recurrentes para tu agente:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 7 AM diario
      task: "Preparar briefing matutino con calendario, emails no leídos y clima"
      channel: telegram # Dónde entregar resultados
      classification: INTERNAL # Techo máximo de taint para esta tarea

    - id: pipeline-check
      schedule: "0 */4 * * *" # Cada 4 horas
      task: "Verificar el pipeline de Salesforce por cambios"
      channel: slack
      classification: CONFIDENTIAL
```

Cada tarea cron se ejecuta en su propia sesión aislada con un techo de clasificación.
Todas las acciones cron pasan por los hooks de políticas normales.

## Temporización de triggers

Configura con qué frecuencia tu agente realiza verificaciones proactivas:

```yaml
trigger:
  interval: 30m # Verificar cada 30 minutos
  classification: INTERNAL # Techo máximo de taint para sesiones de trigger
  quiet_hours: "22:00-07:00" # No activar durante horas tranquilas
```

El sistema de triggers lee tu archivo `~/.triggerfish/TRIGGER.md` para decidir qué
verificar en cada activación. Consulta [SPINE y Triggers](./spine-and-triggers) para detalles
sobre cómo escribir tu TRIGGER.md.

## Webhooks

Acepta eventos entrantes de servicios externos:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Revisar PR y publicar resumen"
        - event: "issues.opened"
          task: "Clasificar nuevo issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigar error y crear PR de corrección si es posible"
```

## Ejemplo completo

Aquí hay un ejemplo de configuración completa con comentarios:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- Proveedores de LLM ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Canales ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- Clasificación ---
classification:
  mode: personal

# --- Políticas ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Preparar briefing matutino"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Próximos pasos

- Define la identidad de tu agente en [SPINE.md](./spine-and-triggers)
- Configura el monitoreo proactivo con [TRIGGER.md](./spine-and-triggers)
- Conoce todos los comandos del CLI en la [Referencia de comandos](./commands)
