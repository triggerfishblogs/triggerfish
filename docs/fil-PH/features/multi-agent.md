# Multi-Agent Routing

Sinusuportahan ng Triggerfish ang pag-route ng iba't ibang channels, accounts, o contacts sa hiwalay na isolated agents, bawat isa ay may sariling workspace, sessions, personality, at classification ceiling.

## Bakit Maramihang Agents?

Hindi palaging sapat ang iisang agent na may iisang personality. Maaaring gusto mo ng:

- Isang **personal assistant** sa WhatsApp na humahawak ng calendar, reminders, at family messages.
- Isang **work assistant** sa Slack na nagma-manage ng Jira tickets, GitHub PRs, at code reviews.
- Isang **support agent** sa Discord na sumasagot ng community questions na may ibang tone at limitadong access.

Pinapayagan ka ng multi-agent routing na patakbuhin ang lahat ng ito nang sabay-sabay mula sa iisang Triggerfish installation.

## Paano Gumagana

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent routing: inbound channels routed through AgentRouter sa isolated agent workspaces" style="max-width: 100%;" />

Sinusuri ng **AgentRouter** ang bawat inbound message at mina-map ito sa isang agent batay sa configurable routing rules. Kung walang rule na tumugma, napupunta ang messages sa default agent.

## Mga Routing Rule

Maaaring i-route ang messages ayon sa:

| Criteria | Paglalarawan                                     | Halimbawa                                       |
| -------- | ------------------------------------------------ | ----------------------------------------------- |
| Channel  | I-route ayon sa messaging platform               | Lahat ng Slack messages ay napupunta sa "Work"   |
| Account  | I-route ayon sa specific account sa loob ng channel | Work email vs personal email                   |
| Contact  | I-route ayon sa sender/peer identity             | Messages mula sa manager mo ay napupunta sa "Work" |
| Default  | Fallback kapag walang rule na tumugma            | Lahat ng iba pa ay napupunta sa "Personal"       |

## Configuration

Mag-define ng agents at routing sa `triggerfish.yaml`:

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

Bawat agent ay nagsi-specify ng:

- **id** -- Unique identifier para sa routing.
- **name** -- Human-readable na pangalan.
- **channels** -- Aling channel instances ang hina-handle ng agent na ito.
- **tools** -- Tool profile at explicit allow/deny lists.
- **model** -- Aling LLM model ang gagamitin (maaaring mag-iba per agent).
- **classification_ceiling** -- Maximum classification level na maaaring maabot ng agent na ito.

## Agent Identity

Bawat agent ay may sariling `SPINE.md` na nagde-define ng personality, mission, at boundaries nito. Ang SPINE.md files ay nasa workspace directory ng agent:

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

Ine-enforce ng multi-agent routing ang strict isolation sa pagitan ng agents:

| Aspeto     | Isolation                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Sessions   | Bawat agent ay may independent session space. Hindi kailanman shine-share ang sessions.              |
| Taint      | Ang taint ay tina-track per-agent, hindi sa lahat ng agents. Hindi naaapektuhan ng work taint ang personal sessions. |
| Skills     | Nilo-load ang skills per-workspace. Ang work skill ay hindi available sa personal agent.             |
| Secrets    | Ang credentials ay isolated per-agent. Hindi maa-access ng support agent ang work API keys.         |
| Workspaces | Bawat agent ay may sariling filesystem workspace para sa code execution.                            |

::: warning Posible ang inter-agent communication sa pamamagitan ng `sessions_send` pero gine-gate ito ng policy layer. Hindi maaaring tahimik na i-access ng isang agent ang data o sessions ng ibang agent nang walang explicit policy rules na nagpapahintulot nito. :::

::: tip Ang multi-agent routing ay para sa paghihiwalay ng concerns sa mga channels at personas. Para sa mga agents na kailangang mag-collaborate sa shared task, tingnan ang [Agent Teams](/fil-PH/features/agent-teams). :::

## Default Agent

Kapag walang routing rule na tumugma sa inbound message, napupunta ito sa default agent. Maaari mo itong i-set sa configuration:

```yaml
agents:
  default: personal
```

Kung walang default na naka-configure, ang unang agent sa list ang ginagamit bilang default.
