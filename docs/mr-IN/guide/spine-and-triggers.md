# SPINE आणि Triggers

Triggerfish तुमच्या एजंटचे वर्तन परिभाषित करण्यासाठी दोन markdown फाइल्स वापरतो:
**SPINE.md** तुमचा एजंट कोण आहे ते नियंत्रित करतो, आणि **TRIGGER.md** तुमचा
एजंट सक्रियपणे काय करतो ते नियंत्रित करतो. दोन्ही freeform markdown आहेत -- तुम्ही
त्या सामान्य इंग्रजीत लिहिता.

## SPINE.md -- एजंट ओळख

`SPINE.md` हे तुमच्या एजंटच्या system prompt चा आधार आहे. ते एजंटचे नाव,
व्यक्तिमत्व, मिशन, ज्ञान क्षेत्रे आणि सीमा परिभाषित करते. Triggerfish प्रत्येक
वेळी संदेश प्रक्रिया करताना ही फाइल लोड करतो, त्यामुळे बदल त्वरित प्रभावी होतात.

### फाइल स्थान

```
~/.triggerfish/SPINE.md
```

बहु-एजंट सेटअपसाठी, प्रत्येक एजंटचे स्वतःचे SPINE.md असते:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### सुरुवात करणे

सेटअप विझार्ड (`triggerfish dive`) तुमच्या उत्तरांवर आधारित starter SPINE.md
तयार करतो. तुम्ही ते कधीही मुक्तपणे संपादित करू शकता -- ते फक्त markdown आहे.

### प्रभावी SPINE.md कसे लिहावे

एक चांगला SPINE.md विशिष्ट असतो. तुम्ही तुमच्या एजंटच्या भूमिकेबद्दल जितके ठोस
असाल, तितके ते चांगले कार्य करते. येथे एक शिफारस केलेली रचना आहे:

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

### सर्वोत्तम पद्धती

::: tip **व्यक्तिमत्वाबद्दल विशिष्ट असा.** "उपयुक्त व्हा" ऐवजी "संक्षिप्त, थेट
आणि स्पष्टतेसाठी bullet points वापरा" असे लिहा. :::

::: tip **मालकाबद्दल संदर्भ समाविष्ट करा.** एजंट जेव्हा तुमची भूमिका, साधने
आणि प्राधान्ये माहीत असतात तेव्हा चांगले कार्य करतो. :::

::: tip **स्पष्ट सीमा निश्चित करा.** एजंटने काय कधीही करू नये ते परिभाषित करा. हे
धोरण engine च्या निश्चायक अंमलबजावणीला पूरक आहे (परंतु बदलत नाही). :::

::: warning SPINE.md सूचना LLM च्या वर्तनास मार्गदर्शन करतात परंतु सुरक्षा नियंत्रणे नाहीत.
लागू करण्यायोग्य निर्बंधांसाठी, `triggerfish.yaml` मधील धोरण engine वापरा. धोरण
engine निश्चायक आहे आणि बायपास केले जाऊ शकत नाही -- SPINE.md सूचना करू शकतात. :::

## TRIGGER.md -- सक्रिय वर्तन

`TRIGGER.md` आवर्त wakeups दरम्यान तुमच्या एजंटने काय तपासावे, देखरेख करावी
आणि कृती करावी ते परिभाषित करते. cron jobs (जे schedule वर निश्चित कार्ये execute
करतात) च्या विपरीत, triggers एजंटला परिस्थिती मूल्यांकन करण्याची आणि कृती आवश्यक
आहे का ते ठरवण्याची स्वायत्तता देतात.

### फाइल स्थान

```
~/.triggerfish/TRIGGER.md
```

बहु-एजंट सेटअपसाठी:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Triggers कसे कार्य करतात

1. trigger loop कॉन्फिगर केलेल्या interval वर एजंट जागा करतो (
   `triggerfish.yaml` मध्ये सेट)
2. Triggerfish तुमचे TRIGGER.md लोड करतो आणि एजंटला सादर करतो
3. एजंट प्रत्येक आयटम मूल्यांकन करतो आणि आवश्यक असल्यास कृती करतो
4. सर्व trigger क्रिया सामान्य धोरण hooks मधून जातात
5. trigger session वर्गीकरण ceiling सह चालते (YAML मध्ये देखील कॉन्फिगर केलेले)
6. Quiet hours चा आदर केला जातो -- त्या वेळेत कोणताही trigger fire होत नाही

### YAML मध्ये Trigger कॉन्फिगरेशन

`triggerfish.yaml` मध्ये timing आणि constraints सेट करा:

```yaml
trigger:
  interval: 30m # दर 30 मिनिटांनी तपासा
  classification: INTERNAL # trigger sessions साठी कमाल taint ceiling
  quiet_hours: "22:00-07:00" # या वेळेत wakeups नाहीत
```

### TRIGGER.md कसे लिहावे

तुमचे triggers प्राधान्यानुसार organize करा. काय actionable मानले जाते आणि
एजंटने त्याबद्दल काय करावे याबद्दल विशिष्ट व्हा.

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

### उदाहरण: किमान TRIGGER.md

जर तुम्हाला एक साधा प्रारंभिक बिंदू हवा असेल:

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### उदाहरण: Developer-केंद्रित TRIGGER.md

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

### Triggers आणि धोरण Engine

सर्व trigger क्रिया इंटरॅक्टिव्ह संवादांसारख्याच धोरण अंमलबजावणीच्या अधीन आहेत:

- प्रत्येक trigger wakeup त्याच्या स्वतःच्या taint tracking सह isolated session
  spawn करतो
- तुमच्या YAML config मधील वर्गीकरण ceiling trigger ला कोणत्या डेटामध्ये प्रवेश
  मिळेल ते मर्यादित करते
- no write-down नियम लागू होतो -- जर trigger confidential डेटामध्ये प्रवेश करतो,
  ते public channel वर परिणाम पाठवू शकत नाही
- सर्व trigger क्रिया audit trail मध्ये लॉग केल्या जातात

::: info जर TRIGGER.md अनुपस्थित असेल, तर trigger wakeups कॉन्फिगर केलेल्या
interval वर होतात. एजंट त्याचे सामान्य ज्ञान आणि SPINE.md वापरून काय लक्ष देणे
आवश्यक आहे ते ठरवतो. सर्वोत्तम परिणामांसाठी, TRIGGER.md लिहा. :::

## SPINE.md विरुद्ध TRIGGER.md

| पैलू     | SPINE.md                           | TRIGGER.md                         |
| -------- | ---------------------------------- | ---------------------------------- |
| उद्देश   | एजंट कोण आहे ते परिभाषित करा      | एजंट काय देखरेख करतो ते परिभाषित करा |
| लोड      | प्रत्येक संदेश                     | प्रत्येक trigger wakeup             |
| व्याप्ती | सर्व संवाद                         | फक्त trigger sessions               |
| प्रभावित | व्यक्तिमत्व, ज्ञान, सीमा           | सक्रिय तपासणी आणि क्रिया           |
| आवश्यक   | हो (dive विझार्डद्वारे तयार केलेले) | नाही (परंतु शिफारस केलेले)          |

## पुढील पायऱ्या

- तुमच्या [triggerfish.yaml](./configuration) मध्ये trigger timing आणि cron jobs कॉन्फिगर करा
- [Commands reference](./commands) मध्ये सर्व उपलब्ध CLI कमांड्स बद्दल जाणून घ्या
