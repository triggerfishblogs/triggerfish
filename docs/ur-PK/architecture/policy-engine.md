# Policy Engine اور Hooks

Policy engine وہ نافذ کاری پرت ہے جو LLM اور باہری دنیا کے درمیان بیٹھتی ہے۔ یہ ڈیٹا
بہاؤ میں ہر اہم نقطے پر ہر عمل کو روکتی ہے اور یقینی ALLOW، BLOCK، یا REDACT فیصلے
کرتی ہے۔ LLM ان فیصلوں کو bypass، modify، یا متاثر نہیں کر سکتا۔

## بنیادی اصول: LLM کی تہہ کے نیچے نافذ کاری

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy enforcement layers: LLM sits above the policy layer, which sits above the execution layer" style="max-width: 100%;" />

::: warning سیکیورٹی LLM policy layer کے اوپر بیٹھتا ہے۔ اسے prompt-inject کیا جا
سکتا ہے، jailbreak کیا جا سکتا ہے، یا manipulate کیا جا سکتا ہے — اور اس سے کوئی فرق
نہیں پڑتا۔ Policy layer خالص کوڈ ہے جو LLM کے نیچے چلتا ہے، structured action requests
کا معائنہ کرتا ہے اور classification قواعد کی بنیاد پر binary فیصلے کرتا ہے۔ LLM output
سے hook bypass تک کوئی راستہ نہیں ہے۔ :::

## Hook Types

آٹھ نافذ کاری hooks ڈیٹا بہاؤ میں ہر اہم نقطے پر اقدامات کو روکتے ہیں۔

### Hook Architecture

<img src="/diagrams/hook-chain-flow.svg" alt="Hook chain flow: PRE_CONTEXT_INJECTION → LLM Context → PRE_TOOL_CALL → Tool Execution → POST_TOOL_RESPONSE → LLM Response → PRE_OUTPUT → Output Channel" style="max-width: 100%;" />

### تمام Hook Types

| Hook                    | Trigger                          | اہم اقدامات                                                              | ناکامی کی صورت       |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------ | -------------------- |
| `PRE_CONTEXT_INJECTION` | بیرونی input context میں داخل   | Input classify کریں، taint تفویض، lineage بنائیں، injection scan کریں   | Input رد کریں        |
| `PRE_TOOL_CALL`         | LLM tool execution کی درخواست    | Permission check، rate limit، parameter validation                       | Tool call block کریں |
| `POST_TOOL_RESPONSE`    | Tool ڈیٹا واپس کرتا ہے          | Response classify کریں، session taint update، lineage بنائیں/update     | Redact یا block      |
| `PRE_OUTPUT`            | Response سسٹم چھوڑنے والی ہے    | ہدف کے خلاف آخری classification check، PII scan                         | Output block کریں    |
| `SECRET_ACCESS`         | Plugin credential مانگتا ہے     | رسائی log کریں، declared scope کے خلاف permission verify کریں            | Credential رد کریں   |
| `SESSION_RESET`         | User taint reset مانگتا ہے      | Lineage archive، context صاف، confirmation verify کریں                   | Confirmation مانگیں  |
| `AGENT_INVOCATION`      | Agent دوسرے agent کو call کرتا  | Delegation chain verify کریں، taint ceiling نافذ کریں                    | Invocation block     |
| `MCP_TOOL_CALL`         | MCP server tool invoke کیا گیا  | Gateway policy check (server status، tool permissions، schema)           | MCP call block       |

## Hook Interface

ہر hook ایک context receive کرتا ہے اور result واپس کرتا ہے۔ handler ایک synchronous، خالص
function ہے۔

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-specific payload varies by type
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` synchronous ہے اور `HookResult` directly واپس کرتا ہے —
Promise نہیں۔ یہ ڈیزائن کے مطابق ہے۔ عمل آگے بڑھنے سے پہلے Hooks مکمل ہونے چاہئیں،
اور انہیں synchronous بنانا async bypass کی کوئی بھی ممکنہ صورت ختم کر دیتا ہے۔ اگر کوئی
hook timeout ہو جائے، تو عمل رد کر دیا جاتا ہے۔ :::

## Hook Guarantees

ہر hook execution چار invariants لے جاتا ہے:

| Guarantee      | اس کا مطلب                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **یقینی**      | ایک ہی input ہمیشہ ایک ہی فیصلہ۔ کوئی بے ترتیبی نہیں۔ hooks کے اندر کوئی LLM calls نہیں۔ فیصلوں کو متاثر کرنے والے کوئی بیرونی API calls نہیں۔ |
| **Synchronous** | عمل آگے بڑھنے سے پہلے hooks مکمل ہوتے ہیں۔ کوئی async bypass ممکن نہیں۔ Timeout یعنی rejection۔ |
| **Logged**     | ہر hook execution recorded: input parameters، فیصلہ، timestamp، اور policy قواعد evaluate کیے گئے۔ |
| **Unforgeable** | LLM output میں hook bypass ہدایات نہیں ہو سکتیں۔ Hook layer میں "LLM output parse for commands" logic نہیں ہے۔ |

## Policy قواعد کی Hierarchy

Policy قواعد تین tiers میں منظم ہیں۔ اونچے tiers نچلے tiers کو override نہیں کر سکتے۔

### مقررہ قواعد (ہمیشہ نافذ، قابل ترتیب نہیں)

یہ قواعد hardcoded ہیں اور کسی بھی admin، user، یا configuration سے disable نہیں کیے
جا سکتے:

- **No write-down**: Classification کا بہاؤ یک سمتی ہے۔ ڈیٹا کم سطح کی طرف نہیں بہہ سکتا۔
- **UNTRUSTED channels**: کوئی ڈیٹا اندر یا باہر نہیں۔ بس۔
- **Session taint**: ایک بار بلند ہونے پر، session کی پوری زندگی بلند رہتا ہے۔
- **Audit logging**: تمام اقدامات logged۔ کوئی استثناء نہیں۔ Disable کرنے کا کوئی طریقہ نہیں۔

### قابل ترتیب قواعد (admin-tunable)

Administrators UI یا configuration files کے ذریعے انہیں adjust کر سکتے ہیں:

- Integration ڈیفالٹ classifications (مثلاً Salesforce ڈیفالٹ `CONFIDENTIAL`)
- Channel classifications
- فی integration action allow/deny فہرستیں
- بیرونی مواصلات کے لیے Domain allowlists
- فی tool، فی user، یا فی session rate limits

### Declarative Escape Hatch (enterprise)

Enterprise deployments ترقی یافتہ scenarios کے لیے structured YAML میں کسٹم policy
قواعد define کر سکتے ہیں:

```yaml
# SSN patterns پر مشتمل کسی بھی Salesforce query کو block کریں
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# زیادہ قدر والے transactions کے لیے منظوری ضروری کریں
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# وقت پر مبنی پابندی: کام کے اوقات کے بعد کوئی بیرونی sends نہیں
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "External communications restricted outside business hours"
```

::: tip کسٹم YAML قواعد کو activation سے پہلے validation پاس کرنا ہوگا۔ غلط قواعد
runtime پر نہیں، configuration کے وقت رد کیے جاتے ہیں۔ یہ misconfiguration کو سیکیورٹی
gaps بنانے سے روکتا ہے۔ :::

## انکار کا صارف تجربہ

جب policy engine کوئی عمل block کرتا ہے، تو صارف کو ایک عام error کی بجائے واضح
وضاحت ملتی ہے۔

**ڈیفالٹ (مخصوص):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**Opt-in (تعلیمی):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  -> Reset session and send message
  -> Ask your admin to reclassify the WhatsApp channel
  -> Learn more: [docs link]
```

تعلیمی mode opt-in ہے اور صارفین کو سمجھنے میں مدد کرتا ہے _کیوں_ کوئی عمل blocked ہوا،
بشمول کون سے ڈیٹا source نے taint escalation کی اور classification mismatch کیا ہے۔ دونوں
modes dead-end errors کی بجائے قابل عمل اگلے اقدامات پیش کرتے ہیں۔

## Hooks کیسے ایک ساتھ Chain ہوتے ہیں

ایک عام request/response cycle میں، متعدد hooks ترتیب سے چلتے ہیں۔ ہر hook کو chain
میں پہلے کے hooks کے فیصلوں کی مکمل visibility حاصل ہوتی ہے۔

```
User sends: "Check my Salesforce pipeline and message my wife"

1. PRE_CONTEXT_INJECTION
   - Input from owner, classified as PUBLIC
   - Session taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Tool permitted? YES
   - User has Salesforce connection? YES
   - Rate limit? OK
   - Decision: ALLOW

3. POST_TOOL_RESPONSE (salesforce results)
   - Data classified: CONFIDENTIAL
   - Session taint escalates: PUBLIC -> CONFIDENTIAL
   - Lineage record created

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Tool permitted? YES
   - Decision: ALLOW (tool-level check passes)

5. PRE_OUTPUT (message to wife via WhatsApp)
   - Session taint: CONFIDENTIAL
   - Target effective classification: PUBLIC (external recipient)
   - CONFIDENTIAL -> PUBLIC: BLOCKED
   - Decision: BLOCK
   - Reason: "classification_violation"

6. Agent presents reset option to user
```
