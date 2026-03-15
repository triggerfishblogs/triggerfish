# Sessioner och Taint

Sessioner är den grundläggande enheten för konversationstillstånd i Triggerfish. Varje session spårar oberoende en **taint-nivå** — ett klassificeringsvattenström som registrerar den högsta känsligheten hos data som nåtts under sessionen. Taint driver policymotonrs utdatabeslut: om en session är taintad vid `CONFIDENTIAL` kan ingen data från den sessionen flöda till en kanal klassificerad under `CONFIDENTIAL`.

## Session-taint-modell

### Hur Taint fungerar

När en session kommer åt data vid en klassificeringsnivå **taintas** hela sessionen vid den nivån. Taint följer tre regler:

1. **Per konversation**: Varje session har sin egen oberoende taint-nivå
2. **Bara eskalering**: Taint kan öka, aldrig minska inom en session
3. **Fullständig återställning rensar allt**: Taint OCH konversationshistorik rensas tillsammans

<img src="/diagrams/taint-escalation.svg" alt="Taint-eskalering: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint kan bara eskalera, aldrig minska." style="max-width: 100%;" />

::: warning SÄKERHET Taint kan aldrig selektivt minskas. Det finns ingen mekanism för att "av-tainta" en session utan att rensa hela konversationshistoriken. Det förhindrar kontextläckage — om sessionen minns att ha sett konfidentiell data måste taint återspegla det. :::

### Varför Taint inte kan minska

Även om den klassificerade datan inte längre visas innehåller LLM:ens kontextfönster den fortfarande. Modellen kan referera till, sammanfatta eller upprepa klassificerad information i framtida svar. Det enda säkra sättet att sänka taint är att eliminera kontexten helt — vilket är exakt vad en fullständig återställning gör.

## Sessionstyper

Triggerfish hanterar flera sessionstyper, var och en med oberoende taint-spårning:

| Sessionstyp    | Beskrivning                                           | Initial Taint | Bevaras vid omstarter |
| -------------- | ----------------------------------------------------- | ------------- | --------------------- |
| **Main**       | Primär direkt konversation med ägaren                 | `PUBLIC`      | Ja                    |
| **Kanal**      | En per ansluten kanal (Telegram, Slack osv.)          | `PUBLIC`      | Ja                    |
| **Bakgrund**   | Skapad för autonoma uppgifter (cron, webhooks)        | `PUBLIC`      | Under uppgiftens varaktighet |
| **Agent**      | Per-agentsessioner för multi-agent-routning           | `PUBLIC`      | Ja                    |
| **Grupp**      | Gruppchatt-sessioner                                  | `PUBLIC`      | Ja                    |

::: info Bakgrundssessioner börjar alltid med `PUBLIC` taint, oavsett föräldrasessionens taint-nivå. Det här är av design — cron-jobb och webhook-utlösta uppgifter ska inte ärva taint från vilken session som råkade skapa dem. :::

## Taint-eskaleringsexempel

Här är ett komplett flöde som visar taint-eskalering och det resulterande policyblocket:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint-eskaleringsexempel: session börjar PUBLIC, eskalerar till CONFIDENTIAL efter Salesforce-åtkomst, blockerar sedan utdata till PUBLIC WhatsApp-kanal" style="max-width: 100%;" />

## Fullständig återställningsmekanism

En sessionsåterställning är det enda sättet att sänka taint. Det är en avsiktlig, destruktiv operation:

1. **Arkivera linjegrafipost** — All lineage-data från sessionen bevaras i revisionslagret
2. **Rensa konversationshistorik** — Hela kontextfönstret raderas
3. **Återställ taint till PUBLIC** — Sessionen börjar om från scratch
4. **Kräv användarbekräftelse** — `SESSION_RESET`-hooken kräver uttrycklig bekräftelse innan exekvering

Efter en återställning är sessionen oskiljbar från en ny session. Agenten har inget minne av den tidigare konversationen. Det här är det enda sättet att garantera att klassificerad data inte kan läcka via LLM:ens kontext.

## Inter-sessionskommunikation

När en agent skickar data mellan sessioner med `sessions_send` gäller samma nedskrivningsregler:

| Källsessions-taint    | Målsessionskanal       | Beslut  |
| --------------------- | ---------------------- | ------- |
| `PUBLIC`              | `PUBLIC`-kanal         | ALLOW   |
| `CONFIDENTIAL`        | `CONFIDENTIAL`-kanal   | ALLOW   |
| `CONFIDENTIAL`        | `PUBLIC`-kanal         | BLOCK   |
| `RESTRICTED`          | `CONFIDENTIAL`-kanal   | BLOCK   |

Sessionsverktyg tillgängliga för agenten:

| Verktyg            | Beskrivning                                         | Taint-påverkan                           |
| ------------------ | --------------------------------------------------- | ---------------------------------------- |
| `sessions_list`    | Lista aktiva sessioner med filter                   | Ingen taint-ändring                      |
| `sessions_history` | Hämta utskrift för en session                       | Taint ärvs från refererad session        |
| `sessions_send`    | Skicka meddelande till en annan session             | Föremål för nedskrivningskontroll        |
| `sessions_spawn`   | Skapa bakgrundsuppgiftssession                      | Ny session startar med `PUBLIC`          |
| `session_status`   | Kontrollera aktuellt sessionstillstånd och metadata | Ingen taint-ändring                      |

## Datalinjegrafi

Varje dataelement som bearbetas av Triggerfish bär **provenansmetadata** — en komplett post om var data kom ifrån, hur den transformerades och vart den gick. Linjegrafi är revisionsspåret som gör klassificeringsbeslut verifierbara.

### Linjegrafipoststruktur

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Valda fält: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM sammanfattade 3 poster till pipelineöversikt",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Linjegrafiregistreringsregler

| Händelse                                   | Linjegrafiåtgärd                                  |
| ------------------------------------------ | -------------------------------------------------- |
| Data läst från integration                 | Skapa linjegrafipost med ursprung                  |
| Data transformerad av LLM                  | Lägg till transformation, länka indatalinjegrafer  |
| Data aggregerad från flera källor          | Slå ihop linjegrafi, klassificering = `max(indata)` |
| Data skickad till kanal                    | Registrera mål, verifiera klassificering           |
| Sessionsåterställning                      | Arkivera linjegrafipost, rensa från kontext        |

### Aggregeringsklassificering

När data från flera källor kombineras (t.ex. en LLM-sammanfattning av poster från olika integrationer) ärver det aggregerade resultatet den **maximala klassificeringen** av alla indata:

```
Indata 1: INTERNAL    (intern wiki)
Indata 2: CONFIDENTIAL (Salesforce-post)
Indata 3: PUBLIC      (väder-API)

Aggregerad utdataklassificering: CONFIDENTIAL (max av indata)
```

::: tip Företagsdriftsättningar kan konfigurera valfria nedgraderingsregler för statistiska aggregat (medelvärden, antal, summor av 10+ poster) eller certifierad anonymiserad data. Alla nedgraderingar kräver explicita policyregler, loggas med full motivering och är föremål för revisionsöversyn. :::

### Revisionskapaciteter

Linjegrafi möjliggör fyra kategorier av revisionsfrågor:

- **Framåtspårning**: "Vad hände med data från Salesforce-post X?" — följer data framåt från ursprung till alla destinationer
- **Bakåtspårning**: "Vilka källor bidrog till denna utdata?" — spårar en utdata tillbaka till alla dess källposter
- **Klassificeringsberättigande**: "Varför är det här märkt CONFIDENTIAL?" — visar klassificeringsanledningskedjan
- **Efterlevnadsexport**: Fullständig förvaringskedja för juridisk eller regulatorisk granskning

## Taint-persistens

Session-taint bevaras via `StorageProvider` under `taint:`-namnrymden. Det innebär att taint överlever daemon-omstarter — en session som var `CONFIDENTIAL` före en omstart är fortfarande `CONFIDENTIAL` efteråt.

Linjegrafipost bevaras under `lineage:`-namnrymden med efterlevnadsdrivet bevarande (standard 90 dagar).
