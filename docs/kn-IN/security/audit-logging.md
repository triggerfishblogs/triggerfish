# Audit & Compliance

Triggerfish ನಲ್ಲಿ ಪ್ರತಿ policy ನಿರ್ಧಾರ ಸಂಪೂರ್ಣ context ನೊಂದಿಗೆ logged ಆಗುತ್ತದೆ. ಯಾವ
ಅಪವಾದ ಇಲ್ಲ, logging ನಿಷ್ಕ್ರಿಯಗೊಳಿಸುವ "debug mode" ಇಲ್ಲ, ಮತ್ತು LLM audit records
suppress ಮಾಡಲು ಯಾವ ಮಾರ್ಗ ಇಲ್ಲ. ಇದು ವ್ಯವಸ್ಥೆ ಮಾಡಿದ ಪ್ರತಿ ಭದ್ರತಾ ನಿರ್ಧಾರದ ಸಂಪೂರ್ಣ,
tamper-evident ದಾಖಲೆ ಒದಗಿಸುತ್ತದೆ.

## ಏನು ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ

Audit logging **ಸ್ಥಿರ ನಿಯಮ** -- ಇದು ಯಾವಾಗಲೂ active ಮತ್ತು disable ಮಾಡಲಾಗದು. ಪ್ರತಿ
enforcement hook execution ಒಳಗೊಂಡ audit record ತಯಾರಿಸುತ್ತದೆ:

| Field             | ವಿವರಣೆ                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp`       | ನಿರ್ಧಾರ ಮಾಡಿದ ಸಮಯ (ISO 8601, UTC)                                                                                                                                                    |
| `hook_type`       | ಯಾವ enforcement hook ಚಲಿಸಿತು (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | ಕ್ರಿಯೆ ನಡೆದ session                                                                                                                                                                 |
| `decision`        | `ALLOW`, `BLOCK`, ಅಥವಾ `REDACT`                                                                                                                                                      |
| `reason`          | ನಿರ್ಧಾರದ human-readable ವಿವರಣೆ                                                                                                                                                       |
| `input`           | Hook trigger ಮಾಡಿದ ಡೇಟಾ ಅಥವಾ ಕ್ರಿಯೆ                                                                                                                                                |
| `rules_evaluated` | ನಿರ್ಧಾರ ತಲುಪಲು ಯಾವ policy rules ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟವು                                                                                                                                   |
| `taint_before`    | ಕ್ರಿಯೆ ಮೊದಲು session taint ಮಟ್ಟ                                                                                                                                                     |
| `taint_after`     | ಕ್ರಿಯೆ ನಂತರ session taint ಮಟ್ಟ (ಬದಲಾಗಿದ್ದರೆ)                                                                                                                                       |
| `metadata`        | Hook ಪ್ರಕಾರಕ್ಕೆ ನಿರ್ದಿಷ್ಟ ಹೆಚ್ಚುವರಿ context                                                                                                                                         |

## Audit Record ಉದಾಹರಣೆಗಳು

### ಅನುಮತಿಸಿದ Output

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

### ತಡೆಯಲ್ಪಟ್ಟ Write-Down

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

### Taint Escalation ನೊಂದಿಗೆ Tool Call

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

### ತಡೆಯಲ್ಪಟ್ಟ Agent Delegation

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

## Audit Trace ಸಾಮರ್ಥ್ಯಗಳು

<img src="/diagrams/audit-trace-flow.svg" alt="Audit trace flow: forward trace, backward trace, and classification justification feed into compliance export" style="max-width: 100%;" />

Audit records ನಾಲ್ಕು ವಿಧಗಳಲ್ಲಿ query ಮಾಡಬಹುದು, ಪ್ರತಿಯೊಂದು ವಿಭಿನ್ನ compliance ಮತ್ತು
forensic ಅಗತ್ಯಗಳನ್ನು ಪೂರೈಸುತ್ತದೆ.

### ಮುಂದಕ್ಕೆ Trace

**ಪ್ರಶ್ನೆ:** "Salesforce record `opp_00123ABC` ನಿಂದ ಡೇಟಾಗೆ ಏನಾಯಿತು?"

Forward trace ಡೇಟಾ element ಅನ್ನು ಅದರ ಮೂಲ ಬಿಂದುವಿನಿಂದ ಪ್ರತಿ transformation, session,
ಮತ್ತು output ಮೂಲಕ ಅನುಸರಿಸುತ್ತದೆ. ಇದು ಉತ್ತರಿಸುತ್ತದೆ: ಈ ಡೇಟಾ ಎಲ್ಲಿ ಹೋಯಿತು, ಯಾರು ನೋಡಿದರು,
ಮತ್ತು ಇದು ಎಂದಾದರೂ ಸಂಸ್ಥೆ ಹೊರಗೆ ಕಳುಹಿಸಲ್ಪಟ್ಟಿತೇ?

```
Origin: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> classification: CONFIDENTIAL
  --> session: sess_456

Transformations:
  --> Extracted fields: name, amount, stage
  --> LLM summarized 3 records into pipeline overview

Outputs:
  --> Sent to owner via Telegram (ALLOWED)
  --> Blocked from WhatsApp external contact (BLOCKED)
```

### ಹಿಂದಕ್ಕೆ Trace

**ಪ್ರಶ್ನೆ:** "10:24 UTC ನಲ್ಲಿ ಕಳುಹಿಸಲ್ಪಟ್ಟ ಸಂದೇಶಕ್ಕೆ ಯಾವ ಮೂಲಗಳು ಕೊಡುಗೆ ನೀಡಿದವು?"

Backward trace output ನಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ ಮತ್ತು output ಮೇಲೆ ಪ್ರಭಾವ ಬೀರಿದ ಪ್ರತಿ ಡೇಟಾ
ಮೂಲ ಗುರುತಿಸಲು lineage chain ಮೂಲಕ ಹಿಂತಿರುಗಿ ನಡೆಯುತ್ತದೆ. Response ನಲ್ಲಿ classified ಡೇಟಾ
ಸೇರಿಸಲ್ಪಟ್ಟಿತೇ ಎಂದು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಇದು ಅಗತ್ಯ.

```
Output: Message sent to Telegram at 10:24:00Z
  --> session: sess_456
  --> lineage sources:
      --> lin_789xyz: Salesforce opportunity (CONFIDENTIAL)
      --> lin_790xyz: Salesforce opportunity (CONFIDENTIAL)
      --> lin_791xyz: Salesforce opportunity (CONFIDENTIAL)
      --> lin_792xyz: Weather API (PUBLIC)
```

### Classification Justification

**ಪ್ರಶ್ನೆ:** "ಈ ಡೇಟಾ CONFIDENTIAL ಎಂದು ಏಕೆ ಗುರುತಿಸಲ್ಪಟ್ಟಿದೆ?"

Classification justification classification level ನಿಯೋಜಿಸಿದ ನಿಯಮ ಅಥವಾ policy ಗೆ ಹಿಂತಿರುಗಿ
trace ಮಾಡುತ್ತದೆ:

```
Data: Pipeline summary (lin_789xyz)
Classification: CONFIDENTIAL
Reason: source_system_default
  --> Salesforce integration default classification: CONFIDENTIAL
  --> Configured by: admin_001 at 2025-01-10T08:00:00Z
  --> Policy rule: "All Salesforce data classified as CONFIDENTIAL"
```

### Compliance Export

ಕಾನೂನು, ನಿಯಂತ್ರಕ, ಅಥವಾ ಆಂತರಿಕ ಪರಿಶೀಲನೆಗಾಗಿ, Triggerfish ಯಾವುದೇ ಡೇಟಾ element ಅಥವಾ
ಸಮಯ ವ್ಯಾಪ್ತಿಗೆ ಸಂಪೂರ್ಣ chain of custody export ಮಾಡಬಹುದು:

```
Export request:
  --> Time range: 2025-01-29T00:00:00Z to 2025-01-29T23:59:59Z
  --> Scope: All sessions for user_456
  --> Format: JSON

Export includes:
  --> All audit records in the time range
  --> All lineage records referenced by audit records
  --> All session state transitions
  --> All policy decisions (ALLOW, BLOCK, REDACT)
  --> All taint changes
  --> All delegation chain records
```

::: tip Compliance exports SIEM systems, compliance dashboards, ಅಥವಾ legal review tools ನಿಂದ
ಒಳಗೊಳ್ಳಬಹುದಾದ structured JSON files. Export format stable ಮತ್ತು versioned. :::

## ಡೇಟಾ Lineage

Audit logging Triggerfish ನ data lineage system ನೊಂದಿಗೆ ಕೈಜೋಡಿಸಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ.
Triggerfish ಪ್ರಕ್ರಿಯೆ ಮಾಡಿದ ಪ್ರತಿ ಡೇಟಾ element provenance metadata ಹೊಂದಿದೆ:

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

Lineage records `POST_TOOL_RESPONSE` ನಲ್ಲಿ ರಚಿಸಲ್ಪಡುತ್ತವೆ (ಡೇಟಾ ವ್ಯವಸ್ಥೆ ಪ್ರವೇಶಿಸಿದಾಗ) ಮತ್ತು
ಡೇಟಾ transform ಆದಂತೆ update ಆಗುತ್ತವೆ. ಒಟ್ಟಾಗಿ ಸೇರಿಸಿದ ಡೇಟಾ `max(input classifications)`
ಆನುವಂಶಿಕವಾಗಿ ಪಡೆಯುತ್ತದೆ -- ಯಾವ input CONFIDENTIAL ಆಗಿದ್ದರೂ, output ಕನಿಷ್ಟ CONFIDENTIAL.

| ಘಟನೆ                                  | Lineage ಕ್ರಿಯೆ                                     |
| ------------------------------------- | --------------------------------------------------- |
| Integration ನಿಂದ ಡೇಟಾ ಓದಿ             | Origin ನೊಂದಿಗೆ lineage record ರಚಿಸಿ                 |
| LLM ಯಿಂದ ಡೇಟಾ transform               | Transformation append ಮಾಡಿ, input lineages ಲಿಂಕ್ ಮಾಡಿ |
| ಅನೇಕ ಮೂಲಗಳಿಂದ ಡೇಟಾ ಒಟ್ಟುಗೂಡಿಸಿ       | Lineage ವಿಲೀನ ಮಾಡಿ, classification = max(inputs)    |
| Channel ಗೆ ಡೇಟಾ ಕಳುಹಿಸಿ               | ಗಮ್ಯಸ್ಥಾನ ದಾಖಲಿಸಿ, classification ಪರಿಶೀಲಿಸಿ         |
| Session ಮರುಹೊಂದಿಸಿ                    | Lineage records archive ಮಾಡಿ, context ನಿಂದ clear ಮಾಡಿ |

## Storage ಮತ್ತು Retention

Audit logs `audit:` namespace ಅಡಿ `StorageProvider` abstraction ಮೂಲಕ persist ಮಾಡಲ್ಪಡುತ್ತವೆ.
Lineage records `lineage:` namespace ಅಡಿ ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ.

| ಡೇಟಾ ಪ್ರಕಾರ       | Namespace   | ಡಿಫಾಲ್ಟ್ ಉಳಿಕೆ                |
| ----------------- | ----------- | ------------------------------ |
| Audit logs        | `audit:`    | 1 ವರ್ಷ                         |
| Lineage records   | `lineage:`  | 90 ದಿನಗಳು                      |
| Session state     | `sessions:` | 30 ದಿನಗಳು                      |
| Taint history     | `taint:`    | Session ಉಳಿಕೆ ಹೊಂದಾಣಿಕೆ        |

::: warning SECURITY Retention periods configurable, ಆದರೆ audit logs compliance requirements
ಬೆಂಬಲಿಸಲು (SOC 2, GDPR, HIPAA) 1 ವರ್ಷಕ್ಕೆ default ಆಗುತ್ತವೆ. ನಿಮ್ಮ ಸಂಸ್ಥೆಯ ನಿಯಂತ್ರಕ
requirement ಗಿಂತ ಕಡಿಮೆ retention period ಕಡಿಮೆ ಮಾಡುವುದು administrator ಜವಾಬ್ದಾರಿ. :::

### Storage Backends

| Tier           | Backend   | ವಿವರಗಳು                                                                                                                                                                            |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personal**   | SQLite    | `~/.triggerfish/data/triggerfish.db` ನಲ್ಲಿ WAL-mode database. Audit records ಎಲ್ಲ ಇತರ Triggerfish state ಅದೇ database ನಲ್ಲಿ structured JSON ಆಗಿ ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ.              |
| **Enterprise** | Pluggable | Enterprise backends (Postgres, S3, ಇತ್ಯಾದಿ) `StorageProvider` interface ಮೂಲಕ ಬಳಸಬಹುದು. ಇದು ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ log aggregation infrastructure ನೊಂದಿಗೆ integration ಸಕ್ರಿಯಗೊಳಿಸುತ್ತದೆ. |

## Immutability ಮತ್ತು Integrity

Audit records append-only. ಒಮ್ಮೆ ಬರೆದ ನಂತರ, ಅವುಗಳನ್ನು ವ್ಯವಸ್ಥೆಯ ಯಾವ component ನಿಂದಲೂ --
LLM, agent, ಅಥವಾ plugins ಸೇರಿದಂತೆ -- modify ಅಥವಾ delete ಮಾಡಲಾಗದು. Deletion retention
policy expiration ಮೂಲಕ ಮಾತ್ರ ಆಗುತ್ತದೆ.

ಪ್ರತಿ audit record integrity ಪರಿಶೀಲಿಸಲು ಬಳಸಬಹುದಾದ content hash ಒಳಗೊಂಡಿದೆ. Records
compliance review ಗಾಗಿ export ಮಾಡಿದ್ದರೆ, hashes stored records ವಿರುದ್ಧ validate ಮಾಡಿ
tampering ಪತ್ತೆ ಮಾಡಬಹುದು.

## Enterprise Compliance ವೈಶಿಷ್ಟ್ಯಗಳು

Enterprise deployments audit logging ವಿಸ್ತರಿಸಬಹುದು:

| ವೈಶಿಷ್ಟ್ಯ                 | ವಿವರಣೆ                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| **Legal hold**              | ನಿರ್ದಿಷ್ಟ users, sessions, ಅಥವಾ ಸಮಯ ವ್ಯಾಪ್ತಿಗಾಗಿ retention-based deletion suspend ಮಾಡಿ      |
| **SIEM integration**        | Real time ನಲ್ಲಿ Splunk, Datadog, ಅಥವಾ ಇತರ SIEM systems ಗೆ audit events stream ಮಾಡಿ           |
| **Compliance dashboards**   | Policy decisions, blocked actions, ಮತ್ತು taint patterns ದೃಶ್ಯ ಅವಲೋಕನ                         |
| **Scheduled exports**       | ನಿಯಂತ್ರಕ ಪರಿಶೀಲನೆಗಾಗಿ ಸ್ವಯಂಚಾಲಿತ ಆವರ್ತಕ exports                                               |
| **Alert rules**             | ನಿರ್ದಿಷ್ಟ audit patterns ಆದಾಗ notifications trigger ಮಾಡಿ (ಉದಾ., ಪುನರಾವರ್ತಿತ blocked write-downs) |

## ಸಂಬಂಧಿತ ಪುಟಗಳು

- [ಭದ್ರತಾ-ಪ್ರಥಮ ವಿನ್ಯಾಸ](./) -- ಭದ್ರತಾ architecture ಅವಲೋಕನ
- [No Write-Down ನಿಯಮ](./no-write-down) -- logged ಆಗುವ classification flow ನಿಯಮ
- [Identity & Auth](./identity) -- identity ನಿರ್ಧಾರಗಳು ಹೇಗೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತವೆ
- [Agent Delegation](./agent-delegation) -- delegation chains audit records ನಲ್ಲಿ ಹೇಗೆ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ
- [Secrets Management](./secrets) -- credential access ಹೇಗೆ logged ಆಗುತ್ತದೆ
