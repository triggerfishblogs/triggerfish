# Inicio rápido

Esta guía te lleva a través de tus primeros 5 minutos con Triggerfish -- desde
ejecutar el asistente de configuración hasta tener un agente de IA funcional con el que puedes chatear.

## Ejecuta el asistente de configuración

Si usaste el instalador de un solo comando, el asistente ya se ejecutó durante
la instalación. Para ejecutarlo de nuevo o empezar desde cero:

```bash
triggerfish dive
```

El asistente te guía a través de ocho pasos:

### Paso 1: Elige tu proveedor de LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Selecciona un proveedor e ingresa tus credenciales. Triggerfish soporta múltiples
proveedores con failover automático. **Triggerfish Gateway** es la opción más fácil
— suscríbete a un [plan Pro o Power](/pt-BR/pricing), y tu agente se conecta a
infraestructura administrada de LLM y búsqueda sin necesidad de configurar API keys.

### Paso 2: Nombra a tu agente

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

Esto genera tu archivo `SPINE.md` -- la base del prompt del sistema de tu agente.
Puedes editarlo en cualquier momento en `~/.triggerfish/SPINE.md`.

### Paso 3: Conecta un canal

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

Elige una plataforma de mensajería o salta este paso para empezar solo con el CLI. Puedes
agregar canales después en tu `triggerfish.yaml`.

### Paso 4: Plugins opcionales

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Conecta integraciones opcionales como Obsidian para toma de notas.

### Paso 5: Conecta Google Workspace (opcional)

Conecta tu cuenta de Google para Gmail, Calendar, Tasks, Drive y Sheets vía
OAuth2. Puedes saltar esto y conectar después con `triggerfish connect google`.

### Paso 6: Conecta GitHub (opcional)

Conecta GitHub pegando un Personal Access Token. Le da al agente herramientas para
repos, PRs, issues y Actions. Puedes saltar esto y conectar después con
`triggerfish connect github`.

### Paso 7: Configura la búsqueda web

Elige un motor de búsqueda (Brave Search o SearXNG auto-hospedado) para que tu agente
lo use, o sáltalo por ahora.

### Paso 8: Inicia el daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Elige Sí para que tu agente esté ejecutándose siempre que tu máquina esté encendida.

## Empieza a chatear

Después de que el asistente termine, puedes empezar a chatear inmediatamente a través del CLI:

```bash
triggerfish chat
```

O, si conectaste un canal de mensajería, envía un mensaje a tu agente por ahí.

### Ejemplo de conversación

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## Verifica tu configuración

Ejecuta la verificación de salud para asegurarte de que todo funciona:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## Qué hacer después

- **Personaliza tu agente** -- edita `~/.triggerfish/SPINE.md` para refinar la
  personalidad y capacidades de tu agente. Consulta
  [SPINE y Triggers](./spine-and-triggers).
- **Agrega más canales** -- conecta Telegram, Slack, Discord o WhatsApp en tu
  `triggerfish.yaml`. Consulta [Configuración](./configuration).
- **Conecta integraciones** -- `triggerfish connect google` para Google Workspace,
  `triggerfish connect github` para GitHub. Consulta [Integraciones](/pt-BR/integrations/).
- **Configura comportamiento proactivo** -- crea un `~/.triggerfish/TRIGGER.md` para indicarle
  a tu agente qué monitorear. Consulta [SPINE y Triggers](./spine-and-triggers).
- **Explora los comandos** -- conoce todos los comandos disponibles del CLI y en el chat. Consulta
  [Comandos del CLI](./commands).
