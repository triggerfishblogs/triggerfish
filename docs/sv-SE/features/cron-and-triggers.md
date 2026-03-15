# Cron och Triggers

Triggerfish-agenter är inte begränsade till reaktiva frågor och svar. Cron- och trigger-systemet möjliggör proaktivt beteende: schemalagda uppgifter, regelbundna incheckningar, morgonöversikter, bakgrundsövervakning och autonoma flerstegsarbetsflöden.

## Cron-jobb

Cron-jobb är schemalagda uppgifter med fasta instruktioner, en leveranskanal och ett klassificeringstak. De använder standard cron-uttryckssyntax.

### Konfiguration

Definiera cron-jobb i `triggerfish.yaml` eller låt agenten hantera dem under körtid via cron-verktyget:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7:00 dagligen
        task: "Förbered morgonöversikt med kalender,
          olästa e-postmeddelanden och väder"
        channel: telegram # Var leveransen sker
        classification: INTERNAL # Max taint för detta jobb

      - id: pipeline-check
        schedule: "0 */4 * * *" # Var 4:e timme
        task: "Kontrollera Salesforce-pipeline för ändringar"
        channel: slack
        classification: CONFIDENTIAL
```

### Hur det fungerar

1. **CronManager** tolkar standard cron-uttryck och upprätthåller ett beständigt jobbregister som överlever omstarter.
2. När ett jobb körs skapar **OrchestratorFactory** en isolerad orkestratorer och session specifikt för den exekveringen.
3. Jobbet körs i en **bakgrundssessions-arbetsyta** med sin egen taint-spårning.
4. Utdata levereras till den konfigurerade kanalen, med hänsyn till kanalens klassificeringsregler.
5. Exekveringshistorik registreras för revision.

### Agenthantering av cron

Agenten kan skapa och hantera sina egna cron-jobb via `cron`-verktyget:

| Åtgärd         | Beskrivning                 | Säkerhet                                          |
| -------------- | --------------------------- | ------------------------------------------------- |
| `cron.list`    | Lista alla schemalagda jobb | Endast ägare                                      |
| `cron.create`  | Schemalägg ett nytt jobb    | Endast ägare, klassificeringstak tillämpas         |
| `cron.delete`  | Ta bort ett schemalagt jobb | Endast ägare                                      |
| `cron.history` | Visa tidigare exekveringar  | Revisionshistorik bevarad                         |

::: warning Skapande av cron-jobb kräver ägarautentisering. Agenten kan inte schemalägga jobb åt externa användare eller överskrida det konfigurerade klassificeringstaken. :::

### CLI-cron-hantering

Cron-jobb kan också hanteras direkt från kommandoraden:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

Flaggan `--classification` anger klassificeringstaken för jobbet. Giltiga nivåer är `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` och `RESTRICTED`. Om den utelämnas används `INTERNAL` som standard.

## Trigger-systemet

Triggers är periodiska "inchecknings"-slingor där agenten vaknar för att utvärdera om någon proaktiv åtgärd behövs. Till skillnad från cron-jobb med fasta uppgifter ger triggers agenten diskretion att besluta vad som behöver uppmärksamhet.

### TRIGGER.md

`TRIGGER.md` definierar vad agenten ska kontrollera vid varje uppvakning. Den finns på `~/.triggerfish/config/TRIGGER.md` och är en frihandformad markdown-fil där du anger övervakningsprioriteringar, eskaleringsregler och proaktiva beteenden.

Om `TRIGGER.md` saknas använder agenten sin allmänna kunskap för att avgöra vad som behöver uppmärksamhet.

**Exempel på TRIGGER.md:**

```markdown
# TRIGGER.md — Vad att kontrollera vid varje uppvakning

## Prioritetskontroller

- Olästa meddelanden över alla kanaler äldre än 1 timme
- Kalenderkonflikter under de nästa 24 timmarna
- Försenade uppgifter i Linear eller Jira

## Övervakning

- GitHub: PRs som väntar på min granskning
- E-post: allt från VIP-kontakter (flagga för omedelbar avisering)
- Slack: omnämnanden i #incidents-kanalen

## Proaktivt

- Om morgon (7-9), förbered daglig översikt
- Om fredagseftermiddag, skriv veckosammanfattning
```

### Trigger-konfiguration

Trigger-timing och begränsningar ställs in i `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Sätt till false för att inaktivera triggers (standard: true)
    interval_minutes: 30 # Kontrollera var 30:e minut (standard: 30)
    # Sätt till 0 för att inaktivera triggers utan att ta bort konfigurationen
    classification_ceiling: CONFIDENTIAL # Max taint-tak (standard: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Vakna inte mellan 22:00 ...
      end: 7 # ... och 07:00
```

| Inställning                             | Beskrivning                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Huruvida periodiska trigger-uppvakningar är aktiva. Sätt till `false` för att inaktivera.                                                           |
| `interval_minutes`                      | Hur ofta (i minuter) agenten vaknar för att kontrollera triggers. Standard: `30`. Sätt till `0` för att inaktivera utan att ta bort konfigurationsblocket. |
| `classification_ceiling`                | Maximal klassificeringsnivå trigger-sessionen kan nå. Standard: `CONFIDENTIAL`.                                                                     |
| `quiet_hours.start` / `quiet_hours.end` | Timintervall (24h-klocka) under vilket triggers undertrycks.                                                                                        |

::: tip För att tillfälligt inaktivera triggers, sätt `interval_minutes: 0`. Det är likvärdigt med `enabled: false` och låter dig behålla dina andra trigger-inställningar på plats så att du enkelt kan återaktivera. :::

### Trigger-exekvering

Varje trigger-uppvakning följer den här sekvensen:

1. Schemaläggaren körs med det konfigurerade intervallet.
2. En ny bakgrundssession skapas med `PUBLIC` taint.
3. Agenten läser `TRIGGER.md` för sina övervakningsinstruktioner.
4. Agenten utvärderar varje kontroll med tillgängliga verktyg och MCP-servrar.
5. Om åtgärd behövs agerar agenten — skickar aviseringar, skapar uppgifter eller levererar sammanfattningar.
6. Sessionens taint kan eskalera när klassificerad data nås, men kan inte överskrida det konfigurerade taket.
7. Sessionen arkiveras efter slutförande.

::: tip Triggers och cron-jobb kompletterar varandra. Använd cron för uppgifter som ska köras vid exakta tider oavsett förutsättningar (morgonöversikt kl. 7). Använd triggers för övervakning som kräver bedömning (kontrollera om något behöver min uppmärksamhet var 30:e minut). :::

## Trigger-kontextverktyget

Agenten kan ladda trigger-resultat i sin nuvarande konversation med verktyget `trigger_add_to_context`. Det är användbart när en användare frågar om något som kontrollerades under den senaste trigger-uppvakningen.

### Användning

| Parameter | Standard     | Beskrivning                                                                                                    |
| --------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"`  | Vilka trigger-utdata som ska laddas: `"trigger"` (periodisk), `"cron:<job-id>"` eller `"webhook:<source>"`    |

Verktyget laddar det senaste exekveringsresultatet för den angivna källan och lägger till det i konversationskontexten.

### Nedskrivningstillämpning

Trigger-kontextinjektion respekterar nedskrivningsregeln:

- Om triggers klassificering **överstiger** sessions-tainten **eskalerar** sessions-tainten för att matcha
- Om sessions-tainten **överstiger** triggers klassificering **tillåts** injektionen — data med lägre klassificering kan alltid flöda in i en session med högre klassificering (normalt `canFlowTo`-beteende). Sessions-tainten ändras inte.

::: info En CONFIDENTIAL-session kan ladda ett PUBLIC-triggerresultat utan problem — data flödar uppåt. Det omvända (injicera CONFIDENTIAL-triggerdata i en session med PUBLIC-tak) skulle eskalera sessionens taint till CONFIDENTIAL. :::

### Persistens

Triggerresultat lagras via `StorageProvider` med nycklar i formatet `trigger:last:<source>`. Bara det senaste resultatet per källa bevaras.

## Säkerhetsintegration

All schemalagd exekvering integreras med kärnssäkerhetsmodellen:

- **Isolerade sessioner** — Varje cron-jobb och trigger-uppvakning körs i sin egen skapade session med oberoende taint-spårning.
- **Klassificeringstak** — Bakgrundsuppgifter kan inte överstiga sin konfigurerade klassificeringsnivå, även om de verktyg de anropar returnerar högt klassificerad data.
- **Policykrokar** — Alla åtgärder inom schemalagda uppgifter passerar genom samma tillämpningskrokar som interaktiva sessioner (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Kanalklassificering** — Leverans av utdata respekterar målkanalens klassificeringsnivå. Ett `CONFIDENTIAL`-resultat kan inte skickas till en `PUBLIC`-kanal.
- **Revisionshistorik** — Varje schemalagd exekvering loggas med full kontext: jobb-ID, sessions-ID, taint-historik, vidtagna åtgärder och leveransstatus.
- **Persistens** — Cron-jobb lagras via `StorageProvider` (namnrymd: `cron:`) och överlever gateway-omstarter.
