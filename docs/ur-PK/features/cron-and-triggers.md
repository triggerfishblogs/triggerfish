# Cron اور Triggers

Triggerfish ایجنٹس reactive سوال-جواب تک محدود نہیں۔ Cron اور trigger system
proactive behavior ممکن بناتی ہے: scheduled tasks، periodic check-ins، morning
briefings، background monitoring، اور autonomous multi-step workflows۔

## Cron Jobs

Cron jobs fixed instructions، delivery channel، اور classification ceiling کے ساتھ
scheduled tasks ہیں۔ یہ standard cron expression syntax استعمال کرتے ہیں۔

### Configuration

`triggerfish.yaml` میں cron jobs define کریں یا ایجنٹ کو runtime میں cron tool
کے ذریعے manage کرنے دیں:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # روزانہ صبح 7 بجے
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Deliver کہاں کریں
        classification: INTERNAL # اس job کا max taint

      - id: pipeline-check
        schedule: "0 */4 * * *" # ہر 4 گھنٹے
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### یہ کیسے کام کرتا ہے

1. **CronManager** standard cron expressions parse کرتا ہے اور ایک persistent job
   registry maintain کرتا ہے جو restarts کے پار survive ہوتی ہے۔
2. جب job fire ہوتی ہے، **OrchestratorFactory** اس execution کے لیے مخصوص
   isolated orchestrator اور session بناتا ہے۔
3. Job اپنے taint tracking کے ساتھ **background session workspace** میں چلتی ہے۔
4. Output configured channel کو deliver ہوتا ہے، اس channel کے classification rules
   کے تابع۔
5. Execution history audit کے لیے record ہوتی ہے۔

### Agent-Managed Cron

ایجنٹ `cron` tool کے ذریعے اپنی cron jobs بنا اور manage کر سکتا ہے:

| Action         | تفصیل                     | Security                                        |
| -------------- | -------------------------- | ----------------------------------------------- |
| `cron.list`    | تمام scheduled jobs list کریں | صرف owner                                  |
| `cron.create`  | نئی job schedule کریں      | صرف owner، classification ceiling enforce      |
| `cron.delete`  | Scheduled job ہٹائیں       | صرف owner                                       |
| `cron.history` | گزشتہ executions دیکھیں   | Audit trail preserved                           |

::: warning Cron job creation کے لیے owner authentication ضروری ہے۔ ایجنٹ
external users کی طرف سے jobs schedule نہیں کر سکتا یا configured classification
ceiling سے تجاوز نہیں کر سکتا۔ :::

### CLI Cron Management

Cron jobs command line سے بھی manage کی جا سکتی ہیں:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` flag job کے لیے classification ceiling set کرتا ہے۔ Valid levels
`PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، اور `RESTRICTED` ہیں۔ اگر omit کریں تو
ڈیفالٹ `INTERNAL` ہے۔

## Trigger System

Triggers periodic "check-in" loops ہیں جہاں ایجنٹ evaluate کرنے کے لیے wakes up
کہ آیا کوئی proactive action ضروری ہے۔ Fixed tasks والے cron jobs کے برخلاف،
triggers ایجنٹ کو discretion دیتے ہیں کہ کیا توجہ کا ضرورتمند ہے۔

### TRIGGER.md

`TRIGGER.md` define کرتا ہے کہ ایجنٹ کو ہر wakeup کے دوران کیا check کرنا چاہیے۔
یہ `~/.triggerfish/config/TRIGGER.md` پر رہتا ہے اور ایک freeform markdown file ہے
جہاں آپ monitoring priorities، escalation rules، اور proactive behaviors specify
کرتے ہیں۔

اگر `TRIGGER.md` غائب ہو، تو ایجنٹ یہ فیصلہ کرنے کے لیے اپنا general knowledge
استعمال کرتا ہے کہ کیا توجہ کا ضرورت ہے۔

**مثالی TRIGGER.md:**

```markdown
# TRIGGER.md -- ہر wakeup پر کیا check کریں

## Priority Checks

- 1 گھنٹے سے زیادہ پرانے تمام channels میں unread messages
- اگلے 24 گھنٹوں میں calendar conflicts
- Linear یا Jira میں overdue tasks

## Monitoring

- GitHub: میرے review کا انتظار کرتے PRs
- Email: VIP contacts سے کچھ بھی (فوری notification کے لیے flag)
- Slack: #incidents channel میں mentions

## Proactive

- اگر صبح ہو (7-9am)، daily briefing تیار کریں
- اگر جمعہ کی دوپہر ہو، weekly summary draft کریں
```

### Trigger Configuration

Trigger timing اور constraints `triggerfish.yaml` میں set ہوتی ہیں:

```yaml
scheduler:
  trigger:
    enabled: true # Triggers disable کرنے کے لیے false
    interval_minutes: 30 # ہر 30 منٹ check کریں (ڈیفالٹ: 30)
    # Config ہٹائے بغیر triggers disable کرنے کے لیے 0 set کریں
    classification_ceiling: CONFIDENTIAL # Max taint ceiling (ڈیفالٹ: CONFIDENTIAL)
    quiet_hours:
      start: 22 # رات 10 بجے سے نہ جگائیں ...
      end: 7 # ... صبح 7 بجے تک
```

| Setting                                 | تفصیل                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`                               | آیا periodic trigger wakeups active ہیں۔ Disable کرنے کے لیے `false` set کریں                                                            |
| `interval_minutes`                      | Agent کتنی بار (منٹوں میں) triggers check کرنے کے لیے wakes up ہو۔ ڈیفالٹ: `30`۔ Config block ہٹائے بغیر triggers disable کرنے کے لیے `0` |
| `classification_ceiling`                | Trigger session جو زیادہ سے زیادہ classification level پہنچ سکتی ہے۔ ڈیفالٹ: `CONFIDENTIAL`                                              |
| `quiet_hours.start` / `quiet_hours.end` | Hour range (24h clock) جس کے دوران triggers suppress ہوتے ہیں                                                                            |

::: tip Triggers عارضی طور پر disable کرنے کے لیے `interval_minutes: 0` set کریں۔
یہ `enabled: false` کے برابر ہے اور آپ کی دیگر trigger settings برقرار رکھتا ہے تاکہ
آسانی سے re-enable کر سکیں۔ :::

### Trigger Execution

ہر trigger wakeup اس sequence کو follow کرتی ہے:

1. Scheduler configured interval پر fire ہوتا ہے۔
2. `PUBLIC` taint کے ساتھ fresh background session spawn ہوتی ہے۔
3. ایجنٹ اپنی monitoring instructions کے لیے `TRIGGER.md` پڑھتا ہے۔
4. ایجنٹ ہر check evaluate کرتا ہے، available tools اور MCP servers استعمال کرتا ہے۔
5. اگر action ضروری ہو، ایجنٹ act کرتا ہے — notifications بھیجتا ہے، tasks بناتا
   ہے، یا summaries deliver کرتا ہے۔
6. Session کا taint escalate ہو سکتا ہے جیسے classified data access ہوتا ہے، لیکن
   configured ceiling سے تجاوز نہیں کر سکتا۔
7. Session completion کے بعد archive ہو جاتی ہے۔

::: tip Triggers اور cron jobs ایک دوسرے کی تکمیل کرتے ہیں۔ Cron ایسے tasks کے
لیے استعمال کریں جو conditions سے قطع نظر exact times پر چلنے چاہیے (صبح 7 بجے
morning briefing)۔ Triggers monitoring کے لیے استعمال کریں جس میں judgment درکار ہو
(ہر 30 منٹ check کریں کہ آیا کچھ میری توجہ چاہتا ہے)۔ :::

## Trigger Context Tool

ایجنٹ `trigger_add_to_context` tool استعمال کر کے trigger results کو اپنی current
conversation میں load کر سکتا ہے۔ یہ تب مفید ہوتا ہے جب user کسی ایسی چیز کے
بارے میں پوچھے جو آخری trigger wakeup کے دوران check کی گئی تھی۔

### Usage

| Parameter | Default     | تفصیل                                                                                       |
| --------- | ----------- | -------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | کون سا trigger output load کریں: `"trigger"` (periodic)، `"cron:<job-id>"`، یا `"webhook:<source>"` |

Tool specified source کے لیے سب سے recent execution result load کرتا ہے اور اسے
conversation context میں شامل کرتا ہے۔

### Write-Down Enforcement

Trigger context injection no-write-down rule کا احترام کرتی ہے:

- اگر trigger کی classification session taint سے **زیادہ** ہو، تو session taint
  **escalate** ہو کر match کرتا ہے
- اگر session taint trigger کی classification سے **زیادہ** ہو، تو injection
  **allowed** ہے — lower-classification data ہمیشہ higher-classification session میں
  flow کر سکتا ہے (عام `canFlowTo` behavior)۔ Session taint unchanged رہتا ہے۔

::: info CONFIDENTIAL session بغیر مسئلے کے PUBLIC trigger result load کر سکتی ہے —
data اوپر flow ہوتا ہے۔ الٹا (PUBLIC ceiling والی session میں CONFIDENTIAL trigger
data inject کرنا) session taint کو CONFIDENTIAL تک escalate کرے گا۔ :::

### Persistence

Trigger results `StorageProvider` کے ذریعے `trigger:last:<source>` format میں
keys کے ساتھ store ہوتے ہیں۔ صرف ہر source کا سب سے recent result رکھا جاتا ہے۔

## Security Integration

تمام scheduled execution core security model کے ساتھ integrate ہوتا ہے:

- **Isolated sessions** -- ہر cron job اور trigger wakeup اپنی spawned session میں
  independent taint tracking کے ساتھ چلتی ہے۔
- **Classification ceiling** -- Background tasks اپنے configured classification
  level سے تجاوز نہیں کر سکتے، چاہے جو tools وہ invoke کریں higher-classified
  data واپس کریں۔
- **Policy hooks** -- Scheduled tasks میں تمام actions interactive sessions کی طرح
  enforcement hooks سے گزرتے ہیں (PRE_TOOL_CALL، POST_TOOL_RESPONSE، PRE_OUTPUT)۔
- **Channel classification** -- Output delivery target channel کے classification
  level کا احترام کرتی ہے۔ `CONFIDENTIAL` نتیجہ `PUBLIC` channel کو نہیں بھیجا
  جا سکتا۔
- **Audit trail** -- ہر scheduled execution full context کے ساتھ logged ہوتی ہے:
  job ID، session ID، taint history، actions taken، اور delivery status۔
- **Persistence** -- Cron jobs `StorageProvider` کے ذریعے store ہوتی ہیں (namespace:
  `cron:`) اور gateway restarts کے پار survive ہوتی ہیں۔
