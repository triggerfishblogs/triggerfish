# Multi-Agent Routing

Triggerfish वेगवेगळ्या channels, accounts, किंवा contacts ला स्वतंत्र isolated
agents ला routing support करतो, प्रत्येकाचे स्वतःचे workspace, sessions,
personality, आणि classification ceiling.

## Multiple Agents का?

Single personality सह single agent नेहमी पुरेसा नसतो. तुम्हाला हवे असेल:

- Calendar, reminders, आणि family messages handle करणारा WhatsApp वर
  **personal assistant**.
- Jira tickets, GitHub PRs, आणि code reviews manage करणारा Slack वर
  **work assistant**.
- Different tone आणि limited access सह community questions answer करणारा
  Discord वर **support agent**.

Multi-agent routing तुम्हाला single Triggerfish installation मधून या सर्वांना
simultaneously run करण्यास परवानगी देतो.

## हे कसे काम करते

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent routing: inbound channels routed through AgentRouter to isolated agent workspaces" style="max-width: 100%;" />

**AgentRouter** प्रत्येक inbound message examine करतो आणि configurable routing
rules वर आधारित agent ला map करतो. कोणताही rule match नसल्यास, messages default
agent ला जातात.

## Routing Rules

Messages route केले जाऊ शकतात:

| Criteria | वर्णन                                        | Example                                        |
| -------- | -------------------------------------------- | ---------------------------------------------- |
| Channel  | Messaging platform नुसार route करा           | सर्व Slack messages "Work" ला जातात            |
| Account  | Channel मधील specific account नुसार route करा | Work email vs personal email                   |
| Contact  | Sender/peer identity नुसार route करा         | तुमच्या manager कडील messages "Work" ला जातात  |
| Default  | कोणताही rule match नसल्यास fallback           | बाकी सर्व "Personal" ला जातात                  |

## Configuration

`triggerfish.yaml` मध्ये agents आणि routing define करा:

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

प्रत्येक agent specify करतो:

- **id** -- Routing साठी unique identifier.
- **name** -- Human-readable name.
- **channels** -- कोणते channel instances हा agent handle करतो.
- **tools** -- Tool profile आणि explicit allow/deny lists.
- **model** -- कोणता LLM model वापरायचा (per agent वेगळा असू शकतो).
- **classification_ceiling** -- या agent ला reach होणारी maximum classification
  level.

## Agent Identity

प्रत्येक agent चे स्वतःचे `SPINE.md` आहे ज्यात त्याची personality, mission,
आणि boundaries define केल्या आहेत. SPINE.md files एजंटच्या workspace directory
मध्ये राहतात:

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

Multi-agent routing agents दरम्यान strict isolation enforce करतो:

| Aspect     | Isolation                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Sessions   | प्रत्येक agent ला independent session space आहे. Sessions कधीही shared नाहीत.                     |
| Taint      | Taint per-agent tracked आहे, agents मध्ये नाही. Work taint personal sessions ला affect करत नाही. |
| Skills     | Skills per-workspace loaded आहेत. Work skill personal agent ला available नाही.                    |
| Secrets    | Credentials per-agent isolated आहेत. Support agent work API keys access करू शकत नाही.            |
| Workspaces | प्रत्येक agent ला code execution साठी स्वतःचे filesystem workspace आहे.                            |

::: warning Inter-agent communication `sessions_send` द्वारे शक्य आहे पण
policy layer द्वारे gated आहे. एक agent स्पष्ट policy rules परवानगी न देता
दुसऱ्या agent चा data किंवा sessions silently access करू शकत नाही. :::

::: tip Multi-agent routing channels आणि personas मध्ये concerns separate
करण्यासाठी आहे. Shared task वर collaborate करणे आवश्यक असलेल्या agents साठी,
[Agent Teams](/mr-IN/features/agent-teams) पहा. :::

## Default Agent

Inbound message शी कोणताही routing rule match नसल्यास, ते default agent ला जाते.
तुम्ही हे configuration मध्ये set करू शकता:

```yaml
agents:
  default: personal
```

कोणताही default configured नसल्यास, list मधील पहिला agent default म्हणून
वापरला जातो.
