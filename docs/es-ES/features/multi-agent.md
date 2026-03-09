# Enrutamiento multiagente

Triggerfish admite el enrutamiento de diferentes canales, cuentas o contactos a agentes aislados separados, cada uno con su propio workspace, sesiones, personalidad y techo de clasificación.

## ¿Por qué múltiples agentes?

Un único agente con una única personalidad no siempre es suficiente. Puede necesitar:

- Un **asistente personal** en WhatsApp que gestione calendario, recordatorios y mensajes familiares.
- Un **asistente de trabajo** en Slack que gestione tickets de Jira, PRs de GitHub y revisiones de código.
- Un **agente de soporte** en Discord que responda preguntas de la comunidad con un tono diferente y acceso limitado.

El enrutamiento multiagente le permite ejecutar todos estos simultáneamente desde una única instalación de Triggerfish.

## Cómo funciona

<img src="/diagrams/multi-agent-routing.svg" alt="Enrutamiento multiagente: canales entrantes enrutados a través del AgentRouter a workspaces de agentes aislados" style="max-width: 100%;" />

El **AgentRouter** examina cada mensaje entrante y lo mapea a un agente basándose en reglas de enrutamiento configurables. Si ninguna regla coincide, los mensajes van a un agente predeterminado.

## Reglas de enrutamiento

Los mensajes se pueden enrutar por:

| Criterio | Descripción                                   | Ejemplo                                     |
| -------- | --------------------------------------------- | ------------------------------------------- |
| Canal    | Enrutar por plataforma de mensajería          | Todos los mensajes de Slack van a "Trabajo"  |
| Cuenta   | Enrutar por cuenta específica dentro de un canal | Correo de trabajo vs correo personal       |
| Contacto | Enrutar por identidad del remitente/interlocutor | Mensajes de su jefe van a "Trabajo"        |
| Predeterminado | Respaldo cuando ninguna regla coincide   | Todo lo demás va a "Personal"               |

## Configuración

Defina agentes y enrutamiento en `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Cada agente especifica:

- **id** -- Identificador único para enrutamiento.
- **name** -- Nombre legible por humanos.
- **channels** -- Qué instancias de canal gestiona este agente.
- **tools** -- Perfil de herramientas y listas explícitas de permitir/denegar.
- **model** -- Qué modelo LLM usar (puede diferir por agente).
- **classification_ceiling** -- Nivel máximo de clasificación que puede alcanzar este agente.

## Identidad del agente

Cada agente tiene su propio `SPINE.md` que define su personalidad, misión y límites. Los archivos SPINE.md se encuentran en el directorio del workspace del agente:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personalidad del asistente personal
    work/
      SPINE.md          # Personalidad del asistente de trabajo
    support/
      SPINE.md          # Personalidad del bot de soporte
```

## Aislamiento

El enrutamiento multiagente aplica un estricto aislamiento entre agentes:

| Aspecto    | Aislamiento                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Sesiones   | Cada agente tiene un espacio de sesiones independiente. Las sesiones nunca se comparten.          |
| Taint      | El taint se rastrea por agente, no entre agentes. El taint de trabajo no afecta las sesiones personales. |
| Skills     | Las skills se cargan por workspace. Una skill de trabajo no está disponible para el agente personal. |
| Secretos   | Las credenciales están aisladas por agente. El agente de soporte no puede acceder a claves API de trabajo. |
| Workspaces | Cada agente tiene su propio workspace del sistema de archivos para ejecución de código.          |

::: warning La comunicación entre agentes es posible a través de `sessions_send` pero está controlada por la capa de políticas. Un agente no puede acceder silenciosamente a los datos o sesiones de otro agente sin reglas de política explícitas que lo permitan. :::

::: tip El enrutamiento multiagente es para separar responsabilidades entre canales y personas. Para agentes que necesitan colaborar en una tarea compartida, consulte [Equipos de agentes](/es-ES/features/agent-teams). :::

## Agente predeterminado

Cuando ninguna regla de enrutamiento coincide con un mensaje entrante, este va al agente predeterminado. Puede establecerlo en la configuración:

```yaml
agents:
  default: personal
```

Si no se configura un predeterminado, se usa el primer agente de la lista.
