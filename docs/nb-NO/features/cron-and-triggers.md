# Cron og Triggers

Triggerfish-agenter er ikke begrenset til reaktive spørsmål-og-svar. Cron- og
trigger-systemet muliggjør proaktiv atferd: planlagte oppgaver, periodiske
innsjekkinger, morgenbriefinger, bakgrunnsovervåking og autonome flertrinns
arbeidsflyter.

## Cron-jobber

Cron-jobber er planlagte oppgaver med faste instruksjoner, en leveringskanal
og et klassifiseringstak. De bruker standard cron-uttrykkssyntaks.

### Konfigurasjon

Definer cron-jobber i `triggerfish.yaml` eller la agenten administrere dem
ved kjøretid via cron-verktøyet:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # kl. 07 daglig
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Hvor det leveres
        classification: INTERNAL # Maks taint for denne jobben

      - id: pipeline-check
        schedule: "0 */4 * * *" # Hver 4. time
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### Slik fungerer det

1. **CronManager** analyserer standard cron-uttrykk og vedlikeholder et
   vedvarende jobbregister som overlever omstarter.
2. Når en jobb utløses, oppretter **OrchestratorFactory** en isolert
   orchestrator og sesjon spesifikt for den kjøringen.
3. Jobben kjøres i en **bakgrunnssesjons-workspace** med egen taint-sporing.
4. Utdata leveres til den konfigurerte kanalen, underlagt kanalens
   klassifiseringsregler.
5. Kjøringshistorikk registreres for revisjon.

### Agentadministrerte cron-jobber

Agenten kan opprette og administrere sine egne cron-jobber via `cron`-verktøyet:

| Handling       | Beskrivelse                | Sikkerhet                                         |
| -------------- | -------------------------- | ------------------------------------------------- |
| `cron.list`    | List alle planlagte jobber | Bare eier                                         |
| `cron.create`  | Planlegg en ny jobb        | Bare eier, klassifiseringstak håndheves           |
| `cron.delete`  | Fjern en planlagt jobb     | Bare eier                                         |
| `cron.history` | Vis tidligere kjøringer    | Revisjonsspor bevares                             |

::: warning Oppretting av cron-jobber krever eiergodkjenning. Agenten kan ikke
planlegge jobber på vegne av eksterne brukere eller overskride det konfigurerte
klassifiseringstaken. :::

### CLI-administrasjon av cron

Cron-jobber kan også administreres direkte fra kommandolinjen:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification`-flagget setter klassifiseringstaken for jobben. Gyldige
nivåer er `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` og `RESTRICTED`. Hvis utelatt,
er standard `INTERNAL`.

## Trigger-system

Triggers er periodiske «innsjekking»-løkker der agenten våkner for å vurdere
om noen proaktiv handling er nødvendig. I motsetning til cron-jobber med faste
oppgaver gir triggers agenten skjønn til å bestemme hva som trenger oppmerksomhet.

### TRIGGER.md

`TRIGGER.md` definerer hva agenten skal sjekke under hver oppvåkning. Den
befinner seg i `~/.triggerfish/config/TRIGGER.md` og er en friformatert
markdown-fil der du angir overvåkingsprioriteringer, eskaleringsregler og
proaktive atferder.

Hvis `TRIGGER.md` er fraværende, bruker agenten sin generelle kunnskap til å
bestemme hva som trenger oppmerksomhet.

**Eksempel på TRIGGER.md:**

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

### Trigger-konfigurasjon

Trigger-timing og begrensninger settes i `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Sett til false for å deaktivere triggers (standard: true)
    interval_minutes: 30 # Sjekk hvert 30. minutt (standard: 30)
    # Sett til 0 for å deaktivere triggers uten å fjerne konfigurasjonen
    classification_ceiling: CONFIDENTIAL # Maks taint-tak (standard: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Ikke vekk mellom kl. 22 ...
      end: 7 # ... og kl. 07
```

| Innstilling                             | Beskrivelse                                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Om periodiske trigger-oppvåkninger er aktive. Sett til `false` for å deaktivere.                                                                  |
| `interval_minutes`                      | Hvor ofte (i minutter) agenten våkner for å sjekke triggers. Standard: `30`. Sett til `0` for å deaktivere triggers uten å fjerne konfigblokken.  |
| `classification_ceiling`                | Maksimalt klassifiseringsnivå trigger-sesjonen kan nå. Standard: `CONFIDENTIAL`.                                                                  |
| `quiet_hours.start` / `quiet_hours.end` | Timeintervall (24-timers klokke) der triggers undertrykkes.                                                                                        |

::: tip For å midlertidig deaktivere triggers, sett `interval_minutes: 0`. Dette
tilsvarer `enabled: false` og lar deg beholde de andre trigger-innstillingene
slik at du enkelt kan aktivere dem igjen. :::

### Trigger-kjøring

Hver trigger-oppvåkning følger denne sekvensen:

1. Scheduleren utløses ved det konfigurerte intervallet.
2. En frisk bakgrunns sesjon spawnes med `PUBLIC` taint.
3. Agenten leser `TRIGGER.md` for overvåkningsinstruksjonene sine.
4. Agenten evaluerer hver sjekk ved hjelp av tilgjengelige verktøy og MCP-servere.
5. Hvis handling er nødvendig, handler agenten — sender varsler, oppretter
   oppgaver eller leverer oppsummeringer.
6. Sesjonens taint kan eskalere etter hvert som klassifisert data aksesseres,
   men kan ikke overskride det konfigurerte taket.
7. Sesjonen arkiveres etter fullføring.

::: tip Triggers og cron-jobber utfyller hverandre. Bruk cron for oppgaver som
skal kjøre på nøyaktige tidspunkter uavhengig av betingelser (morgenbriefing
kl. 07). Bruk triggers for overvåking som krever skjønn (sjekk om noe trenger
min oppmerksomhet hvert 30. minutt). :::

## Trigger-kontekstverktøy

Agenten kan laste trigger-resultater inn i den gjeldende samtalen ved hjelp av
`trigger_add_to_context`-verktøyet. Dette er nyttig når en bruker spør om noe
som ble sjekket under den siste trigger-oppvåkningen.

### Bruk

| Parameter | Standard    | Beskrivelse                                                                                                |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | Hvilket trigger-utdata som lastes: `"trigger"` (periodisk), `"cron:<job-id>"`, eller `"webhook:<source>"` |

Verktøyet laster det nyeste kjøringsresultatet for den angitte kilden og legger
det til i samtale-konteksten.

### No-write-down-håndhevelse

Trigger-kontekstinjeksjon respekterer no-write-down-regelen:

- Hvis triggerens klassifisering **overstiger** session taint, **eskalerer**
  session taint til å matche
- Hvis session taint **overstiger** triggerens klassifisering, er injeksjonen
  **tillatt** — lavere-klassifisert data kan alltid flyte til en
  høyere-klassifisert sesjon (normal `canFlowTo`-atferd). Session taint endres ikke.

::: info En CONFIDENTIAL-sesjon kan laste et PUBLIC trigger-resultat uten
problemer — data flyter oppover. Det omvendte (injisering av CONFIDENTIAL
trigger-data i en sesjon med PUBLIC-tak) ville eskalere session taint til
CONFIDENTIAL. :::

### Vedvarende lagring

Trigger-resultater lagres via `StorageProvider` med nøkler i formatet
`trigger:last:<source>`. Bare det nyeste resultatet per kilde beholdes.

## Sikkerhetsintegrasjon

All planlagt kjøring integreres med kjernes sikkerhetsmodell:

- **Isolerte sesjoner** — Hver cron-jobb og trigger-oppvåkning kjøres i sin
  egen spawnet sesjon med uavhengig taint-sporing.
- **Klassifiseringstak** — Bakgrunnsoppgaver kan ikke overskride sitt konfigurerte
  klassifiseringsnivå, selv om verktøyene de kaller returnerer høyere-klassifisert
  data.
- **Policy-hooks** — Alle handlinger i planlagte oppgaver passerer gjennom de
  samme håndhevingshookene som interaktive sesjoner (PRE_TOOL_CALL,
  POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Kanal-klassifisering** — Utdatalevering respekterer målkanalens
  klassifiseringsnivå. Et `CONFIDENTIAL`-resultat kan ikke sendes til en
  `PUBLIC`-kanal.
- **Revisjonsspor** — Hver planlagte kjøring logges med full kontekst: jobb-ID,
  sesjons-ID, taint-historikk, utførte handlinger og leveringsstatus.
- **Vedvarende lagring** — Cron-jobber lagres via `StorageProvider` (navnerom:
  `cron:`) og overlever gateway-omstarter.
