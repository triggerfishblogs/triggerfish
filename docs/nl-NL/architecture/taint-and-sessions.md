# Sessies en Taint

Sessies zijn de fundamentele eenheid van gespreksstatus in Triggerfish. Elke sessie volgt onafhankelijk een **taint-niveau** — een classificatiewatermerk dat de hoogste gevoeligheid bijhoudt van gegevens die tijdens de sessie zijn geraadpleegd. Taint stuurt de uitvoerbeslissingen van de beleidsengine: als een sessie is besmet op `CONFIDENTIAL`, kunnen er geen gegevens van die sessie stromen naar een kanaal dat is geclassificeerd onder `CONFIDENTIAL`.

## Sessie-taint-model

### Hoe taint werkt

Wanneer een sessie gegevens raadpleegt op een classificatieniveau, wordt de hele sessie op dat niveau **besmet**. Taint volgt drie regels:

1. **Per gesprek**: Elke sessie heeft zijn eigen onafhankelijk taint-niveau
2. **Alleen escalatie**: Taint kan toenemen, nooit afnemen binnen een sessie
3. **Volledige reset wist alles**: Taint EN gespreksgeschiedenis worden tegelijk gewist

<img src="/diagrams/taint-escalation.svg" alt="Taint-escalatie: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint kan alleen escaleren, nooit afnemen." style="max-width: 100%;" />

::: warning BEVEILIGING Taint kan nooit selectief worden verlaagd. Er is geen mechanisme om een sessie te "ontsmetten" zonder de volledige gespreksgeschiedenis te wissen. Dit voorkomt contextlekken — als de sessie weet dat het vertrouwelijke gegevens heeft gezien, moet de taint dat weerspiegelen. :::

### Waarom taint niet kan afnemen

Zelfs als de geclassificeerde gegevens niet meer worden weergegeven, bevat het contextvenster van het LLM ze nog steeds. Het model kan geclassificeerde informatie verwijzen, samenvatten of herhalen in toekomstige antwoorden. De enige veilige manier om taint te verlagen is de context volledig te elimineren — wat precies is wat een volledige reset doet.

## Sessietypen

Triggerfish beheert verschillende sessietypen, elk met onafhankelijke taint-tracking:

| Sessietype     | Beschrijving                                       | Initiële taint | Blijft bestaan na herstart |
| -------------- | -------------------------------------------------- | -------------- | -------------------------- |
| **Hoofd**      | Primair direct gesprek met de eigenaar             | `PUBLIC`       | Ja                         |
| **Kanaal**     | Eén per verbonden kanaal (Telegram, Slack, enz.)   | `PUBLIC`       | Ja                         |
| **Achtergrond** | Gestart voor autonome taken (cron, webhooks)      | `PUBLIC`       | Duur van de taak           |
| **Agent**      | Per-agent-sessies voor multi-agent-routering       | `PUBLIC`       | Ja                         |
| **Groep**      | Groepsgespreksssessies                             | `PUBLIC`       | Ja                         |

::: info Achtergrondssessies starten altijd met `PUBLIC`-taint, ongeacht het taint-niveau van de oudersessie. Dit is bewust ontworpen — cron-jobs en webhook-getriggerde taken mogen niet de taint erven van welke sessie hen dan ook heeft gestart. :::

## Voorbeeld van taint-escalatie

Hier is een complete stroom die taint-escalatie en de resulterende beleidsblokkering toont:

<img src="/diagrams/taint-with-blocks.svg" alt="Voorbeeld taint-escalatie: sessie start PUBLIC, escaleert naar CONFIDENTIAL na Salesforce-toegang, blokkeert vervolgens uitvoer naar PUBLIC WhatsApp-kanaal" style="max-width: 100%;" />

## Volledig resetmechanisme

Een sessiereset is de enige manier om taint te verlagen. Het is een bewuste, destructieve operatie:

1. **Lineagerecords archiveren** — Alle lineagegegevens van de sessie worden bewaard in auditopslag
2. **Gespreksgeschiedenis wissen** — Het volledige contextvenster wordt gewist
3. **Taint resetten naar PUBLIC** — De sessie begint opnieuw
4. **Gebruikersbevestiging vereisen** — De `SESSION_RESET`-hook vereist expliciete bevestiging voordat deze wordt uitgevoerd

Na een reset is de sessie niet te onderscheiden van een gloednieuwe sessie. De agent heeft geen herinnering aan het vorige gesprek. Dit is de enige manier om te garanderen dat geclassificeerde gegevens niet kunnen lekken via de context van het LLM.

## Communicatie tussen sessies

Wanneer een agent gegevens tussen sessies verstuurt via `sessions_send`, gelden dezelfde no-write-down-regels:

| Taint bronsessie | Kanaal doelsessie      | Beslissing |
| ---------------- | ---------------------- | ---------- |
| `PUBLIC`         | `PUBLIC`-kanaal        | ALLOW      |
| `CONFIDENTIAL`   | `CONFIDENTIAL`-kanaal  | ALLOW      |
| `CONFIDENTIAL`   | `PUBLIC`-kanaal        | BLOCK      |
| `RESTRICTED`     | `CONFIDENTIAL`-kanaal  | BLOCK      |

Sessietools beschikbaar voor de agent:

| Tool               | Beschrijving                                 | Taint-impact                                |
| ------------------ | -------------------------------------------- | ------------------------------------------- |
| `sessions_list`    | Actieve sessies weergeven met filters        | Geen taint-wijziging                        |
| `sessions_history` | Transcript voor een sessie ophalen           | Taint erft van de gerefereerde sessie       |
| `sessions_send`    | Bericht naar een andere sessie sturen        | Onderworpen aan write-down-controle         |
| `sessions_spawn`   | Achtergrondtaaksessie aanmaken               | Nieuwe sessie start op `PUBLIC`             |
| `session_status`   | Huidige sessiestatus en metadata controleren | Geen taint-wijziging                        |

## Gegevenslineage

Elk gegevenselement dat door Triggerfish wordt verwerkt, draagt **provenancemetadata** — een volledig overzicht van waar gegevens vandaan kwamen, hoe ze zijn getransformeerd en waar ze naartoe gingen. Lineage is de audittrail die classificatiebeslissingen verifieerbaar maakt.

### Structuur van een lineagerecord

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
      "description": "Geselecteerde velden: naam, bedrag, fase",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM heeft 3 records samengevat in pipeline-overzicht",
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

### Lineage-trackingregels

| Gebeurtenis                             | Lineageactie                                        |
| --------------------------------------- | --------------------------------------------------- |
| Gegevens gelezen van integratie         | Lineagerecord aanmaken met oorsprong                |
| Gegevens getransformeerd door LLM       | Transformatie toevoegen, invoerlineages koppelen    |
| Gegevens samengevoegd uit meerdere bronnen | Lineage samenvoegen, classificatie = `max(invoeren)` |
| Gegevens verzonden naar kanaal          | Bestemming vastleggen, classificatie verifiëren     |
| Sessie reset                            | Lineagerecords archiveren, uit context verwijderen  |

### Aggregatieclassificatie

Wanneer gegevens uit meerdere bronnen worden gecombineerd (bijv. een LLM-samenvatting van records uit verschillende integraties), erft het geaggregeerde resultaat de **maximale classificatie** van alle invoeren:

```
Invoer 1: INTERNAL    (interne wiki)
Invoer 2: CONFIDENTIAL (Salesforce-record)
Invoer 3: PUBLIC      (weer-API)

Classificatie geaggregeerde uitvoer: CONFIDENTIAL (max van invoeren)
```

::: tip Enterprise-implementaties kunnen optionele degradatieregels configureren voor statistische aggregaten (gemiddelden, aantallen, sommen van 10+ records) of gecertificeerd geanonimiseerde gegevens. Alle degradaties vereisen expliciete beleidsregels, worden vastgelegd met volledige rechtvaardiging en zijn onderworpen aan auditbeoordeling. :::

### Auditcapaciteiten

Lineage maakt vier categorieën auditquery's mogelijk:

- **Voorwaartse tracering**: "Wat is er gebeurd met gegevens van Salesforce-record X?" — volgt gegevens voorwaarts van oorsprong naar alle bestemmingen
- **Achterwaartse tracering**: "Welke bronnen hebben bijgedragen aan deze uitvoer?" — traceert een uitvoer terug naar alle bronrecords
- **Classificatierechtvaarding**: "Waarom is dit gemarkeerd als CONFIDENTIAL?" — toont de classificatierechtvaardigingsketen
- **Compliance-export**: Volledige bewakingsketen voor juridische of regelgevingscontrole

## Taint-persistentie

Sessie-taint wordt bewaard via de `StorageProvider` onder de naamruimte `taint:`. Dit betekent dat taint overleeft bij daemon-herstarts — een sessie die `CONFIDENTIAL` was voor een herstart, is nog steeds `CONFIDENTIAL` daarna.

Lineagerecords worden bewaard onder de naamruimte `lineage:` met op compliance gebaseerde retentie (standaard 90 dagen).
