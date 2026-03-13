# Agent Teams

Triggerfish एजंट complex tasks वर एकत्र काम करणाऱ्या collaborating agents चे
persistent teams spawn करू शकतात. प्रत्येक team member ला स्वतःचे session, role,
conversation context, आणि tools मिळतात. एक member **lead** म्हणून designated
आणि काम coordinate करतो.

Teams open-ended tasks साठी सर्वोत्तम आहेत ज्यांना parallel मध्ये specialized
roles काम करण्याचा फायदा होतो: research + analysis + writing, architecture +
implementation + review, किंवा कोणताही task जिथे different perspectives एकमेकांच्या
कामावर iterate करणे आवश्यक आहे.

::: info Availability
Agent Teams Triggerfish Gateway वापरताना **Power** plan ($149/month) आवश्यक
करतात. स्वतःच्या API keys चालवणाऱ्या open source users ला agent teams साठी
पूर्ण access आहे -- प्रत्येक team member तुमच्या configured provider कडून
inference consume करतो.
:::

## Tools

### `team_create`

एखाद्या task वर collaborate करणारे agents चे persistent team तयार करा. Member
roles, tools, आणि models define करा. Exactly एक member lead असणे आवश्यक आहे.

| Parameter                | Type   | Required | वर्णन                                                             |
| ------------------------ | ------ | -------- | ----------------------------------------------------------------- |
| `name`                   | string | हो       | Human-readable team name                                          |
| `task`                   | string | हो       | Team चे objective (lead ला initial instructions म्हणून पाठवले जाते) |
| `members`                | array  | हो       | Team member definitions (खाली पहा)                                |
| `idle_timeout_seconds`   | number | नाही     | Per-member idle timeout. Default: 300 (5 minutes)                 |
| `max_lifetime_seconds`   | number | नाही     | Maximum team lifetime. Default: 3600 (1 hour)                     |
| `classification_ceiling` | string | नाही     | Team-wide classification ceiling (उदा. `CONFIDENTIAL`)            |

**Member definition:**

| Field                    | Type    | Required | वर्णन                                                       |
| ------------------------ | ------- | -------- | ----------------------------------------------------------- |
| `role`                   | string  | हो       | Unique role identifier (उदा. `researcher`, `reviewer`)       |
| `description`            | string  | हो       | हा member काय करतो (system prompt मध्ये inject केले जाते)   |
| `is_lead`                | boolean | हो       | हा member team lead आहे का                                  |
| `model`                  | string  | नाही     | या member साठी model override                               |
| `classification_ceiling` | string  | नाही     | Per-member classification ceiling                           |
| `initial_task`           | string  | नाही     | Initial instructions (lead defaults to team task)           |

**Validation rules:**

- Team मध्ये exactly एक member `is_lead: true` सह असणे आवश्यक आहे
- सर्व roles unique आणि non-empty असणे आवश्यक आहे
- Member classification ceilings team ceiling exceed करू शकत नाहीत
- `name` आणि `task` non-empty असणे आवश्यक आहे

### `team_status`

Active team ची current state check करा.

| Parameter | Type   | Required | वर्णन    |
| --------- | ------ | -------- | -------- |
| `team_id` | string | हो       | Team ID  |

Team ची status, aggregate taint level, आणि प्रत्येक member चे current taint,
status, आणि last activity timestamp सह per-member details return करतो.

### `team_message`

Specific team member ला message पाठवा. Additional context provide करणे, काम
redirect करणे, किंवा progress updates विचारण्यासाठी उपयुक्त.

| Parameter | Type   | Required | वर्णन                                      |
| --------- | ------ | -------- | ------------------------------------------ |
| `team_id` | string | हो       | Team ID                                    |
| `role`    | string | नाही     | Target member role (defaults to lead)      |
| `message` | string | हो       | Message content                            |

Team `running` status मध्ये असणे आणि target member `active` किंवा `idle` असणे
आवश्यक आहे.

### `team_disband`

Team shut down करा आणि सर्व member sessions terminate करा.

| Parameter | Type   | Required | वर्णन                               |
| --------- | ------ | -------- | ----------------------------------- |
| `team_id` | string | हो       | Team ID                             |
| `reason`  | string | नाही     | Team का disband केली जात आहे        |

फक्त team create केलेला session किंवा lead member team disband करू शकतो.

## Teams कसे काम करतात

### Creation

एजंट `team_create` call करतो तेव्हा, Triggerfish:

1. Team definition validate करतो (roles, lead count, classification ceilings)
2. Orchestrator factory द्वारे प्रत्येक member साठी isolated agent session spawn
   करतो
3. प्रत्येक member च्या system prompt मध्ये **team roster prompt** inject करतो,
   त्यांची role, teammates, आणि collaboration instructions describe करतो
4. Lead ला initial task पाठवतो (किंवा per member custom `initial_task`)
5. दर 30 seconds team health check करणारा lifecycle monitor सुरू करतो

प्रत्येक member session स्वतःच्या conversation context, taint tracking, आणि tool
access सह पूर्णपणे isolated आहे.

### Collaboration

Team members `sessions_send` वापरून एकमेकांशी communicate करतात. Creating
agent ला members दरम्यान messages relay करण्याची आवश्यकता नाही. Typical flow:

1. Lead team objective receive करतो
2. Lead task decompose करतो आणि `sessions_send` द्वारे members ला assignments
   पाठवतो
3. Members autonomously काम करतात, tools calling आणि iterating
4. Members lead ला (किंवा थेट दुसऱ्या member ला) results पाठवतात
5. Lead results synthesize करतो आणि काम कधी complete झाले ते decide करतो
6. Lead `team_disband` call करतो team shut down करण्यासाठी

Team members दरम्यान messages orchestrator द्वारे थेट deliver केले जातात --
प्रत्येक message recipient च्या session मध्ये full agent turn trigger करतो.

### Status

कोणत्याही वेळी progress check करण्यासाठी `team_status` वापरा. Response मध्ये
समाविष्ट:

- **Team status:** `running`, `paused`, `completed`, `disbanded`, किंवा `timed_out`
- **Aggregate taint:** सर्व members मध्ये highest classification level
- **Per-member details:** Role, status (`active`, `idle`, `completed`, `failed`),
  current taint level, आणि last activity timestamp

### Disband

Teams द्वारे disband केल्या जाऊ शकतात:

- Creating session `team_disband` call करतो
- Lead member `team_disband` call करतो
- Lifecycle monitor lifetime limit expire झाल्यावर auto-disband करतो
- Lifecycle monitor सर्व members inactive detect करतो

Team disband केली जाते तेव्हा, सर्व active member sessions terminate केल्या
जातात आणि resources cleaned up होतात.

## Team Roles

### Lead

Lead member team coordinate करतो. Create झाल्यावर:

- Team चा `task` initial instructions म्हणून receive करतो (जोपर्यंत
  `initial_task` द्वारे override केला नाही)
- काम decompose करणे, tasks assign करणे, आणि objective कधी पूर्ण झाले ते decide
  करण्यासाठी system prompt instructions मिळवतो
- Team disband करण्यास authorized आहे

Team मध्ये exactly एक lead असतो.

### Members

Non-lead members specialists आहेत. Create झाल्यावर:

- `initial_task` provided असल्यास receive करतात, अन्यथा lead त्यांना काम
  पाठवेपर्यंत idle राहतात
- Completed काम lead ला किंवा पुढच्या appropriate teammate ला पाठवण्यासाठी
  system prompt instructions मिळवतात
- Team disband करू शकत नाहीत

## Lifecycle Monitoring

Teams दर 30 seconds run होणाऱ्या automatic lifecycle monitoring आहेत.

### Idle Timeout

प्रत्येक member ला idle timeout आहे (default: 5 minutes). Member idle असताना:

1. **First threshold (idle_timeout_seconds):** Member ला nudge message मिळतो
   ज्यात त्यांचे काम complete असल्यास results पाठवण्यास सांगतो
2. **Double threshold (2x idle_timeout_seconds):** Member terminate केला जातो
   आणि lead ला notify केले जाते

### Lifetime Timeout

Teams ला maximum lifetime आहे (default: 1 hour). Limit reached झाल्यावर:

1. Lead ला 60 seconds मध्ये final output produce करण्यासाठी warning message
   मिळतो
2. Grace period नंतर, team automatically disband केली जाते

### Health Checks

Monitor दर 30 seconds session health check करतो:

- **Lead failure:** Lead session यापुढे reachable नसल्यास, team paused केली
  जाते आणि creating session ला notify केले जाते
- **Member failure:** Member session gone असल्यास, ते `failed` म्हणून marked
  केले जाते आणि lead ला remaining members सह continue करण्यास notify केले जाते
- **All inactive:** सर्व members `completed` किंवा `failed` असल्यास, creating
  session ला नवीन instructions inject करणे किंवा disband करण्यास notify केले
  जाते

## Classification आणि Taint

Team member sessions इतर सर्व sessions प्रमाणेच classification rules follow
करतात:

- प्रत्येक member `PUBLIC` taint वर सुरू होतो आणि classified data access केल्यावर
  escalate होतो
- **Classification ceilings** per-team किंवा per-member set केले जाऊ शकतात
  members कोणता data access करू शकतात ते restrict करण्यासाठी
- **Write-down enforcement** सर्व inter-member communication ला लागू होते.
  `CONFIDENTIAL` tainted member `PUBLIC` member ला data पाठवू शकत नाही
- **Aggregate taint** (सर्व members मधील highest taint) `team_status` मध्ये
  reported आहे जेणेकरून creating session team च्या overall classification
  exposure track करू शकेल

::: danger SECURITY Member classification ceilings team ceiling exceed करू शकत
नाहीत. Team ceiling `INTERNAL` असल्यास, कोणताही member `CONFIDENTIAL` ceiling
सह configure केला जाऊ शकत नाही. हे creation वेळी validated आहे. :::

## Teams vs Sub-Agents

| Aspect          | Sub-Agent (`subagent`)                           | Team (`team_create`)                                         |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| **Lifetime**    | Single task, result return करतो आणि exit होतो  | Disbanded किंवा timed out होईपर्यंत persistent              |
| **Members**     | एक agent                                         | Distinct roles सह multiple agents                            |
| **Interaction** | Parent कडून fire-and-forget                       | Members `sessions_send` द्वारे freely communicate करतात     |
| **Coordination**| Parent result साठी wait करतो                    | Lead coordinate करतो, parent `team_status` द्वारे check करू शकतो |
| **Use case**    | Focused single-step delegation                   | Complex multi-role collaboration                             |

**Sub-agents वापरा** जेव्हा तुम्हाला single agent ला focused task करायचा आहे
आणि result return करायचा आहे. **Teams वापरा** जेव्हा task multiple specialized
perspectives एकमेकांच्या कामावर iterate करण्याचा फायदा घेते.

::: tip Teams create झाल्यावर autonomous असतात. Creating agent status check
करू शकतो आणि messages पाठवू शकतो, पण micromanage करण्याची आवश्यकता नाही.
Lead coordination handle करतो. :::
