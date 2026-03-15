# Multi-Agent Routing

Triggerfish مختلف channels، accounts، یا contacts کو الگ isolated agents تک
routing support کرتا ہے، ہر ایک کا اپنا workspace، sessions، personality، اور
classification ceiling کے ساتھ۔

## Multiple Agents کیوں؟

ایک personality والا single agent ہمیشہ کافی نہیں ہوتا۔ آپ چاہتے ہو سکتے ہیں:

- WhatsApp پر **personal assistant** جو calendar، reminders، اور family messages
  handle کرے۔
- Slack پر **work assistant** جو Jira tickets، GitHub PRs، اور code reviews manage
  کرے۔
- Discord پر **support agent** جو مختلف tone اور limited access کے ساتھ community
  questions کا جواب دے۔

Multi-agent routing آپ کو یہ سب ایک Triggerfish installation سے simultaneously
چلانے دیتا ہے۔

## یہ کیسے کام کرتا ہے

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent routing: inbound channels routed through AgentRouter to isolated agent workspaces" style="max-width: 100%;" />

**AgentRouter** ہر inbound message examine کرتا ہے اور اسے configurable routing
rules کی بنیاد پر agent تک map کرتا ہے۔ اگر کوئی rule match نہ کرے تو messages
default agent کو جاتے ہیں۔

## Routing Rules

Messages ان کی بنیاد پر route کی جا سکتی ہیں:

| Criteria | تفصیل                                          | مثال                                     |
| -------- | ----------------------------------------------- | ----------------------------------------- |
| Channel  | Messaging platform سے route                    | تمام Slack messages "Work" کو جاتے ہیں   |
| Account  | Channel کے اندر مخصوص account سے route         | Work email بمقابلہ personal email         |
| Contact  | Sender/peer identity سے route                  | Manager کے messages "Work" کو جاتے ہیں   |
| Default  | کوئی rule match نہ کرے تو fallback             | باقی سب "Personal" کو جاتے ہیں          |

## Configuration

`triggerfish.yaml` میں agents اور routing define کریں:

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

ہر agent specify کرتا ہے:

- **id** -- Routing کے لیے unique identifier۔
- **name** -- Human-readable name۔
- **channels** -- کون سے channel instances یہ agent handle کرتا ہے۔
- **tools** -- Tool profile اور explicit allow/deny lists۔
- **model** -- کون سا LLM model استعمال کرنا ہے (per agent مختلف ہو سکتا ہے)۔
- **classification_ceiling** -- یہ agent جو زیادہ سے زیادہ classification level
  reach کر سکتا ہے۔

## Agent Identity

ہر agent کا اپنا `SPINE.md` ہے جو اس کی personality، mission، اور boundaries
define کرتا ہے۔ SPINE.md files agent کی workspace directory میں رہتی ہیں:

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

Multi-agent routing agents کے درمیان strict isolation enforce کرتی ہے:

| پہلو       | Isolation                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Sessions   | ہر agent کا independent session space۔ Sessions کبھی shared نہیں                               |
| Taint      | Taint per-agent track ہوتا ہے، agents کے پار نہیں۔ Work taint personal sessions کو affect نہیں کرتا |
| Skills     | Skills per-workspace load ہوتی ہیں۔ Work skill personal agent کو available نہیں                 |
| Secrets    | Credentials per-agent isolated۔ Support agent work API keys access نہیں کر سکتا                 |
| Workspaces | ہر agent کی code execution کے لیے اپنی filesystem workspace ہے                                  |

::: warning Inter-agent communication `sessions_send` کے ذریعے ممکن ہے لیکن policy
layer سے gated ہے۔ ایک agent بغیر explicit policy rules کے خاموشی سے دوسرے agent
کا data یا sessions access نہیں کر سکتا۔ :::

::: tip Multi-agent routing channels اور personas کے پار concerns separate کرنے
کے لیے ہے۔ ایسے agents کے لیے جنہیں shared task پر collaborate کرنا ہو، دیکھیں
[Agent Teams](/ur-PK/features/agent-teams)۔ :::

## Default Agent

جب کوئی routing rule inbound message سے match نہ کرے، وہ default agent کو جاتا
ہے۔ آپ یہ configuration میں set کر سکتے ہیں:

```yaml
agents:
  default: personal
```

اگر کوئی default configure نہ ہو، تو list میں پہلا agent بطور default استعمال ہوتا
ہے۔
