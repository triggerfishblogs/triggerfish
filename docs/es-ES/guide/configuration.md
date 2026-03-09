# Configuracion

Triggerfish se configura a traves de un unico fichero YAML en
`~/.triggerfish/triggerfish.yaml`. El asistente de configuracion
(`triggerfish dive`) crea este fichero automaticamente, pero puede editarlo
manualmente en cualquier momento.

## Ubicacion del fichero de configuracion

```
~/.triggerfish/triggerfish.yaml
```

Puede establecer valores individuales desde la linea de comandos utilizando
rutas con puntos:

```bash
triggerfish config set <clave> <valor>
triggerfish config get <clave>
```

Los valores booleanos y enteros se convierten automaticamente. Los secretos se
enmascaran en la salida.

Valide su configuracion con:

```bash
triggerfish config validate
```

## Modelos

La seccion `models` configura sus proveedores LLM y el comportamiento de
failover.

```yaml
models:
  # Proveedor y modelo a utilizar por defecto
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Opcional: modelo de vision para descripcion automatica de imagenes cuando
  # el modelo principal carece de soporte de vision
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

Las claves API se almacenan en el llavero del sistema operativo, no en este
fichero. El asistente de configuracion (`triggerfish dive`) solicita su clave
API y la almacena de forma segura. Ollama y LM Studio son locales y no requieren
autenticacion.

## Canales

La seccion `channels` define a que plataformas de mensajeria se conecta su
agente y el nivel de clasificacion de cada una.

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

Los tokens, contrasenas y claves API de cada canal se almacenan en el llavero
del sistema operativo. Ejecute `triggerfish config add-channel <nombre>` para
introducir las credenciales de forma interactiva -- se guardan en el llavero,
nunca en este fichero.

### Claves de configuracion de canales

Configuracion no secreta en `triggerfish.yaml`:

| Canal    | Claves de configuracion                                        | Claves opcionales                                                       |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Los secretos (tokens de bot, claves API, contrasenas, secretos de firma) se
introducen durante la configuracion del canal y se almacenan en el llavero del
sistema operativo.

### Niveles de clasificacion por defecto

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

Todos los valores por defecto son configurables. Puede asignar a cualquier canal
cualquier nivel de clasificacion.

## Servidores MCP

Conecte servidores MCP externos para dar a su agente acceso a herramientas
adicionales. Consulte [MCP Gateway](/integrations/mcp-gateway) para el modelo
de seguridad completo.

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

Cada servidor debe tener un nivel de `classification` o sera rechazado
(denegacion por defecto). Utilice `command` + `args` para servidores locales
(lanzados como subprocesos) o `url` para servidores remotos (HTTP SSE). Los
valores de entorno con prefijo `keychain:` se resuelven desde el llavero del
sistema operativo.

Para ayuda en la eleccion de los niveles de clasificacion, consulte la
[Guia de clasificacion](./classification-guide).

## Clasificacion

La seccion `classification` controla como Triggerfish clasifica y protege los
datos.

```yaml
classification:
  mode: personal # "personal" o "enterprise" (proximamente)
```

**Niveles de clasificacion:**

| Nivel          | Descripcion     | Ejemplos                                                 |
| -------------- | --------------- | -------------------------------------------------------- |
| `RESTRICTED`   | Mas sensible    | Documentos de M&A, PII, cuentas bancarias, historiales medicos |
| `CONFIDENTIAL` | Sensible        | Datos CRM, finanzas, contratos, registros fiscales       |
| `INTERNAL`     | Solo interno    | Wikis internas, notas personales, contactos              |
| `PUBLIC`       | Seguro para todos | Materiales de marketing, informacion publica, contenido web general |

Para orientacion detallada sobre como elegir el nivel adecuado para sus
integraciones, canales y servidores MCP, consulte la
[Guia de clasificacion](./classification-guide).

## Politicas

La seccion `policy` configura reglas de aplicacion personalizadas mas alla de
las protecciones integradas.

```yaml
policy:
  # Accion por defecto cuando ninguna regla coincide
  default_action: ALLOW

  # Reglas personalizadas
  rules:
    # Bloquear respuestas de herramientas que contengan patrones de SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # Limitar la tasa de llamadas a API externas
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Las reglas de seguridad fundamentales -- prohibicion de write-down,
escalado de taint de sesion, registro de auditoria -- siempre se aplican y no
pueden desactivarse. Las reglas de politica personalizadas anaden controles
adicionales sobre estas protecciones fijas. :::

## Busqueda web y fetch

La seccion `web` configura la busqueda web y la obtencion de contenido,
incluidos los controles de seguridad de dominios.

```yaml
web:
  search:
    provider: brave # Backend de busqueda (brave es el actualmente soportado)
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
    allowlist: [] # Vacia = permitir todos (menos denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Configure la busqueda desde la linea de comandos:

```bash
triggerfish config set web.search.provider brave
```

La clave API de Brave se introduce durante `triggerfish dive` y se almacena en
el llavero del sistema operativo.

::: tip Obtenga una clave API de Brave Search en
[brave.com/search/api](https://brave.com/search/api/). El nivel gratuito incluye
2.000 consultas/mes. :::

## Cron Jobs

Programe tareas recurrentes para su agente:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 7 AM diariamente
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # Donde entregar los resultados
      classification: INTERNAL # Techo maximo de taint para este trabajo

    - id: pipeline-check
      schedule: "0 */4 * * *" # Cada 4 horas
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

Cada cron job se ejecuta en su propia sesion aislada con un techo de
clasificacion. Todas las acciones del cron pasan por los hooks de politica
normales.

## Temporalizacion de triggers

Configure la frecuencia con la que su agente realiza revisiones proactivas:

```yaml
trigger:
  interval: 30m # Revisar cada 30 minutos
  classification: INTERNAL # Techo maximo de taint para sesiones de trigger
  quiet_hours: "22:00-07:00" # No activar durante las horas de descanso
```

El sistema de triggers lee su fichero `~/.triggerfish/TRIGGER.md` para decidir
que comprobar en cada activacion. Consulte
[SPINE y Triggers](./spine-and-triggers) para detalles sobre como redactar su
TRIGGER.md.

## Webhooks

Acepte eventos entrantes de servicios externos:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## Ejemplo completo

A continuacion se muestra un ejemplo completo de configuracion con comentarios:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- Proveedores LLM ---
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

# --- Clasificacion ---
classification:
  mode: personal

# --- Politica ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Siguientes pasos

- Defina la identidad de su agente en [SPINE.md](./spine-and-triggers)
- Configure la monitorizacion proactiva con [TRIGGER.md](./spine-and-triggers)
- Conozca todos los comandos CLI en la [referencia de Comandos](./commands)
