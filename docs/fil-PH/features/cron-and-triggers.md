# Cron at Triggers

Hindi limitado sa reactive na tanong-at-sagot ang mga Triggerfish agent. Ang cron at trigger system ay nagbibigay-daan sa proactive behavior: scheduled tasks, periodic check-ins, morning briefings, background monitoring, at autonomous multi-step workflows.

## Mga Cron Job

Ang mga cron job ay scheduled tasks na may fixed instructions, delivery channel, at classification ceiling. Gumagamit sila ng standard cron expression syntax.

### Configuration

Mag-define ng cron jobs sa `triggerfish.yaml` o hayaang ma-manage ng agent ang mga ito sa runtime sa pamamagitan ng cron tool:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM araw-araw
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Kung saan ide-deliver
        classification: INTERNAL # Max taint para sa job na ito

      - id: pipeline-check
        schedule: "0 */4 * * *" # Kada 4 na oras
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### Paano Gumagana

1. Ang **CronManager** ay nagpa-parse ng standard cron expressions at nagma-maintain ng persistent job registry na tumatagal sa restarts.
2. Kapag nagfi-fire ang isang job, ang **OrchestratorFactory** ay gumagawa ng isolated orchestrator at session na espesipiko para sa execution na iyon.
3. Tumatakbo ang job sa **background session workspace** na may sariling taint tracking.
4. Dine-deliver ang output sa configured channel, subject sa classification rules ng channel na iyon.
5. Nire-record ang execution history para sa audit.

### Agent-Managed Cron

Maaaring gumawa at mag-manage ang agent ng sarili nitong cron jobs sa pamamagitan ng `cron` tool:

| Action         | Paglalarawan                | Security                                     |
| -------------- | --------------------------- | -------------------------------------------- |
| `cron.list`    | Mag-list ng lahat ng scheduled jobs | Owner-only                              |
| `cron.create`  | Mag-schedule ng bagong job  | Owner-only, ine-enforce ang classification ceiling |
| `cron.delete`  | Mag-alis ng scheduled job   | Owner-only                                   |
| `cron.history` | Mag-view ng nakaraang executions | Pinapanatili ang audit trail              |

::: warning Nangangailangan ang cron job creation ng owner authentication. Hindi maaaring mag-schedule ng jobs ang agent sa ngalan ng external users o lumagpas sa configured classification ceiling. :::

### CLI Cron Management

Maaari ding ma-manage ang mga cron jobs direkta mula sa command line:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

Sine-set ng `--classification` flag ang classification ceiling para sa job. Ang valid levels ay `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, at `RESTRICTED`. Kung hindi ibinigay, dina-default sa `INTERNAL`.

## Trigger System

Ang triggers ay periodic na "check-in" loops kung saan naggi-gising ang agent para suriin kung may kailangan ng proactive action. Hindi tulad ng cron jobs na may fixed tasks, binibigyan ng triggers ang agent ng discretion para mag-decide kung ano ang nangangailangan ng atensiyon.

### TRIGGER.md

Dine-define ng `TRIGGER.md` kung ano ang dapat i-check ng agent sa bawat wakeup. Nandito ito sa `~/.triggerfish/config/TRIGGER.md` at isang freeform markdown file kung saan mo sine-specify ang monitoring priorities, escalation rules, at proactive behaviors.

Kung wala ang `TRIGGER.md`, ginagamit ng agent ang general knowledge nito para mag-decide kung ano ang nangangailangan ng atensiyon.

**Halimbawa ng TRIGGER.md:**

```markdown
# TRIGGER.md -- Ano ang iche-check sa bawat wakeup

## Mga Priority Check

- Unread messages sa lahat ng channels na mas matanda sa 1 oras
- Calendar conflicts sa susunod na 24 oras
- Overdue tasks sa Linear o Jira

## Monitoring

- GitHub: PRs na naghihintay ng aking review
- Email: kahit ano mula sa VIP contacts (i-flag para sa immediate notification)
- Slack: mentions sa #incidents channel

## Proactive

- Kung umaga (7-9am), maghanda ng daily briefing
- Kung Friday afternoon, mag-draft ng weekly summary
```

### Trigger Configuration

Ang trigger timing at constraints ay sine-set sa `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # I-set sa false para i-disable ang triggers (default: true)
    interval_minutes: 30 # Mag-check kada 30 minuto (default: 30)
    # I-set sa 0 para i-disable ang triggers nang hindi inaalis ang config
    classification_ceiling: CONFIDENTIAL # Max taint ceiling (default: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Huwag gumising sa pagitan ng 10 PM ...
      end: 7 # ... at 7 AM
```

| Setting                                 | Paglalarawan                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Kung active ang periodic trigger wakeups. I-set sa `false` para i-disable.                                                                          |
| `interval_minutes`                      | Gaano kadalas (sa minuto) gumigising ang agent para i-check ang triggers. Default: `30`. I-set sa `0` para i-disable ang triggers nang hindi inaalis ang config block. |
| `classification_ceiling`                | Maximum classification level na maaaring maabot ng trigger session. Default: `CONFIDENTIAL`.                                                        |
| `quiet_hours.start` / `quiet_hours.end` | Hour range (24h clock) kung saan sine-suppress ang triggers.                                                                                        |

::: tip Para pansamantalang i-disable ang triggers, i-set ang `interval_minutes: 0`. Katumbas ito ng `enabled: false` at pinapayagan kang i-keep ang ibang trigger settings para madaling ma-re-enable. :::

### Trigger Execution

Sinusunod ng bawat trigger wakeup ang sequence na ito:

1. Nagfi-fire ang scheduler sa configured interval.
2. Sine-spawn ang fresh background session na may `PUBLIC` taint.
3. Binabasa ng agent ang `TRIGGER.md` para sa monitoring instructions nito.
4. Sine-evaluate ng agent ang bawat check, gamit ang available tools at MCP servers.
5. Kung kailangan ng action, kumilos ang agent -- nagpapadala ng notifications, gumagawa ng tasks, o nagde-deliver ng summaries.
6. Maaaring mag-escalate ang taint ng session habang ina-access ang classified data, pero hindi ito maaaring lumagpas sa configured ceiling.
7. Ina-archive ang session pagkatapos matapos.

::: tip Nagko-complement ang triggers at cron jobs sa isa't isa. Gamitin ang cron para sa tasks na dapat tumakbo sa eksaktong oras anuman ang conditions (morning briefing sa 7 AM). Gamitin ang triggers para sa monitoring na nangangailangan ng judgment (i-check kung may nangangailangan ng atensiyon ko kada 30 minuto). :::

## Trigger Context Tool

Maaaring i-load ng agent ang trigger results sa kasalukuyang conversation gamit ang `trigger_add_to_context` tool. Kapaki-pakinabang ito kapag nagtatanong ang user tungkol sa isang bagay na na-check noong huling trigger wakeup.

### Paggamit

| Parameter | Default     | Paglalarawan                                                                                      |
| --------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | Aling trigger output ang ilo-load: `"trigger"` (periodic), `"cron:<job-id>"`, o `"webhook:<source>"` |

Nilo-load ng tool ang pinakabagong execution result para sa specified source at idinaragdag ito sa conversation context.

### Write-Down Enforcement

Nire-respect ng trigger context injection ang no-write-down rule:

- Kung ang classification ng trigger ay **lumampas** sa session taint, **nag-escalate** ang session taint para mag-match
- Kung ang session taint ay **lumampas** sa classification ng trigger, **pinapayagan** ang injection -- palaging maaaring dumaloy ang lower-classification data sa higher-classification session (normal `canFlowTo` behavior). Hindi nagbabago ang session taint.

::: info Ang CONFIDENTIAL session ay maaaring mag-load ng PUBLIC trigger result nang walang problema -- pataas ang daloy ng data. Ang kabaligtaran (pag-inject ng CONFIDENTIAL trigger data sa session na may PUBLIC ceiling) ay mag-e-escalate ng session taint sa CONFIDENTIAL. :::

### Persistence

Ang trigger results ay sino-store sa pamamagitan ng `StorageProvider` na may keys sa format na `trigger:last:<source>`. Ang pinakabagong result lang per source ang kinikimkim.

## Security Integration

Lahat ng scheduled execution ay nag-integrate sa core security model:

- **Isolated sessions** -- Ang bawat cron job at trigger wakeup ay tumatakbo sa sariling spawned session na may independent taint tracking.
- **Classification ceiling** -- Hindi maaaring lumagpas ang background tasks sa configured classification level nila, kahit na nagbabalik ng higher-classified data ang mga tools na kanilang ginagamit.
- **Policy hooks** -- Lahat ng actions sa loob ng scheduled tasks ay dumadaan sa parehong enforcement hooks tulad ng interactive sessions (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Channel classification** -- Nire-respect ng output delivery ang classification level ng target channel. Hindi maaaring ipadala ang `CONFIDENTIAL` result sa `PUBLIC` channel.
- **Audit trail** -- Lahat ng scheduled execution ay nilo-log na may buong context: job ID, session ID, taint history, actions taken, at delivery status.
- **Persistence** -- Ang mga cron job ay sino-store sa pamamagitan ng `StorageProvider` (namespace: `cron:`) at tumatagal sa gateway restarts.
