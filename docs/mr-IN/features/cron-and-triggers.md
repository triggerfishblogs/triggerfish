# Cron आणि Triggers

Triggerfish एजंट reactive question-and-answer पर्यंत मर्यादित नाहीत. Cron आणि
trigger system proactive वर्तन enable करतो: scheduled tasks, periodic check-ins,
morning briefings, background monitoring, आणि autonomous multi-step workflows.

## Cron Jobs

Cron jobs हे fixed instructions, delivery channel, आणि classification ceiling
सह scheduled tasks आहेत. ते standard cron expression syntax वापरतात.

### Configuration

`triggerfish.yaml` मध्ये cron jobs define करा किंवा runtime मध्ये एजंटला cron
tool द्वारे manage करू द्या:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM daily
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Where to deliver
        classification: INTERNAL # Max taint for this job

      - id: pipeline-check
        schedule: "0 */4 * * *" # Every 4 hours
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### हे कसे काम करते

1. **CronManager** standard cron expressions parse करतो आणि restarts survive
   करणारी persistent job registry maintain करतो.
2. Job fire होतो तेव्हा, **OrchestratorFactory** त्या execution साठी isolated
   orchestrator आणि session तयार करतो.
3. Job स्वतःच्या taint tracking सह **background session workspace** मध्ये चालतो.
4. Output configured channel ला deliver केले जाते, त्या channel च्या
   classification rules च्या अधीन.
5. Execution history audit साठी recorded केली जाते.

### Agent-Managed Cron

एजंट `cron` tool द्वारे स्वतःचे cron jobs create आणि manage करू शकतो:

| Action         | वर्णन                     | Security                                    |
| -------------- | ------------------------- | ------------------------------------------- |
| `cron.list`    | सर्व scheduled jobs list करा | Owner-only                               |
| `cron.create`  | नवीन job schedule करा     | Owner-only, classification ceiling enforced |
| `cron.delete`  | Scheduled job remove करा  | Owner-only                                  |
| `cron.history` | Past executions पहा        | Audit trail preserved                       |

::: warning Cron job creation साठी owner authentication आवश्यक आहे. एजंट
external users च्या वतीने jobs schedule करू शकत नाही किंवा configured
classification ceiling exceed करू शकत नाही. :::

### CLI Cron Management

Cron jobs command line वरून थेट manage केले जाऊ शकतात:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` flag job साठी classification ceiling set करतो. Valid levels
`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, आणि `RESTRICTED` आहेत. Omit केल्यास,
default `INTERNAL` आहे.

## Trigger System

Triggers periodic "check-in" loops आहेत जिथे एजंट कोणती proactive action
आवश्यक आहे का ते evaluate करण्यासाठी जागे होतो. Fixed tasks सह cron jobs
च्या विपरीत, triggers एजंटला काय attention आवश्यक आहे ते decide करण्याचा
discretion देतात.

### TRIGGER.md

`TRIGGER.md` प्रत्येक wakeup दरम्यान एजंटने काय check करावे ते define करतो.
ते `~/.triggerfish/config/TRIGGER.md` येथे राहते आणि एक freeform markdown file
आहे जिथे तुम्ही monitoring priorities, escalation rules, आणि proactive behaviors
specify करता.

`TRIGGER.md` absent असल्यास, एजंट काय attention आवश्यक आहे ते decide करण्यासाठी
त्याचे general knowledge वापरतो.

**Example TRIGGER.md:**

```markdown
# TRIGGER.md -- What to check on each wakeup

## Priority Checks

- Unread messages across all channels older than 1 hour
- Calendar conflicts in the next 24 hours
- Overdue tasks in Linear or Jira

## Monitoring

- GitHub: PRs awaiting my review
- Email: anything from VIP contacts (flag for immediate notification)
- Slack: mentions in #incidents channel

## Proactive

- If morning (7-9am), prepare daily briefing
- If Friday afternoon, draft weekly summary
```

### Trigger Configuration

`triggerfish.yaml` मध्ये trigger timing आणि constraints set केले जातात:

```yaml
scheduler:
  trigger:
    enabled: true # Triggers disable करण्यासाठी false वर set करा (default: true)
    interval_minutes: 30 # दर 30 minutes check करा (default: 30)
    # Config remove न करता triggers disable करण्यासाठी 0 वर set करा
    classification_ceiling: CONFIDENTIAL # Max taint ceiling (default: CONFIDENTIAL)
    quiet_hours:
      start: 22 # रात्री 10 वाजेपर्यंत जागे होऊ नका...
      end: 7 # ... आणि सकाळी 7 वाजेपर्यंत
```

| Setting                                 | वर्णन                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Periodic trigger wakeups active आहेत का. Disable करण्यासाठी `false` वर set करा.                                                              |
| `interval_minutes`                      | एजंट triggers check करण्यासाठी किती वेळाने जागे होतो (minutes मध्ये). Default: `30`. Config block remove न करता triggers disable करण्यासाठी `0` वर set करा. |
| `classification_ceiling`                | Trigger session reach करू शकणारी maximum classification level. Default: `CONFIDENTIAL`.                                                       |
| `quiet_hours.start` / `quiet_hours.end` | Hour range (24h clock) ज्या दरम्यान triggers suppressed केले जातात.                                                                           |

::: tip Triggers तात्पुरते disable करण्यासाठी, `interval_minutes: 0` set करा.
हे `enabled: false` च्या समतुल्य आहे आणि तुम्हाला इतर trigger settings जागेवर
ठेवण्यास परवानगी देते जेणेकरून तुम्ही सहजपणे re-enable करू शकता. :::

### Trigger Execution

प्रत्येक trigger wakeup हा sequence follow करतो:

1. Scheduler configured interval वर fire होतो.
2. `PUBLIC` taint सह fresh background session spawn केला जातो.
3. एजंट monitoring instructions साठी `TRIGGER.md` वाचतो.
4. एजंट available tools आणि MCP servers वापरून प्रत्येक check evaluate करतो.
5. Action आवश्यक असल्यास, एजंट act करतो -- notifications पाठवतो, tasks
   create करतो, किंवा summaries deliver करतो.
6. Session चा taint classified data access केल्यावर escalate होऊ शकतो, पण
   configured ceiling exceed करू शकत नाही.
7. Completion नंतर session archived केला जातो.

::: tip Triggers आणि cron jobs एकमेकांना complement करतात. Exact times वर
conditions विचारात न घेता run होणाऱ्या tasks साठी cron वापरा (सकाळी 7 वाजता
morning briefing). Judgment आवश्यक असलेल्या monitoring साठी triggers वापरा
(दर 30 minutes एकदा काही attention आवश्यक आहे का तपासा). :::

## Trigger Context Tool

एजंट `trigger_add_to_context` tool वापरून trigger results त्याच्या current
conversation मध्ये load करू शकतो. User शेवटच्या trigger wakeup दरम्यान check
केलेल्या गोष्टीबद्दल विचारतो तेव्हा हे उपयुक्त आहे.

### Usage

| Parameter | Default     | वर्णन                                                                                                          |
| --------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | कोणते trigger output load करायचे: `"trigger"` (periodic), `"cron:<job-id>"`, किंवा `"webhook:<source>"`       |

Tool specified source साठी most recent execution result load करतो आणि
conversation context मध्ये जोडतो.

### Write-Down Enforcement

Trigger context injection no-write-down rule respect करतो:

- Trigger चे classification session taint **exceed** करत असल्यास, session
  taint match करण्यासाठी **escalate** होतो
- Session taint trigger च्या classification **exceed** करत असल्यास, injection
  **allowed** आहे -- lower-classification data नेहमी higher-classification
  session मध्ये flow करू शकतो (normal `canFlowTo` वर्तन). Session taint
  unchanged आहे.

::: info CONFIDENTIAL session PUBLIC trigger result बिनदिक्कत load करू शकतो --
data upward flows. Reverse (PUBLIC ceiling सह session मध्ये CONFIDENTIAL trigger
data inject करणे) session taint CONFIDENTIAL ला escalate करेल. :::

### Persistence

Trigger results `StorageProvider` द्वारे `trigger:last:<source>` format मधील
keys सह stored आहेत. प्रत्येक source साठी फक्त most recent result kept आहे.

## Security Integration

सर्व scheduled execution core security model सह integrate होते:

- **Isolated sessions** -- प्रत्येक cron job आणि trigger wakeup independent
  taint tracking सह स्वतःच्या spawned session मध्ये चालतो.
- **Classification ceiling** -- Background tasks त्यांची configured
  classification level exceed करू शकत नाहीत, जरी ते invoke करत असलेल्या tools
  higher-classified data return करत असले तरी.
- **Policy hooks** -- Scheduled tasks मधील सर्व actions interactive sessions
  प्रमाणेच enforcement hooks मधून जातात (PRE_TOOL_CALL, POST_TOOL_RESPONSE,
  PRE_OUTPUT).
- **Channel classification** -- Output delivery target channel च्या classification
  level respect करतो. `CONFIDENTIAL` result `PUBLIC` channel ला पाठवला जाऊ
  शकत नाही.
- **Audit trail** -- प्रत्येक scheduled execution full context सह logged: job
  ID, session ID, taint history, actions taken, आणि delivery status.
- **Persistence** -- Cron jobs `StorageProvider` (namespace: `cron:`) द्वारे
  stored आहेत आणि gateway restarts survive करतात.
