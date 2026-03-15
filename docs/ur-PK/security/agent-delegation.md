# Agent Delegation

جیسے جیسے AI ایجنٹ ایک دوسرے کے ساتھ تعامل بڑھاتے ہیں — ایک ایجنٹ دوسرے کو
sub-tasks مکمل کرنے کے لیے بلاتا ہے — ایک نئی class کے سیکیورٹی خطرات سامنے آتے
ہیں۔ ایک agent chain کو کم پابندیوں والے ایجنٹ کے ذریعے ڈیٹا laundering کے لیے
استعمال کیا جا سکتا ہے، classification controls کو bypass کرتے ہوئے۔ Triggerfish یہ
cryptographic agent identity، classification ceilings، اور mandatory taint inheritance
کے ذریعے روکتا ہے۔

## Agent Certificates

Triggerfish میں ہر ایجنٹ کا ایک certificate ہوتا ہے جو اس کی شناخت، capabilities،
اور delegation permissions بیان کرتا ہے۔ یہ certificate agent کے مالک نے sign کیا
ہوتا ہے اور ایجنٹ خود یا دیگر agents اسے modify نہیں کر سکتے۔

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Certificate کے اہم fields:

| Field                  | مقصد                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | **Classification ceiling** — سب سے اونچی taint سطح جس پر یہ ایجنٹ کام کر سکتا ہے۔ INTERNAL ceiling والا ایجنٹ CONFIDENTIAL tainted session کے ذریعے invoke نہیں کیا جا سکتا۔      |
| `can_invoke_agents`    | آیا یہ ایجنٹ دوسرے agents کو call کرنے کی اجازت رکھتا ہے۔                                                                                                                           |
| `can_be_invoked_by`    | ان agents کی explicit allowlist جو اسے invoke کر سکتے ہیں۔                                                                                                                           |
| `max_delegation_depth` | Agent invocation chain کی زیادہ سے زیادہ گہرائی۔ Unbounded recursion روکتا ہے۔                                                                                                      |
| `signature`            | مالک کا Ed25519 signature۔ Certificate tampering روکتا ہے۔                                                                                                                           |

## Invocation Flow

جب ایک ایجنٹ دوسرے کو call کرتا ہے، policy layer callee agent execute ہونے سے پہلے
delegation verify کرتی ہے۔ یہ check یقینی ہے اور کوڈ میں چلتا ہے — calling agent
فیصلے کو متاثر نہیں کر سکتا۔

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agent delegation sequence: Agent A invokes Agent B, policy layer verifies taint vs ceiling and blocks when taint exceeds ceiling" style="max-width: 100%;" />

اس مثال میں، Agent A کا session taint CONFIDENTIAL ہے (اس نے Salesforce ڈیٹا پہلے
access کیا)۔ Agent B کی classification ceiling INTERNAL ہے۔ چونکہ CONFIDENTIAL
INTERNAL سے اونچا ہے، invocation blocked ہو جاتی ہے۔ Agent A کا tainted ڈیٹا کم
classification ceiling والے ایجنٹ تک نہیں پہنچ سکتا۔

::: warning سیکیورٹی Policy layer caller کی **موجودہ session taint** چیک کرتی ہے، اس
کی ceiling نہیں۔ یہاں تک کہ اگر Agent A کی CONFIDENTIAL ceiling ہو، جو اہم ہے وہ
invocation کے وقت session کا اصل taint level ہے۔ اگر Agent A نے کوئی classified ڈیٹا
access نہیں کیا (taint PUBLIC ہے)، تو یہ Agent B (INTERNAL ceiling) کو بغیر مسئلے کے
invoke کر سکتا ہے۔ :::

## Delegation Chain Tracking

جب agents دوسرے agents کو invoke کرتے ہیں، مکمل chain timestamps اور ہر مرحلے پر
taint levels کے ساتھ track کی جاتی ہے:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

یہ chain audit log میں recorded ہوتی ہے اور compliance اور forensic analysis کے لیے
query کی جا سکتی ہے۔ آپ بالکل trace کر سکتے ہیں کہ کون سے agents شامل تھے، ان کے
taint levels کیا تھے، اور انہوں نے کیا tasks انجام دیے۔

## Security Invariants

چار invariants agent delegation کو govern کرتے ہیں۔ تمام policy layer میں کوڈ کے
ذریعے نافذ ہیں اور chain کا کوئی بھی ایجنٹ انہیں override نہیں کر سکتا۔

| Invariant                       | نافذ کاری                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint صرف بڑھتا ہے**          | ہر callee `max(اپنا taint، caller taint)` inherit کرتا ہے۔ Callee کا taint اس کے caller سے کم کبھی نہیں ہو سکتا۔                                            |
| **Ceiling کا احترام**           | اگر caller کا taint callee کی `max_classification` ceiling سے زیادہ ہو تو ایجنٹ invoke نہیں کیا جا سکتا۔                                                    |
| **Depth limits نافذ**           | Chain `max_delegation_depth` پر ختم ہوتی ہے۔ اگر limit 3 ہو، تو چوتھی سطح کی invocation blocked ہوتی ہے۔                                                   |
| **Circular invocation blocked** | ایک ایجنٹ ایک ہی chain میں دو بار نہیں آ سکتا۔ اگر Agent A Agent B کو call کرے جو Agent A کو call کرنے کی کوشش کرے، تو دوسری invocation blocked ہو جاتی ہے۔ |

### Taint Inheritance کی تفصیل

جب Agent A (taint: CONFIDENTIAL) Agent B (ceiling: CONFIDENTIAL) کو کامیابی سے invoke
کرتا ہے، Agent B CONFIDENTIAL کے taint سے شروع ہوتا ہے — Agent A سے inherited۔ اگر
Agent B پھر RESTRICTED ڈیٹا access کرے، تو اس کا taint RESTRICTED تک escalate ہو
جاتا ہے۔ یہ بلند taint invocation complete ہونے پر Agent A تک واپس آتا ہے۔

<img src="/diagrams/taint-inheritance.svg" alt="Taint inheritance: Agent A (INTERNAL) invokes Agent B, B inherits taint, accesses Salesforce (CONFIDENTIAL), returns elevated taint to A" style="max-width: 100%;" />

Taint دونوں سمتوں میں بہتا ہے — invocation کے وقت caller سے callee تک، اور completion
پر callee سے caller تک۔ یہ صرف escalate ہو سکتا ہے۔

## Data Laundering روکنا

Multi-agent systems میں ایک اہم attack vector **data laundering** ہے — intermediate
agents کے ذریعے classified ڈیٹا کو کم-classification منزل تک routing کر کے classified
ڈیٹا کو نقل و حمل کرنا۔

### حملہ

```
Attacker goal: CONFIDENTIAL data کو PUBLIC channel کے ذریعے exfiltrate کرنا

Attempted flow:
1. Agent A Salesforce access کرتا ہے (taint --> CONFIDENTIAL)
2. Agent A Agent B کو invoke کرتا ہے (جس کے پاس PUBLIC channel ہے)
3. Agent B ڈیٹا PUBLIC channel کو بھیجتا ہے
```

### کیوں ناکام ہوتا ہے

Triggerfish یہ حملہ متعدد مقامات پر block کرتا ہے:

**Block point 1: Invocation check.** اگر Agent B کی ceiling CONFIDENTIAL سے کم ہو،
invocation outright blocked ہو جاتی ہے۔ Agent A کا taint (CONFIDENTIAL) Agent B کی
ceiling سے زیادہ ہے۔

**Block point 2: Taint inheritance.** یہاں تک کہ اگر Agent B کی CONFIDENTIAL ceiling
ہو اور invocation کامیاب ہو، Agent B Agent A کا CONFIDENTIAL taint inherit کرتا ہے۔
جب Agent B PUBLIC channel کو output دینے کی کوشش کرتا ہے، تو `PRE_OUTPUT` hook
write-down block کرتا ہے۔

**Block point 3: Delegation میں کوئی taint reset نہیں۔** Delegation chain میں agents
اپنا taint reset نہیں کر سکتے۔ Taint reset صرف end user کے لیے دستیاب ہے، اور یہ
پوری conversation history صاف کر دیتا ہے۔ ایجنٹ کے لیے chain کے دوران اپنا taint
level "wash" کرنے کا کوئی mechanism نہیں ہے۔

::: danger ڈیٹا agent delegation کے ذریعے اپنی classification سے بچ نہیں سکتا۔
Ceiling checks، mandatory taint inheritance، اور chains میں no-taint-reset کا combination
data laundering کو Triggerfish security model کے اندر ناممکن بناتا ہے۔ :::

## مثالی منظرنامے

### منظرنامہ 1: کامیاب Delegation

```
Agent A (ceiling: CONFIDENTIAL, current taint: INTERNAL)
  Agent B کو call کرتا ہے (ceiling: CONFIDENTIAL)

Policy check:
  - A، B کو invoke کر سکتا ہے؟ ہاں (B، A کی delegation list میں ہے)
  - A کا taint (INTERNAL) <= B کی ceiling (CONFIDENTIAL)؟ ہاں
  - Depth limit OK؟ ہاں (depth 1 of max 3)
  - Circular؟ نہیں

نتیجہ: ALLOWED
Agent B taint کے ساتھ شروع ہوتا ہے: INTERNAL (A سے inherited)
```

### منظرنامہ 2: Ceiling کی وجہ سے Blocked

```
Agent A (ceiling: RESTRICTED, current taint: CONFIDENTIAL)
  Agent B کو call کرتا ہے (ceiling: INTERNAL)

Policy check:
  - A کا taint (CONFIDENTIAL) <= B کی ceiling (INTERNAL)؟ نہیں

نتیجہ: BLOCKED
وجہ: Agent B ceiling (INTERNAL) session taint (CONFIDENTIAL) سے کم
```

### منظرنامہ 3: Depth Limit کی وجہ سے Blocked

```
Agent A، Agent B کو call کرتا ہے (depth 1)
  Agent B، Agent C کو call کرتا ہے (depth 2)
    Agent C، Agent D کو call کرتا ہے (depth 3)
      Agent D، Agent E کو call کرتا ہے (depth 4)

Agent E کے لیے Policy check:
  - Depth 4 > max_delegation_depth (3)

نتیجہ: BLOCKED
وجہ: Maximum delegation depth exceeded
```

### منظرنامہ 4: Circular Reference کی وجہ سے Blocked

```
Agent A، Agent B کو call کرتا ہے (depth 1)
  Agent B، Agent C کو call کرتا ہے (depth 2)
    Agent C، Agent A کو call کرنے کی کوشش کرتا ہے (depth 3)

دوسری Agent A invocation کے لیے Policy check:
  - Agent A پہلے سے chain میں موجود ہے

نتیجہ: BLOCKED
وجہ: Circular agent invocation detected
```

## متعلقہ صفحات

- [سیکیورٹی-اول ڈیزائن](./) — سیکیورٹی architecture کا جائزہ
- [No Write-Down قاعدہ](./no-write-down) — وہ classification flow قاعدہ جو delegation نافذ کرتی ہے
- [Identity اور Auth](./identity) — user اور channel identity کیسے قائم ہوتی ہے
- [Audit اور Compliance](./audit-logging) — delegation chains audit log میں کیسے recorded ہوتی ہیں
