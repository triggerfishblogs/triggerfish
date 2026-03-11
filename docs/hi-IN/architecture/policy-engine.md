# Policy Engine और Hooks

Policy engine वह प्रवर्तन परत है जो LLM और बाहरी दुनिया के बीच बैठती है। यह
डेटा प्रवाह में प्रत्येक महत्वपूर्ण बिंदु पर हर कार्य को इंटरसेप्ट करती है और
निश्चयात्मक ALLOW, BLOCK, या REDACT निर्णय लेती है। LLM इन निर्णयों को बायपास,
संशोधित, या प्रभावित नहीं कर सकता।

## मूल सिद्धांत: LLM के नीचे प्रवर्तन

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy प्रवर्तन परतें: LLM policy परत के ऊपर बैठता है, जो निष्पादन परत के ऊपर बैठती है" style="max-width: 100%;" />

::: warning सुरक्षा LLM policy परत के ऊपर बैठता है। इसे prompt-inject, jailbreak,
या manipulate किया जा सकता है -- और इससे कोई फर्क नहीं पड़ता। Policy परत शुद्ध
कोड है जो LLM के नीचे चलती है, संरचित कार्य अनुरोधों की जाँच करती है और
वर्गीकरण नियमों के आधार पर बाइनरी निर्णय लेती है। LLM आउटपुट से hook बायपास
तक कोई मार्ग नहीं है। :::

## Hook प्रकार

आठ प्रवर्तन hook डेटा प्रवाह में प्रत्येक महत्वपूर्ण बिंदु पर कार्यों को
इंटरसेप्ट करते हैं।

### Hook आर्किटेक्चर

<img src="/diagrams/hook-chain-flow.svg" alt="Hook chain प्रवाह: PRE_CONTEXT_INJECTION → LLM Context → PRE_TOOL_CALL → Tool Execution → POST_TOOL_RESPONSE → LLM Response → PRE_OUTPUT → Output Channel" style="max-width: 100%;" />

### सभी Hook प्रकार

| Hook                    | ट्रिगर                          | प्रमुख कार्य                                                          | विफलता मोड          |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | बाहरी इनपुट संदर्भ में प्रवेश  | इनपुट वर्गीकृत करें, taint दें, lineage बनाएँ, injection स्कैन करें    | इनपुट अस्वीकार करें |
| `PRE_TOOL_CALL`         | LLM tool निष्पादन अनुरोध करता है | अनुमति जाँच, rate limit, पैरामीटर मान्यकरण                            | Tool call अवरुद्ध    |
| `POST_TOOL_RESPONSE`    | Tool डेटा लौटाता है             | उत्तर वर्गीकृत करें, session taint अपडेट करें, lineage बनाएँ/अपडेट करें | Redact या अवरुद्ध   |
| `PRE_OUTPUT`            | उत्तर सिस्टम से बाहर जाने वाला | लक्ष्य के विरुद्ध अंतिम वर्गीकरण जाँच, PII स्कैन                     | आउटपुट अवरुद्ध      |
| `SECRET_ACCESS`         | Plugin credential अनुरोध करता है | एक्सेस लॉग, घोषित स्कोप के विरुद्ध अनुमति सत्यापन                    | Credential अस्वीकार  |
| `SESSION_RESET`         | उपयोगकर्ता taint रीसेट अनुरोध  | Lineage संग्रहीत, संदर्भ साफ़, पुष्टि सत्यापन                         | पुष्टि आवश्यक       |
| `AGENT_INVOCATION`      | Agent दूसरे agent को कॉल करता है | Delegation chain सत्यापन, taint ceiling लागू                           | आह्वान अवरुद्ध       |
| `MCP_TOOL_CALL`         | MCP server tool आह्वान          | Gateway policy जाँच (server स्थिति, tool अनुमतियाँ, स्कीमा)           | MCP call अवरुद्ध     |

## Hook Interface

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-विशिष्ट payload प्रकार के अनुसार भिन्न होता है
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` सिंक्रोनस है और सीधे `HookResult` लौटाता है -- Promise
नहीं। यह जानबूझकर है। Hooks को कार्य आगे बढ़ने से पहले पूरा होना चाहिए, और
उन्हें सिंक्रोनस बनाना async बायपास की किसी भी संभावना को समाप्त करता है। :::

## Hook गारंटी

| गारंटी            | इसका अर्थ                                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| **निश्चयात्मक**   | समान इनपुट हमेशा समान निर्णय उत्पन्न करता है। कोई यादृच्छिकता नहीं।             |
| **सिंक्रोनस**     | Hook कार्य आगे बढ़ने से पहले पूरा होता है। कोई async बायपास संभव नहीं।            |
| **लॉग किया गया**   | प्रत्येक hook निष्पादन रिकॉर्ड किया जाता है: इनपुट पैरामीटर, निर्णय, टाइमस्टैम्प। |
| **जाली नहीं बनाया जा सकता** | LLM आउटपुट में hook बायपास निर्देश नहीं हो सकते।                        |

## Policy नियम पदानुक्रम

### निश्चित नियम (हमेशा लागू, कॉन्फ़िगर करने योग्य नहीं)

- **No write-down**: वर्गीकरण प्रवाह एक-दिशात्मक है
- **UNTRUSTED चैनल**: कोई डेटा अंदर या बाहर नहीं
- **Session taint**: एक बार बढ़ने पर, session जीवनकाल तक बढ़ी रहती है
- **ऑडिट लॉगिंग**: सभी कार्य लॉग किए गए। कोई अपवाद नहीं

### कॉन्फ़िगर करने योग्य नियम (admin-ट्यूनेबल)

Administrators इन्हें UI या कॉन्फ़िगरेशन फ़ाइलों के माध्यम से समायोजित कर सकते हैं:

- एकीकरण डिफ़ॉल्ट वर्गीकरण
- चैनल वर्गीकरण
- प्रति-एकीकरण कार्य allow/deny सूचियाँ
- दर सीमाएँ

### घोषणात्मक Escape Hatch (एंटरप्राइज़)

```yaml
# SSN पैटर्न वाली किसी भी Salesforce क्वेरी को अवरुद्ध करें
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

## अस्वीकृति उपयोगकर्ता अनुभव

जब policy engine कोई कार्य अवरुद्ध करता है, तो उपयोगकर्ता को स्पष्ट स्पष्टीकरण
दिखाई देता है -- सामान्य त्रुटि नहीं।

**डिफ़ॉल्ट (विशिष्ट):**

```
मैं गोपनीय डेटा सार्वजनिक चैनल पर नहीं भेज सकता।

  -> Session रीसेट करें और संदेश भेजें
  -> रद्द करें
```

**शैक्षिक (ऑप्ट-इन):**

```
मैं गोपनीय डेटा सार्वजनिक चैनल पर नहीं भेज सकता।

क्यों: इस session ने Salesforce (CONFIDENTIAL) तक पहुँचा।
WhatsApp व्यक्तिगत PUBLIC के रूप में वर्गीकृत है।
डेटा केवल समान या उच्चतर वर्गीकरण तक प्रवाहित हो सकता है।

विकल्प:
  -> Session रीसेट करें और संदेश भेजें
  -> अपने admin से WhatsApp चैनल को पुनर्वर्गीकृत करने के लिए कहें
  -> और जानें: [docs लिंक]
```
