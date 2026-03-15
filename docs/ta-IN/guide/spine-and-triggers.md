# SPINE மற்றும் Triggers

Triggerfish உங்கள் agent இன் நடத்தையை வரையறுக்க இரண்டு markdown கோப்புகளை பயன்படுத்துகிறது: **SPINE.md** உங்கள் agent யார் என்பதை கட்டுப்படுத்துகிறது, மற்றும் **TRIGGER.md** உங்கள் agent முன்கூட்டியே என்ன செய்கிறது என்பதை கட்டுப்படுத்துகிறது. இரண்டும் freeform markdown -- நீங்கள் அவற்றை எளிய ஆங்கிலத்தில் எழுதுகிறீர்கள்.

## SPINE.md -- Agent அடையாளம்

`SPINE.md` உங்கள் agent இன் system prompt இன் அடிப்படை. இது agent இன் பெயர், ஆளுமை, mission, அறிவு துறைகள் மற்றும் எல்லைகளை வரையறுக்கிறது. Triggerfish ஒவ்வொரு செய்தியையும் செயலாக்கும்போது இந்த கோப்பை ஏற்றுகிறது, எனவே மாற்றங்கள் உடனடியாக நடைமுறைக்கு வருகின்றன.

### கோப்பு இருப்பிடம்

```
~/.triggerfish/SPINE.md
```

multi-agent அமைப்புகளுக்கு, ஒவ்வொரு agent க்கும் சொந்த SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### தொடங்குவது

setup wizard (`triggerfish dive`) உங்கள் பதில்களின் அடிப்படையில் starter SPINE.md உருவாக்குகிறது. எப்போது வேண்டுமானாலும் சுதந்திரமாக திருத்தலாம் -- இது வெறும் markdown மட்டுமே.

### பயனுள்ள SPINE.md எழுதுவது

நல்ல SPINE.md குறிப்பிட்டதாக இருக்கும். உங்கள் agent இன் பங்கைப் பற்றி நீங்கள் எவ்வளவு குறிப்பிட்டதாக இருக்கிறீர்களோ, அந்த அளவு சிறப்பாக செயல்படும். பரிந்துரைக்கப்பட்ட கட்டமைப்பு இதோ:

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

### சிறந்த நடைமுறைகள்

::: tip **ஆளுமையைப் பற்றி குறிப்பிட்டதாக இருங்கள்.** "உதவியாக இருங்கள்" என்பதற்கு பதிலாக, "சுருக்கமாக, நேரடியாக இருங்கள் மற்றும் தெளிவுக்காக bullet points பயன்படுத்துங்கள்" என எழுதுங்கள். :::

::: tip **உரிமையாளரைப் பற்றிய சூழலை சேர்க்கவும்.** உங்கள் பங்கு, tools மற்றும் முன்னுரிமைகளை agent அறியும்போது சிறப்பாக செயல்படும். :::

::: tip **வெளிப்படையான எல்லைகளை அமைக்கவும்.** agent ஒருபோதும் செய்யக்கூடாதவற்றை வரையறுங்கள். இது policy engine இன் நிர்ணயவாத அமலாக்கத்தை (மாற்றாக இல்லாமல்) நிரப்புகிறது. :::

::: warning SPINE.md வழிமுறைகள் LLM இன் நடத்தையை வழிகாட்டுகின்றன, ஆனால் பாதுகாப்பு கட்டுப்பாடுகள் அல்ல. அமல்படுத்தக்கூடிய கட்டுப்பாடுகளுக்கு, `triggerfish.yaml` இல் policy engine பயன்படுத்தவும். policy engine நிர்ணயவாதமானது மற்றும் bypass செய்ய முடியாது -- SPINE.md வழிமுறைகள் முடியும். :::

## TRIGGER.md -- முன்கூட்டிய நடத்தை

`TRIGGER.md` உங்கள் agent தவறாமல் wakeups போது என்ன சரிபார்க்க வேண்டும், கண்காணிக்க வேண்டும் மற்றும் செயல்பட வேண்டும் என்பதை வரையறுக்கிறது. cron jobs (திட்டமிட்ட நேரத்தில் நிலையான tasks ஐ செயல்படுத்துகின்றன) போல் அல்லாமல், triggers நிலைமைகளை மதிப்பீடு செய்து செயல் தேவையா என்று முடிவு செய்ய agent க்கு விவேகத்தை வழங்குகின்றன.

### கோப்பு இருப்பிடம்

```
~/.triggerfish/TRIGGER.md
```

multi-agent அமைப்புகளுக்கு:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Triggers எவ்வாறு செயல்படுகின்றன

1. trigger loop கட்டமைக்கப்பட்ட இடைவெளியில் agent ஐ எழுப்புகிறது (`triggerfish.yaml` இல் அமைக்கப்படுகிறது)
2. Triggerfish உங்கள் TRIGGER.md ஐ ஏற்றி agent க்கு வழங்குகிறது
3. agent ஒவ்வொரு உருப்படியையும் மதிப்பீடு செய்து தேவைப்பட்டால் செயல்படுகிறது
4. அனைத்து trigger செயல்களும் சாதாரண policy hooks வழியாக செல்கின்றன
5. trigger session வகைப்படுத்தல் ceiling உடன் இயங்குகிறது (YAML இலும் கட்டமைக்கப்படுகிறது)
6. quiet hours மதிக்கப்படுகின்றன -- அந்த நேரங்களில் triggers fire ஆவதில்லை

### YAML இல் Trigger கட்டமைப்பு

`triggerfish.yaml` இல் timing மற்றும் constraints அமைக்கவும்:

```yaml
trigger:
  interval: 30m # ஒவ்வொரு 30 நிமிடமும் சரிபாருங்கள்
  classification: INTERNAL # trigger sessions க்கான அதிகபட்ச taint ceiling
  quiet_hours: "22:00-07:00" # இந்த நேரங்களில் wakeups இல்லை
```

### TRIGGER.md எழுதுவது

முன்னுரிமையின்படி உங்கள் triggers ஐ ஒழுங்கமைக்கவும். என்ன செயல்படுத்தக்கூடியது என்பதையும் அதைப் பற்றி agent என்ன செய்ய வேண்டும் என்பதையும் குறிப்பிட்டதாக இருங்கள்.

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

### உதாரணம்: குறைந்தபட்ச TRIGGER.md

எளிய தொடக்கப் புள்ளி விரும்பினால்:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### உதாரணம்: Developer-Focused TRIGGER.md

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

### Triggers மற்றும் Policy Engine

அனைத்து trigger செயல்களும் இடைவினை உரையாடல்களைப் போலவே ஒரே policy அமலாக்கத்திற்கு உட்பட்டவை:

- ஒவ்வொரு trigger wakeup அதன் சொந்த taint கண்காணிப்புடன் தனிமைப்படுத்தப்பட்ட session உருவாக்குகிறது
- உங்கள் YAML config இல் உள்ள வகைப்படுத்தல் ceiling trigger எந்த data ஐ அணுகலாம் என்பதை வரம்பிடுகிறது
- no write-down விதி பொருந்தும் -- ஒரு trigger confidential data அணுகினால், அது பொது சேனலுக்கு முடிவுகளை அனுப்ப முடியாது
- அனைத்து trigger செயல்களும் audit trail இல் பதிவு செய்யப்படுகின்றன

::: info TRIGGER.md இல்லாவிட்டால், கட்டமைக்கப்பட்ட இடைவெளியில் trigger wakeups நடக்கும். agent அதன் பொது அறிவு மற்றும் SPINE.md பயன்படுத்தி என்ன கவனிக்க வேண்டும் என்று முடிவு செய்யும். சிறந்த முடிவுகளுக்கு, TRIGGER.md எழுதுங்கள். :::

## SPINE.md vs TRIGGER.md

| அம்சம்    | SPINE.md                           | TRIGGER.md                        |
| --------- | ---------------------------------- | --------------------------------- |
| நோக்கம்   | agent யார் என்பதை வரையறு           | agent என்ன கண்காணிக்கிறது என்பதை வரையறு |
| ஏற்றப்படும் | ஒவ்வொரு செய்தியும்                 | ஒவ்வொரு trigger wakeup போதும்    |
| நோக்கு    | அனைத்து உரையாடல்களும்              | Trigger sessions மட்டும்          |
| பாதிக்கிறது | ஆளுமை, அறிவு, எல்லைகள்             | முன்கூட்டிய சரிபார்ப்புகள் மற்றும் செயல்கள் |
| தேவையா   | ஆம் (dive wizard மூலம் உருவாக்கப்படும்) | இல்லை (ஆனால் பரிந்துரைக்கப்படுகிறது) |

## அடுத்த படிகள்

- உங்கள் [triggerfish.yaml](./configuration) இல் trigger timing மற்றும் cron jobs கட்டமைக்கவும்
- [Commands reference](./commands) இல் அனைத்து கிடைக்கக்கூடிய CLI கட்டளைகளையும் அறியுங்கள்
