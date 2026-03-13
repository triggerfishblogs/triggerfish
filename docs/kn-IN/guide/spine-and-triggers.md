# SPINE ಮತ್ತು Triggers

Triggerfish ನಿಮ್ಮ ಏಜೆಂಟ್‌ನ ನಡವಳಿಕೆ ನಿರ್ಧರಿಸಲು ಎರಡು markdown ಫೈಲ್‌ಗಳನ್ನು ಬಳಸುತ್ತದೆ:
**SPINE.md** ನಿಮ್ಮ ಏಜೆಂಟ್ ಯಾರು ಎಂದು ನಿಯಂತ್ರಿಸುತ್ತದೆ, ಮತ್ತು **TRIGGER.md** ನಿಮ್ಮ
ಏಜೆಂಟ್ ಸಕ್ರಿಯವಾಗಿ ಏನು ಮಾಡುತ್ತದೆ ಎಂದು ನಿಯಂತ್ರಿಸುತ್ತದೆ. ಎರಡೂ ಮುಕ್ತ-ರೂಪ markdown --
ನೀವು ಅವುಗಳನ್ನು ಸಾದಾ ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಬರೆಯುತ್ತೀರಿ.

## SPINE.md -- ಏಜೆಂಟ್ ಗುರುತು

`SPINE.md` ನಿಮ್ಮ ಏಜೆಂಟ್‌ನ ಸಿಸ್ಟಂ ಪ್ರಾಂಪ್ಟ್‌ನ ಅಡಿಪಾಯ. ಇದು ಏಜೆಂಟ್‌ನ ಹೆಸರು,
ವ್ಯಕ್ತಿತ್ವ, ಮಿಷನ್, ಜ್ಞಾನ ಕ್ಷೇತ್ರಗಳು ಮತ್ತು ಮಿತಿಗಳನ್ನು ನಿರ್ಧರಿಸುತ್ತದೆ.
Triggerfish ಪ್ರತಿ ಬಾರಿ ಸಂದೇಶ ಪ್ರಕ್ರಿಯೆ ಮಾಡುವಾಗ ಈ ಫೈಲ್ ಲೋಡ್ ಮಾಡುತ್ತದೆ, ಆದ್ದರಿಂದ
ಬದಲಾವಣೆಗಳು ತಕ್ಷಣ ಪರಿಣಾಮ ನೀಡುತ್ತವೆ.

### ಫೈಲ್ ಸ್ಥಳ

```
~/.triggerfish/SPINE.md
```

ಬಹು-ಏಜೆಂಟ್ ಸೆಟಪ್‌ಗಳಿಗಾಗಿ, ಪ್ರತಿ ಏಜೆಂಟ್‌ಗೆ ತನ್ನದೇ SPINE.md ಇದೆ:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### ಪ್ರಾರಂಭಿಸುವುದು

ಸೆಟಪ್ ವಿಝಾರ್ಡ್ (`triggerfish dive`) ನಿಮ್ಮ ಉತ್ತರಗಳ ಆಧಾರದ ಮೇಲೆ ಸ್ಟಾರ್ಟರ್ SPINE.md ಉತ್ಪಾದಿಸುತ್ತದೆ.
ನೀವು ಇದನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ಸ್ವತಂತ್ರವಾಗಿ ಸಂಪಾದಿಸಬಹುದು -- ಇದು ಕೇವಲ markdown.

### ಪರಿಣಾಮಕಾರಿ SPINE.md ಬರೆಯುವುದು

ಉತ್ತಮ SPINE.md ನಿರ್ದಿಷ್ಟವಾಗಿರುತ್ತದೆ. ನಿಮ್ಮ ಏಜೆಂಟ್‌ನ ಪಾತ್ರದ ಬಗ್ಗೆ ನೀವು ಎಷ್ಟು ಸ್ಪಷ್ಟವಾಗಿರುತ್ತೀರೋ,
ಅಷ್ಟು ಉತ್ತಮ ಅದು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. ಇಲ್ಲಿ ಶಿಫಾರಸು ರಚನೆ ಇದೆ:

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

### ಉತ್ತಮ ಅಭ್ಯಾಸಗಳು

::: tip **ವ್ಯಕ್ತಿತ್ವದ ಬಗ್ಗೆ ನಿರ್ದಿಷ್ಟವಾಗಿರಿ.** "ಸಹಾಯಕನಾಗಿರಿ" ಬದಲಾಗಿ "ಸಂಕ್ಷಿಪ್ತ, ನೇರ
ಇರಿ ಮತ್ತು ಸ್ಪಷ್ಟತೆಗಾಗಿ ಬುಲೆಟ್ ಪಾಯಿಂಟ್‌ಗಳನ್ನು ಬಳಸಿ" ಬರೆಯಿರಿ. :::

::: tip **ಮಾಲೀಕರ ಬಗ್ಗೆ ಸಂದರ್ಭ ಸೇರಿಸಿ.** ನಿಮ್ಮ ಪಾತ್ರ, ಉಪಕರಣಗಳು ಮತ್ತು ಆದ್ಯತೆಗಳನ್ನು
ಏಜೆಂಟ್‌ಗೆ ಗೊತ್ತಿದ್ದಾಗ ಉತ್ತಮ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ. :::

::: tip **ಸ್ಪಷ್ಟ ಮಿತಿಗಳನ್ನು ಹೊಂದಿಸಿ.** ಏಜೆಂಟ್ ಎಂದಿಗೂ ಮಾಡಬಾರದ ಸಂಗತಿಗಳನ್ನು ನಿರ್ಧರಿಸಿ.
ಇದು ನೀತಿ ಎಂಜಿನ್‌ನ ನಿರ್ಧಾರಾತ್ಮಕ ಜಾರಿಯನ್ನು ಪೂರಕಗೊಳಿಸುತ್ತದೆ (ಆದರೆ ಅದನ್ನು ಬದಲಾಯಿಸುವುದಿಲ್ಲ). :::

::: warning SPINE.md ಸೂಚನೆಗಳು LLM ನ ನಡವಳಿಕೆ ಮಾರ್ಗದರ್ಶಿ ಮಾಡುತ್ತವೆ ಆದರೆ ಭದ್ರತಾ
ನಿಯಂತ್ರಣಗಳಲ್ಲ. ಜಾರಿಗೊಳಿಸಬಹುದಾದ ನಿರ್ಬಂಧಗಳಿಗಾಗಿ, `triggerfish.yaml` ನಲ್ಲಿ ನೀತಿ ಎಂಜಿನ್
ಬಳಸಿ. ನೀತಿ ಎಂಜಿನ್ ನಿರ್ಧಾರಾತ್ಮಕ ಮತ್ತು ಬೈಪಾಸ್ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ -- SPINE.md ಸೂಚನೆಗಳನ್ನು
ಮಾಡಬಹುದು. :::

## TRIGGER.md -- ಸಕ್ರಿಯ ನಡವಳಿಕೆ

`TRIGGER.md` ನಿಮ್ಮ ಏಜೆಂಟ್ ಆವರ್ತಕ ಎಚ್ಚರಗಳ ಸಮಯದಲ್ಲಿ ಏನನ್ನು ಪರಿಶೀಲಿಸಬೇಕು, ಮೇಲ್ವಿಚಾರಣೆ
ಮಾಡಬೇಕು ಮತ್ತು ಕಾರ್ಯ ನಿರ್ವಹಿಸಬೇಕು ಎಂದು ನಿರ್ಧರಿಸುತ್ತದೆ. cron ಕೆಲಸಗಳಿಗಿಂತ ಭಿನ್ನವಾಗಿ
(ಅವು ನಿಗದಿತ ಸಮಯದಲ್ಲಿ ನಿಶ್ಚಿತ ಕೆಲಸಗಳನ್ನು ಚಲಾಯಿಸುತ್ತವೆ), ಟ್ರಿಗ್ಗರ್‌ಗಳು ಏಜೆಂಟ್‌ಗೆ
ಷರತ್ತುಗಳನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡಲು ಮತ್ತು ಕ್ರಿಯೆ ಅಗತ್ಯವಿದೆಯೇ ಎಂದು ನಿರ್ಧರಿಸಲು ವಿವೇಚನೆ ನೀಡುತ್ತವೆ.

### ಫೈಲ್ ಸ್ಥಳ

```
~/.triggerfish/TRIGGER.md
```

### Triggers ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ

1. trigger loop ಕಾನ್ಫಿಗರ್ ಮಾಡಲಾದ ಮಧ್ಯಂತರದಲ್ಲಿ ಏಜೆಂಟ್ ಎಚ್ಚರಿಸುತ್ತದೆ
2. Triggerfish ನಿಮ್ಮ TRIGGER.md ಲೋಡ್ ಮಾಡುತ್ತದೆ ಮತ್ತು ಏಜೆಂಟ್‌ಗೆ ಪ್ರಸ್ತುತಪಡಿಸುತ್ತದೆ
3. ಏಜೆಂಟ್ ಪ್ರತಿ ಐಟಂ ಮೌಲ್ಯಮಾಪನ ಮಾಡುತ್ತದೆ ಮತ್ತು ಅಗತ್ಯವಿದ್ದರೆ ಕ್ರಿಯೆ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ
4. ಎಲ್ಲ trigger ಕ್ರಿಯೆಗಳು ಸಾಮಾನ್ಯ ನೀತಿ hooks ಮೂಲಕ ಹಾದುಹೋಗುತ್ತವೆ
5. Trigger session ವರ್ಗೀಕರಣ ಮೇಲ್ಛಾವಣಿಯೊಂದಿಗೆ ಚಲಿಸುತ್ತದೆ
6. ಶಾಂತ ಗಂಟೆಗಳನ್ನು ಗೌರವಿಸಲಾಗುತ್ತದೆ

### YAML ನಲ್ಲಿ Trigger ಕಾನ್ಫಿಗರೇಶನ್

```yaml
trigger:
  interval: 30m # ಪ್ರತಿ 30 ನಿಮಿಷ ಪರಿಶೀಲಿಸಿ
  classification: INTERNAL # Trigger sessions ಗಾಗಿ ಗರಿಷ್ಠ taint ಮೇಲ್ಛಾವಣಿ
  quiet_hours: "22:00-07:00" # ಈ ಸಮಯದಲ್ಲಿ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ
```

### TRIGGER.md ಬರೆಯುವುದು

ಆದ್ಯತೆಯ ಪ್ರಕಾರ ನಿಮ್ಮ triggers ಗಳನ್ನು ಸಂಘಟಿಸಿ. ಏನನ್ನು ಕ್ರಿಯಾಯೋಗ್ಯ ಎಂದು ಪರಿಗಣಿಸಲಾಗುತ್ತದೆ
ಮತ್ತು ಏಜೆಂಟ್ ಅದರ ಬಗ್ಗೆ ಏನು ಮಾಡಬೇಕು ಎಂದು ನಿರ್ದಿಷ್ಟವಾಗಿ ಹೇಳಿ.

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

### Triggers ಮತ್ತು ನೀತಿ ಎಂಜಿನ್

ಎಲ್ಲ trigger ಕ್ರಿಯೆಗಳು ಸಂವಾದಾತ್ಮಕ ಸಂಭಾಷಣೆಗಳಂತೆಯೇ ನೀತಿ ಜಾರಿಗೆ ಒಳಪಟ್ಟಿರುತ್ತವೆ:

- ಪ್ರತಿ trigger ಎಚ್ಚರವು ತನ್ನದೇ taint ಟ್ರ್ಯಾಕಿಂಗ್‌ನೊಂದಿಗೆ ಪ್ರತ್ಯೇಕ session ಉತ್ಪಾದಿಸುತ್ತದೆ
- YAML config ನಲ್ಲಿ ವರ್ಗೀಕರಣ ಮೇಲ್ಛಾವಣಿ trigger ಪ್ರವೇಶಿಸಬಹುದಾದ ಡೇಟಾವನ್ನು ಮಿತಿಗೊಳಿಸುತ್ತದೆ
- no write-down ನಿಯಮ ಅನ್ವಯಿಸುತ್ತದೆ
- ಎಲ್ಲ trigger ಕ್ರಿಯೆಗಳನ್ನು ಆಡಿಟ್ ಟ್ರೇಲ್‌ನಲ್ಲಿ ದಾಖಲಿಸಲಾಗುತ್ತದೆ

## SPINE.md vs TRIGGER.md

| ಅಂಶ      | SPINE.md                           | TRIGGER.md                         |
| -------- | ---------------------------------- | ---------------------------------- |
| ಉದ್ದೇಶ   | ಏಜೆಂಟ್ ಯಾರು ಎಂದು ನಿರ್ಧರಿಸಿ        | ಏಜೆಂಟ್ ಏನನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡುತ್ತದೆ |
| ಲೋಡ್     | ಪ್ರತಿ ಸಂದೇಶ                        | ಪ್ರತಿ trigger ಎಚ್ಚರ                |
| ವ್ಯಾಪ್ತಿ  | ಎಲ್ಲ ಸಂಭಾಷಣೆಗಳು                    | Trigger sessions ಮಾತ್ರ            |
| ಪರಿಣಾಮ   | ವ್ಯಕ್ತಿತ್ವ, ಜ್ಞಾನ, ಮಿತಿಗಳು         | ಸಕ್ರಿಯ ಪರಿಶೀಲನೆಗಳು ಮತ್ತು ಕ್ರಿಯೆಗಳು |
| ಅಗತ್ಯ    | ಹೌದು (dive ವಿಝಾರ್ಡ್ ರಚಿಸುತ್ತದೆ)   | ಇಲ್ಲ (ಆದರೆ ಶಿಫಾರಸು)               |

## ಮುಂದಿನ ಹೆಜ್ಜೆಗಳು

- ನಿಮ್ಮ [triggerfish.yaml](./configuration) ನಲ್ಲಿ trigger ಸಮಯ ಮತ್ತು cron ಕೆಲಸಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡಿ
- [ಆಜ್ಞೆ ಉಲ್ಲೇಖ](./commands) ನಲ್ಲಿ ಎಲ್ಲ ಲಭ್ಯ CLI ಆಜ್ಞೆಗಳ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ
