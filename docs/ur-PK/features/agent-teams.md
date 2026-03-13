# Agent Teams

Triggerfish ایجنٹس collaborating agents کی persistent teams spawn کر سکتے ہیں
جو مل کر complex tasks پر کام کرتے ہیں۔ ہر team member کو اپنی session، role،
conversation context، اور tools ملتی ہیں۔ ایک member **lead** designate ہوتا ہے
جو کام coordinate کرتا ہے۔

Teams open-ended tasks کے لیے بہترین ہیں جو parallel میں کام کرنے والے specialized
roles سے benefit کریں: research + analysis + writing، architecture + implementation
+ review، یا کوئی بھی task جہاں مختلف perspectives ایک دوسرے کے کام پر iterate
کریں۔

::: info Availability
Agent Teams Triggerfish Gateway استعمال کرتے وقت **Power** plan ($149/month) پر
ضروری ہیں۔ اپنی API keys چلانے والے open source users کو agent teams تک مکمل
رسائی ہے — ہر team member آپ کے configured provider سے inference consume کرتا ہے۔
:::

## Tools

### `team_create`

Agents کی persistent team بنائیں جو task پر collaborate کریں۔ Member roles، tools،
اور models define کریں۔ بالکل ایک member lead ہونا چاہیے۔

| Parameter                | Type   | ضروری | تفصیل                                                            |
| ------------------------ | ------ | :---: | ----------------------------------------------------------------- |
| `name`                   | string | ہاں   | Human-readable team name                                         |
| `task`                   | string | ہاں   | Team کا objective (lead کو initial instructions کے طور پر بھیجا) |
| `members`                | array  | ہاں   | Team member definitions (نیچے دیکھیں)                            |
| `idle_timeout_seconds`   | number | نہیں  | Per-member idle timeout۔ ڈیفالٹ: 300 (5 منٹ)                    |
| `max_lifetime_seconds`   | number | نہیں  | زیادہ سے زیادہ team lifetime۔ ڈیفالٹ: 3600 (1 گھنٹہ)            |
| `classification_ceiling` | string | نہیں  | Team-wide classification ceiling (مثلاً `CONFIDENTIAL`)           |

**Member definition:**

| Field                    | Type    | ضروری | تفصیل                                                       |
| ------------------------ | ------- | :---: | ------------------------------------------------------------ |
| `role`                   | string  | ہاں   | Unique role identifier (مثلاً `researcher`، `reviewer`)     |
| `description`            | string  | ہاں   | یہ member کیا کرتا ہے (system prompt میں inject ہوتا ہے)    |
| `is_lead`                | boolean | ہاں   | آیا یہ member team lead ہے                                   |
| `model`                  | string  | نہیں  | اس member کے لیے model override                             |
| `classification_ceiling` | string  | نہیں  | Per-member classification ceiling                            |
| `initial_task`           | string  | نہیں  | Initial instructions (lead ڈیفالٹ team task لیتا ہے)         |

**Validation rules:**

- Team میں بالکل ایک member کے ساتھ `is_lead: true` ہونا چاہیے
- تمام roles unique اور non-empty ہونے چاہیے
- Member classification ceilings team ceiling سے زیادہ نہیں ہو سکتے
- `name` اور `task` non-empty ہونے چاہیے

### `team_status`

Active team کی current state چیک کریں۔

| Parameter | Type   | ضروری | تفصیل   |
| --------- | ------ | :---: | -------- |
| `team_id` | string | ہاں   | Team ID  |

Team کا status، aggregate taint level، اور per-member details واپس کرتا ہے جن میں
ہر member کا current taint، status، اور last activity timestamp شامل ہیں۔

### `team_message`

مخصوص team member کو message بھیجیں۔ Additional context فراہم کرنے، کام
redirect کرنے، یا progress updates مانگنے کے لیے مفید۔

| Parameter | Type   | ضروری | تفصیل                                           |
| --------- | ------ | :---: | ------------------------------------------------ |
| `team_id` | string | ہاں   | Team ID                                         |
| `role`    | string | نہیں  | Target member role (ڈیفالٹ lead)               |
| `message` | string | ہاں   | Message content                                 |

Team `running` status میں ہونی چاہیے اور target member `active` یا `idle` ہونا
چاہیے۔

### `team_disband`

Team بند کریں اور تمام member sessions terminate کریں۔

| Parameter | Type   | ضروری | تفصیل                              |
| --------- | ------ | :---: | ----------------------------------- |
| `team_id` | string | ہاں   | Team ID                             |
| `reason`  | string | نہیں  | Team کیوں disband ہو رہی ہے        |

صرف team بنانے والی session یا lead member team disband کر سکتی ہے۔

## Teams کیسے کام کرتی ہیں

### Creation

جب ایجنٹ `team_create` call کرتا ہے، Triggerfish:

1. Team definition validate کرتا ہے (roles، lead count، classification ceilings)
2. Orchestrator factory کے ذریعے ہر member کے لیے isolated agent session spawn
   کرتا ہے
3. ہر member کے system prompt میں **team roster prompt** inject کرتا ہے، ان کا
   role، teammates، اور collaboration instructions describe کرتا ہے
4. Lead کو initial task بھیجتا ہے (یا per member custom `initial_task`)
5. Lifecycle monitor start کرتا ہے جو ہر 30 سیکنڈ team health check کرتا ہے

ہر member session اپنے conversation context، taint tracking، اور tool access کے
ساتھ fully isolated ہے۔

### Collaboration

Team members ایک دوسرے سے `sessions_send` استعمال کر کے communicate کرتے ہیں۔
Creating agent کو members کے درمیان messages relay کرنے کی ضرورت نہیں۔ Typical
flow:

1. Lead کو team objective ملتا ہے
2. Lead task decompose کرتا ہے اور `sessions_send` کے ذریعے members کو assignments
   بھیجتا ہے
3. Members autonomously کام کرتے ہیں، tools call اور iterate کرتے ہیں
4. Members نتائج lead کو (یا directly کسی دوسرے member کو) بھیجتے ہیں
5. Lead نتائج synthesize کرتا ہے اور فیصلہ کرتا ہے کہ کام کب ختم ہوا
6. Lead team بند کرنے کے لیے `team_disband` call کرتا ہے

Team members کے درمیان messages directly orchestrator کے ذریعے deliver ہوتے ہیں
— ہر message recipient کی session میں full agent turn trigger کرتا ہے۔

### Status

`team_status` کسی بھی وقت progress check کرنے کے لیے استعمال کریں۔ Response میں
شامل ہے:

- **Team status:** `running`، `paused`، `completed`، `disbanded`، یا `timed_out`
- **Aggregate taint:** تمام members میں سب سے زیادہ classification level
- **Per-member details:** Role، status (`active`، `idle`، `completed`، `failed`)،
  current taint level، اور last activity timestamp

### Disband

Teams کو disband کیا جا سکتا ہے:

- Creating session کے `team_disband` call سے
- Lead member کے `team_disband` call سے
- Lifecycle monitor کے lifetime limit expire ہونے پر auto-disband سے
- Lifecycle monitor کے تمام members inactive detect کرنے پر

Team disband ہونے پر، تمام active member sessions terminate اور resources clean up
ہوتے ہیں۔

## Team Roles

### Lead

Lead member team coordinate کرتا ہے۔ بنانے پر:

- Team کا `task` اپنی initial instructions کے طور پر receive کرتا ہے (جب تک
  `initial_task` سے override نہ ہو)
- Work decompose کرنے، tasks assign کرنے، اور objective کب meet ہوا decide کرنے
  کے لیے system prompt instructions ملتی ہیں
- Team disband کا authorized ہے

ہر team میں بالکل ایک lead ہوتا ہے۔

### Members

Non-lead members specialists ہیں۔ بنانے پر:

- اگر `initial_task` ہو تو receive کرتے ہیں، ورنہ idle رہتے ہیں جب تک lead انہیں
  کام نہ بھیجے
- Completed work lead یا اگلے appropriate teammate کو بھیجنے کے لیے system prompt
  instructions ملتی ہیں
- Team disband نہیں کر سکتے

## Lifecycle Monitoring

Teams کی automatic lifecycle monitoring ہر 30 سیکنڈ چلتی ہے۔

### Idle Timeout

ہر member کا idle timeout ہوتا ہے (ڈیفالٹ: 5 منٹ)۔ جب member idle ہو:

1. **پہلی threshold (idle_timeout_seconds):** Member کو nudge message ملتا ہے
   جو پوچھتا ہے کہ اگر کام complete ہو تو نتائج بھیجیں
2. **Double threshold (2x idle_timeout_seconds):** Member terminate ہوتا ہے اور
   lead کو notify کیا جاتا ہے

### Lifetime Timeout

Teams کی زیادہ سے زیادہ lifetime ہوتی ہے (ڈیفالٹ: 1 گھنٹہ)۔ Limit پہنچنے پر:

1. Lead کو 60 سیکنڈ کے ساتھ warning message ملتا ہے کہ final output produce کرے
2. Grace period کے بعد، team automatically disband ہو جاتی ہے

### Health Checks

Monitor ہر 30 سیکنڈ session health check کرتا ہے:

- **Lead failure:** اگر lead session no longer reachable ہو، team paused ہوتی ہے
  اور creating session notify ہوتی ہے
- **Member failure:** اگر member session gone ہو، اسے `failed` mark کیا جاتا ہے
  اور lead کو notify کیا جاتا ہے کہ remaining members کے ساتھ continue کریں
- **All inactive:** اگر تمام members `completed` یا `failed` ہوں، creating session
  کو notify کیا جاتا ہے کہ یا نئی instructions inject کریں یا disband کریں

## Classification اور Taint

Team member sessions تمام دوسری sessions کی طرح classification rules follow کرتی ہیں:

- ہر member `PUBLIC` taint سے شروع ہوتا ہے اور classified data access کرتے ہوئے
  escalate ہوتا ہے
- **Classification ceilings** per-team یا per-member set کی جا سکتی ہیں یہ restrict
  کرنے کے لیے کہ members کیا data access کر سکتے ہیں
- **Write-down enforcement** تمام inter-member communication پر لاگو ہوتی ہے۔
  `CONFIDENTIAL` پر tainted member `PUBLIC` member کو data نہیں بھیج سکتا
- **Aggregate taint** (تمام members میں سب سے زیادہ taint) `team_status` میں
  report ہوتا ہے تاکہ creating session team کی overall classification exposure
  track کر سکے

::: danger SECURITY Member classification ceilings team ceiling سے زیادہ نہیں
ہو سکتے۔ اگر team ceiling `INTERNAL` ہے، تو کوئی member `CONFIDENTIAL` ceiling
کے ساتھ configure نہیں ہو سکتا۔ یہ creation کے وقت validate ہوتا ہے۔ :::

## Teams بمقابلہ Sub-Agents

| پہلو            | Sub-Agent (`subagent`)                      | Team (`team_create`)                                    |
| --------------- | ------------------------------------------- | ------------------------------------------------------- |
| **Lifetime**    | Single task، result واپس کر کے exit        | Disband یا timed out ہونے تک persistent                 |
| **Members**     | ایک agent                                   | Multiple agents مختلف roles کے ساتھ                    |
| **Interaction** | Parent سے fire-and-forget                   | Members `sessions_send` کے ذریعے آزادانہ communicate کرتے ہیں |
| **Coordination**| Parent result کا انتظار کرتا ہے            | Lead coordinate کرتا ہے، parent `team_status` سے check کر سکتا ہے |
| **Use case**    | Focused single-step delegation              | Complex multi-role collaboration                        |

**Sub-agents** تب استعمال کریں جب آپ کو focused task کرنے اور result واپس کرنے
کے لیے single agent چاہیے۔ **Teams** تب استعمال کریں جب task multiple specialized
perspectives سے benefit کرے جو ایک دوسرے کے کام پر iterate کریں۔

::: tip Teams بنانے کے بعد autonomous ہوتی ہیں۔ Creating agent status check اور
messages بھیج سکتا ہے، لیکن micromanage کرنے کی ضرورت نہیں۔ Lead coordination
handle کرتا ہے۔ :::
