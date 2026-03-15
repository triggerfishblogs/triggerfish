# Policy Engine & Hooks

policy engine LLM க்கும் வெளி உலகிற்கும் இடையில் அமர்ந்திருக்கும் அமலாக்க அடுக்கு. இது தரவு ஓட்டத்தில் முக்கியமான புள்ளிகளில் ஒவ்வொரு செயலையும் இடைமறித்து நிர்ணயவாத ALLOW, BLOCK அல்லது REDACT முடிவுகளை எடுக்கிறது. LLM இந்த முடிவுகளை bypass, modify அல்லது தாக்க முடியாது.

## முதன்மை கொள்கை: LLM க்கு கீழே அமலாக்கம்

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy enforcement layers: LLM sits above the policy layer, which sits above the execution layer" style="max-width: 100%;" />

::: warning SECURITY LLM policy அடுக்கிற்கு மேல் அமர்ந்துள்ளது. அதை prompt-inject செய்யலாம், jailbreak செய்யலாம் அல்லது manipulate செய்யலாம் -- அது முக்கியமில்லை. policy அடுக்கு LLM க்கு கீழ் இயங்கும் தூய கோடு, structured செயல் கோரிக்கைகளை ஆய்வு செய்து வகைப்படுத்தல் விதிகளின் அடிப்படையில் binary முடிவுகள் எடுக்கிறது. LLM output இலிருந்து hook bypass க்கு எந்த பாதையும் இல்லை. :::

## Hook வகைகள்

எட்டு அமலாக்க hooks தரவு ஓட்டத்தில் ஒவ்வொரு முக்கியமான புள்ளியிலும் செயல்களை இடைமறிக்கின்றன.

### Hook Architecture

<img src="/diagrams/hook-chain-flow.svg" alt="Hook chain flow: PRE_CONTEXT_INJECTION → LLM Context → PRE_TOOL_CALL → Tool Execution → POST_TOOL_RESPONSE → LLM Response → PRE_OUTPUT → Output Channel" style="max-width: 100%;" />

### அனைத்து Hook வகைகளும்

| Hook                    | தூண்டுவது                          | முதன்மை செயல்கள்                                                              | தோல்வி வழி         |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------- | ------------------- |
| `PRE_CONTEXT_INJECTION` | வெளிப்புற input சூழலில் நுழைகிறது  | Input வகைப்படுத்தல், taint ஒதுக்கல், lineage உருவாக்கல், injection scan     | Input நிராகரிக்கல் |
| `PRE_TOOL_CALL`         | LLM tool execution கோருகிறது       | Permission சரிபார்ப்பு, rate limit, parameter validation                      | Tool அழைப்பை block |
| `POST_TOOL_RESPONSE`    | Tool தரவை திரும்ப அனுப்புகிறது     | Response வகைப்படுத்தல், session taint புதுப்பிக்கல், lineage உருவாக்கல்/புதுப்பிக்கல் | Redact அல்லது block |
| `PRE_OUTPUT`            | Response கணினியை விட்டு வெளியேற உள்ளது | இலக்கிற்கு எதிராக இறுதி வகைப்படுத்தல் சரிபார்ப்பு, PII scan                | Output block        |
| `SECRET_ACCESS`         | Plugin ஒரு credential கோருகிறது    | அணுகலை log செய்தல், declared scope க்கு எதிராக permission சரிபார்ப்பு        | Credential மறுப்பு |
| `SESSION_RESET`         | பயனர் taint reset கோருகிறார்       | Lineage archive செய்தல், சூழலை அழிக்கல், confirmation சரிபார்ப்பு           | Confirmation தேவை  |
| `AGENT_INVOCATION`      | Agent மற்றொரு agent ஐ அழைக்கிறது   | Delegation chain சரிபார்ப்பு, taint ceiling அமலாக்கல்                        | Invocation block    |
| `MCP_TOOL_CALL`         | MCP server tool invoke செய்யப்படுகிறது | Gateway policy சரிபார்ப்பு (server நிலை, tool permissions, schema)          | MCP அழைப்பை block  |

## Hook Interface

ஒவ்வொரு hook ஒரு context பெற்று ஒரு result திரும்ப அனுப்புகிறது. handler synchronous, தூய function.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-specific payload வகையால் மாறுகிறது
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` synchronous மற்றும் `HookResult` ஐ நேரடியாக திரும்ப அனுப்புகிறது -- Promise அல்ல. இது வடிவமைப்பால். Hooks செயல் தொடர்வதற்கு முன் முடிக்க வேண்டும், மற்றும் அவற்றை synchronous ஆக்குவது எந்த async bypass சாத்தியத்தையும் நீக்குகிறது. ஒரு hook timeout ஆனால், செயல் நிராகரிக்கப்படுகிறது. :::

## Hook உத்தரவாதங்கள்

ஒவ்வொரு hook execution நான்கு invariants சுமக்கிறது:

| உத்தரவாதம்       | அர்த்தம்                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **நிர்ணயவாதம்**  | ஒரே input எப்போதும் ஒரே முடிவை உருவாக்கும். சீரற்றதன்மை இல்லை. Hooks க்குள் LLM அழைப்புகள் இல்லை. முடிவுகளை பாதிக்கும் வெளிப்புற API அழைப்புகள் இல்லை. |
| **Synchronous**   | Hooks செயல் தொடர்வதற்கு முன் முடிக்கும். Async bypass சாத்தியமில்லை. Timeout என்பது rejection.                               |
| **Logged**        | ஒவ்வொரு hook execution பதிவு செய்யப்படுகிறது: input parameters, எடுக்கப்பட்ட முடிவு, timestamp, மற்றும் மதிப்பீடு செய்யப்பட்ட policy விதிகள். |
| **Unforgeable**   | LLM output hook bypass வழிமுறைகளை கொண்டிருக்க முடியாது. hook அடுக்கு "LLM output ஐ கட்டளைகளுக்கு parse செய்" logic இல்லை.  |

## Policy விதிகள் Hierarchy

Policy விதிகள் மூன்று அடுக்குகளாக ஒழுங்கமைக்கப்பட்டுள்ளன. உயர் அடுக்குகள் குறைந்த அடுக்குகளை override செய்ய முடியாது.

### நிலையான விதிகள் (எப்போதும் அமலாக்கம், கட்டமைக்க முடியாது)

இந்த விதிகள் hardcoded மற்றும் எந்த admin, பயனர் அல்லது கட்டமைப்பாலும் முடக்க முடியாது:

- **No write-down**: வகைப்படுத்தல் ஓட்டம் ஒரு திசை. தரவு குறைந்த நிலைக்கு ஓட முடியாது.
- **UNTRUSTED channels**: தரவு உள்ளோ வெளியோ இல்லை. Period.
- **Session taint**: உயர்த்தியவுடன், session lifetime முழுவதும் உயர்த்தப்பட்டே இருக்கும்.
- **Audit logging**: அனைத்து செயல்களும் log ஆகும். விதிவிலக்கு இல்லை. முடக்க வழி இல்லை.

### கட்டமைக்கக்கூடிய விதிகள் (admin-tunable)

Administrators UI அல்லது கட்டமைப்பு கோப்புகள் மூலம் இவற்றை சரிசெய்யலாம்:

- Integration இயல்புநிலை வகைப்படுத்தல்கள் (உதா., Salesforce `CONFIDENTIAL` க்கு இயல்புநிலையாகும்)
- Channel வகைப்படுத்தல்கள்
- Integration க்கு per செயல் allow/deny lists
- வெளிப்புற communications க்கான domain allowlists
- Tool, user அல்லது session க்கு per rate limits

### Declarative Escape Hatch (enterprise)

Enterprise deployments மேம்பட்ட scenarios க்காக structured YAML இல் தனிப்பயன் policy விதிகளை வரையறுக்கலாம்:

```yaml
# SSN patterns கொண்ட எந்த Salesforce query வையும் block செய்யவும்
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
# அதிக மதிப்பு transactions க்கு approval தேவை
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
# நேரம் அடிப்படையிலான கட்டுப்பாடு: வேலை நேரத்திற்கு பிறகு வெளிப்புற sends இல்லை
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "External communications restricted outside business hours"
```

::: tip தனிப்பயன் YAML விதிகள் செயல்படுத்தப்படுவதற்கு முன் validation pass ஆக வேண்டும். தவறான விதிகள் runtime இல் அல்ல, கட்டமைப்பு நேரத்தில் நிராகரிக்கப்படுகின்றன. இது misconfiguration பாதுகாப்பு இடைவெளிகளை உருவாக்காமல் தடுக்கிறது. :::

## மறுப்பு பயனர் அனுபவம்

policy engine ஒரு செயலை block செய்யும்போது, பயனர் பொதுவான error க்கு பதிலாக தெளிவான விளக்கம் பார்க்கிறார்.

**இயல்புநிலை (குறிப்பிட்டது):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**Opt-in (கல்வி):**

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

கல்வி mode opt-in மற்றும் பயனர்களுக்கு ஒரு செயல் ஏன் block ஆனது என்பதை புரிய வைக்கிறது, தரவு மூலம் taint escalation ஏற்படுத்தியது மற்றும் வகைப்படுத்தல் mismatch என்ன என்பது உட்பட. இரண்டு modes உம் dead-end errors க்கு பதிலாக actionable அடுத்த படிகளை வழங்குகின்றன.

## Hooks எவ்வாறு சங்கிலியாக இணைகின்றன

பொதுவான request/response cycle இல், பல hooks வரிசையாக fire ஆகின்றன. ஒவ்வொரு hook சங்கிலியில் முந்தைய hooks செய்த முடிவுகளை முழுமையாக பார்க்கிறது.

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
