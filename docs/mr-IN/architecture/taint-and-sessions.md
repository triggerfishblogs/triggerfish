# Sessions आणि Taint

Sessions हे Triggerfish मधील conversation state चे fundamental unit आहेत. प्रत्येक
session स्वतंत्रपणे एक **taint level** track करते -- एक classification watermark
जे session दरम्यान access केलेल्या डेटाची सर्वोच्च sensitivity record करते. Taint
धोरण engine च्या output decisions चालवतो: जर session `CONFIDENTIAL` वर tainted
असेल, तर त्या session मधील कोणताही data `CONFIDENTIAL` पेक्षा कमी classified
channel ला वाहू शकत नाही.

## Session Taint Model

### Taint कसे कार्य करते

जेव्हा session एखाद्या classification level वर data access करते, तेव्हा संपूर्ण
session त्या level वर **tainted** होते. Taint तीन नियम follow करते:

1. **Per-conversation**: प्रत्येक session ला स्वतःचा स्वतंत्र taint level आहे
2. **Escalation only**: Taint session मध्ये वाढू शकतो, कधीही कमी होऊ शकत नाही
3. **Full reset सर्व काही साफ करतो**: Taint आणि conversation history एकत्र cleared आहेत

<img src="/diagrams/taint-escalation.svg" alt="Taint escalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint can only escalate, never decrease." style="max-width: 100%;" />

::: warning SECURITY Taint कधीही selectively कमी केला जाऊ शकत नाही. संपूर्ण
conversation history साफ केल्याशिवाय session "un-taint" करण्याचा कोणताही mechanism
नाही. हे context leakage प्रतिबंध करते -- जर session ने confidential data पाहिले
असल्याचे आठवत असेल, तर taint हे reflect करणे आवश्यक आहे. :::

### Taint का कमी होऊ शकत नाही

जरी classified data आता displayed नसेल तरी, LLM चा context window अजूनही ते
contain करतो. Model future responses मध्ये classified information reference,
summarize किंवा echo करू शकतो. Taint कमी करण्याचा एकमेव सुरक्षित मार्ग म्हणजे
context पूर्णपणे eliminate करणे -- जे full reset नक्की करते.

## Session Types

Triggerfish अनेक session types व्यवस्थापित करते, प्रत्येकात स्वतंत्र taint tracking:

| Session Type   | वर्णन                                              | Initial Taint | Restarts मध्ये Persist होते |
| -------------- | -------------------------------------------------- | ------------- | ----------------------------- |
| **Main**       | Owner सह primary direct conversation               | `PUBLIC`      | हो                            |
| **Channel**    | प्रत्येक connected channel साठी एक                 | `PUBLIC`      | हो                            |
| **Background** | Autonomous tasks साठी spawned (cron, webhooks)     | `PUBLIC`      | Task duration                 |
| **Agent**      | Multi-agent routing साठी per-agent sessions        | `PUBLIC`      | हो                            |
| **Group**      | Group chat sessions                                | `PUBLIC`      | हो                            |

::: info Background sessions नेहमी `PUBLIC` taint सह सुरू होतात, parent session
च्या taint level पर्वा न करता. हे design नुसार आहे -- cron jobs आणि
webhook-triggered tasks त्यांना spawn केलेल्या कोणत्याही session चे taint inherit
करू नये. :::

## Full Reset Mechanism

Session reset हा taint कमी करण्याचा एकमेव मार्ग आहे. हे एक deliberate, destructive
operation आहे:

1. **Lineage records archive करा** -- Session मधील सर्व lineage data audit storage
   मध्ये preserved आहे
2. **Conversation history साफ करा** -- संपूर्ण context window wiped आहे
3. **Taint PUBLIC ला reset करा** -- Session fresh सुरू होते
4. **User confirmation आवश्यक करा** -- `SESSION_RESET` hook execute होण्यापूर्वी
   explicit confirmation आवश्यक करतो

Reset नंतर, session brand-new session पासून indistinguishable आहे. एजंटला
मागील conversation ची कोणती आठवण नाही.

## Inter-Session Communication

जेव्हा एजंट `sessions_send` वापरून sessions मध्ये data पाठवतो, तेव्हा समान
write-down नियम लागू होतात:

| Source Session Taint | Target Session Channel    | निर्णय |
| -------------------- | ------------------------- | ------- |
| `PUBLIC`             | `PUBLIC` channel          | ALLOW   |
| `CONFIDENTIAL`       | `CONFIDENTIAL` channel    | ALLOW   |
| `CONFIDENTIAL`       | `PUBLIC` channel          | BLOCK   |
| `RESTRICTED`         | `CONFIDENTIAL` channel    | BLOCK   |

## Data Lineage

Triggerfish द्वारे processed प्रत्येक data element **provenance metadata** वाहतो
-- data कुठून आले, कसे transformed झाले आणि कुठे गेले याची पूर्ण record.

### Lineage Record Structure

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "accessed_at": "2025-01-29T10:23:45Z"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"]
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Aggregation Classification

जेव्हा अनेक sources मधील data combined केला जातो, तेव्हा aggregated result सर्व
inputs च्या **कमाल वर्गीकरण** inherit करतो:

```
Input 1: INTERNAL    (internal wiki)
Input 2: CONFIDENTIAL (Salesforce record)
Input 3: PUBLIC      (weather API)

Aggregated output classification: CONFIDENTIAL (inputs चा max)
```

### Audit Capabilities

Lineage चार categories च्या audit queries सक्षम करते:

- **Forward trace**: "Salesforce record X च्या data चे काय झाले?" -- data मूळापासून
  सर्व destinations पर्यंत forward follow करते
- **Backward trace**: "या output मध्ये कोणते sources contributed केले?" -- output
  ला त्याच्या सर्व source records पर्यंत trace करते
- **Classification justification**: "हे CONFIDENTIAL का चिन्हांकित आहे?" -- classification
  reason chain दाखवते
- **Compliance export**: Legal किंवा regulatory review साठी chain of custody

## Taint Persistence

Session taint `StorageProvider` द्वारे `taint:` namespace खाली persisted आहे.
याचा अर्थ taint daemon restarts मध्ये survive करते -- restart पूर्वी `CONFIDENTIAL`
असलेला session नंतरही `CONFIDENTIAL` आहे.
