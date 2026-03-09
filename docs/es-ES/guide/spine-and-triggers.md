# SPINE y Triggers

Triggerfish utiliza dos ficheros markdown para definir el comportamiento de su
agente: **SPINE.md** controla quien es su agente, y **TRIGGER.md** controla lo
que su agente hace de forma proactiva. Ambos son markdown de formato libre --
los redacta en lenguaje natural.

## SPINE.md -- Identidad del agente

`SPINE.md` es la base del system prompt de su agente. Define el nombre, la
personalidad, la mision, los dominios de conocimiento y los limites del agente.
Triggerfish carga este fichero cada vez que procesa un mensaje, por lo que los
cambios surten efecto inmediatamente.

### Ubicacion del fichero

```
~/.triggerfish/SPINE.md
```

Para configuraciones multiagente, cada agente tiene su propio SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Primeros pasos

El asistente de configuracion (`triggerfish dive`) genera un SPINE.md inicial
basado en sus respuestas. Puede editarlo libremente en cualquier momento -- es
simplemente markdown.

### Escribir un SPINE.md eficaz

Un buen SPINE.md es especifico. Cuanto mas concreto sea sobre el rol de su
agente, mejor funcionara. Esta es una estructura recomendada:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### Mejores practicas

::: tip **Sea especifico sobre la personalidad.** En lugar de "se servicial",
escriba "se conciso, directo y utiliza viñetas para mayor claridad." :::

::: tip **Incluya contexto sobre el propietario.** El agente funciona mejor
cuando conoce su rol, herramientas y prioridades. :::

::: tip **Establezca limites explicitos.** Defina lo que el agente nunca debe
hacer. Esto complementa (pero no reemplaza) la aplicacion determinista del motor
de politicas. :::

::: warning Las instrucciones de SPINE.md guian el comportamiento del LLM, pero
no son controles de seguridad. Para restricciones aplicables, utilice el motor
de politicas en `triggerfish.yaml`. El motor de politicas es determinista y no
puede ser eludido -- las instrucciones de SPINE.md si pueden serlo. :::

## TRIGGER.md -- Comportamiento proactivo

`TRIGGER.md` define lo que su agente debe comprobar, monitorizar y actuar sobre
ello durante las activaciones periodicas. A diferencia de los cron jobs (que
ejecutan tareas fijas en un horario), los triggers dan al agente discrecion para
evaluar condiciones y decidir si se necesita accion.

### Ubicacion del fichero

```
~/.triggerfish/TRIGGER.md
```

Para configuraciones multiagente:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Como funcionan los triggers

1. El bucle de triggers despierta al agente en un intervalo configurado
   (establecido en `triggerfish.yaml`)
2. Triggerfish carga su TRIGGER.md y se lo presenta al agente
3. El agente evalua cada elemento y actua si es necesario
4. Todas las acciones de triggers pasan por los hooks de politica normales
5. La sesion de trigger se ejecuta con un techo de clasificacion (tambien
   configurado en YAML)
6. Se respetan las horas de descanso -- no se activan triggers durante esos
   periodos

### Configuracion de triggers en YAML

Establezca la temporalizacion y restricciones en su `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # Revisar cada 30 minutos
  classification: INTERNAL # Techo maximo de taint para sesiones de trigger
  quiet_hours: "22:00-07:00" # Sin activaciones durante estas horas
```

### Redactar TRIGGER.md

Organice sus triggers por prioridad. Sea especifico sobre que se considera
accionable y que debe hacer el agente al respecto.

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### Ejemplo: TRIGGER.md minimo

Si desea un punto de partida sencillo:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### Ejemplo: TRIGGER.md orientado a desarrollo

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### Triggers y el motor de politicas

Todas las acciones de triggers estan sujetas a la misma aplicacion de politicas
que las conversaciones interactivas:

- Cada activacion de trigger genera una sesion aislada con su propio
  seguimiento de taint
- El techo de clasificacion en su configuracion YAML limita a que datos puede
  acceder el trigger
- Se aplica la regla de no write-down -- si un trigger accede a datos
  confidenciales, no puede enviar los resultados a un canal publico
- Todas las acciones de triggers se registran en la pista de auditoria

::: info Si TRIGGER.md esta ausente, las activaciones de trigger siguen
ocurriendo en el intervalo configurado. El agente utiliza su conocimiento
general y SPINE.md para decidir que necesita atencion. Para mejores resultados,
redacte un TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspecto   | SPINE.md                               | TRIGGER.md                           |
| --------- | -------------------------------------- | ------------------------------------ |
| Proposito | Definir quien es el agente             | Definir que monitoriza el agente     |
| Cargado   | En cada mensaje                        | En cada activacion de trigger        |
| Alcance   | Todas las conversaciones               | Solo sesiones de trigger             |
| Afecta    | Personalidad, conocimiento, limites    | Comprobaciones y acciones proactivas |
| Requerido | Si (generado por el asistente dive)    | No (pero recomendado)                |

## Siguientes pasos

- Configure la temporalizacion de triggers y cron jobs en su
  [triggerfish.yaml](./configuration)
- Conozca todos los comandos CLI disponibles en la
  [referencia de Comandos](./commands)
