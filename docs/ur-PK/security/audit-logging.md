# Audit اور Compliance

Triggerfish میں ہر policy فیصلہ مکمل context کے ساتھ logged ہوتا ہے۔ کوئی استثناء
نہیں، کوئی "debug mode" نہیں جو logging غیر فعال کرے، اور LLM کے لیے audit records
suppress کرنے کا کوئی طریقہ نہیں۔ یہ سسٹم کے ہر سیکیورٹی فیصلے کا مکمل، tamper-evident
ریکارڈ فراہم کرتا ہے۔

## کیا Recorded ہوتا ہے

Audit logging ایک **مقررہ قاعدہ** ہے — یہ ہمیشہ فعال ہے اور غیر فعال نہیں کیا جا
سکتا۔ ہر enforcement hook execution ایک audit record تیار کرتا ہے جس میں شامل ہیں:

| Field             | تفصیل                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | فیصلہ کب کیا گیا (ISO 8601، UTC)                                                                                                                                                              |
| `hook_type`       | کون سا enforcement hook چلا (`PRE_CONTEXT_INJECTION`، `PRE_TOOL_CALL`، `POST_TOOL_RESPONSE`، `PRE_OUTPUT`، `SECRET_ACCESS`، `SESSION_RESET`، `AGENT_INVOCATION`، `MCP_TOOL_CALL`)             |
| `session_id`      | وہ session جس میں عمل ہوا                                                                                                                                                                     |
| `decision`        | `ALLOW`، `BLOCK`، یا `REDACT`                                                                                                                                                                 |
| `reason`          | فیصلے کی انسانی زبان میں وضاحت                                                                                                                                                                |
| `input`           | وہ ڈیٹا یا عمل جس نے hook کو trigger کیا                                                                                                                                                     |
| `rules_evaluated` | فیصلے تک پہنچنے کے لیے کون سے policy قواعد چیک کیے گئے                                                                                                                                      |
| `taint_before`    | عمل سے پہلے session taint سطح                                                                                                                                                                 |
| `taint_after`     | عمل کے بعد session taint سطح (اگر تبدیل ہوئی)                                                                                                                                               |
| `metadata`        | hook type کے لیے مخصوص اضافی context                                                                                                                                                         |

## Audit Record کی مثالیں

### اجازت یافتہ Output

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

### Blocked Write-Down

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

### Taint Escalation کے ساتھ Tool Call

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

### Agent Delegation Blocked

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

## Audit Trace Capabilities

<img src="/diagrams/audit-trace-flow.svg" alt="Audit trace flow: forward trace, backward trace, and classification justification feed into compliance export" style="max-width: 100%;" />

Audit records کو چار طریقوں سے query کیا جا سکتا ہے، ہر ایک مختلف compliance اور
forensic ضرورت کو پورا کرتا ہے۔

### Forward Trace

**سوال:** "Salesforce record `opp_00123ABC` کے ڈیٹا کا کیا ہوا؟"

Forward trace ایک ڈیٹا element کو اس کے اصل مقام سے ہر transformation، session،
اور output تک trace کرتا ہے۔ یہ جواب دیتا ہے: یہ ڈیٹا کہاں گیا، کس نے دیکھا، اور
کیا یہ کبھی organization سے باہر بھیجا گیا؟

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

### Backward Trace

**سوال:** "10:24 UTC پر بھیجے گئے پیغام میں کون سے sources شامل تھے؟"

Backward trace ایک output سے شروع ہو کر lineage chain میں پیچھے جاتا ہے تاکہ ہر
data source کی شناخت ہو جس نے output کو متاثر کیا۔ یہ سمجھنے کے لیے ضروری ہے کہ آیا
classified ڈیٹا response میں شامل تھا۔

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

**سوال:** "یہ ڈیٹا CONFIDENTIAL کیوں marked ہے؟"

Classification justification اس قاعدے یا policy تک واپس trace کرتی ہے جس نے
classification سطح تفویض کی:

```
Data: Pipeline summary (lin_789xyz)
Classification: CONFIDENTIAL
Reason: source_system_default
  --> Salesforce integration default classification: CONFIDENTIAL
  --> Configured by: admin_001 at 2025-01-10T08:00:00Z
  --> Policy rule: "All Salesforce data classified as CONFIDENTIAL"
```

### Compliance Export

قانونی، regulatory، یا داخلی review کے لیے، Triggerfish کسی بھی ڈیٹا element یا
time range کے لیے مکمل chain of custody export کر سکتا ہے:

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

::: tip Compliance exports structured JSON فائلیں ہیں جو SIEM systems، compliance
dashboards، یا legal review tools کے ذریعے ingest کی جا سکتی ہیں۔ Export format مستحکم
اور versioned ہے۔ :::

## Data Lineage

Audit logging Triggerfish کے data lineage system کے ساتھ مل کر کام کرتا ہے۔ Triggerfish
کے ذریعے processed ہر ڈیٹا element provenance metadata رکھتا ہے:

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

Lineage records `POST_TOOL_RESPONSE` پر بنائے جاتے ہیں (جب ڈیٹا سسٹم میں داخل ہو)
اور جیسے جیسے ڈیٹا transform ہوتا ہے، اپ ڈیٹ ہوتے ہیں۔ Aggregated ڈیٹا
`max(input classifications)` inherit کرتا ہے — اگر کوئی بھی input CONFIDENTIAL ہو،
تو output کم از کم CONFIDENTIAL ہے۔

| Event                                    | Lineage Action                                      |
| ---------------------------------------- | --------------------------------------------------- |
| Integration سے ڈیٹا پڑھنا               | Origin کے ساتھ lineage record بنانا                 |
| LLM کے ذریعے ڈیٹا transform کرنا        | Transformation append کرنا، input lineages link کرنا |
| متعدد sources سے ڈیٹا aggregate کرنا    | Lineage merge کرنا، classification = max(inputs)    |
| Channel کو ڈیٹا بھیجنا                  | منزل record کرنا، classification verify کرنا       |
| Session reset                            | Lineage records archive کرنا، context سے صاف کرنا  |

## Storage اور Retention

Audit logs `audit:` namespace کے تحت `StorageProvider` abstraction کے ذریعے محفوظ
کیے جاتے ہیں۔ Lineage records `lineage:` namespace کے تحت stored ہوتے ہیں۔

| Data Type       | Namespace   | ڈیفالٹ Retention       |
| --------------- | ----------- | ---------------------- |
| Audit logs      | `audit:`    | 1 سال                  |
| Lineage records | `lineage:`  | 90 دن                  |
| Session state   | `sessions:` | 30 دن                  |
| Taint history   | `taint:`    | Session retention سے مطابقت |

::: warning سیکیورٹی Retention periods قابل ترتیب ہیں، لیکن audit logs compliance
requirements (SOC 2، GDPR، HIPAA) کو support کرنے کے لیے ڈیفالٹ 1 سال ہیں۔ Retention
period کو آپ کی organization کی regulatory ضرورت سے کم کرنا administrator کی ذمہ داری
ہے۔ :::

### Storage Backends

| Tier           | Backend     | تفصیلات                                                                                                                                                                              |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Personal**   | SQLite      | `~/.triggerfish/data/triggerfish.db` پر WAL-mode database۔ Audit records تمام دیگر Triggerfish state کے ساتھ ایک ہی database میں structured JSON کے طور پر stored ہوتے ہیں۔       |
| **Enterprise** | Pluggable   | Enterprise backends (Postgres، S3، وغیرہ) `StorageProvider` interface کے ذریعے استعمال کیے جا سکتے ہیں۔ یہ موجودہ log aggregation infrastructure کے ساتھ integration کی اجازت دیتا ہے۔ |

## Immutability اور Integrity

Audit records append-only ہیں۔ ایک بار لکھے جانے کے بعد، سسٹم کا کوئی بھی component
— بشمول LLM، agent، یا plugins — انہیں modify یا delete نہیں کر سکتا۔ Deletion صرف
retention policy expiration کے ذریعے ہوتا ہے۔

ہر audit record میں ایک content hash ہوتا ہے جو integrity verify کرنے کے لیے استعمال
کیا جا سکتا ہے۔ اگر records compliance review کے لیے export کیے جائیں، تو tampering
detect کرنے کے لیے hashes stored records کے خلاف validate کیے جا سکتے ہیں۔

## Enterprise Compliance Features

Enterprise deployments audit logging کو ان خصوصیات کے ساتھ بڑھا سکتے ہیں:

| خصوصیت                    | تفصیل                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Legal hold**             | مخصوص users، sessions، یا time ranges کے لیے retention-based deletion معطل کریں                                             |
| **SIEM integration**       | Audit events کو real time میں Splunk، Datadog، یا دیگر SIEM systems کو stream کریں                                          |
| **Compliance dashboards**  | Policy decisions، blocked actions، اور taint patterns کا visual overview                                                    |
| **Scheduled exports**      | Regulatory review کے لیے خودکار periodic exports                                                                            |
| **Alert rules**            | مخصوص audit patterns ہونے پر notifications trigger کریں (مثلاً، بار بار blocked write-downs)                               |

## متعلقہ صفحات

- [سیکیورٹی-اول ڈیزائن](./) — سیکیورٹی architecture کا جائزہ
- [No Write-Down قاعدہ](./no-write-down) — وہ classification flow قاعدہ جس کی نافذ کاری logged ہوتی ہے
- [Identity اور Auth](./identity) — شناخت فیصلے کیسے recorded ہوتے ہیں
- [Agent Delegation](./agent-delegation) — delegation chains audit records میں کیسے نظر آتی ہیں
- [Secrets Management](./secrets) — credential رسائی کیسے logged ہوتی ہے
