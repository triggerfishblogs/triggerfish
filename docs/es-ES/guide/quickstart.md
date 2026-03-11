# Inicio rapido

Esta guia le acompana en sus primeros 5 minutos con Triggerfish -- desde la
ejecucion del asistente de configuracion hasta tener un agente de IA funcional
con el que puede chatear.

## Ejecutar el asistente de configuracion

Si utilizo el instalador con un solo comando, el asistente ya se ejecuto durante
la instalacion. Para ejecutarlo de nuevo o empezar de cero:

```bash
triggerfish dive
```

El asistente le guia a traves de ocho pasos:

### Paso 1: Elija su proveedor LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Seleccione un proveedor e introduzca sus credenciales. Triggerfish soporta
multiples proveedores con failover automatico. **Triggerfish Gateway** es la
opcion mas sencilla — suscribase a un [plan Pro o Power](/es-ES/pricing), y su
agente se conecta a una infraestructura gestionada de LLM y busqueda sin claves
API que configurar.

### Paso 2: Nombre a su agente

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

Esto genera su fichero `SPINE.md` -- la base del system prompt de su agente.
Puede editarlo en cualquier momento en `~/.triggerfish/SPINE.md`.

### Paso 3: Conectar un canal

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

Elija una plataforma de mensajeria u omita este paso para empezar solo con el
CLI. Puede anadir canales mas tarde en su `triggerfish.yaml`.

### Paso 4: Plugins opcionales

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Conecte integraciones opcionales como Obsidian para tomar notas.

### Paso 5: Conectar Google Workspace (opcional)

Conecte su cuenta de Google para Gmail, Calendar, Tasks, Drive y Sheets mediante
OAuth2. Puede omitir este paso y conectar mas tarde con
`triggerfish connect google`.

### Paso 6: Conectar GitHub (opcional)

Conecte GitHub pegando un Personal Access Token. Permite al agente utilizar
herramientas para repositorios, PRs, issues y Actions. Puede omitir este paso y
conectar mas tarde con `triggerfish connect github`.

### Paso 7: Configurar la busqueda web

Elija un motor de busqueda (Brave Search o SearXNG autoalojado) para que lo
utilice su agente, o omitalo por ahora.

### Paso 8: Iniciar el daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Elija Si para que su agente se ejecute siempre que su ordenador este encendido.

## Empezar a chatear

Tras completar el asistente, puede empezar a chatear inmediatamente a traves del
CLI:

```bash
triggerfish chat
```

O, si conecto un canal de mensajeria, envie un mensaje a su agente por ahi.

### Conversacion de ejemplo

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

## Verificar la configuracion

Ejecute la comprobacion de salud para asegurarse de que todo funciona:

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

## Que hacer a continuacion

- **Personalice su agente** -- edite `~/.triggerfish/SPINE.md` para refinar la
  personalidad y capacidades de su agente. Consulte
  [SPINE y Triggers](./spine-and-triggers).
- **Anade mas canales** -- conecte Telegram, Slack, Discord o WhatsApp en su
  `triggerfish.yaml`. Consulte [Configuracion](./configuration).
- **Conecte integraciones** -- `triggerfish connect google` para Google
  Workspace, `triggerfish connect github` para GitHub. Consulte
  [Integraciones](/integrations/).
- **Configure el comportamiento proactivo** -- cree un
  `~/.triggerfish/TRIGGER.md` para indicar a su agente que debe monitorizar.
  Consulte [SPINE y Triggers](./spine-and-triggers).
- **Explore los comandos** -- conozca todos los comandos disponibles del CLI y
  del chat. Consulte [Comandos CLI](./commands).
