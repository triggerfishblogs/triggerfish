# Audit e Conformità

Ogni decisione di policy in Triggerfish viene registrata con contesto completo.
Non ci sono eccezioni, nessuna "modalità debug" che disabilita la registrazione,
e nessun modo per il LLM di sopprimere i record di audit. Questo fornisce un
registro completo e a prova di manomissione di ogni decisione di sicurezza presa
dal sistema.

## Cosa Viene Registrato

La registrazione di audit è una **regola fissa** -- è sempre attiva e non può
essere disabilitata. Ogni esecuzione di un hook di applicazione produce un record
di audit contenente:

| Campo             | Descrizione                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Quando è stata presa la decisione (ISO 8601, UTC)                                                                                                                               |
| `hook_type`       | Quale hook di applicazione è stato eseguito (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | La sessione in cui è avvenuta l'azione                                                                                                                                          |
| `decision`        | `ALLOW`, `BLOCK` o `REDACT`                                                                                                                                                     |
| `reason`          | Spiegazione leggibile della decisione                                                                                                                                           |
| `input`           | I dati o l'azione che ha attivato l'hook                                                                                                                                        |
| `rules_evaluated` | Quali regole di policy sono state verificate per raggiungere la decisione                                                                                                       |
| `taint_before`    | Livello di taint della sessione prima dell'azione                                                                                                                               |
| `taint_after`     | Livello di taint della sessione dopo l'azione (se modificato)                                                                                                                   |
| `metadata`        | Contesto aggiuntivo specifico per il tipo di hook                                                                                                                               |

## Esempi di Record di Audit

### Output Consentito

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

### Write-Down Bloccato

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

### Chiamata a Tool con Escalazione del Taint

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

### Delega tra Agent Bloccata

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

## Capacità di Tracciamento dell'Audit

<img src="/diagrams/audit-trace-flow.svg" alt="Flusso di tracciamento dell'audit: tracciamento in avanti, tracciamento all'indietro e giustificazione della classificazione alimentano l'esportazione per la conformità" style="max-width: 100%;" />

I record di audit possono essere interrogati in quattro modi, ciascuno al
servizio di una diversa esigenza di conformità e analisi forense.

### Tracciamento in Avanti

**Domanda:** "Cosa è successo ai dati del record Salesforce `opp_00123ABC`?"

Un tracciamento in avanti segue un elemento dati dal suo punto di origine
attraverso ogni trasformazione, sessione e output. Risponde a: dove sono andati
questi dati, chi li ha visti e sono mai stati inviati all'esterno
dell'organizzazione?

```
Origine: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> classificazione: CONFIDENTIAL
  --> sessione: sess_456

Trasformazioni:
  --> Campi estratti: name, amount, stage
  --> LLM ha riassunto 3 record in una panoramica della pipeline

Output:
  --> Inviato al proprietario via Telegram (CONSENTITO)
  --> Bloccato dall'invio al contatto esterno WhatsApp (BLOCCATO)
```

### Tracciamento all'Indietro

**Domanda:** "Quali fonti hanno contribuito al messaggio inviato alle 10:24 UTC?"

Un tracciamento all'indietro parte da un output e ripercorre la catena di lineage
per identificare ogni fonte dati che ha influenzato l'output. Questo è essenziale
per capire se dati classificati sono stati inclusi in una risposta.

```
Output: Messaggio inviato su Telegram alle 10:24:00Z
  --> sessione: sess_456
  --> fonti di lineage:
      --> lin_789xyz: Opportunità Salesforce (CONFIDENTIAL)
      --> lin_790xyz: Opportunità Salesforce (CONFIDENTIAL)
      --> lin_791xyz: Opportunità Salesforce (CONFIDENTIAL)
      --> lin_792xyz: API Meteo (PUBLIC)
```

### Giustificazione della Classificazione

**Domanda:** "Perché questi dati sono marcati come CONFIDENTIAL?"

La giustificazione della classificazione risale alla regola o policy che ha
assegnato il livello di classificazione:

```
Dati: Riepilogo della pipeline (lin_789xyz)
Classificazione: CONFIDENTIAL
Motivo: source_system_default
  --> Classificazione predefinita dell'integrazione Salesforce: CONFIDENTIAL
  --> Configurata da: admin_001 il 2025-01-10T08:00:00Z
  --> Regola di policy: "Tutti i dati Salesforce classificati come CONFIDENTIAL"
```

### Esportazione per la Conformità

Per revisioni legali, normative o interne, Triggerfish può esportare l'intera
catena di custodia per qualsiasi elemento dati o intervallo temporale:

```
Richiesta di esportazione:
  --> Intervallo temporale: 2025-01-29T00:00:00Z a 2025-01-29T23:59:59Z
  --> Ambito: Tutte le sessioni per user_456
  --> Formato: JSON

L'esportazione include:
  --> Tutti i record di audit nell'intervallo temporale
  --> Tutti i record di lineage referenziati dai record di audit
  --> Tutte le transizioni di stato delle sessioni
  --> Tutte le decisioni di policy (ALLOW, BLOCK, REDACT)
  --> Tutte le modifiche del taint
  --> Tutti i record delle catene di delega
```

::: tip Le esportazioni per la conformità sono file JSON strutturati che possono
essere importati da sistemi SIEM, dashboard di conformità o strumenti di
revisione legale. Il formato di esportazione è stabile e versionato. :::

## Lineage dei Dati

La registrazione di audit lavora in congiunzione con il sistema di lineage dei
dati di Triggerfish. Ogni elemento dati elaborato da Triggerfish porta metadati
di provenienza:

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

I record di lineage vengono creati al `POST_TOOL_RESPONSE` (quando i dati
entrano nel sistema) e aggiornati man mano che i dati vengono trasformati. I dati
aggregati ereditano `max(classificazioni degli input)` -- se un qualsiasi input è
CONFIDENTIAL, l'output è almeno CONFIDENTIAL.

| Evento                                       | Azione di Lineage                                        |
| -------------------------------------------- | -------------------------------------------------------- |
| Dati letti da un'integrazione                | Creazione record di lineage con origine                  |
| Dati trasformati dal LLM                     | Aggiunta trasformazione, collegamento lineage degli input |
| Dati aggregati da fonti multiple             | Unione dei lineage, classificazione = max(input)         |
| Dati inviati a un canale                     | Registrazione destinazione, verifica classificazione     |
| Reset della sessione                         | Archiviazione record di lineage, rimozione dal contesto  |

## Archiviazione e Conservazione

I log di audit sono persistiti attraverso l'astrazione `StorageProvider` nel
namespace `audit:`. I record di lineage sono archiviati nel namespace `lineage:`.

| Tipo di Dati        | Namespace   | Conservazione Predefinita    |
| ------------------- | ----------- | ---------------------------- |
| Log di audit        | `audit:`    | 1 anno                       |
| Record di lineage   | `lineage:`  | 90 giorni                    |
| Stato delle sessioni | `sessions:` | 30 giorni                   |
| Cronologia del taint | `taint:`   | Corrisponde alla conservazione delle sessioni |

::: warning SICUREZZA I periodi di conservazione sono configurabili, ma i log di
audit hanno un valore predefinito di 1 anno per supportare i requisiti di
conformità (SOC 2, GDPR, HIPAA). Ridurre il periodo di conservazione al di sotto
del requisito normativo della propria organizzazione è responsabilità
dell'amministratore. :::

### Backend di Archiviazione

| Livello        | Backend     | Dettagli                                                                                                                                                             |
| -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personale**  | SQLite      | Database in modalità WAL in `~/.triggerfish/data/triggerfish.db`. I record di audit sono archiviati come JSON strutturato nello stesso database di tutti gli altri stati di Triggerfish. |
| **Enterprise** | Modulare    | I backend enterprise (Postgres, S3, ecc.) possono essere utilizzati tramite l'interfaccia `StorageProvider`. Questo consente l'integrazione con l'infrastruttura di aggregazione dei log esistente. |

## Immutabilità e Integrità

I record di audit sono solo in appendice. Una volta scritti, non possono essere
modificati o eliminati da nessun componente del sistema -- inclusi il LLM,
l'agent o i plugin. L'eliminazione avviene solo attraverso la scadenza della
policy di conservazione.

Ogni record di audit include un hash del contenuto che può essere utilizzato per
verificarne l'integrità. Se i record vengono esportati per una revisione di
conformità, gli hash possono essere validati rispetto ai record archiviati per
rilevare manomissioni.

## Funzionalità di Conformità Enterprise

Le distribuzioni enterprise possono estendere la registrazione di audit con:

| Funzionalità              | Descrizione                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Blocco legale**         | Sospensione dell'eliminazione basata sulla conservazione per utenti, sessioni o intervalli temporali specificati |
| **Integrazione SIEM**     | Streaming degli eventi di audit verso Splunk, Datadog o altri sistemi SIEM in tempo reale                  |
| **Dashboard di conformità** | Panoramica visiva delle decisioni di policy, azioni bloccate e pattern di taint                          |
| **Esportazioni programmate** | Esportazioni periodiche automatiche per la revisione normativa                                          |
| **Regole di allerta**     | Attivazione di notifiche quando si verificano specifici pattern di audit (es. write-down bloccati ripetuti) |

## Pagine Correlate

- [Progettazione Security-First](/it-IT/security/) -- panoramica dell'architettura di sicurezza
- [Regola No Write-Down](/it-IT/security/no-write-down) -- la regola sul flusso di classificazione la cui applicazione viene registrata
- [Identità e Autenticazione](/it-IT/security/identity) -- come vengono registrate le decisioni sull'identità
- [Delega tra Agent](/it-IT/security/agent-delegation) -- come le catene di delega appaiono nei record di audit
- [Gestione dei Secret](/it-IT/security/secrets) -- come viene registrato l'accesso alle credenziali
