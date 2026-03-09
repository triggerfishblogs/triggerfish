# SPINE at Triggers

Gumagamit ang Triggerfish ng dalawang markdown files para i-define ang behavior ng iyong agent: kino-kontrol ng **SPINE.md** kung sino ang iyong agent, at kino-kontrol ng **TRIGGER.md** kung ano ang proactive na ginagawa ng iyong agent. Parehong freeform markdown -- isinusulat mo ang mga ito sa plain English.

## SPINE.md -- Agent Identity

Ang `SPINE.md` ang pundasyon ng system prompt ng iyong agent. Dine-define nito ang pangalan, personality, mission, knowledge domains, at mga boundaries ng agent. Nilo-load ng Triggerfish ang file na ito tuwing magpo-process ng mensahe, kaya agad na nagkaka-epekto ang mga pagbabago.

### File Location

```
~/.triggerfish/SPINE.md
```

Para sa multi-agent setups, bawat agent ay may sariling SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Pagsisimula

Gumagawa ang setup wizard (`triggerfish dive`) ng starter SPINE.md batay sa iyong mga sagot. Maaari mo itong i-edit nang malaya anumang oras -- markdown lang ito.

### Pagsulat ng Epektibong SPINE.md

Ang magandang SPINE.md ay specific. Mas maganda ang performance ng agent kapag mas concrete ka tungkol sa role nito. Narito ang recommended structure:

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

### Mga Best Practice

::: tip **Maging specific tungkol sa personality.** Sa halip na "be helpful," isulat ang "be concise, direct, and use bullet points for clarity." :::

::: tip **Isama ang context tungkol sa owner.** Mas maganda ang performance ng agent kapag alam nito ang role, tools, at priorities mo. :::

::: tip **Mag-set ng explicit boundaries.** I-define kung ano ang hindi dapat gawin ng agent. Sinusuplemento nito (pero hindi pinapalitan) ang deterministic enforcement ng policy engine. :::

::: warning Ang mga SPINE.md instruction ay gumagabay sa behavior ng LLM pero hindi mga security controls. Para sa enforceable restrictions, gamitin ang policy engine sa `triggerfish.yaml`. Deterministic ang policy engine at hindi ito maaaring i-bypass -- ang mga SPINE.md instruction ay maaari. :::

## TRIGGER.md -- Proactive Behavior

Dine-define ng `TRIGGER.md` kung ano ang dapat i-check, i-monitor, at i-act ng iyong agent sa mga periodic wakeup. Hindi tulad ng cron jobs (na nag-e-execute ng fixed tasks sa isang schedule), binibigyan ng triggers ang agent ng discretion na mag-evaluate ng conditions at magpasya kung kailangan ng action.

### File Location

```
~/.triggerfish/TRIGGER.md
```

Para sa multi-agent setups:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Paano Gumagana ang Triggers

1. Ginigising ng trigger loop ang agent sa configured interval (na-set sa `triggerfish.yaml`)
2. Nilo-load ng Triggerfish ang iyong TRIGGER.md at iprinepresenta ito sa agent
3. Ine-evaluate ng agent ang bawat item at nag-a-act kung kailangan
4. Lahat ng trigger actions ay dumadaan sa normal policy hooks
5. Tumatakbo ang trigger session na may classification ceiling (na-configure rin sa YAML)
6. Nirerespeto ang quiet hours -- walang triggers na nagfa-fire sa mga oras na iyon

### Trigger Configuration sa YAML

I-set ang timing at constraints sa iyong `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # I-check tuwing 30 minuto
  classification: INTERNAL # Max taint ceiling para sa trigger sessions
  quiet_hours: "22:00-07:00" # Walang wakeups sa mga oras na ito
```

### Pagsulat ng TRIGGER.md

I-organize ang iyong triggers ayon sa priority. Maging specific tungkol sa kung ano ang itinuturing na actionable at kung ano ang dapat gawin ng agent tungkol dito.

```markdown
# Priority Checks

- Unread messages across all channels na mas matanda sa 1 oras -- i-summarize at i-notify sa primary channel.
- Calendar conflicts sa susunod na 24 oras -- i-flag at mag-suggest ng resolution.
- Overdue tasks sa Linear -- ilista ang mga ito kasama ang days overdue.

# Monitoring

- GitHub: PRs na naghihintay ng aking review -- i-notify kung mas matanda sa 4 oras.
- Email: anumang bagay mula sa VIP contacts (David Chen, Maria Lopez) -- i-flag para sa immediate notification anuman ang quiet hours.
- Slack: mentions sa #incidents channel -- i-summarize at i-escalate kung hindi pa resolved.

# Proactive

- Kung umaga (7-9am), maghanda ng daily briefing na may calendar, weather, at top 3 priorities.
- Kung Friday afternoon, mag-draft ng weekly summary ng completed tasks at open items.
- Kung lumampas sa 50 unread ang inbox count, mag-alok ng batch-triage.
```

### Halimbawa: Minimal TRIGGER.md

Kung gusto mo ng simpleng starting point:

```markdown
# I-check sa bawat wakeup

- Anumang unread messages na mas matanda sa 1 oras
- Calendar events sa susunod na 4 oras
- Anumang urgent sa email
```

### Halimbawa: Developer-Focused TRIGGER.md

```markdown
# High Priority

- CI failures sa main branch -- mag-investigate at mag-notify.
- PRs na naghihintay ng aking review na mas matanda sa 2 oras.
- Sentry errors na may "critical" severity sa huling oras.

# Monitoring

- Dependabot PRs -- auto-approve ng patch updates, i-flag ang minor/major.
- Build times na trending sa itaas ng 10 minuto -- mag-report weekly.
- Open issues na naka-assign sa akin na walang updates sa 3 araw.

# Daily

- Umaga: i-summarize ang overnight CI runs at deploy status.
- Pagtatapos ng araw: ilista ang PRs na binuksan ko na pending pa ang review.
```

### Triggers at ang Policy Engine

Lahat ng trigger actions ay subject sa parehong policy enforcement tulad ng interactive conversations:

- Bawat trigger wakeup ay nagsi-spawn ng isolated session na may sariling taint tracking
- Nili-limit ng classification ceiling sa iyong YAML config kung anong data ang maaaring i-access ng trigger
- Naa-apply ang no write-down rule -- kung nag-access ng confidential data ang trigger, hindi nito maaaring ipadala ang results sa public channel
- Lahat ng trigger actions ay nilo-log sa audit trail

::: info Kung walang TRIGGER.md, nangyayari pa rin ang trigger wakeups sa configured interval. Ginagamit ng agent ang general knowledge nito at SPINE.md para magpasya kung ano ang nangangailangan ng atensyon. Para sa pinakamainam na resulta, sumulat ng TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspeto   | SPINE.md                             | TRIGGER.md                       |
| -------- | ------------------------------------ | -------------------------------- |
| Layunin  | I-define kung sino ang agent         | I-define kung ano ang mino-monitor ng agent |
| Nilo-load | Bawat mensahe                       | Bawat trigger wakeup             |
| Saklaw   | Lahat ng conversations               | Trigger sessions lang            |
| Nakakaapekto | Personality, knowledge, boundaries | Proactive checks at actions    |
| Kinakailangan | Oo (gine-generate ng dive wizard) | Hindi (pero recommended)      |

## Mga Susunod na Hakbang

- I-configure ang trigger timing at cron jobs sa iyong [triggerfish.yaml](./configuration)
- Alamin ang lahat ng available CLI commands sa [Commands reference](./commands)
