# ஆழமான பாதுகாப்பு

Triggerfish 13 சுயாதீன, ஒன்றோடொன்று ஒட்டும் அடுக்குகளாக பாதுகாப்பை செயல்படுத்துகிறது. எந்த ஒரு அடுக்கும் தனியாக போதுமானதல்ல. ஒன்றாக, அவை gracefully குறையும் பாதுகாப்பை உருவாக்குகின்றன -- ஒரு அடுக்கு சமரசம் ஆனாலும், மீதமுள்ள அடுக்குகள் கணினியை பாதுகாக்கத் தொடர்கின்றன.

::: warning SECURITY ஆழமான பாதுகாப்பு என்பது எந்த ஒரு அடுக்கிலும் உள்ள vulnerability கணினியை சமரசம் செய்யாது என்று அர்த்தம். Channel authentication ஐ bypass செய்யும் attacker இன்னும் session taint கண்காணிப்பு, policy hooks மற்றும் audit logging எதிர்கொள்கிறார். Prompt-injected LLM அதன் கீழ் உள்ள நிர்ணயவாத policy அடுக்கை இன்னும் தாக்க முடியாது. :::

## 13 அடுக்குகள்

### அடுக்கு 1: Channel Authentication

**இதிலிருந்து பாதுகாக்கிறது:** Impersonation, அங்கீகரிக்கப்படாத அணுகல், அடையாள குழப்பம்.

LLM செய்தி உள்ளடக்கத்தை interpret செய்வதிலிருந்தல்ல, **session establishment போது கோட்டால்** அடையாளம் தீர்மானிக்கப்படுகிறது. LLM எந்த செய்தியும் பார்ப்பதற்கு முன், channel adapter அதை மாற்ற முடியாத label உடன் tag செய்கிறது:

```
{ source: "owner" }    -- verified channel identity registered owner உடன் பொருந்துகிறது
{ source: "external" } -- வேறு யாரும்; input மட்டும், கட்டளையாக கருதப்படவில்லை
```

Authentication முறைகள் சேனல் மூலம் மாறுகின்றன:

| Channel                 | முறை           | சரிபார்ப்பு                                                     |
| ----------------------- | --------------- | ----------------------------------------------------------------- |
| Telegram / WhatsApp     | Pairing code    | ஒரு முறை code, 5 நிமிட expiry, பயனரின் account இலிருந்து அனுப்பப்படுகிறது |
| Slack / Discord / Teams | OAuth           | Platform OAuth consent flow, verified user ID திரும்ப அனுப்பும் |
| CLI                     | Local process   | பயனரின் கணினியில் இயங்குகிறது, OS மூலம் authenticated            |
| WebChat                 | இல்லை (public)  | அனைத்து visitors `EXTERNAL`, ஒருபோதும் `owner` அல்ல            |
| Email                   | Domain matching | Sender domain கட்டமைக்கப்பட்ட உள் domains க்கு எதிராக ஒப்பிடப்படுகிறது |

::: info LLM ஒருபோதும் owner யார் என்று முடிவு செய்வதில்லை. "நான் owner" என்று கூறும் unverified sender இலிருந்த செய்தி `{ source: "external" }` tag ஆகும் மற்றும் owner-level கட்டளைகளை trigger செய்ய முடியாது. இந்த முடிவு கோட்டில் எடுக்கப்படுகிறது, LLM செய்தியை செயலாக்குவதற்கு முன். :::

### அடுக்கு 2: Permission-Aware Data Access

**இதிலிருந்து பாதுகாக்கிறது:** Over-permissioned data access, கணினி credentials மூலம் privilege escalation.

Triggerfish system service accounts அல்ல, பயனரின் delegated OAuth tokens பயன்படுத்தி வெளிப்புற கணினிகளை query செய்கிறது. source கணினி அதன் சொந்த permission மாதிரியை அமல்படுத்துகிறது:

Plugin SDK API நிலையில் இதை அமல்படுத்துகிறது:

| SDK Method                              | நடத்தை                                      |
| --------------------------------------- | -------------------------------------------- |
| `sdk.get_user_credential(integration)`  | பயனரின் delegated OAuth token திரும்ப அனுப்பும் |
| `sdk.query_as_user(integration, query)` | பயனரின் permissions உடன் செயல்படுத்துகிறது   |
| `sdk.get_system_credential(name)`       | **BLOCKED** -- `PermissionError` எறிகிறது   |

### அடுக்கு 3: Session Taint கண்காணிப்பு

**இதிலிருந்து பாதுகாக்கிறது:** Context contamination மூலம் தரவு கசிவு, வகைப்படுத்தப்பட்ட தரவு குறைந்த-வகைப்படுத்தல் சேனல்களை எட்டுவது.

ஒவ்வொரு session சுயாதீனமாக session போது அணுகப்பட்ட தரவின் அதிக வகைப்படுத்தலை பிரதிபலிக்கும் taint நிலையை கண்காணிக்கிறது. Taint மூன்று invariants பின்பற்றுகிறது:

1. **Per-conversation** -- ஒவ்வொரு session க்கும் சொந்த taint உள்ளது
2. **Escalation மட்டும்** -- taint அதிகரிக்கும், குறையாது
3. **முழு reset எல்லாவற்றையும் அழிக்கும்** -- taint மற்றும் வரலாறு ஒன்றாக துடைக்கப்படும்

### அடுக்கு 4: Data Lineage

**இதிலிருந்து பாதுகாக்கிறது:** Traceable அல்லாத தரவு ஓட்டங்கள், தரவு எங்கே சென்றது என்று audit செய்ய இயலாமை, compliance gaps.

ஒவ்வொரு தரவு உறுப்பும் origin இலிருந்து destination வரை provenance metadata சுமக்கிறது.

### அடுக்கு 5: Policy Enforcement Hooks

**இதிலிருந்து பாதுகாக்கிறது:** Prompt injection attacks, LLM-driven பாதுகாப்பு bypasses, கட்டுப்பாடற்ற tool execution.

எட்டு நிர்ணயவாத hooks தரவு ஓட்டத்தில் முக்கியமான புள்ளிகளில் ஒவ்வொரு செயலையும் இடைமறிக்கின்றன. Hooks தூய கோடு: நிர்ணயவாதம், synchronous, logged மற்றும் unforgeable.

### அடுக்கு 6: MCP Gateway

**இதிலிருந்து பாதுகாக்கிறது:** கட்டுப்பாடற்ற வெளிப்புற tool அணுகல், MCP servers மூலம் வகைப்படுத்தப்படாத தரவு நுழைவு.

அனைத்து MCP servers இயல்பாக `UNTRUSTED` மற்றும் admin அல்லது பயனர் அவற்றை வகைப்படுத்தும் வரை invoke செய்ய முடியாது.

### அடுக்கு 7: Plugin Sandbox

**இதிலிருந்து பாதுகாக்கிறது:** தீங்கான அல்லது bugs நிறைந்த plugin கோடு, தரவு exfiltration, அங்கீகரிக்கப்படாத கணினி அணுகல்.

Plugins இரட்டை sandbox க்கு உள்ளே இயங்குகின்றன. Plugins செய்ய முடியாதவை:

- அறிவிக்கப்படாத network endpoints அணுக
- வகைப்படுத்தல் labels இல்லாமல் தரவை emit செய்ய
- Taint propagation ஐ trigger செய்யாமல் தரவை படிக்க
- Triggerfish க்கு வெளியே தரவை நிலைத்திருக்க வைக்க
- கணினி credentials பயன்படுத்த

### அடுக்கு 8: Secrets தனிமைப்படுத்தல்

**இதிலிருந்து பாதுகாக்கிறது:** Credential திருட்டு, config கோப்புகளில் secrets, plaintext credential storage.

Credentials OS keychain (personal tier) அல்லது vault integration (enterprise tier) இல் சேமிக்கப்படுகின்றன. அவை ஒருபோதும் தோன்றுவதில்லை:

- Configuration கோப்புகளில்
- `StorageProvider` மதிப்புகளில்
- Log entries இல்
- LLM சூழலில்

### அடுக்கு 9: Filesystem Tool Sandbox

**இதிலிருந்து பாதுகாக்கிறது:** Path traversal attacks, அங்கீகரிக்கப்படாத கோப்பு அணுகல்.

அனைத்து filesystem tool operations ம் session இன் taint-பொருத்தமான workspace subdirectory க்கு scoped OS-level permissions உடன் sandboxed Deno Worker க்கு உள்ளே இயங்குகின்றன.

### அடுக்கு 10: Agent அடையாளம்

**இதிலிருந்து பாதுகாக்கிறது:** Agent chains மூலம் privilege escalation, delegation மூலம் தரவு laundering.

Agents மற்ற agents ஐ invoke செய்யும்போது, cryptographic delegation chains privilege escalation ஐ தடுக்கின்றன.

### அடுக்கு 11: Audit Logging

**இதிலிருந்து பாதுகாக்கிறது:** கண்டுபிடிக்க முடியாத breaches, compliance failures, incidents investigate செய்ய இயலாமை.

ஒவ்வொரு பாதுகாப்பு-சம்பந்தமான முடிவும் முழு சூழலுடன் log ஆகும்:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "user_id": "user_123",
  "session_id": "sess_456",
  "action": "slack.postMessage",
  "target_channel": "external_webhook",
  "session_taint": "CONFIDENTIAL",
  "target_classification": "PUBLIC",
  "decision": "DENIED",
  "reason": "classification_violation",
  "hook": "PRE_OUTPUT",
  "policy_rules_evaluated": ["rule_001", "rule_002"],
  "lineage_ids": ["lin_789", "lin_790"]
}
```

::: info Audit logging முடக்க முடியாது. இது policy hierarchy இல் நிலையான விதி. ஒரு org admin கூட தங்கள் சொந்த செயல்களுக்கான logging ஐ முடக்க முடியாது. :::

### அடுக்கு 12: SSRF தடுப்பு

**இதிலிருந்து பாதுகாக்கிறது:** Server-side request forgery, உள் நெட்வொர்க் reconnaissance, cloud metadata exfiltration.

அனைத்து outbound HTTP requests ம் (`web_fetch`, `browser.navigate` மற்றும் plugin network access இலிருந்து) முதலில் DNS resolve செய்கின்றன மற்றும் resolved IP ஐ private மற்றும் reserved ranges இன் hardcoded denylist க்கு எதிராக சரிபார்க்கின்றன.

- Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) எப்போதும் blocked
- Link-local (`169.254.0.0/16`) மற்றும் cloud metadata endpoints blocked
- Loopback (`127.0.0.0/8`) blocked
- Denylist hardcoded மற்றும் கட்டமைக்கக்கூடியதல்ல -- admin override இல்லை

### அடுக்கு 13: Memory வகைப்படுத்தல் Gating

**இதிலிருந்து பாதுகாக்கிறது:** Memory மூலம் cross-session தரவு கசிவு, memory writes மூலம் வகைப்படுத்தல் குறைக்குவது.

Cross-session memory கணினி write மற்றும் read நேரம் இரண்டிலும் வகைப்படுத்தலை அமல்படுத்துகிறது:

- **Writes**: Memory entries தற்போதைய session இன் taint நிலைக்கு கட்டாயப்படுத்தப்படுகின்றன. LLM stored memories க்கு குறைந்த வகைப்படுத்தலை தேர்வு செய்ய முடியாது.
- **Reads**: Memory queries `canFlowTo` மூலம் filter ஆகின்றன -- ஒரு session அதன் தற்போதைய taint நிலையில் அல்லது கீழே உள்ள memories மட்டுமே படிக்க முடியும்.

## நம்பிக்கை Hierarchy

::: tip **Personal tier:** பயனர் org admin ஆவார். முழு sovereignty. Triggerfish visibility இல்லை. Vendor பயனர் தரவுக்கு இயல்பாக zero அணுகல் வைத்திருக்கிறது மற்றும் பயனரிடமிருந்து வெளிப்படையான, நேர-bound, logged grant மூலம் மட்டுமே அணுகலை பெற முடியும். :::

## அடுக்குகள் எவ்வாறு ஒன்றாக செயல்படுகின்றன

தீங்கான செய்தி தரவை exfiltrate செய்ய முயற்சிக்கும் ஒரு prompt injection attack ஐ கவனியுங்கள்:

| படி | அடுக்கு                | செயல்                                                                 |
| ---- | ---------------------- | ----------------------------------------------------------------------- |
| 1    | Channel authentication | செய்தி `{ source: "external" }` tag ஆகும் -- owner அல்ல               |
| 2    | PRE_CONTEXT_INJECTION  | Input injection patterns க்காக scan ஆகும், வகைப்படுத்தப்படும்         |
| 3    | Session taint          | Session taint மாறாது (வகைப்படுத்தப்பட்ட தரவு அணுகப்படவில்லை)         |
| 4    | LLM செய்தியை செயலாக்குகிறது | LLM tool அழைப்பை கோர manipulate ஆகலாம்                         |
| 5    | PRE_TOOL_CALL          | External-source விதிகளுக்கு எதிராக tool permission சரிபார்ப்பு         |
| 6    | POST_TOOL_RESPONSE     | திரும்பிய தரவு வகைப்படுத்தப்படும், taint புதுப்பிக்கப்படும்           |
| 7    | PRE_OUTPUT             | Output வகைப்படுத்தல் vs இலக்கு சரிபார்க்கப்படும்                      |
| 8    | Audit logging          | முழு வரிசையும் மதிப்பாய்வுக்காக பதிவு செய்யப்படும்                   |

படி 4 இல் LLM முழுமையாக சமரசம் ஆகி data exfiltration tool அழைப்பை கோரினாலும், மீதமுள்ள அடுக்குகள் (permission சரிபார்ப்புகள், taint கண்காணிப்பு, output வகைப்படுத்தல், audit logging) கொள்கையை அமல்படுத்தத் தொடர்கின்றன. எந்த ஒரு failure புள்ளியும் கணினியை சமரசம் செய்யாது.
