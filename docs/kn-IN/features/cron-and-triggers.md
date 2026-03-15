# Cron ಮತ್ತು Triggers

Triggerfish agents ಪ್ರತಿಕ್ರಿಯಾತ್ಮಕ ಪ್ರಶ್ನೋತ್ತರಕ್ಕೆ ಸೀಮಿತವಾಗಿಲ್ಲ. Cron ಮತ್ತು
trigger ವ್ಯವಸ್ಥೆ ಸಕ್ರಿಯ ನಡವಳಿಕೆ ಸಕ್ರಿಯಗೊಳಿಸುತ್ತದೆ: ನಿಗದಿತ ಕಾರ್ಯಗಳು, ಆವರ್ತಕ
check-ins, ಬೆಳಿಗ್ಗೆ ಮಾಹಿತಿ, ಹಿನ್ನೆಲೆ ಮೇಲ್ವಿಚಾರಣೆ, ಮತ್ತು ಸ್ವಾಯತ್ತ ಮಲ್ಟಿ-ಸ್ಟೆಪ್
workflows.

## Cron Jobs

Cron jobs ಸ್ಥಿರ ಸೂಚನೆಗಳು, delivery channel, ಮತ್ತು classification ceiling ಇರುವ
ನಿಗದಿತ ಕಾರ್ಯಗಳಾಗಿವೆ. ಇವು ಸ್ಟ್ಯಾಂಡರ್ಡ್ cron expression syntax ಬಳಸುತ್ತವೆ.

### ಸಂರಚನೆ

`triggerfish.yaml` ನಲ್ಲಿ cron jobs ನಿರ್ಧರಿಸಿ ಅಥವಾ cron tool ಮೂಲಕ runtime ನಲ್ಲಿ
agent ಅವುಗಳನ್ನು ನಿರ್ವಹಿಸಲು ಬಿಡಿ:

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

### ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

1. **CronManager** ಸ್ಟ್ಯಾಂಡರ್ಡ್ cron expressions parse ಮಾಡಿ restarts ನಿಂದ ಬದುಕಿ
   ಉಳಿಯುವ ಶಾಶ್ವತ job registry ನಿರ್ವಹಿಸುತ್ತದೆ.
2. Job ಫೈರ್ ಆದಾಗ, **OrchestratorFactory** ಆ execution ಗಾಗಿ ವಿಶೇಷವಾಗಿ ಪ್ರತ್ಯೇಕ
   orchestrator ಮತ್ತು session ರಚಿಸುತ್ತದೆ.
3. Job **ಹಿನ್ನೆಲೆ session workspace** ನಲ್ಲಿ ತನ್ನದೇ taint tracking ಜೊತೆ ಚಲಿಸುತ್ತದೆ.
4. Output ಸಂರಚಿಸಿದ channel ಗೆ ತಲುಪಿಸಲ್ಪಡುತ್ತದೆ, ಆ channel ನ classification
   rules ಅಧೀನ.
5. Execution ಇತಿಹಾಸ audit ಗಾಗಿ ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ.

### Agent-Managed Cron

Agent `cron` tool ಮೂಲಕ ತನ್ನದೇ cron jobs ರಚಿಸಿ ನಿರ್ವಹಿಸಬಹುದು:

| Action         | Description             | Security                                    |
| -------------- | ----------------------- | ------------------------------------------- |
| `cron.list`    | ಎಲ್ಲ ನಿಗದಿತ jobs ಪಟ್ಟಿ | Owner-only                                  |
| `cron.create`  | ಹೊಸ job ನಿಗದಿಗೊಳಿಸಿ    | Owner-only, classification ceiling ಜಾರಿ    |
| `cron.delete`  | ನಿಗದಿತ job ತೆಗೆದುಹಾಕಿ  | Owner-only                                  |
| `cron.history` | ಹಿಂದಿನ executions ನೋಡಿ | Audit trail ಸಂರಕ್ಷಿತ                      |

::: warning Cron job ರಚನೆಗೆ owner authentication ಅಗತ್ಯ. Agent ಬಾಹ್ಯ ಬಳಕೆದಾರರ
ಪರವಾಗಿ jobs ನಿಗದಿಗೊಳಿಸಲು ಅಥವಾ ಸಂರಚಿಸಿದ classification ceiling ಮೀರಲಾಗದು. :::

### CLI Cron ನಿರ್ವಹಣೆ

Cron jobs command line ನಿಂದ ನೇರವಾಗಿ ನಿರ್ವಹಿಸಬಹುದು:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` flag job ಗಾಗಿ classification ceiling ಹೊಂದಿಸುತ್ತದೆ. ಮಾನ್ಯ
ಮಟ್ಟಗಳು: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, ಮತ್ತು `RESTRICTED`. ಬಿಟ್ಟರೆ
`INTERNAL` ಗೆ ಡಿಫಾಲ್ಟ್ ಆಗುತ್ತದೆ.

## Trigger ವ್ಯವಸ್ಥೆ

Triggers ಆವರ್ತಕ "check-in" loops ಆಗಿವೆ, ಅಲ್ಲಿ agent ಯಾವ ಸಕ್ರಿಯ ಕ್ರಿಯೆ
ಅಗತ್ಯವಿದೆಯೇ ಎಂದು ಮೌಲ್ಯಮಾಪನ ಮಾಡಲು ಎಚ್ಚರಗೊಳ್ಳುತ್ತದೆ. ಸ್ಥಿರ ಕಾರ್ಯಗಳಿರುವ cron
jobs ಭಿನ್ನವಾಗಿ, triggers ಏನು ಗಮನ ಅಗತ್ಯವೆಂದು ನಿರ್ಧರಿಸಲು agent ಗೆ ವಿವೇಚನೆ ನೀಡುತ್ತವೆ.

### TRIGGER.md

`TRIGGER.md` ಪ್ರತಿ wakeup ಸಮಯದಲ್ಲಿ agent ಏನನ್ನು ತಪಾಸಣೆ ಮಾಡಬೇಕು ಎಂದು ನಿರ್ಧರಿಸುತ್ತದೆ.
ಇದು `~/.triggerfish/config/TRIGGER.md` ನಲ್ಲಿ ಇರುತ್ತದೆ ಮತ್ತು ಮೇಲ್ವಿಚಾರಣಾ
ಆದ್ಯತೆಗಳು, escalation rules, ಮತ್ತು ಸಕ್ರಿಯ ನಡವಳಿಕೆಗಳನ್ನು ನಿರ್ಧರಿಸುವ freeform
markdown ಫೈಲ್ ಆಗಿದೆ.

`TRIGGER.md` ಇಲ್ಲದಿದ್ದರೆ, agent ಏನಿಗೆ ಗಮನ ಬೇಕೆಂದು ನಿರ್ಧರಿಸಲು ತನ್ನ ಸಾಮಾನ್ಯ
ಜ್ಞಾನ ಬಳಸುತ್ತದೆ.

**ಉದಾಹರಣೆ TRIGGER.md:**

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

### Trigger ಸಂರಚನೆ

Trigger timing ಮತ್ತು ನಿರ್ಬಂಧಗಳನ್ನು `triggerfish.yaml` ನಲ್ಲಿ ಹೊಂದಿಸಿ:

```yaml
scheduler:
  trigger:
    enabled: true # Set to false to disable triggers (default: true)
    interval_minutes: 30 # Check every 30 minutes (default: 30)
    # Set to 0 to disable triggers without removing config
    classification_ceiling: CONFIDENTIAL # Max taint ceiling (default: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Don't wake between 10 PM ...
      end: 7 # ... and 7 AM
```

| Setting                                 | Description                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | ಆವರ್ತಕ trigger wakeups ಸಕ್ರಿಯವಾಗಿದೆಯೇ. ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲು `false` ಹೊಂದಿಸಿ.                                                                  |
| `interval_minutes`                      | Agent triggers ತಪಾಸಣೆ ಮಾಡಲು ಎಷ್ಟು ಬಾರಿ (ನಿಮಿಷಗಳಲ್ಲಿ) ಎಚ್ಚರಗೊಳ್ಳುತ್ತದೆ. ಡಿಫಾಲ್ಟ್: `30`. Config block ತೆಗೆದುಹಾಕದೆ triggers ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲು `0` ಹೊಂದಿಸಿ. |
| `classification_ceiling`                | Trigger session ತಲುಪಬಹುದಾದ ಗರಿಷ್ಠ classification ಮಟ್ಟ. ಡಿಫಾಲ್ಟ್: `CONFIDENTIAL`.                                                           |
| `quiet_hours.start` / `quiet_hours.end` | Triggers suppress ಮಾಡಲ್ಪಡುವ ಗಂಟೆಯ ವ್ಯಾಪ್ತಿ (24h clock).                                                                                    |

::: tip Triggers ತಾತ್ಕಾಲಿಕವಾಗಿ ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲು `interval_minutes: 0` ಹೊಂದಿಸಿ.
ಇದು `enabled: false` ಗೆ ಸಮಾನ ಮತ್ತು ಇತರ trigger settings ಉಳಿಸಿಕೊಳ್ಳಲು ಅನುಮತಿಸುತ್ತದೆ
ಆದ್ದರಿಂದ ಸುಲಭವಾಗಿ ಮರು-ಸಕ್ರಿಯಗೊಳಿಸಬಹುದು. :::

### Trigger Execution

ಪ್ರತಿ trigger wakeup ಈ ಅನುಕ್ರಮ ಅನುಸರಿಸುತ್ತದೆ:

1. Scheduler ಸಂರಚಿಸಿದ interval ನಲ್ಲಿ ಫೈರ್ ಆಗುತ್ತದೆ.
2. `PUBLIC` taint ಜೊತೆ ತಾಜಾ ಹಿನ್ನೆಲೆ session spawn ಮಾಡಲ್ಪಡುತ್ತದೆ.
3. Agent ತನ್ನ ಮೇಲ್ವಿಚಾರಣಾ ಸೂಚನೆಗಳಿಗಾಗಿ `TRIGGER.md` ಓದುತ್ತದೆ.
4. Agent ಲಭ್ಯ tools ಮತ್ತು MCP servers ಬಳಸಿ ಪ್ರತಿ ತಪಾಸಣೆ ಮೌಲ್ಯಮಾಪಿಸುತ್ತದೆ.
5. ಕ್ರಿಯೆ ಅಗತ್ಯವಿದ್ದರೆ, agent ಕ್ರಿಯಿಸುತ್ತದೆ -- notifications ಕಳುಹಿಸುತ್ತದೆ,
   ಕಾರ್ಯಗಳನ್ನು ರಚಿಸುತ್ತದೆ, ಅಥವಾ ಸಾರಾಂಶಗಳನ್ನು ತಲುಪಿಸುತ್ತದೆ.
6. Session ನ taint classified ಡೇಟಾ ಪ್ರವೇಶಿಸಿದಂತೆ escalate ಆಗಬಹುದು, ಆದರೆ
   ಸಂರಚಿಸಿದ ceiling ಮೀರಲಾಗದು.
7. Session ಪೂರ್ಣವಾದ ನಂತರ archived ಮಾಡಲ್ಪಡುತ್ತದೆ.

::: tip Triggers ಮತ್ತು cron jobs ಪರಸ್ಪರ ಪೂರಕ. ಯಾವ conditions ಇದ್ದರೂ ನಿರ್ದಿಷ್ಟ
ಸಮಯಗಳಲ್ಲಿ ಚಲಿಸಬೇಕಾದ ಕಾರ್ಯಗಳಿಗೆ cron ಬಳಸಿ (ಬೆಳಿಗ್ಗೆ 7 ಗಂಟೆಗೆ briefing). ತೀರ್ಪು
ಅಗತ್ಯವಿರುವ ಮೇಲ್ವಿಚಾರಣೆಗೆ triggers ಬಳಸಿ (ಪ್ರತಿ 30 ನಿಮಿಷಗಳಿಗೆ ಏನಾದರೂ ಗಮನ
ಅಗತ್ಯವೇ ತಪಾಸಣೆ). :::

## Trigger Context Tool

Agent `trigger_add_to_context` tool ಬಳಸಿ ಪ್ರಸ್ತುತ conversation ಗೆ trigger
ಫಲಿತಾಂಶಗಳನ್ನು ಲೋಡ್ ಮಾಡಬಹುದು. ಬಳಕೆದಾರ ಕೊನೆಯ trigger wakeup ಸಮಯದಲ್ಲಿ ತಪಾಸಣೆ
ಮಾಡಿದ ಏನಾದರೂ ಬಗ್ಗೆ ಕೇಳಿದಾಗ ಉಪಯುಕ್ತ.

### ಬಳಕೆ

| Parameter | Default     | Description                                                                                      |
| --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `source`  | `"trigger"` | ಯಾವ trigger output ಲೋಡ್ ಮಾಡಬೇಕು: `"trigger"` (periodic), `"cron:<job-id>"`, ಅಥವಾ `"webhook:<source>"` |

Tool ನಿರ್ದಿಷ್ಟ source ಗಾಗಿ ಅತ್ಯಂತ ಇತ್ತೀಚಿನ execution ಫಲಿತಾಂಶ ಲೋಡ್ ಮಾಡಿ
conversation context ಗೆ ಸೇರಿಸುತ್ತದೆ.

### Write-Down Enforcement

Trigger context injection no-write-down rule ಗೌರವಿಸುತ್ತದೆ:

- Trigger ನ classification session taint **ಮೀರಿದ್ದರೆ**, session taint ಹೊಂದಾಣಿಕೆಯಾಗಲು
  **escalate ಆಗುತ್ತದೆ**
- Session taint trigger ನ classification **ಮೀರಿದ್ದರೆ**, injection **ಅನುಮತಿಸಲ್ಪಡುತ್ತದೆ** --
  ಕಡಿಮೆ-classification ಡೇಟಾ ಯಾವಾಗಲೂ ಹೆಚ್ಚು-classification session ಗೆ flow ಮಾಡಬಹುದು
  (ಸಾಮಾನ್ಯ `canFlowTo` ನಡವಳಿಕೆ). Session taint ಬದಲಾಗದು.

::: info CONFIDENTIAL session PUBLIC trigger ಫಲಿತಾಂಶ ಲೋಡ್ ಮಾಡಬಹುದು -- ಡೇಟಾ
ಮೇಲ್ಮುಖವಾಗಿ flow ಮಾಡುತ್ತದೆ. ವಿರುದ್ಧ (PUBLIC ceiling ಇರುವ session ಗೆ CONFIDENTIAL
trigger ಡೇಟಾ inject ಮಾಡುವುದು) session taint ಅನ್ನು CONFIDENTIAL ಗೆ escalate
ಮಾಡುತ್ತದೆ. :::

### Persistence

Trigger ಫಲಿತಾಂಶಗಳನ್ನು `trigger:last:<source>` format ನಲ್ಲಿ keys ಜೊತೆ
`StorageProvider` ಮೂಲಕ ಉಳಿಸಲ್ಪಡುತ್ತವೆ. ಪ್ರತಿ source ಗಾಗಿ ಅತ್ಯಂತ ಇತ್ತೀಚಿನ ಫಲಿತಾಂಶ
ಮಾತ್ರ ಉಳಿಸಿಕೊಳ್ಳಲ್ಪಡುತ್ತದೆ.

## ಭದ್ರತಾ ಸಂಯೋಜನೆ

ಎಲ್ಲ ನಿಗದಿತ execution core security model ಜೊತೆ ಸಂಯೋಜಿಸುತ್ತದೆ:

- **ಪ್ರತ್ಯೇಕ sessions** -- ಪ್ರತಿ cron job ಮತ್ತು trigger wakeup ಸ್ವತಂತ್ರ taint
  tracking ಜೊತೆ ತನ್ನದೇ spawned session ನಲ್ಲಿ ಚಲಿಸುತ್ತದೆ.
- **Classification ceiling** -- ಹಿನ್ನೆಲೆ ಕಾರ್ಯಗಳು invoke ಮಾಡಿದ tools
  ಹೆಚ್ಚು-classified ಡೇಟಾ ಹಿಂದಿರುಗಿಸಿದರೂ ಸಹ ಸಂರಚಿಸಿದ classification ಮಟ್ಟ ಮೀರಲಾಗದು.
- **Policy hooks** -- ನಿಗದಿತ ಕಾರ್ಯಗಳಲ್ಲಿನ ಎಲ್ಲ ಕ್ರಿಯೆಗಳು ಸಂವಾದಾತ್ಮಕ sessions
  (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT) ಅದೇ enforcement hooks ಮೂಲಕ
  ಹಾದು ಹೋಗುತ್ತವೆ.
- **Channel classification** -- Output delivery ಗುರಿ channel ನ classification
  ಮಟ್ಟ ಗೌರವಿಸುತ್ತದೆ. `CONFIDENTIAL` ಫಲಿತಾಂಶ `PUBLIC` channel ಗೆ ಕಳುಹಿಸಲಾಗದು.
- **Audit trail** -- ಪ್ರತಿ ನಿಗದಿತ execution ಪೂರ್ಣ context ಜೊತೆ ಲಾಗ್ ಮಾಡಲ್ಪಡುತ್ತದೆ:
  job ID, session ID, taint ಇತಿಹಾಸ, ತೆಗೆದ ಕ್ರಿಯೆಗಳು, ಮತ್ತು delivery status.
- **Persistence** -- Cron jobs `StorageProvider` ಮೂಲಕ ಉಳಿಸಲ್ಪಡುತ್ತವೆ (namespace:
  `cron:`) ಮತ್ತು gateway restarts ನಿಂದ ಬದುಕಿ ಉಳಿಯುತ್ತವೆ.
