# Agent Teams

Triggerfish agents complex tasks இல் சேர்ந்து வேலை செய்யும் collaborating agents இன் persistent teams spawn செய்யலாம். ஒவ்வொரு team member உம் அதன் சொந்த session, role, conversation context, மற்றும் tools பெறுகிறது. ஒரு member **lead** என்று நியமிக்கப்படுகிறது மற்றும் வேலையை coordinate செய்கிறது.

Parallel ஆக வேலை செய்யும் specialized roles இலிருந்து பயனடையும் open-ended tasks க்கு Teams சிறந்தது: research + analysis + writing, architecture + implementation + review, அல்லது different perspectives ஒன்றோடொன்று iterate செய்ய வேண்டும் எந்த task உம்.

::: info Availability
Agent Teams Triggerfish Gateway பயன்படுத்தும்போது **Power** plan ($149/month) தேவை. தங்கள் சொந்த API keys இயக்கும் open source பயனர்களுக்கு agent teams க்கு முழு அணுகல் உள்ளது -- ஒவ்வொரு team member உம் கட்டமைக்கப்பட்ட provider இலிருந்து inference consume செய்கிறது.
:::

## Tools

### `team_create`

ஒரு task இல் collaborate செய்யும் ஒரு persistent team of agents உருவாக்கவும். Member roles, tools, மற்றும் models வரையறுக்கவும். சரியாக ஒரு member lead ஆக இருக்க வேண்டும்.

| Parameter                | Type   | Required | விளக்கம்                                                            |
| ------------------------ | ------ | -------- | ---------------------------------------------------------------------- |
| `name`                   | string | ஆம்      | Human-readable team name                                               |
| `task`                   | string | ஆம்      | Team இன் objective (lead க்கு initial instructions ஆக அனுப்பப்படுகிறது) |
| `members`                | array  | ஆம்      | Team member definitions (கீழே பாருங்கள்)                              |
| `idle_timeout_seconds`   | number | இல்லை   | Per-member idle timeout. Default: 300 (5 நிமிடங்கள்)                  |
| `max_lifetime_seconds`   | number | இல்லை   | அதிகபட்ச team lifetime. Default: 3600 (1 மணிநேரம்)                    |
| `classification_ceiling` | string | இல்லை   | Team-wide classification ceiling (உதா. `CONFIDENTIAL`)                 |

**Member definition:**

| Field                    | Type    | Required | விளக்கம்                                                |
| ------------------------ | ------- | -------- | --------------------------------------------------------- |
| `role`                   | string  | ஆம்      | Unique role identifier (உதா. `researcher`, `reviewer`)   |
| `description`            | string  | ஆம்      | இந்த member என்ன செய்கிறது (system prompt இல் inject ஆகிறது) |
| `is_lead`                | boolean | ஆம்      | இந்த member team lead ஆக இருக்கிறதா                      |
| `model`                  | string  | இல்லை   | இந்த member க்கான Model override                         |
| `classification_ceiling` | string  | இல்லை   | Per-member classification ceiling                        |
| `initial_task`           | string  | இல்லை   | Initial instructions (lead default ஆக team task பெறுகிறது) |

**Validation விதிகள்:**

- Team இல் சரியாக `is_lead: true` உடன் ஒரு member இருக்க வேண்டும்
- அனைத்து roles உம் unique மற்றும் non-empty ஆக இருக்க வேண்டும்
- Member classification ceilings team ceiling ஐ மீற முடியாது
- `name` மற்றும் `task` non-empty ஆக இருக்க வேண்டும்

### `team_status`

Active team இன் current state சரிபார்க்கவும்.

| Parameter | Type   | Required | விளக்கம்  |
| --------- | ------ | -------- | ----------- |
| `team_id` | string | ஆம்      | Team ID     |

Team இன் status, aggregate taint நிலை, மற்றும் ஒவ்வொரு member இன் current taint, status, மற்றும் last activity timestamp சேர்ந்த per-member details return செய்கிறது.

### `team_message`

ஒரு specific team member க்கு ஒரு செய்தி அனுப்பவும். கூடுதல் context வழங்க, வேலையை redirect செய்ய, அல்லது progress updates கோர பயனுள்ளது.

| Parameter | Type   | Required | விளக்கம்                                      |
| --------- | ------ | -------- | ----------------------------------------------- |
| `team_id` | string | ஆம்      | Team ID                                         |
| `role`    | string | இல்லை   | Target member role (default ஆக lead)            |
| `message` | string | ஆம்      | Message content                                 |

Team `running` status இல் இருக்க வேண்டும் மற்றும் target member `active` அல்லது `idle` ஆக இருக்க வேண்டும்.

### `team_disband`

ஒரு team ஐ shutdown செய்து அனைத்து member sessions ஐயும் terminate செய்யவும்.

| Parameter | Type   | Required | விளக்கம்                              |
| --------- | ------ | -------- | --------------------------------------- |
| `team_id` | string | ஆம்      | Team ID                                 |
| `reason`  | string | இல்லை   | Team disband ஆவதற்கான காரணம்          |

Team உருவாக்கிய session மட்டுமோ அல்லது lead member மட்டுமோ team disband செய்யலாம்.

## Teams எவ்வாறு செயல்படுகின்றன

### உருவாக்கல்

Agent `team_create` அழைக்கும்போது, Triggerfish:

1. Team definition validate செய்கிறது (roles, lead count, classification ceilings)
2. Orchestrator factory மூலம் ஒவ்வொரு member க்கும் ஒரு isolated agent session spawn செய்கிறது
3. ஒவ்வொரு member இன் system prompt க்கும் ஒரு **team roster prompt** inject செய்கிறது, அவர்களின் role, teammates, மற்றும் collaboration instructions விவரிக்கிறது
4. Lead க்கு (அல்லது per member க்கு custom `initial_task`) initial task அனுப்புகிறது
5. ஒவ்வொரு 30 வினாடிகளும் team health சரிபார்க்கும் lifecycle monitor தொடங்குகிறது

ஒவ்வொரு member session உம் அதன் சொந்த conversation context, taint tracking, மற்றும் tool access உடன் முழுமையாக isolated.

### Collaboration

Team members ஒன்றோடொன்று `sessions_send` பயன்படுத்தி communicate செய்கின்றன. Creating agent members இடையே செய்திகளை relay செய்ய தேவையில்லை. Typical flow:

1. Lead team objective பெறுகிறது
2. Lead task ஐ decompose செய்து `sessions_send` மூலம் members க்கு assignments அனுப்புகிறது
3. Members தன்னிச்சையாக வேலை செய்கின்றன, tools அழைத்து iterate செய்கின்றன
4. Members results lead க்கு (அல்லது நேரடியாக மற்றொரு member க்கு) திரும்ப அனுப்புகின்றன
5. Lead results synthesize செய்கிறது மற்றும் வேலை முடிந்தவுடன் தீர்மானிக்கிறது
6. Lead team shutdown செய்ய `team_disband` அழைக்கிறது

Team members இடையே செய்திகள் orchestrator மூலம் நேரடியாக deliver ஆகின்றன -- ஒவ்வொரு செய்தியும் பெறுனரின் session இல் ஒரு full agent turn trigger செய்கிறது.

### Status

எந்த நேரத்திலும் progress சரிபார்க்க `team_status` பயன்படுத்தவும். Response சேர்க்கிறது:

- **Team status:** `running`, `paused`, `completed`, `disbanded`, அல்லது `timed_out`
- **Aggregate taint:** அனைத்து members முழுவதும் highest classification நிலை
- **Per-member details:** Role, status (`active`, `idle`, `completed`, `failed`), current taint நிலை, மற்றும் last activity timestamp

### Disband

Teams disband ஆக முடியும்:

- Creating session `team_disband` அழைக்கும்போது
- Lead member `team_disband` அழைக்கும்போது
- Lifetime limit expire ஆகும்போது lifecycle monitor auto-disband செய்யும்போது
- அனைத்து members உம் inactive என்று lifecycle monitor கண்டறியும்போது

Team disband ஆகும்போது, அனைத்து active member sessions உம் terminate ஆகின்றன மற்றும் resources clean up ஆகின்றன.

## Team Roles

### Lead

Lead member team ஐ coordinate செய்கிறது. உருவாக்கப்படும்போது:

- Team இன் `task` ஐ initial instructions ஆக பெறுகிறது (`initial_task` மூலம் override ஆகாவிட்டால்)
- Work decompose செய்ய, tasks assign செய்ய, மற்றும் objective meet ஆகும்போது தீர்மானிக்க system prompt instructions பெறுகிறது
- Team disband செய்ய authorized

ஒவ்வொரு team இலும் சரியாக ஒரு lead உள்ளது.

### Members

Non-lead members specialists. உருவாக்கப்படும்போது:

- `initial_task` வழங்கப்பட்டால் பெறுகின்றன, இல்லையென்றால் lead வேலை அனுப்பும் வரை idle ஆக இருக்கின்றன
- Lead க்கு அல்லது அடுத்த appropriate teammate க்கு completed work அனுப்புவதற்கான system prompt instructions பெறுகின்றன
- Team disband செய்ய முடியாது

## Lifecycle Monitoring

Teams க்கு ஒவ்வொரு 30 வினாடிகளும் இயங்கும் automatic lifecycle monitoring உள்ளது.

### Idle Timeout

ஒவ்வொரு member உம் ஒரு idle timeout கொண்டுள்ளது (default: 5 நிமிடங்கள்). ஒரு member idle ஆகும்போது:

1. **முதல் threshold (idle_timeout_seconds):** Member வேலை முடிந்திருந்தால் results அனுப்புமாறு ஒரு nudge செய்தி பெறுகிறது
2. **Double threshold (2x idle_timeout_seconds):** Member terminate ஆகிறது மற்றும் lead notify ஆகிறது

### Lifetime Timeout

Teams க்கு ஒரு maximum lifetime உள்ளது (default: 1 மணிநேரம்). வரம்பை அடையும்போது:

1. Lead 60 வினாடிகளில் final output produce செய்ய ஒரு warning செய்தி பெறுகிறது
2. Grace period க்கு பிறகு, team தானாக disband ஆகிறது

### Health Checks

Monitor ஒவ்வொரு 30 வினாடிகளும் session health சரிபார்க்கிறது:

- **Lead தோல்வி:** Lead session reachable இல்லையென்றால், team paused ஆகிறது மற்றும் creating session notify ஆகிறது
- **Member தோல்வி:** ஒரு member session gone ஆனால், அது `failed` என்று mark ஆகிறது மற்றும் remaining members உடன் தொடர lead notify ஆகிறது
- **அனைத்தும் inactive:** அனைத்து members உம் `completed` அல்லது `failed` ஆனால், creating session புதிய instructions inject செய்ய அல்லது disband செய்ய notify ஆகிறது

## Classification மற்றும் Taint

Team member sessions மற்ற அனைத்து sessions போலவும் அதே classification விதிகளை பின்பற்றுகின்றன:

- ஒவ்வொரு member உம் `PUBLIC` taint இல் தொடங்கி classified data அணுகும்போது escalate ஆகிறது
- **Classification ceilings** per-team அல்லது per-member அமைக்கலாம், members அணுக முடியும் data ஐ restrict செய்ய
- **Write-down enforcement** அனைத்து inter-member communication க்கும் பொருந்துகிறது. `CONFIDENTIAL` இல் tainted ஒரு member `PUBLIC` இல் ஒரு member க்கு data அனுப்ப முடியாது
- **Aggregate taint** (அனைத்து members முழுவதும் highest taint) `team_status` இல் report ஆகிறது, இதனால் creating session team இன் overall classification exposure track செய்யலாம்

::: danger SECURITY Member classification ceilings team ceiling ஐ மீற முடியாது. Team ceiling `INTERNAL` ஆனால், எந்த member உம் `CONFIDENTIAL` ceiling உடன் கட்டமைக்கப்பட முடியாது. இது creation time இல் validate ஆகிறது. :::

## Teams vs Sub-Agents

| Aspect          | Sub-Agent (`subagent`)                     | Team (`team_create`)                                      |
| --------------- | ------------------------------------------ | ---------------------------------------------------------- |
| **Lifetime**    | Single task, result return செய்து exit     | Disband அல்லது timed out ஆகும் வரை Persistent            |
| **Members**     | ஒரு agent                                  | Distinct roles உடன் Multiple agents                       |
| **Interaction** | Parent இலிருந்து Fire-and-forget           | Members `sessions_send` மூலம் சுதந்திரமாக communicate    |
| **Coordination**| Parent result க்காக காத்திருக்கிறது       | Lead coordinate செய்கிறது, parent `team_status` மூலம் check in செய்யலாம் |
| **Use case**    | Focused single-step delegation             | Complex multi-role collaboration                          |

Focused task செய்து result return செய்ய single agent தேவைப்படும்போது **sub-agents பயன்படுத்தவும்**. Multiple specialized perspectives ஒன்றின் வேலையை மற்றொன்று iterate செய்வதிலிருந்து task பயனடையும்போது **teams பயன்படுத்தவும்**.

::: tip Teams உருவாக்கப்பட்டவுடன் autonomous. Creating agent status சரிபார்க்கலாம் மற்றும் செய்திகள் அனுப்பலாம், ஆனால் micromanage செய்ய தேவையில்லை. Lead coordination கையாளுகிறது. :::
