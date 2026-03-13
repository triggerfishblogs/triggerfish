# ಮಲ್ಟಿ-Agent Routing

Triggerfish ಭಿನ್ನ channels, accounts, ಅಥವಾ contacts ಅನ್ನು ಪ್ರತ್ಯೇಕ ಪ್ರತ್ಯೇಕ
agents ಗೆ route ಮಾಡಲು ಬೆಂಬಲಿಸುತ್ತದೆ, ಪ್ರತಿಯೊಂದಕ್ಕೂ ತನ್ನದೇ workspace, sessions,
personality, ಮತ್ತು classification ceiling.

## ಬಹು Agents ಏಕೆ?

ಒಂದೇ personality ಇರುವ ಒಂದೇ agent ಯಾವಾಗಲೂ ಸಾಕಾಗುವುದಿಲ್ಲ. ನಿಮಗೆ ಬೇಕಾಗಬಹುದು:

- Calendar, reminders, ಮತ್ತು family messages ನಿರ್ವಹಿಸುವ WhatsApp ನಲ್ಲಿ
  **personal assistant**.
- Jira tickets, GitHub PRs, ಮತ್ತು code reviews ನಿರ್ವಹಿಸುವ Slack ನಲ್ಲಿ
  **work assistant**.
- ಭಿನ್ನ tone ಮತ್ತು ಸೀಮಿತ ಪ್ರವೇಶ ಜೊತೆ community ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುವ Discord
  ನಲ್ಲಿ **support agent**.

ಮಲ್ಟಿ-agent routing ಒಂದೇ Triggerfish installation ನಿಂದ ಇವೆಲ್ಲವನ್ನೂ ಏಕಕಾಲದಲ್ಲಿ
ಚಲಾಯಿಸಲು ಅನುಮತಿಸುತ್ತದೆ.

## ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent routing: inbound channels routed through AgentRouter to isolated agent workspaces" style="max-width: 100%;" />

**AgentRouter** ಪ್ರತಿ inbound message ಪರಿಶೀಲಿಸಿ configure ಮಾಡಬಹುದಾದ routing rules
ಆಧಾರದ ಮೇಲೆ agent ಗೆ map ಮಾಡುತ್ತದೆ. ಯಾವ rule ಹೊಂದಾಣಿಕೆಯಾಗದಿದ್ದರೆ, messages
default agent ಗೆ ಹೋಗುತ್ತವೆ.

## Routing Rules

Messages ಇವರಿಂದ route ಮಾಡಬಹುದು:

| Criteria | Description                                | Example                                 |
| -------- | ------------------------------------------ | --------------------------------------- |
| Channel  | Messaging platform ಮೂಲಕ route ಮಾಡಿ       | ಎಲ್ಲ Slack messages "Work" ಗೆ ಹೋಗುತ್ತವೆ |
| Account  | Channel ಒಳಗಿನ ನಿರ್ದಿಷ್ಟ account ಮೂಲಕ   | Work email vs personal email             |
| Contact  | Sender/peer identity ಮೂಲಕ                | ನಿಮ್ಮ manager ನ messages "Work" ಗೆ ಹೋಗುತ್ತವೆ |
| Default  | ಯಾವ rule ಹೊಂದಾಣಿಕೆಯಾಗದಿದ್ದರೆ fallback   | ಉಳಿದ ಎಲ್ಲ "Personal" ಗೆ ಹೋಗುತ್ತವೆ       |

## ಸಂರಚನೆ

`triggerfish.yaml` ನಲ್ಲಿ agents ಮತ್ತು routing ನಿರ್ಧರಿಸಿ:

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

ಪ್ರತಿ agent ನಿರ್ಧರಿಸುತ್ತದೆ:

- **id** -- Routing ಗಾಗಿ ಅನನ್ಯ identifier.
- **name** -- Human-readable ಹೆಸರು.
- **channels** -- ಯಾವ channel instances ಈ agent ನಿರ್ವಹಿಸುತ್ತದೆ.
- **tools** -- Tool profile ಮತ್ತು ಸ್ಪಷ್ಟ allow/deny ಪಟ್ಟಿಗಳು.
- **model** -- ಯಾವ LLM model ಬಳಸಬೇಕು (agent ಪ್ರತಿ ಭಿನ್ನವಾಗಿರಬಹುದು).
- **classification_ceiling** -- ಈ agent ತಲುಪಬಹುದಾದ ಗರಿಷ್ಠ classification ಮಟ್ಟ.

## Agent Identity

ಪ್ರತಿ agent ತನ್ನ personality, mission, ಮತ್ತು boundaries ನಿರ್ಧರಿಸುವ ತನ್ನದೇ
`SPINE.md` ಹೊಂದಿದೆ. SPINE.md files agent ನ workspace directory ನಲ್ಲಿ ಇರುತ್ತವೆ:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personal assistant personality
    work/
      SPINE.md          # Work assistant personality
    support/
      SPINE.md          # Support bot personality
```

## Isolation

ಮಲ್ಟಿ-agent routing agents ನಡುವೆ ಕಠಿಣ isolation ಜಾರಿಗೊಳಿಸುತ್ತದೆ:

| Aspect     | Isolation                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------- |
| Sessions   | ಪ್ರತಿ agent ಸ್ವತಂತ್ರ session space ಹೊಂದಿದೆ. Sessions ಎಂದಿಗೂ share ಮಾಡಲ್ಪಡುವುದಿಲ್ಲ.    |
| Taint      | Taint per-agent track ಮಾಡಲ್ಪಡುತ್ತದೆ, agents ನಾದ್ಯಂತ ಅಲ್ಲ. Work taint personal sessions ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವುದಿಲ್ಲ. |
| Skills     | Skills per-workspace ಲೋಡ್ ಮಾಡಲ್ಪಡುತ್ತವೆ. Work skill personal agent ಗೆ ಲಭ್ಯವಿಲ್ಲ.      |
| Secrets    | Credentials per-agent ಪ್ರತ್ಯೇಕ. Support agent ಕೆಲಸ API keys ಪ್ರವೇಶಿಸಲಾಗದು.              |
| Workspaces | ಪ್ರತಿ agent code execution ಗಾಗಿ ತನ್ನದೇ filesystem workspace ಹೊಂದಿದೆ.                    |

::: warning Inter-agent communication `sessions_send` ಮೂಲಕ ಸಾಧ್ಯ ಆದರೆ policy layer
ನಿಂದ gated. ಒಂದು agent ಇನ್ನೊಂದು agent ನ ಡೇಟಾ ಅಥವಾ sessions ಅನ್ನು ಇದನ್ನು ಅನುಮತಿಸುವ
ಸ್ಪಷ್ಟ policy rules ಇಲ್ಲದೆ ಸದ್ದಿಲ್ಲದೆ ಪ್ರವೇಶಿಸಲಾಗದು. :::

::: tip ಮಲ್ಟಿ-agent routing channels ಮತ್ತು personas ನಾದ್ಯಂತ concerns ಪ್ರತ್ಯೇಕಿಸಲು.
Shared ಕಾರ್ಯದ ಮೇಲೆ collaborate ಮಾಡಬೇಕಾದ agents ಗಾಗಿ
[Agent Teams](/kn-IN/features/agent-teams) ನೋಡಿ. :::

## Default Agent

Inbound message ಗೆ ಯಾವ routing rule ಹೊಂದಾಣಿಕೆಯಾಗದಿದ್ದರೆ, ಅದು default agent ಗೆ
ಹೋಗುತ್ತದೆ. Configuration ನಲ್ಲಿ ಇದನ್ನು ಹೊಂದಿಸಬಹುದು:

```yaml
agents:
  default: personal
```

Default configure ಮಾಡದಿದ್ದರೆ, ಪಟ್ಟಿಯಲ್ಲಿ ಮೊದಲ agent default ಆಗಿ ಬಳಸಲ್ಪಡುತ್ತದೆ.
