# Agent Teams

Maaaring mag-spawn ang mga Triggerfish agent ng persistent teams ng collaborating agents na nagtutulungan sa complex tasks. Bawat team member ay may sariling session, role, conversation context, at tools. Isang member ang designated bilang **lead** at nag-coordinate ng trabaho.

Pinakamainam ang teams para sa open-ended tasks na nakikinabang sa specialized roles na nagtatrabaho nang parallel: research + analysis + writing, architecture + implementation + review, o anumang task kung saan kailangan ng iba't ibang perspectives na mag-iterate sa trabaho ng bawat isa.

::: info Availability
Nangangailangan ang Agent Teams ng **Power** plan ($149/month) kapag gumagamit ng Triggerfish Gateway. Ang open source users na nagpapatakbo ng sariling API keys ay may full access sa agent teams -- bawat team member ay kumokonsume ng inference mula sa iyong configured provider.
:::

## Mga Tool

### `team_create`

Gumawa ng persistent team ng mga agents na nagko-collaborate sa isang task. Mag-define ng member roles, tools, at models. Eksaktong isang member ang kailangang lead.

| Parameter                | Type   | Required | Paglalarawan                                                    |
| ------------------------ | ------ | -------- | --------------------------------------------------------------- |
| `name`                   | string | yes      | Human-readable na pangalan ng team                              |
| `task`                   | string | yes      | Ang objective ng team (ipinapadala sa lead bilang initial instructions) |
| `members`                | array  | yes      | Mga team member definition (tingnan sa ibaba)                   |
| `idle_timeout_seconds`   | number | no       | Per-member idle timeout. Default: 300 (5 minuto)                |
| `max_lifetime_seconds`   | number | no       | Maximum team lifetime. Default: 3600 (1 oras)                   |
| `classification_ceiling` | string | no       | Team-wide classification ceiling (hal. `CONFIDENTIAL`)          |

**Member definition:**

| Field                    | Type    | Required | Paglalarawan                                                  |
| ------------------------ | ------- | -------- | ------------------------------------------------------------- |
| `role`                   | string  | yes      | Unique role identifier (hal. `researcher`, `reviewer`)        |
| `description`            | string  | yes      | Kung ano ang ginagawa ng member na ito (ini-inject sa system prompt) |
| `is_lead`                | boolean | yes      | Kung ang member na ito ang team lead                          |
| `model`                  | string  | no       | Model override para sa member na ito                          |
| `classification_ceiling` | string  | no       | Per-member classification ceiling                             |
| `initial_task`           | string  | no       | Initial instructions (ang lead ay dina-default sa team task)  |

**Mga validation rules:**

- Kailangang may eksaktong isang member ang team na may `is_lead: true`
- Lahat ng roles ay kailangang unique at non-empty
- Hindi maaaring lumagpas ang member classification ceilings sa team ceiling
- Kailangang non-empty ang `name` at `task`

### `team_status`

I-check ang kasalukuyang estado ng isang active team.

| Parameter | Type   | Required | Paglalarawan |
| --------- | ------ | -------- | ------------ |
| `team_id` | string | yes      | Team ID      |

Ibinabalik ang status ng team, aggregate taint level, at per-member details kasama ang kasalukuyang taint, status, at last activity timestamp ng bawat member.

### `team_message`

Magpadala ng mensahe sa isang specific team member. Kapaki-pakinabang para sa pagbibigay ng karagdagang context, pag-redirect ng trabaho, o pagtatanong ng progress updates.

| Parameter | Type   | Required | Paglalarawan                                    |
| --------- | ------ | -------- | ----------------------------------------------- |
| `team_id` | string | yes      | Team ID                                         |
| `role`    | string | no       | Target member role (dina-default sa lead)        |
| `message` | string | yes      | Content ng mensahe                              |

Kailangang nasa `running` status ang team at ang target member ay kailangang `active` o `idle`.

### `team_disband`

I-shut down ang isang team at i-terminate ang lahat ng member sessions.

| Parameter | Type   | Required | Paglalarawan                           |
| --------- | ------ | -------- | -------------------------------------- |
| `team_id` | string | yes      | Team ID                                |
| `reason`  | string | no       | Bakit dini-disband ang team            |

Ang session na gumawa ng team o ang lead member lang ang maaaring mag-disband ng team.

## Paano Gumagana ang Teams

### Paggawa

Kapag tumawag ang agent ng `team_create`, ang Triggerfish ay:

1. Vina-validate ang team definition (roles, lead count, classification ceilings)
2. Nagsi-spawn ng isolated agent session para sa bawat member sa pamamagitan ng orchestrator factory
3. Nag-inject ng **team roster prompt** sa system prompt ng bawat member, na nagde-describe ng kanilang role, teammates, at collaboration instructions
4. Nagpapadala ng initial task sa lead (o custom `initial_task` per member)
5. Nagsisimula ng lifecycle monitor na nag-check ng team health kada 30 segundo

Bawat member session ay fully isolated na may sariling conversation context, taint tracking, at tool access.

### Collaboration

Nagko-communicate ang mga team members sa isa't isa gamit ang `sessions_send`. Hindi kailangan ng creating agent na mag-relay ng messages sa pagitan ng members. Ang typical flow:

1. Tinatanggap ng lead ang team objective
2. Dine-decompose ng lead ang task at nagpapadala ng assignments sa members sa pamamagitan ng `sessions_send`
3. Nagtatrabaho nang autonomous ang members, tumatawag ng tools at nag-iterate
4. Nagpapadala ang members ng results pabalik sa lead (o direkta sa ibang member)
5. Sine-synthesize ng lead ang results at nagde-decide kung kailan tapos na ang trabaho
6. Tinatawag ng lead ang `team_disband` para i-shut down ang team

Ang messages sa pagitan ng team members ay direktang dine-deliver sa pamamagitan ng orchestrator -- bawat mensahe ay nagti-trigger ng full agent turn sa session ng recipient.

### Status

Gamitin ang `team_status` para i-check ang progress anumang oras. Kasama sa response ang:

- **Team status:** `running`, `paused`, `completed`, `disbanded`, o `timed_out`
- **Aggregate taint:** Ang pinakamataas na classification level sa lahat ng members
- **Per-member details:** Role, status (`active`, `idle`, `completed`, `failed`), kasalukuyang taint level, at last activity timestamp

### Disband

Maaaring i-disband ang teams ng:

- Ang creating session na tumatawag ng `team_disband`
- Ang lead member na tumatawag ng `team_disband`
- Ang lifecycle monitor na awtomatikong nag-di-disband pagkatapos mag-expire ang lifetime limit
- Ang lifecycle monitor na nakaka-detect na lahat ng members ay inactive

Kapag na-disband ang isang team, lahat ng active member sessions ay tine-terminate at nili-linis ang resources.

## Mga Team Role

### Lead

Kino-coordinate ng lead member ang team. Kapag ginawa:

- Tinatanggap ang `task` ng team bilang initial instructions nito (maliban kung na-override ng `initial_task`)
- Nakakakuha ng system prompt instructions para sa pag-decompose ng trabaho, pag-assign ng tasks, at pag-decide kung kailan natutugunan ang objective
- May authorization na mag-disband ng team

May eksaktong isang lead per team.

### Mga Member

Ang mga non-lead member ay specialists. Kapag ginawa:

- Tinatanggap ang kanilang `initial_task` kung ibinigay, kung hindi ay idle hangga't hindi sila binibigyan ng trabaho ng lead
- Nakakakuha ng system prompt instructions para sa pagpapadala ng completed work sa lead o sa susunod na naaangkop na teammate
- Hindi maaaring mag-disband ng team

## Lifecycle Monitoring

May automatic lifecycle monitoring ang teams na tumatakbo kada 30 segundo.

### Idle Timeout

Bawat member ay may idle timeout (default: 5 minuto). Kapag idle ang isang member:

1. **Unang threshold (idle_timeout_seconds):** Tumatanggap ang member ng nudge message na nagtatanong kung tapos na ang trabaho nito
2. **Double threshold (2x idle_timeout_seconds):** Tine-terminate ang member at inaabisuhan ang lead

### Lifetime Timeout

May maximum lifetime ang teams (default: 1 oras). Kapag naabot ang limit:

1. Tumatanggap ang lead ng warning message na may 60 segundo para mag-produce ng final output
2. Pagkatapos ng grace period, awtomatikong dini-disband ang team

### Health Checks

Chine-check ng monitor ang session health kada 30 segundo:

- **Lead failure:** Kung hindi na reachable ang lead session, pine-pause ang team at inaabisuhan ang creating session
- **Member failure:** Kung nawala ang isang member session, mina-mark ito bilang `failed` at inaabisuhan ang lead na mag-continue sa natitirang members
- **Lahat inactive:** Kung lahat ng members ay `completed` o `failed`, inaabisuhan ang creating session na mag-inject ng bagong instructions o mag-disband

## Classification at Taint

Sinusunod ng team member sessions ang parehong classification rules tulad ng lahat ng ibang sessions:

- Nagsisimula ang bawat member sa `PUBLIC` taint at nag-escalate habang nag-access ng classified data
- Maaaring i-set ang **classification ceilings** per-team o per-member para i-restrict kung anong data ang maaaring i-access ng members
- Nalalapat ang **write-down enforcement** sa lahat ng inter-member communication. Ang member na tainted sa `CONFIDENTIAL` ay hindi maaaring magpadala ng data sa member na nasa `PUBLIC`
- Ang **aggregate taint** (pinakamataas na taint sa lahat ng members) ay inire-report sa `team_status` para masubaybayan ng creating session ang overall classification exposure ng team

::: danger SECURITY Hindi maaaring lumagpas ang member classification ceilings sa team ceiling. Kung `INTERNAL` ang team ceiling, walang member ang maaaring i-configure na may `CONFIDENTIAL` ceiling. Vina-validate ito sa creation time. :::

## Teams vs Sub-Agents

| Aspeto           | Sub-Agent (`subagent`)                        | Team (`team_create`)                                          |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------- |
| **Lifetime**     | Isang task, nagbabalik ng result at nag-exit   | Persistent hangga't hindi dini-disband o nag-time out         |
| **Mga Member**   | Isang agent                                   | Maramihang agents na may distinct roles                       |
| **Interaction**  | Fire-and-forget mula sa parent                | Malaya ang mga members na mag-communicate sa pamamagitan ng `sessions_send` |
| **Coordination** | Naghihintay ang parent ng result              | Kino-coordinate ng lead, maaaring mag-check in ang parent sa pamamagitan ng `team_status` |
| **Use case**     | Focused single-step delegation                | Complex multi-role collaboration                              |

**Gumamit ng sub-agents** kapag kailangan mo ng isang agent na gumawa ng focused task at magbalik ng result. **Gumamit ng teams** kapag nakikinabang ang task sa maramihang specialized perspectives na nag-iterate sa trabaho ng bawat isa.

::: tip Autonomous ang teams kapag nagawa na. Maaaring mag-check ng status at magpadala ng messages ang creating agent, pero hindi kailangan mag-micromanage. Ang lead ang nag-handle ng coordination. :::
