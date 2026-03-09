# Audit & Compliance

Jede Policy-Entscheidung in Triggerfish wird mit vollstaendigem Kontext protokolliert. Es gibt keine Ausnahmen, keinen "Debug-Modus", der das Logging deaktiviert, und keine Moeglichkeit fuer das LLM, Audit-Datensaetze zu unterdruecken. Dies liefert einen vollstaendigen, manipulationssicheren Nachweis jeder Sicherheitsentscheidung, die das System getroffen hat.

## Was aufgezeichnet wird

Audit-Logging ist eine **feste Regel** -- es ist immer aktiv und kann nicht deaktiviert werden. Jede Durchsetzungs-Hook-Ausfuehrung erzeugt einen Audit-Datensatz mit folgendem Inhalt:

| Feld              | Beschreibung                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Wann die Entscheidung getroffen wurde (ISO 8601, UTC)                                                                                                                              |
| `hook_type`       | Welcher Durchsetzungs-Hook ausgefuehrt wurde (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | Die Session, in der die Aktion stattfand                                                                                                                                           |
| `decision`        | `ALLOW`, `BLOCK` oder `REDACT`                                                                                                                                                     |
| `reason`          | Menschenlesbare Erklaerung der Entscheidung                                                                                                                                        |
| `input`           | Die Daten oder Aktion, die den Hook ausgeloest haben                                                                                                                               |
| `rules_evaluated` | Welche Policy-Regeln geprueft wurden, um zur Entscheidung zu gelangen                                                                                                              |
| `taint_before`    | Session-Taint-Stufe vor der Aktion                                                                                                                                                 |
| `taint_after`     | Session-Taint-Stufe nach der Aktion (falls geaendert)                                                                                                                              |
| `metadata`        | Zusaetzlicher, hook-spezifischer Kontext                                                                                                                                           |

## Beispiele fuer Audit-Datensaetze

### Erlaubte Ausgabe

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

### Blockierter Write-Down

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

### Tool-Aufruf mit Taint-Eskalation

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

### Blockierte Agenten-Delegation

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

## Audit-Verfolgungsfaehigkeiten

<img src="/diagrams/audit-trace-flow.svg" alt="Audit-Verfolgungsablauf: Vorwaertsverfolgung, Rueckwaertsverfolgung und Klassifizierungsbegruendung fliessen in Compliance-Export" style="max-width: 100%;" />

Audit-Datensaetze koennen auf vier Arten abgefragt werden, die jeweils einem unterschiedlichen Compliance- und Forensik-Bedarf dienen.

### Vorwaertsverfolgung

**Frage:** "Was geschah mit den Daten aus Salesforce-Datensatz `opp_00123ABC`?"

Eine Vorwaertsverfolgung folgt einem Datenelement von seinem Ursprungspunkt durch jede Transformation, Session und Ausgabe. Sie beantwortet: Wohin gingen diese Daten, wer hat sie gesehen und wurden sie jemals ausserhalb der Organisation gesendet?

```
Ursprung: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> Klassifizierung: CONFIDENTIAL
  --> Session: sess_456

Transformationen:
  --> Extrahierte Felder: Name, Betrag, Phase
  --> LLM fasste 3 Datensaetze in Pipeline-Uebersicht zusammen

Ausgaben:
  --> An Eigentuemer ueber Telegram gesendet (ERLAUBT)
  --> Von WhatsApp externem Kontakt blockiert (BLOCKIERT)
```

### Rueckwaertsverfolgung

**Frage:** "Welche Quellen haben zu der um 10:24 UTC gesendeten Nachricht beigetragen?"

Eine Rueckwaertsverfolgung startet von einer Ausgabe und geht zurueck durch die Lineage-Kette, um jede Datenquelle zu identifizieren, die die Ausgabe beeinflusst hat. Dies ist essenziell, um zu verstehen, ob klassifizierte Daten in einer Antwort enthalten waren.

```
Ausgabe: Nachricht an Telegram gesendet um 10:24:00Z
  --> Session: sess_456
  --> Lineage-Quellen:
      --> lin_789xyz: Salesforce Opportunity (CONFIDENTIAL)
      --> lin_790xyz: Salesforce Opportunity (CONFIDENTIAL)
      --> lin_791xyz: Salesforce Opportunity (CONFIDENTIAL)
      --> lin_792xyz: Wetter-API (PUBLIC)
```

### Klassifizierungsbegruendung

**Frage:** "Warum sind diese Daten als CONFIDENTIAL markiert?"

Die Klassifizierungsbegruendung verfolgt zurueck bis zur Regel oder Policy, die die Klassifizierungsstufe zugewiesen hat:

```
Daten: Pipeline-Zusammenfassung (lin_789xyz)
Klassifizierung: CONFIDENTIAL
Grund: source_system_default
  --> Salesforce-Integration Standard-Klassifizierung: CONFIDENTIAL
  --> Konfiguriert von: admin_001 am 2025-01-10T08:00:00Z
  --> Policy-Regel: "Alle Salesforce-Daten als CONFIDENTIAL klassifiziert"
```

### Compliance-Export

Fuer rechtliche, regulatorische oder interne Ueberpruefungen kann Triggerfish die vollstaendige Aufbewahrungskette fuer jedes Datenelement oder jeden Zeitraum exportieren:

```
Export-Anfrage:
  --> Zeitraum: 2025-01-29T00:00:00Z bis 2025-01-29T23:59:59Z
  --> Umfang: Alle Sessions fuer user_456
  --> Format: JSON

Export enthaelt:
  --> Alle Audit-Datensaetze im Zeitraum
  --> Alle Lineage-Datensaetze, die von Audit-Datensaetzen referenziert werden
  --> Alle Session-Zustandsuebergaenge
  --> Alle Policy-Entscheidungen (ALLOW, BLOCK, REDACT)
  --> Alle Taint-Aenderungen
  --> Alle Delegationsketten-Datensaetze
```

::: tip Compliance-Exporte sind strukturierte JSON-Dateien, die von SIEM-Systemen, Compliance-Dashboards oder rechtlichen Ueberpruefungstools aufgenommen werden koennen. Das Exportformat ist stabil und versioniert. :::

## Daten-Lineage

Audit-Logging arbeitet in Verbindung mit dem Daten-Lineage-System von Triggerfish. Jedes von Triggerfish verarbeitete Datenelement traegt Herkunftsmetadaten:

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

Lineage-Datensaetze werden bei `POST_TOOL_RESPONSE` erstellt (wenn Daten in das System eintreten) und aktualisiert, wenn Daten transformiert werden. Aggregierte Daten erben `max(Eingabe-Klassifizierungen)` -- wenn eine Eingabe CONFIDENTIAL ist, ist die Ausgabe mindestens CONFIDENTIAL.

| Ereignis                                | Lineage-Aktion                                    |
| --------------------------------------- | ------------------------------------------------- |
| Daten von Integration gelesen           | Lineage-Datensatz mit Ursprung erstellen          |
| Daten durch LLM transformiert           | Transformation anhaengen, Eingabe-Lineages verknuepfen |
| Daten aus mehreren Quellen aggregiert   | Lineage zusammenfuehren, Klassifizierung = max(Eingaben) |
| Daten an Kanal gesendet                 | Ziel aufzeichnen, Klassifizierung verifizieren    |
| Session-Reset                           | Lineage-Datensaetze archivieren, aus Kontext loeschen |

## Speicherung und Aufbewahrung

Audit-Logs werden ueber die `StorageProvider`-Abstraktion unter dem Namensraum `audit:` persistiert. Lineage-Datensaetze werden unter dem Namensraum `lineage:` gespeichert.

| Datentyp            | Namensraum  | Standard-Aufbewahrung     |
| ------------------- | ----------- | ------------------------- |
| Audit-Logs          | `audit:`    | 1 Jahr                    |
| Lineage-Datensaetze | `lineage:`  | 90 Tage                   |
| Session-Zustand     | `sessions:` | 30 Tage                   |
| Taint-Verlauf       | `taint:`    | Entspricht Session-Aufbewahrung |

::: warning SICHERHEIT Aufbewahrungszeitraeume sind konfigurierbar, aber Audit-Logs haben standardmaessig 1 Jahr, um Compliance-Anforderungen zu unterstuetzen (SOC 2, DSGVO, HIPAA). Die Reduzierung des Aufbewahrungszeitraums unter die regulatorischen Anforderungen Ihrer Organisation liegt in der Verantwortung des Administrators. :::

### Speicher-Backends

| Stufe          | Backend   | Details                                                                                                                                                              |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persoenlich**| SQLite    | WAL-Modus-Datenbank unter `~/.triggerfish/data/triggerfish.db`. Audit-Datensaetze werden als strukturiertes JSON in derselben Datenbank wie alle anderen Triggerfish-Zustaende gespeichert. |
| **Enterprise** | Erweiterbar | Enterprise-Backends (Postgres, S3 usw.) koennen ueber die `StorageProvider`-Schnittstelle verwendet werden. Dies ermoeglicht die Integration mit bestehender Log-Aggregations-Infrastruktur. |

## Unveraenderlichkeit und Integritaet

Audit-Datensaetze sind nur anfuegbar. Einmal geschrieben, koennen sie von keiner Komponente des Systems modifiziert oder geloescht werden -- einschliesslich des LLM, des Agenten oder von Plugins. Loeschung erfolgt nur durch Ablauf der Aufbewahrungsrichtlinie.

Jeder Audit-Datensatz enthaelt einen Content-Hash, der zur Integritaetspruefung verwendet werden kann. Wenn Datensaetze fuer Compliance-Ueberpruefungen exportiert werden, koennen die Hashes gegen die gespeicherten Datensaetze validiert werden, um Manipulation zu erkennen.

## Enterprise-Compliance-Features

Enterprise-Bereitstellungen koennen Audit-Logging erweitern mit:

| Feature                    | Beschreibung                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Legal Hold**             | Aufbewahrungsbasierte Loeschung fuer bestimmte Benutzer, Sessions oder Zeitraeume aussetzen             |
| **SIEM-Integration**       | Audit-Ereignisse in Echtzeit an Splunk, Datadog oder andere SIEM-Systeme streamen                      |
| **Compliance-Dashboards**  | Visuelle Uebersicht ueber Policy-Entscheidungen, blockierte Aktionen und Taint-Muster                  |
| **Geplante Exporte**       | Automatische periodische Exporte fuer regulatorische Ueberpruefung                                     |
| **Alarmregeln**            | Benachrichtigungen ausloesen, wenn bestimmte Audit-Muster auftreten (z.B. wiederholte blockierte Write-Downs) |

## Verwandte Seiten

- [Sicherheit als Grundprinzip](./) -- Ueberblick ueber die Sicherheitsarchitektur
- [No-Write-Down-Regel](./no-write-down) -- Die Klassifizierungsflussregel, deren Durchsetzung protokolliert wird
- [Identitaet & Authentifizierung](./identity) -- Wie Identitaetsentscheidungen aufgezeichnet werden
- [Agenten-Delegation](./agent-delegation) -- Wie Delegationsketten in Audit-Datensaetzen erscheinen
- [Secrets-Verwaltung](./secrets) -- Wie Zugriffe auf Anmeldedaten protokolliert werden
