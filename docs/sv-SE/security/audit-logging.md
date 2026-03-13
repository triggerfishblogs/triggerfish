# Revision och efterlevnad

Varje policybeslut i Triggerfish loggas med fullständigt sammanhang. Det finns inga undantag, inget "felsökningsläge" som inaktiverar loggning och inget sätt för LLM:en att undertrycka revisionspost. Det ger en komplett, manipulationssäker post av varje säkerhetsbeslut systemet har fattat.

## Vad som registreras

Revisionsloggning är en **fast regel** — den är alltid aktiv och kan inte inaktiveras. Varje hook-körning producerar en revisionspost innehållande:

| Fält              | Beskrivning                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp`       | När beslutet fattades (ISO 8601, UTC)                                                                                                                                                |
| `hook_type`       | Vilken hanteringshook körde (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`)    |
| `session_id`      | Sessionen där åtgärden inträffade                                                                                                                                                    |
| `decision`        | `ALLOW`, `BLOCK` eller `REDACT`                                                                                                                                                      |
| `reason`          | Läsbar förklaring av beslutet                                                                                                                                                        |
| `input`           | Data eller åtgärd som utlöste hooken                                                                                                                                                 |
| `rules_evaluated` | Vilka policyregler kontrollerades för att nå beslutet                                                                                                                                |
| `taint_before`    | Session-taint-nivå före åtgärden                                                                                                                                                     |
| `taint_after`     | Session-taint-nivå efter åtgärden (om ändrad)                                                                                                                                        |
| `metadata`        | Ytterligare sammanhang specifikt för hooktypen                                                                                                                                       |

## Revisionspostexempel

### Tillåten utdata

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Klassificeringskontroll godkänd",
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

### Blockerad nedskrivning

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session-taint (CONFIDENTIAL) överstiger effektiv klassificering (PUBLIC)",
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

### Verktygsanrop med taint-eskalering

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Verktygssvar klassificerat och taint uppdaterat",
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

### Agentdelegering blockerad

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agenttak (INTERNAL) under session-taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generera publik sammanfattning"
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

## Revisionsspårningskapaciteter

<img src="/diagrams/audit-trace-flow.svg" alt="Revisionsspårningsflöde: framåtspårning, bakåtspårning och klassificeringsberättigande matar in i efterlevnadsexport" style="max-width: 100%;" />

Revisionspost kan frågas på fyra sätt, var och en tjänar ett annat efterlevnads- och kriminaltekniskt behov.

### Framåtspårning

**Fråga:** "Vad hände med data från Salesforce-post `opp_00123ABC`?"

En framåtspårning följer ett dataelement från dess ursprungspunkt genom varje transformation, session och utdata. Den svarar: vart gick den här datan, vem såg den och skickades den någonsin utanför organisationen?

```
Ursprung: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> klassificering: CONFIDENTIAL
  --> session: sess_456

Transformationer:
  --> Extraherade fält: name, amount, stage
  --> LLM sammanfattade 3 poster till pipelineöversikt

Utdata:
  --> Skickad till ägaren via Telegram (TILLÅTEN)
  --> Blockerad från WhatsApp extern kontakt (BLOCKERAD)
```

### Bakåtspårning

**Fråga:** "Vilka källor bidrog till meddelandet skickat kl 10:24 UTC?"

En bakåtspårning börjar från en utdata och går tillbaka genom linjegrafikedjan för att identifiera varje datakälla som påverkade utdata. Det här är viktigt för att förstå om klassificerade data inkluderades i ett svar.

```
Utdata: Meddelande skickat till Telegram kl 10:24:00Z
  --> session: sess_456
  --> linjegrafikällor:
      --> lin_789xyz: Salesforce-möjlighet (CONFIDENTIAL)
      --> lin_790xyz: Salesforce-möjlighet (CONFIDENTIAL)
      --> lin_791xyz: Salesforce-möjlighet (CONFIDENTIAL)
      --> lin_792xyz: Väder-API (PUBLIC)
```

### Klassificeringsberättigande

**Fråga:** "Varför är den här datan märkt CONFIDENTIAL?"

Klassificeringsberättigande spårar tillbaka till regeln eller policyn som tilldelade klassificeringsnivån:

```
Data: Pipeline-sammanfattning (lin_789xyz)
Klassificering: CONFIDENTIAL
Orsak: source_system_default
  --> Salesforce-integrations standardklassificering: CONFIDENTIAL
  --> Konfigurerad av: admin_001 kl 2025-01-10T08:00:00Z
  --> Policyregel: "All Salesforce-data klassificerad som CONFIDENTIAL"
```

### Efterlevnadsexport

För juridisk, regulatorisk eller intern granskning kan Triggerfish exportera hela förvaringskedjan för vilket dataelement eller tidsintervall som helst:

```
Exportförfrågan:
  --> Tidsintervall: 2025-01-29T00:00:00Z till 2025-01-29T23:59:59Z
  --> Omfång: Alla sessioner för user_456
  --> Format: JSON

Exportinnehåller:
  --> Alla revisionspost i tidsintervallet
  --> Alla linjegrafipost refererade av revisionspost
  --> Alla sessionstillståndsövergångar
  --> Alla policybeslut (ALLOW, BLOCK, REDACT)
  --> Alla taint-ändringar
  --> Alla delegeringskedjeposter
```

::: tip Efterlevnadsexporter är strukturerade JSON-filer som kan matas in av SIEM-system, efterlevnadspaneler eller juridiska granskningsverktyg. Exportformatet är stabilt och versionerat. :::

## Datalinjegrafi

Revisionsloggning fungerar i samverkan med Triggerfish datalinjegrafisystem. Varje dataelement som bearbetas av Triggerfish bär provenansmetadata:

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

Linjegrafipost skapas vid `POST_TOOL_RESPONSE` (när data hamnar i systemet) och uppdateras när data transformeras. Aggregerade data ärver `max(indataklassificeringar)` — om något indata är CONFIDENTIAL är utdata minst CONFIDENTIAL.

| Händelse                                   | Linjegrafiåtgärd                                  |
| ------------------------------------------ | -------------------------------------------------- |
| Data läst från integration                 | Skapa linjegrafipost med ursprung                  |
| Data transformerad av LLM                  | Lägg till transformation, länka indatalinjegrafier |
| Data aggregerad från flera källor          | Slå ihop linjegrafi, klassificering = max(indata)  |
| Data skickad till kanal                    | Registrera mål, verifiera klassificering           |
| Sessionsåterställning                      | Arkivera linjegrafipost, rensa från kontext        |

## Lagring och bevarande

Revisionsloggar bevaras via `StorageProvider`-abstraktionen under `audit:`-namnrymden. Linjegrafipost lagras under `lineage:`-namnrymden.

| Datatyp           | Namnrymd    | Standardbevarande         |
| ----------------- | ----------- | ------------------------- |
| Revisionsloggar   | `audit:`    | 1 år                      |
| Linjegrafipost    | `lineage:`  | 90 dagar                  |
| Sessionstillstånd | `sessions:` | 30 dagar                  |
| Taint-historik    | `taint:`    | Matchar sessionsbevarande |

::: warning SÄKERHET Bevandeperioder är konfigurerbara, men revisionsloggar standard till 1 år för att stödja efterlevnadskrav (SOC 2, GDPR, HIPAA). Att minska bevandeperioden under din organisations regulatoriska krav är administratörens ansvar. :::

### Lagringsbakends

| Nivå        | Backend    | Detaljer                                                                                                                                                                           |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personlig** | SQLite   | WAL-lägesdatabas på `~/.triggerfish/data/triggerfish.db`. Revisionspost lagras som strukturerat JSON i samma databas som allt annat Triggerfish-tillstånd.                          |
| **Företag** | Pluggbar   | Företagsbackends (Postgres, S3 osv.) kan användas via `StorageProvider`-gränssnittet. Det tillåter integration med befintlig loggaggreringsinfrastruktur.                          |

## Oföränderlighet och integritet

Revisionspost är append-only. När de väl skrivits kan de inte ändras eller tas bort av någon komponent i systemet — inklusive LLM:en, agenten eller plugins. Radering sker bara via utgång av bevandeperiod.

Varje revisionspost inkluderar en innehållshash som kan användas för att verifiera integritet. Om poster exporteras för efterlevnadsgranskning kan hasharna valideras mot de lagrade posterna för att upptäcka manipulation.

## Företagsefterlevnadsfunktioner

Företagsdriftsättningar kan utöka revisionsloggning med:

| Funktion                       | Beskrivning                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Juridisk håll**              | Pausa bevarandebaserad radering för specificerade användare, sessioner eller tidsintervall             |
| **SIEM-integration**           | Strömma revisionshändelser till Splunk, Datadog eller andra SIEM-system i realtid                     |
| **Efterlevnadspaneler**        | Visuell översikt av policybeslut, blockerade åtgärder och taint-mönster                               |
| **Schemalagda exporter**       | Automatiska periodiska exporter för regulatorisk granskning                                           |
| **Varningsregler**             | Utlös notifieringar när specifika revisionsmönster inträffar (t.ex. upprepade blockerade nedskrivningar) |

## Relaterade sidor

- [Säkerhetscentrerat design](./) — översikt över säkerhetsarkitekturen
- [Nedskrivningsregeln](./no-write-down) — klassificeringsflödesregeln vars hantering loggas
- [Identitet och autentisering](./identity) — hur identitetsbeslut registreras
- [Agentdelegering](./agent-delegation) — hur delegeringskedjor visas i revisionspost
- [Hemlighethantering](./secrets) — hur uppgiftsåtkomst loggas
