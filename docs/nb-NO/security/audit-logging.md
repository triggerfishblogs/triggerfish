# Revisjon og samsvar

Hver policy-beslutning i Triggerfish logges med full kontekst. Det finnes ingen unntak, ingen «feilsøkingsmodus» som deaktiverer logging, og ingen måte for LLM-en å undertrykke revisjonsregistre. Dette gir en komplett, manipuleringsbevis registrering av hver sikkerhetsbeslutning systemet har tatt.

## Hva som registreres

Revisjonslogging er en **fast regel** — den er alltid aktiv og kan ikke deaktiveres. Hver håndhevelses-hook-kjøring produserer en revisjonspost som inneholder:

| Felt              | Beskrivelse                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp`       | Når beslutningen ble tatt (ISO 8601, UTC)                                                                                                                                                              |
| `hook_type`       | Hvilken håndhevelses-hook som kjørte (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`)            |
| `session_id`      | Sesjonen der handlingen fant sted                                                                                                                                                                      |
| `decision`        | `ALLOW`, `BLOCK` eller `REDACT`                                                                                                                                                                        |
| `reason`          | Menneskelig lesbar forklaring av beslutningen                                                                                                                                                          |
| `input`           | Dataene eller handlingen som utløste hooken                                                                                                                                                            |
| `rules_evaluated` | Hvilke policy-regler som ble sjekket for å nå beslutningen                                                                                                                                             |
| `taint_before`    | Session taint-nivå før handlingen                                                                                                                                                                      |
| `taint_after`     | Session taint-nivå etter handlingen (hvis endret)                                                                                                                                                      |
| `metadata`        | Ytterligere kontekst spesifikk for hook-typen                                                                                                                                                          |

## Eksempler på revisjonsposter

### Tillatt utdata

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

### Blokkert write-down

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

### Verktøykall med taint-eskalering

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

### Agentdelegasjon blokkert

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

## Sporingsmuligheter for revisjon

<img src="/diagrams/audit-trace-flow.svg" alt="Revisjonssporingsflyt: fremover-sporing, bakover-sporing og klassifiseringsbegrunnelse mater inn i samsvareksport" style="max-width: 100%;" />

Revisjonsposter kan spørres på fire måter, hver tilpasset ulike samsvars- og kriminaltekniske behov.

### Fremover-sporing

**Spørsmål:** «Hva skjedde med data fra Salesforce-posten `opp_00123ABC`?»

En fremover-sporing følger et dataelement fra dets opprinnelsespunkt gjennom hver transformasjon, sesjon og utdata. Den svarer på: hvor gikk disse dataene, hvem så dem, og ble de noen gang sendt utenfor organisasjonen?

```
Opprinnelse: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> klassifisering: CONFIDENTIAL
  --> sesjon: sess_456

Transformasjoner:
  --> Uttrukne felter: name, amount, stage
  --> LLM oppsummerte 3 poster til pipeline-oversikt

Utdata:
  --> Sendt til eier via Telegram (TILLATT)
  --> Blokkert fra WhatsApp ekstern kontakt (BLOKKERT)
```

### Bakover-sporing

**Spørsmål:** «Hvilke kilder bidro til meldingen sendt kl. 10:24 UTC?»

En bakover-sporing starter fra et utdata og går bakover gjennom linjerekken for å identifisere hver datakilde som påvirket utdataet. Dette er viktig for å forstå om klassifiserte data var inkludert i et svar.

```
Utdata: Melding sendt til Telegram kl. 10:24:00Z
  --> sesjon: sess_456
  --> linjekilder:
      --> lin_789xyz: Salesforce-mulighet (CONFIDENTIAL)
      --> lin_790xyz: Salesforce-mulighet (CONFIDENTIAL)
      --> lin_791xyz: Salesforce-mulighet (CONFIDENTIAL)
      --> lin_792xyz: Vær-API (PUBLIC)
```

### Klassifiseringsbegrunnelse

**Spørsmål:** «Hvorfor er disse dataene merket CONFIDENTIAL?»

Klassifiseringsbegrunnelse sporer tilbake til regelen eller policyen som tildelte klassifiseringsnivået:

```
Data: Pipeline-sammendrag (lin_789xyz)
Klassifisering: CONFIDENTIAL
Årsak: source_system_default
  --> Salesforce-integrasjonens standardklassifisering: CONFIDENTIAL
  --> Konfigurert av: admin_001 kl. 2025-01-10T08:00:00Z
  --> Policy-regel: "Alle Salesforce-data klassifisert som CONFIDENTIAL"
```

### Samsvareksport

For juridisk, regulatorisk eller intern gjennomgang kan Triggerfish eksportere den fullstendige forvaringskjeden for ethvert dataelement eller tidsperiode:

```
Eksportforespørsel:
  --> Tidsperiode: 2025-01-29T00:00:00Z til 2025-01-29T23:59:59Z
  --> Omfang: Alle sesjoner for user_456
  --> Format: JSON

Eksporten inkluderer:
  --> Alle revisjonsposter i tidsperioden
  --> Alle linjeposter referert av revisjonsposter
  --> Alle sesjonstilstandsoverganger
  --> Alle policy-beslutninger (ALLOW, BLOCK, REDACT)
  --> Alle taint-endringer
  --> Alle delegeringskjede-poster
```

::: tip Samsvareksporter er strukturerte JSON-filer som kan tas inn av SIEM-systemer, samsvarsdashbord eller verktøy for juridisk gjennomgang. Eksportformatet er stabilt og versjonert. :::

## Datalinje

Revisjonslogging fungerer i samarbeid med Triggerfish sitt datalinjessystem. Hvert dataelement behandlet av Triggerfish bærer provenansmetadata:

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

Linjeposter opprettes ved `POST_TOOL_RESPONSE` (når data kommer inn i systemet) og oppdateres etter hvert som data transformeres. Aggregerte data arver `max(inngangsklassifiseringer)` — hvis noen inndata er CONFIDENTIAL, er utdataet minst CONFIDENTIAL.

| Hendelse                              | Linjehandling                                     |
| ------------------------------------- | ------------------------------------------------- |
| Data lest fra integrasjon             | Opprett linjepost med opprinnelse                 |
| Data transformert av LLM              | Legg til transformasjon, koble inngangslinjer     |
| Data aggregert fra flere kilder       | Slå sammen linjer, klassifisering = max(innganger)|
| Data sendt til kanal                  | Registrer destinasjon, verifiser klassifisering   |
| Sesjonstilbakestilling                | Arkiver linjeposter, tøm fra kontekst             |

## Lagring og oppbevaring

Revisjonslogger lagres gjennom `StorageProvider`-abstraksjonen under `audit:`-navnerommet. Linjeposter lagres under `lineage:`-navnerommet.

| Datatype        | Navnerom    | Standard oppbevaring      |
| --------------- | ----------- | ------------------------- |
| Revisjonslogger | `audit:`    | 1 år                      |
| Linjeposter     | `lineage:`  | 90 dager                  |
| Sesjonstilstand | `sessions:` | 30 dager                  |
| Taint-historikk | `taint:`    | Samsvarer med sesjonsoppbevaring |

::: warning SIKKERHET Oppbevaringsperioder er konfigurerbare, men revisjonslogger er som standard 1 år for å støtte samsvarsrkrav (SOC 2, GDPR, HIPAA). Å redusere oppbevaringsperioden under organisasjonens regulatoriske krav er administratorens ansvar. :::

### Lagringsbackends

| Nivå           | Backend       | Detaljer                                                                                                                                                                        |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personlig**  | SQLite        | WAL-modus database på `~/.triggerfish/data/triggerfish.db`. Revisjonsposter lagres som strukturert JSON i samme database som all annen Triggerfish-tilstand.                    |
| **Bedrift**    | Pluggbar      | Bedriftsbackends (Postgres, S3 osv.) kan brukes via `StorageProvider`-grensesnittet. Dette muliggjør integrasjon med eksisterende loggruggregasjonsinfrastruktur.               |

## Uforanderlighet og integritet

Revisjonsposter er tilleggskjørbare. Når de er skrevet, kan de ikke endres eller slettes av noen komponent i systemet — inkludert LLM-en, agenten eller plugins. Sletting skjer kun gjennom utløp av oppbevaringspolicy.

Hver revisjonspost inkluderer en innholdshash som kan brukes til å verifisere integritet. Hvis poster eksporteres for samsvarsgransking, kan hashene valideres mot de lagrede postene for å oppdage manipulering.

## Bedrifts samsvarsfunksjoner

Bedriftsdistribusjoner kan utvide revisjonslogging med:

| Funksjon                   | Beskrivelse                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Juridisk sperring**      | Suspender oppbevaringsbasert sletting for spesifiserte brukere, sesjoner eller tidsperioder         |
| **SIEM-integrasjon**       | Strøm revisjonshendelser til Splunk, Datadog eller andre SIEM-systemer i sanntid                    |
| **Samsvarsdashbord**       | Visuell oversikt over policy-beslutninger, blokkerte handlinger og taint-mønstre                    |
| **Planlagte eksporter**    | Automatiske periodiske eksporter for regulatorisk gjennomgang                                       |
| **Varslingsregler**        | Utløs varsler når spesifikke revisjonsmønstre oppstår (f.eks. gjentatte blokkerte write-downs)      |

## Relaterte sider

- [Sikkerhetsfokusert design](./) — oversikt over sikkerhetsarkitekturen
- [No-Write-Down-regelen](./no-write-down) — klassifiseringsflytregelen hvis håndhevelse logges
- [Identitet og autentisering](./identity) — hvordan identitetsbeslutninger registreres
- [Agentdelegasjon](./agent-delegation) — hvordan delegeringskjeder vises i revisjonsloggen
- [Hemmelighetshåndtering](./secrets) — hvordan legitimasjonstilgang logges
