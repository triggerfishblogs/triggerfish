# Sessions اور Taint

Sessions Triggerfish میں conversation state کی بنیادی اکائی ہیں۔ ہر session آزادانہ طور
پر ایک **taint level** track کرتا ہے — ایک classification watermark جو session کے دوران
access کیے گئے ڈیٹا کی سب سے زیادہ حساسیت record کرتا ہے۔ Taint policy engine کے output
فیصلوں کو چلاتا ہے: اگر کوئی session `CONFIDENTIAL` تک tainted ہے، تو اس session سے
کوئی ڈیٹا `CONFIDENTIAL` سے نیچے classified channel کی طرف نہیں بہہ سکتا۔

## Session Taint ماڈل

### Taint کیسے کام کرتا ہے

جب کوئی session ایک classification سطح پر ڈیٹا access کرتا ہے، تو پوری session اس
سطح تک **tainted** ہو جاتی ہے۔ Taint تین قواعد پر عمل کرتا ہے:

1. **فی گفتگو**: ہر session کا اپنا آزاد taint level ہوتا ہے
2. **صرف escalation**: Taint session میں بڑھ سکتا ہے، کبھی کم نہیں ہو سکتا
3. **مکمل reset سب صاف کرتا ہے**: Taint اور conversation history ایک ساتھ صاف ہوتے ہیں

<img src="/diagrams/taint-escalation.svg" alt="Taint escalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint can only escalate, never decrease." style="max-width: 100%;" />

::: warning سیکیورٹی Taint کو کبھی بھی منتخب طور پر کم نہیں کیا جا سکتا۔ پوری
conversation history صاف کیے بغیر session کو "un-taint" کرنے کا کوئی طریقہ نہیں ہے۔
یہ context leakage روکتا ہے — اگر session کو confidential ڈیٹا دیکھنا یاد ہے، تو taint
کو اس کی عکاسی کرنی چاہیے۔ :::

### Taint کیوں کم نہیں ہو سکتا

یہاں تک کہ اگر classified ڈیٹا دکھایا نہیں جا رہا، LLM کی context window میں پھر بھی
موجود ہے۔ ماڈل مستقبل کے جوابات میں classified معلومات کا حوالہ دے سکتا، خلاصہ کر سکتا،
یا echo کر سکتا ہے۔ Taint کم کرنے کا واحد محفوظ طریقہ context کو مکمل طور پر ختم کرنا ہے
— جو بالکل وہی ہے جو مکمل reset کرتا ہے۔

## Session Types

Triggerfish کئی session types manage کرتا ہے، ہر ایک آزاد taint ٹریکنگ کے ساتھ:

| Session Type   | وضاحت                                          | ابتدائی Taint | Restarts میں برقرار رہتا ہے |
| -------------- | ----------------------------------------------- | ------------- | ----------------------- |
| **Main**       | مالک کے ساتھ بنیادی براہ راست گفتگو            | `PUBLIC`      | ہاں                     |
| **Channel**    | ہر جڑے channel کے لیے ایک (Telegram، Slack، وغیرہ) | `PUBLIC`   | ہاں                     |
| **Background** | خودمختار tasks کے لیے spawn (cron، webhooks)    | `PUBLIC`      | Task کی مدت تک          |
| **Agent**      | Multi-agent routing کے لیے per-agent sessions   | `PUBLIC`      | ہاں                     |
| **Group**      | Group chat sessions                             | `PUBLIC`      | ہاں                     |

::: info Background sessions ہمیشہ `PUBLIC` taint کے ساتھ شروع ہوتے ہیں، parent session
کے taint level سے قطع نظر۔ یہ ڈیزائن کے مطابق ہے — cron jobs اور webhook-triggered tasks
کو اس session کا taint وراثت میں نہیں ملنا چاہیے جس نے انہیں spawn کیا ہو۔ :::

## Taint Escalation مثال

یہاں taint escalation اور نتیجے میں آنے والے policy block کو دکھانے والا مکمل flow ہے:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint escalation example: session starts PUBLIC, escalates to CONFIDENTIAL after Salesforce access, then BLOCKS output to PUBLIC WhatsApp channel" style="max-width: 100%;" />

## مکمل Reset طریقہ کار

Session reset taint کم کرنے کا واحد طریقہ ہے۔ یہ ایک جان بوجھ کر، destructive
operation ہے:

1. **Lineage records archive کریں** — Session سے تمام lineage ڈیٹا audit storage میں
   محفوظ کیا جاتا ہے
2. **Conversation history صاف کریں** — پوری context window مٹا دی جاتی ہے
3. **Taint کو PUBLIC پر reset کریں** — Session تازہ شروع ہوتا ہے
4. **User confirmation ضروری** — `SESSION_RESET` hook execute کرنے سے پہلے واضح
   confirmation مانگتا ہے

Reset کے بعد، session ایک بالکل نئے session سے الگ نہیں ہوتا۔ ایجنٹ کو پچھلی گفتگو
کی کوئی یاد نہیں ہوتی۔ یہ واحد طریقہ ہے جو guarantee کرتا ہے کہ classified ڈیٹا LLM کی
context سے leak نہیں ہو سکتا۔

## Inter-Session مواصلات

جب ایجنٹ `sessions_send` استعمال کر کے sessions کے درمیان ڈیٹا بھیجتا ہے، تو وہی
write-down قواعد لاگو ہوتے ہیں:

| ماخذ Session Taint   | ہدف Session Channel    | فیصلہ |
| -------------------- | ---------------------- | ------ |
| `PUBLIC`             | `PUBLIC` channel       | ALLOW  |
| `CONFIDENTIAL`       | `CONFIDENTIAL` channel | ALLOW  |
| `CONFIDENTIAL`       | `PUBLIC` channel       | BLOCK  |
| `RESTRICTED`         | `CONFIDENTIAL` channel | BLOCK  |

ایجنٹ کے لیے دستیاب Session tools:

| Tool               | وضاحت                                   | Taint کا اثر                             |
| ------------------ | --------------------------------------- | ---------------------------------------- |
| `sessions_list`    | filters کے ساتھ فعال sessions کی فہرست  | کوئی taint تبدیلی نہیں                   |
| `sessions_history` | کسی session کا transcript retrieve      | Referenced session سے taint وراثت        |
| `sessions_send`    | دوسرے session کو پیغام بھیجیں          | Write-down check کے تحت                  |
| `sessions_spawn`   | بیک گراؤنڈ task session بنائیں         | نئی session `PUBLIC` پر شروع             |
| `session_status`   | موجودہ session state اور metadata چیک   | کوئی taint تبدیلی نہیں                   |

## ڈیٹا Lineage

Triggerfish کی طرف سے process کیا گیا ہر ڈیٹا عنصر **provenance metadata** لے جاتا ہے —
اس بات کا مکمل record کہ ڈیٹا کہاں سے آیا، اسے کیسے transform کیا گیا، اور کہاں گیا۔
Lineage وہ audit trail ہے جو classification فیصلوں کو قابل تصدیق بناتا ہے۔

### Lineage Record ساخت

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

### Lineage Tracking قواعد

| واقعہ                                  | Lineage عمل                                         |
| -------------------------------------- | --------------------------------------------------- |
| Integration سے ڈیٹا پڑھا گیا          | origin کے ساتھ lineage record بنائیں               |
| LLM نے ڈیٹا transform کیا              | Transformation append کریں، input lineages link کریں |
| متعدد ذرائع سے ڈیٹا اکٹھا کیا گیا   | Lineage merge کریں، classification = `max(inputs)` |
| ڈیٹا channel کو بھیجا گیا             | منزل record کریں، classification verify کریں       |
| Session reset                           | Lineage records archive کریں، context سے صاف کریں  |

### Aggregation Classification

جب متعدد ذرائع سے ڈیٹا یکجا کیا جاتا ہے (مثلاً مختلف integrations کے records کا LLM
خلاصہ)، تو مجموعی نتیجہ تمام inputs کی **زیادہ سے زیادہ classification** وراثت میں پاتا ہے:

```
Input 1: INTERNAL    (internal wiki)
Input 2: CONFIDENTIAL (Salesforce record)
Input 3: PUBLIC      (weather API)

Aggregated output classification: CONFIDENTIAL (max of inputs)
```

::: tip Enterprise deployments statistical aggregates (averages، counts، 10+ records
کے sums) یا certified anonymized ڈیٹا کے لیے اختیاری downgrade قواعد configure کر
سکتے ہیں۔ تمام downgrades واضح policy قواعد مانگتے ہیں، مکمل جواز کے ساتھ logged ہوتے
ہیں، اور audit review کے تحت ہیں۔ :::

### Audit صلاحیتیں

Lineage چار categories کے audit queries کو فعال کرتا ہے:

- **Forward trace**: "Salesforce record X کے ڈیٹا کا کیا ہوا؟" — ڈیٹا کو origin سے
  تمام منازل تک آگے follow کرتا ہے
- **Backward trace**: "اس output میں کون سے ذرائع نے حصہ ڈالا؟" — output کو
  تمام source records تک پیچھے trace کرتا ہے
- **Classification justification**: "یہ CONFIDENTIAL کیوں marked ہے؟" — classification
  reason chain دکھاتا ہے
- **Compliance export**: قانونی یا regulatory review کے لیے مکمل chain of custody

## Taint Persistence

Session taint `StorageProvider` کے ذریعے `taint:` namespace کے تحت محفوظ ہوتا ہے۔
اس کا مطلب ہے کہ taint daemon restarts میں برقرار رہتا ہے — ایک session جو restart سے
پہلے `CONFIDENTIAL` تھی، restart کے بعد بھی `CONFIDENTIAL` ہے۔

Lineage records `lineage:` namespace کے تحت compliance-driven retention کے ساتھ محفوظ
ہوتے ہیں (ڈیفالٹ 90 دن)۔
