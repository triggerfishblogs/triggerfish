# Cron மற்றும் Triggers

Triggerfish agents reactive கேள்வி-பதிலுக்கு மட்டும் மட்டுப்படுத்தப்படவில்லை. Cron மற்றும் trigger system proactive நடத்தையை enable செய்கிறது: scheduled tasks, periodic check-ins, morning briefings, background monitoring, மற்றும் autonomous multi-step workflows.

## Cron Jobs

Cron jobs நிலையான instructions, delivery channel, மற்றும் classification ceiling உடன் scheduled tasks. அவை standard cron expression syntax பயன்படுத்துகின்றன.

### கட்டமைப்பு

`triggerfish.yaml` இல் cron jobs வரையறுக்கவும் அல்லது cron tool மூலம் runtime இல் agent அவற்றை manage செய்யட்டும்:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # Daily 7 AM
        task: "Calendar, unread emails, மற்றும் weather உடன் morning briefing தயார் செய்யவும்"
        channel: telegram # எங்கே deliver செய்வது
        classification: INTERNAL # இந்த job க்கான Max taint

      - id: pipeline-check
        schedule: "0 */4 * * *" # ஒவ்வொரு 4 மணிநேரமும்
        task: "Salesforce pipeline ஐ changes க்காக சரிபார்க்கவும்"
        channel: slack
        classification: CONFIDENTIAL
```

### எவ்வாறு செயல்படுகிறது

1. **CronManager** standard cron expressions parse செய்கிறது மற்றும் restarts survive ஆகும் persistent job registry பராமரிக்கிறது.
2. ஒரு job fire ஆகும்போது, **OrchestratorFactory** அந்த execution க்கு பிரத்தியேக isolated orchestrator மற்றும் session உருவாக்குகிறது.
3. Job அதன் சொந்த taint tracking உடன் **background session workspace** இல் இயங்குகிறது.
4. Output கட்டமைக்கப்பட்ட channel க்கு deliver ஆகிறது, அந்த channel இன் classification rules க்கு உட்பட்டு.
5. Execution history audit க்காக பதிவு செய்யப்படுகிறது.

### Agent-Managed Cron

Agent `cron` tool மூலம் தன்னுடைய cron jobs உருவாக்கி manage செய்யலாம்:

| Action         | விளக்கம்                        | பாதுகாப்பு                                   |
| -------------- | -------------------------------- | ---------------------------------------------- |
| `cron.list`    | அனைத்து scheduled jobs பட்டியலிடவும் | Owner-only                                 |
| `cron.create`  | புதிய job schedule செய்யவும்    | Owner-only, classification ceiling enforced    |
| `cron.delete`  | Scheduled job நீக்கவும்         | Owner-only                                     |
| `cron.history` | கடந்த executions பாருங்கள்      | Audit trail பாதுகாக்கப்படுகிறது              |

::: warning Cron job உருவாக்கல் owner authentication தேவை. Agent external பயனர்கள் சார்பாக jobs schedule செய்யவோ கட்டமைக்கப்பட்ட classification ceiling ஐ மீறவோ முடியாது. :::

### CLI Cron Management

Command line இலிருந்தும் Cron jobs manage செய்யலாம்:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` flag job க்கான classification ceiling அமைக்கிறது. Valid நிலைகள் `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, மற்றும் `RESTRICTED`. விடுபட்டால், `INTERNAL` க்கு default ஆகிறது.

## Trigger System

Triggers periodic "check-in" loops -- agent எந்த proactive action தேவை என்று மதிப்பீட்டிற்கு wake up ஆகும். நிலையான tasks உடன் cron jobs போல் இல்லாமல், triggers எதற்கு கவனம் தேவை என்று தீர்மானிக்க agent க்கு discretion தருகின்றன.

### TRIGGER.md

`TRIGGER.md` ஒவ்வொரு wakeup போது agent என்ன சரிபார்க்க வேண்டும் என்று வரையறுக்கிறது. இது `~/.triggerfish/config/TRIGGER.md` இல் உள்ளது மற்றும் monitoring priorities, escalation rules, மற்றும் proactive behaviors குறிப்பிடும் ஒரு freeform markdown file.

`TRIGGER.md` இல்லையென்றால், agent எதற்கு கவனம் தேவை என்று தீர்மானிக்க தன்னுடைய general knowledge பயன்படுத்துகிறது.

**Example TRIGGER.md:**

```markdown
# TRIGGER.md -- ஒவ்வொரு wakeup போது என்ன சரிபார்க்க வேண்டும்

## Priority Checks

- அனைத்து channels இல் 1 மணிநேரத்திற்கு பழைய unread செய்திகள்
- அடுத்த 24 மணிநேரத்தில் calendar conflicts
- Linear அல்லது Jira இல் overdue tasks

## Monitoring

- GitHub: என் review காத்திருக்கும் PRs
- Email: VIP contacts இடமிருந்து எதுவும் (உடனடி notification க்கு flag செய்யவும்)
- Slack: #incidents channel இல் mentions

## Proactive

- காலை (7-9am) ஆனால், daily briefing தயார் செய்யவும்
- வெள்ளிக்கிழமை மாலை ஆனால், weekly summary draft செய்யவும்
```

### Trigger கட்டமைப்பு

`triggerfish.yaml` இல் trigger timing மற்றும் constraints அமைக்கப்படுகின்றன:

```yaml
scheduler:
  trigger:
    enabled: true # Triggers முடக்க false ஆக அமைக்கவும் (default: true)
    interval_minutes: 30 # ஒவ்வொரு 30 நிமிடங்களும் சரிபார்க்கவும் (default: 30)
    # Config நீக்காமல் triggers முடக்க 0 ஆக அமைக்கவும்
    classification_ceiling: CONFIDENTIAL # Max taint ceiling (default: CONFIDENTIAL)
    quiet_hours:
      start: 22 # இரவு 10 மணிக்கு இடையில் எழுப்பாதீர்கள் ...
      end: 7 # ... காலை 7 மணி வரை
```

| Setting                                 | விளக்கம்                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`                               | Periodic trigger wakeups active ஆக உள்ளதா. முடக்க `false` அமைக்கவும்.                                                            |
| `interval_minutes`                      | Agent triggers சரிபார்க்க எவ்வளவு அடிக்கடி (நிமிடங்களில்) wake up ஆகிறது. Default: `30`. Config block நீக்காமல் triggers முடக்க `0` அமைக்கவும். |
| `classification_ceiling`                | Trigger session அடையக்கூடிய அதிகபட்ச classification நிலை. Default: `CONFIDENTIAL`.                                                |
| `quiet_hours.start` / `quiet_hours.end` | Triggers suppress ஆகும் hour range (24h clock).                                                                                     |

::: tip Triggers தற்காலிகமாக முடக்க, `interval_minutes: 0` அமைக்கவும். இது `enabled: false` க்கு சமம் மற்றும் உங்கள் மற்ற trigger settings ஐ place இல் வைக்கிறது, இதனால் எளிதாக re-enable செய்யலாம். :::

### Trigger Execution

ஒவ்வொரு trigger wakeup உம் இந்த sequence பின்பற்றுகிறது:

1. Scheduler கட்டமைக்கப்பட்ட interval இல் fire ஆகிறது.
2. `PUBLIC` taint உடன் ஒரு fresh background session spawn ஆகிறது.
3. Agent தன்னுடைய monitoring instructions க்கு `TRIGGER.md` படிக்கிறது.
4. Agent available tools மற்றும் MCP servers பயன்படுத்தி ஒவ்வொரு check ஐயும் மதிப்பீட்டு செய்கிறது.
5. Action தேவையென்றால், agent செயல்படுகிறது -- notifications அனுப்புகிறது, tasks உருவாக்குகிறது, அல்லது summaries deliver செய்கிறது.
6. Session இன் taint classified data அணுகப்படும்போது escalate ஆகலாம், ஆனால் கட்டமைக்கப்பட்ட ceiling ஐ மீற முடியாது.
7. Completion க்கு பிறகு session archived ஆகிறது.

::: tip Triggers மற்றும் cron jobs ஒன்றை ஒன்று complement செய்கின்றன. Conditions பொருட்படுத்தாமல் சரியான நேரத்தில் இயங்க வேண்டிய tasks க்கு cron பயன்படுத்தவும் (காலை 7 மணிக்கு morning briefing). Judgment தேவைப்படும் monitoring க்கு triggers பயன்படுத்தவும் (ஒவ்வொரு 30 நிமிடங்களும் கவனம் தேவையான எதுவும் உள்ளதா என்று சரிபார்க்கவும்). :::

## Trigger Context Tool

Agent `trigger_add_to_context` tool பயன்படுத்தி கடைசி trigger wakeup இல் சரிபார்க்கப்பட்ட திரும்ப தன்னுடைய current conversation இல் trigger results load செய்யலாம்.

### பயன்பாடு

| Parameter | Default     | விளக்கம்                                                                                        |
| --------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | எந்த trigger output load செய்வது: `"trigger"` (periodic), `"cron:<job-id>"`, அல்லது `"webhook:<source>"` |

Tool குறிப்பிட்ட source க்கான மிகச்சமீபத்திய execution result load செய்கிறது மற்றும் conversation context க்கு சேர்க்கிறது.

### Write-Down Enforcement

Trigger context injection no-write-down விதியை மதிக்கிறது:

- Trigger இன் classification session taint ஐ **மீறினால்**, session taint பொருந்த **escalate** ஆகிறது
- Session taint trigger இன் classification ஐ **மீறினால்**, injection **allowed** -- குறைந்த classification data எப்போதும் அதிக classification session க்கு flow ஆகலாம் (normal `canFlowTo` நடத்தை). Session taint மாறாமல் இருக்கிறது.

::: info ஒரு CONFIDENTIAL session ஒரு PUBLIC trigger result ஐ சிக்கலில்லாமல் load செய்யலாம் -- data upward flow ஆகிறது. இதற்கு நேர்மாறு (PUBLIC ceiling உடன் ஒரு session க்கு CONFIDENTIAL trigger data inject செய்வது) session taint ஐ CONFIDENTIAL க்கு escalate செய்யும். :::

### Persistence

Trigger results `StorageProvider` மூலம் `trigger:last:<source>` format இல் keys உடன் stored ஆகின்றன. ஒவ்வொரு source க்கும் மிகச்சமீபத்திய result மட்டும் வைக்கப்படுகிறது.

## பாதுகாப்பு Integration

அனைத்து scheduled execution உம் core பாதுகாப்பு model உடன் integrate ஆகிறது:

- **Isolated sessions** -- ஒவ்வொரு cron job மற்றும் trigger wakeup உம் independent taint tracking உடன் அதன் சொந்த spawned session இல் இயங்குகிறது.
- **Classification ceiling** -- Background tasks invoke செய்யும் tools அதிக-classified data return செய்தாலும், அவற்றின் கட்டமைக்கப்பட்ட classification நிலையை மீற முடியாது.
- **Policy hooks** -- Scheduled tasks இல் அனைத்து actions உம் interactive sessions போல் அதே enforcement hooks மூலம் செல்கின்றன (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Channel classification** -- Output delivery target channel இன் classification நிலையை மதிக்கிறது. ஒரு `CONFIDENTIAL` result ஒரு `PUBLIC` channel க்கு அனுப்ப முடியாது.
- **Audit trail** -- ஒவ்வொரு scheduled execution உம் முழு context உடன் log ஆகிறது: job ID, session ID, taint history, actions taken, மற்றும் delivery status.
- **Persistence** -- Cron jobs `StorageProvider` மூலம் stored ஆகின்றன (namespace: `cron:`) மற்றும் gateway restarts survive ஆகும்.
