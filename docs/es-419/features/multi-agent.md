# Enrutamiento Multi-Agente

Triggerfish soporta enrutar diferentes canales, cuentas o contactos a agentes
aislados separados, cada uno con su propio workspace, sesiones, personalidad y
techo de clasificacion.

## Por que Multiples Agentes?

Un solo agente con una sola personalidad no siempre es suficiente. Puede
necesitar:

- Un **asistente personal** en WhatsApp que maneje calendario, recordatorios y
  mensajes familiares.
- Un **asistente de trabajo** en Slack que administre tickets de Jira, PRs de
  GitHub y revisiones de codigo.
- Un **agente de soporte** en Discord que responda preguntas de la comunidad con
  un tono diferente y acceso limitado.

El enrutamiento multi-agente le permite ejecutar todos estos simultaneamente
desde una sola instalacion de Triggerfish.

## Como Funciona

<img src="/diagrams/multi-agent-routing.svg" alt="Enrutamiento multi-agente: canales entrantes enrutados a traves de AgentRouter a workspaces de agentes aislados" style="max-width: 100%;" />

El **AgentRouter** examina cada mensaje entrante y lo mapea a un agente basado
en reglas de enrutamiento configurables. Si ninguna regla coincide, los mensajes
van a un agente predeterminado.

## Reglas de Enrutamiento

Los mensajes pueden enrutarse por:

| Criterio | Descripcion                                   | Ejemplo                                          |
| -------- | --------------------------------------------- | ------------------------------------------------ |
| Canal    | Enrutar por plataforma de mensajeria          | Todos los mensajes de Slack van a "Trabajo"      |
| Cuenta   | Enrutar por cuenta especifica dentro de un canal | Email de trabajo vs email personal            |
| Contacto | Enrutar por identidad del remitente/par       | Mensajes de su jefe van a "Trabajo"              |
| Default  | Fallback cuando ninguna regla coincide        | Todo lo demas va a "Personal"                    |

## Configuracion

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

- **id** -- Identificador unico para enrutamiento.
- **name** -- Nombre legible para humanos.
- **channels** -- Que instancias de canal maneja este agente.
- **tools** -- Perfil de herramientas y listas explicitas de permitir/denegar.
- **model** -- Que modelo LLM usar (puede diferir por agente).
- **classification_ceiling** -- Nivel maximo de clasificacion que este agente
  puede alcanzar.

## Identidad del Agente

Cada agente tiene su propio `SPINE.md` definiendo su personalidad, mision y
limites. Los archivos SPINE.md viven en el directorio de workspace del agente:

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

El enrutamiento multi-agente aplica aislamiento estricto entre agentes:

| Aspecto    | Aislamiento                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Sesiones   | Cada agente tiene espacio de sesiones independiente. Las sesiones nunca se comparten.                 |
| Taint      | El taint se rastrea por agente, no entre agentes. El taint de trabajo no afecta sesiones personales. |
| Skills     | Los skills se cargan por workspace. Un skill de trabajo no esta disponible para el agente personal.   |
| Secretos   | Las credenciales estan aisladas por agente. El agente de soporte no puede acceder a API keys de trabajo. |
| Workspaces | Cada agente tiene su propio workspace de sistema de archivos para ejecucion de codigo.               |

::: warning La comunicacion entre agentes es posible a traves de `sessions_send`
pero esta controlada por la capa de politicas. Un agente no puede acceder
silenciosamente a los datos o sesiones de otro agente sin reglas de politica
explicitas que lo permitan. :::

::: tip El enrutamiento multi-agente es para separar responsabilidades entre
canales y personas. Para agentes que necesitan colaborar en una tarea compartida,
vea [Equipos de Agentes](/es-419/features/agent-teams). :::

## Agente Predeterminado

Cuando ninguna regla de enrutamiento coincide con un mensaje entrante, este va
al agente predeterminado. Puede configurar esto:

```yaml
agents:
  default: personal
```

Si no se configura un predeterminado, se usa el primer agente de la lista como
predeterminado.
