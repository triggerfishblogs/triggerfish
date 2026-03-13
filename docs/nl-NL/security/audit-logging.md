# Audit en compliance

Elke beleidsbeslissing in Triggerfish wordt vastgelegd met volledige context. Er zijn geen uitzonderingen, geen "foutopsporingsmodus" die logging uitschakelt en geen manier voor het LLM om auditrecords te onderdrukken. Dit biedt een volledig, tamperbestendig record van elke beveiligingsbeslissing die het systeem heeft genomen.

## Wat wordt vastgelegd

Auditlogging is een **vaste regel** — het is altijd actief en kan niet worden uitgeschakeld. Elke handhavingshookuitvoering produceert een auditrecord met:

| Veld              | Beschrijving                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Wanneer de beslissing is genomen (ISO 8601, UTC)                                                                                                                                 |
| `hook_type`       | Welke handhavingshook is uitgevoerd (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | De sessie waarin de actie plaatsvond                                                                                                                                             |
| `decision`        | `ALLOW`, `BLOCK` of `REDACT`                                                                                                                                                     |
| `reason`          | Leesbare verklaring van de beslissing                                                                                                                                            |
| `input`           | De gegevens of actie die de hook heeft geactiveerd                                                                                                                               |
| `rules_evaluated` | Welke beleidsregels zijn gecontroleerd om de beslissing te nemen                                                                                                                 |
| `taint_before`    | Sessie-taint-niveau vóór de actie                                                                                                                                                |
| `taint_after`     | Sessie-taint-niveau na de actie (indien gewijzigd)                                                                                                                               |
| `metadata`        | Aanvullende context specifiek voor het hooktype                                                                                                                                  |

## Voorbeelden van auditrecords

### Toegestane uitvoer

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### Geblokkeerde write-down

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### Toolaanroep met taint-escalatie

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### Geblokkeerde agentdelegatie

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## Audittraceringsmogelijkheden

<img src="/diagrams/audit-trace-flow.svg" alt="Audittraceringsstroom: voorwaartse tracering, achterwaartse tracering en classificatieverantwoording voeden compliance-export" style="max-width: 100%;" />

Auditrecords kunnen op vier manieren worden bevraagd, elk voor een andere compliance- en forensische behoefte.

### Voorwaartse tracering

**Vraag:** "Wat is er gebeurd met gegevens van Salesforce-record `opp_00123ABC`?"

Een voorwaartse tracering volgt een gegevenselement van zijn oorsprongspunt door elke transformatie, sessie en uitvoer. Het beantwoordt: waar zijn deze gegevens naartoe gegaan, wie heeft ze gezien en zijn ze ooit buiten de organisatie verzonden?

```
Oorsprong: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> classificatie: CONFIDENTIAL
  --> sessie: sess_456

Transformaties:
  --> Geëxtraheerde velden: naam, bedrag, fase
  --> LLM heeft 3 records samengevat in pijplijnoverzicht

Uitvoeren:
  --> Verzonden naar eigenaar via Telegram (TOEGESTAAN)
  --> Geblokkeerd van WhatsApp extern contact (GEBLOKKEERD)
```

### Achterwaartse tracering

**Vraag:** "Welke bronnen hebben bijgedragen aan het bericht verzonden om 10:24 UTC?"

Een achterwaartse tracering begint bij een uitvoer en loopt terug door de lineageketen om elke gegevensbron te identificeren die de uitvoer heeft beïnvloed. Dit is essentieel voor het begrijpen of geclassificeerde gegevens zijn opgenomen in een antwoord.

```
Uitvoer: Bericht verzonden naar Telegram om 10:24:00Z
  --> sessie: sess_456
  --> lineagebronnen:
      --> lin_789xyz: Salesforce-kans (CONFIDENTIAL)
      --> lin_790xyz: Salesforce-kans (CONFIDENTIAL)
      --> lin_791xyz: Salesforce-kans (CONFIDENTIAL)
      --> lin_792xyz: Weer-API (PUBLIC)
```

### Classificatieverantwoording

**Vraag:** "Waarom zijn deze gegevens gemarkeerd als CONFIDENTIAL?"

Classificatieverantwoording traceert terug naar de regel of het beleid dat het classificatieniveau heeft toegewezen:

```
Gegevens: Pijplijnsamenvatting (lin_789xyz)
Classificatie: CONFIDENTIAL
Reden: source_system_default
  --> Standaardclassificatie Salesforce-integratie: CONFIDENTIAL
  --> Geconfigureerd door: admin_001 op 2025-01-10T08:00:00Z
  --> Beleidsregel: "Alle Salesforce-gegevens geclassificeerd als CONFIDENTIAL"
```

### Compliance-export

Voor juridisch, regelgevend of intern onderzoek kan Triggerfish de volledige bewakingsketen exporteren voor elk gegevenselement of tijdsbereik:

```
Exportverzoek:
  --> Tijdsbereik: 2025-01-29T00:00:00Z tot 2025-01-29T23:59:59Z
  --> Bereik: Alle sessies voor user_456
  --> Formaat: JSON

Export bevat:
  --> Alle auditrecords in het tijdsbereik
  --> Alle lineagerecords waarnaar wordt verwezen door auditrecords
  --> Alle sessiestaatovergangen
  --> Alle beleidsbeslissingen (ALLOW, BLOCK, REDACT)
  --> Alle taint-wijzigingen
  --> Alle delegatiekettenrecords
```

::: tip Compliance-exports zijn gestructureerde JSON-bestanden die kunnen worden opgenomen door SIEM-systemen, compliance-dashboards of juridische reviewtools. Het exportformaat is stabiel en versiebeheerd. :::

## Gegevenslineage

Auditlogging werkt samen met het gegevenslineagesysteem van Triggerfish. Elk gegevenselement dat door Triggerfish wordt verwerkt, draagt provenancemetadata:

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
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
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

Lineagerecords worden aangemaakt bij `POST_TOOL_RESPONSE` (wanneer gegevens het systeem binnenkomen) en bijgewerkt naarmate gegevens worden getransformeerd. Geaggregeerde gegevens erven `max(invoerclassificaties)` — als een invoer CONFIDENTIAL is, is de uitvoer minimaal CONFIDENTIAL.

| Gebeurtenis                              | Lineageactie                                            |
| ---------------------------------------- | ------------------------------------------------------- |
| Gegevens gelezen van integratie          | Lineagerecord aanmaken met oorsprong                    |
| Gegevens getransformeerd door LLM        | Transformatie toevoegen, invoerlineages koppelen        |
| Gegevens geaggregeerd uit meerdere bronnen | Lineage samenvoegen, classificatie = max(invoeren)    |
| Gegevens verzonden naar kanaal           | Bestemming vastleggen, classificatie verifiëren         |
| Sessie gereset                           | Lineagerecords archiveren, uit context wissen           |

## Opslag en bewaring

Auditlogs worden bewaard via de `StorageProvider`-abstractie onder de `audit:`-naamruimte. Lineagerecords worden opgeslagen onder de `lineage:`-naamruimte.

| Gegevenstype       | Naamruimte   | Standaardretentie         |
| ------------------ | ------------ | ------------------------- |
| Auditlogs          | `audit:`     | 1 jaar                    |
| Lineagerecords     | `lineage:`   | 90 dagen                  |
| Sessiestatus       | `sessions:`  | 30 dagen                  |
| Taint-geschiedenis | `taint:`     | Overeenkomt met sessieretentie |

::: warning BEVEILIGING Retentieperioden zijn configureerbaar, maar auditlogs zijn standaard ingesteld op 1 jaar om aan compliancevereisten te voldoen (SOC 2, GDPR, HIPAA). Het verminderen van de retentieperiode onder de regelgevingsvereiste van uw organisatie is de verantwoordelijkheid van de beheerder. :::

### Opslagbackends

| Niveau         | Backend    | Details                                                                                                                                                                        |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Persoonlijk** | SQLite    | WAL-modus database op `~/.triggerfish/data/triggerfish.db`. Auditrecords worden opgeslagen als gestructureerde JSON in dezelfde database als alle andere Triggerfish-status.    |
| **Enterprise** | Pluggable  | Enterprise-backends (Postgres, S3, enz.) kunnen worden gebruikt via de `StorageProvider`-interface. Dit maakt integratie mogelijk met bestaande logaggregatie-infrastructuur. |

## Onveranderlijkheid en integriteit

Auditrecords zijn alleen-toevoegen. Eenmaal geschreven kunnen ze niet worden gewijzigd of verwijderd door een component van het systeem — inclusief het LLM, de agent of plugins. Verwijdering vindt alleen plaats via het verlopen van het retentiebeleid.

Elk auditrecord bevat een inhoudshasj die kan worden gebruikt om integriteit te verifiëren. Als records worden geëxporteerd voor compliancebeoordeling, kunnen de hasjes worden gevalideerd aan de hand van de opgeslagen records om manipulatie te detecteren.

## Enterprise-compliancefuncties

Enterprise-implementaties kunnen auditlogging uitbreiden met:

| Functie                       | Beschrijving                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| **Legal hold**                | Retentiegebaseerde verwijdering opschorten voor opgegeven gebruikers, sessies of tijdsbereiken   |
| **SIEM-integratie**           | Auditgebeurtenissen in realtime streamen naar Splunk, Datadog of andere SIEM-systemen            |
| **Compliance-dashboards**     | Visueel overzicht van beleidsbeslissingen, geblokkeerde acties en taint-patronen                 |
| **Geplande exports**          | Automatische periodieke exports voor regelgevingsbeoordeling                                     |
| **Waarschuwingsregels**       | Meldingen activeren wanneer specifieke auditpatronen optreden (bijv. herhaalde geblokkeerde write-downs) |

## Gerelateerde pagina's

- [Beveiligingsgericht ontwerp](./) — overzicht van de beveiligingsarchitectuur
- [No-write-down-regel](./no-write-down) — de classificatiestroomregel waarvan de handhaving wordt vastgelegd
- [Identiteit en authenticatie](./identity) — hoe identiteitsbeslissingen worden vastgelegd
- [Agentdelegatie](./agent-delegation) — hoe delegatieketens verschijnen in auditrecords
- [Geheimenbeheer](./secrets) — hoe inloggegevenstoegang wordt vastgelegd
