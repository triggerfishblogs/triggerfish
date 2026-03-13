# धोरण Engine आणि Hooks

धोरण engine हे enforcement layer आहे जे LLM आणि बाहेरील जग यांच्यामध्ये बसते.
हे डेटा flow मधील critical points वर प्रत्येक action intercept करते आणि निश्चायक
ALLOW, BLOCK किंवा REDACT निर्णय घेते. LLM हे निर्णय bypass, modify किंवा
प्रभावित करू शकत नाही.

## मुख्य तत्त्व: LLM च्या खाली Enforcement

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy enforcement layers: LLM sits above the policy layer, which sits above the execution layer" style="max-width: 100%;" />

::: warning SECURITY LLM धोरण स्तरावर बसते. ते prompt-injected, jailbroken किंवा
manipulated होऊ शकते -- आणि ते महत्त्वाचे नाही. धोरण स्तर शुद्ध कोड आहे जो
LLM च्या खाली चालतो, structured action requests तपासतो आणि वर्गीकरण नियमांवर
आधारित binary निर्णय घेतो. LLM output पासून hook bypass पर्यंत कोणताही pathway
नाही. :::

## Hook Types

आठ enforcement hooks डेटा flow मधील प्रत्येक critical point वर actions intercept
करतात.

### सर्व Hook Types

| Hook                    | Trigger                       | मुख्य क्रिया                                                       | Failure Mode          |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------ | --------------------- |
| `PRE_CONTEXT_INJECTION` | बाह्य input context मध्ये प्रवेश करतो | Input classify करा, taint assign करा, lineage तयार करा, injection scan करा | Input नाकारा |
| `PRE_TOOL_CALL`         | LLM tool execution request करतो | Permission check, rate limit, parameter validation                 | Tool call block करा   |
| `POST_TOOL_RESPONSE`    | Tool data return करतो         | Response classify करा, session taint update करा, lineage तयार/update करा | Redact किंवा block    |
| `PRE_OUTPUT`            | Response system सोडण्याच्या आधी | Target विरुद्ध final classification check, PII scan                | Output block करा      |
| `SECRET_ACCESS`         | Plugin credential request करतो | Access log करा, declared scope विरुद्ध permission verify करा       | Credential नाकारा     |
| `SESSION_RESET`         | User taint reset request करतो | Lineage archive करा, context साफ करा, confirmation verify करा      | Confirmation आवश्यक   |
| `AGENT_INVOCATION`      | Agent दुसऱ्या agent ला call करतो | Delegation chain verify करा, taint ceiling enforce करा             | Invocation block करा  |
| `MCP_TOOL_CALL`         | MCP server tool invoke केला   | Gateway policy check (server status, tool permissions, schema)     | MCP call block करा    |

## Hook Guarantees

प्रत्येक hook execution चार invariants वाहते:

| Guarantee       | याचा अर्थ                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **Deterministic** | समान input नेहमी समान निर्णय देतो. कोणती यादृच्छिकता नाही. Hooks मध्ये कोणत्याही LLM calls नाहीत. |
| **Synchronous**   | Hooks क्रिया proceed होण्यापूर्वी पूर्ण होतात. कोणताही async bypass शक्य नाही.                  |
| **Logged**        | प्रत्येक hook execution recorded आहे: input parameters, निर्णय, timestamp आणि policy rules.      |
| **Unforgeable**   | LLM output मध्ये hook bypass instructions असू शकत नाहीत.                                        |

## धोरण नियम Hierarchy

धोरण नियम तीन tiers मध्ये organized आहेत. उच्च tiers lower tiers override करू शकत नाहीत.

### निश्चित नियम (नेहमी enforce केलेले, configurable नाहीत)

हे नियम hardcoded आहेत आणि कोणत्याही admin, user किंवा configuration द्वारे
अक्षम केले जाऊ शकत नाहीत:

- **No write-down**: वर्गीकरण flow एकदिशात्मक आहे. डेटा कमी स्तरावर वाहू शकत नाही.
- **UNTRUSTED channels**: डेटा in किंवा out नाही. पूर्णविराम.
- **Session taint**: एकदा elevated झाल्यावर, session lifetime साठी elevated राहते.
- **Audit logging**: सर्व क्रिया logged. कोणते अपवाद नाहीत. अक्षम करण्याचा मार्ग नाही.

### Configurable नियम (admin-tunable)

Administrators UI किंवा configuration files द्वारे हे adjust करू शकतात:

- Integration default classifications
- Channel classifications
- प्रति integration action allow/deny lists
- बाह्य communications साठी Domain allowlists
- प्रति tool, user किंवा session rate limits

### Declarative Escape Hatch (enterprise)

Enterprise deployments advanced scenarios साठी structured YAML मध्ये custom
policy rules define करू शकतात:

```yaml
# SSN patterns असलेला कोणताही Salesforce query block करा
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
# High-value transactions साठी approval आवश्यक करा
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

::: tip Custom YAML rules activation पूर्वी validation मधून जाणे आवश्यक आहे.
Invalid rules runtime वर नाही, configuration वेळी rejected आहेत. :::

## Denial User Experience

जेव्हा धोरण engine एखाद्या क्रियेला block करते, तेव्हा वापरकर्त्याला एक स्पष्ट
explanation दिसते -- generic error नाही.

**Default (specific):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**Opt-in (educational):**

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

## Hooks एकत्र कसे Chain होतात

एका सामान्य request/response cycle मध्ये, अनेक hooks क्रमाने fire होतात:

```
User sends: "Check my Salesforce pipeline and message my wife"

1. PRE_CONTEXT_INJECTION
   - Owner कडून Input, PUBLIC म्हणून classified
   - Session taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Tool permitted? YES
   - Decision: ALLOW

3. POST_TOOL_RESPONSE (salesforce results)
   - Data classified: CONFIDENTIAL
   - Session taint escalates: PUBLIC -> CONFIDENTIAL

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Tool permitted? YES
   - Decision: ALLOW (tool-level check passes)

5. PRE_OUTPUT (message to wife via WhatsApp)
   - Session taint: CONFIDENTIAL
   - Target effective classification: PUBLIC (external recipient)
   - CONFIDENTIAL -> PUBLIC: BLOCKED
   - Decision: BLOCK

6. Agent presents reset option to user
```
