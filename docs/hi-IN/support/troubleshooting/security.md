# समस्या निवारण: Security और Classification

## Write-Down Blocks

### "Write-down blocked"

यह सबसे सामान्य security error है। इसका अर्थ है कि डेटा उच्च classification level से निम्न level तक प्रवाहित होने का प्रयास कर रहा है।

**उदाहरण:** आपके session ने CONFIDENTIAL डेटा access किया (classified फ़ाइल पढ़ी, classified database query किया)। Session taint अब CONFIDENTIAL है। फिर आपने response को PUBLIC WebChat channel पर भेजने का प्रयास किया। Policy engine इसे block करता है क्योंकि CONFIDENTIAL डेटा PUBLIC destinations तक प्रवाहित नहीं हो सकता।

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**समाधान कैसे करें:**
1. **नया session शुरू करें।** एक fresh session PUBLIC taint पर शुरू होता है। नई बातचीत शुरू करें।
2. **उच्च-classified channel का उपयोग करें।** CONFIDENTIAL या उससे ऊपर classified channel के माध्यम से response भेजें।
3. **समझें कि taint का कारण क्या था।** Logs में "Taint escalation" entries जाँचें कि किस tool call ने session की classification बढ़ाई।

### "Session taint cannot flow to channel"

Write-down के समान, लेकिन विशेष रूप से channel classification के बारे में:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Classified integrations के tool calls भी write-down enforce करते हैं:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

रुकिए, यह उल्टा लगता है। Session taint tool की classification से अधिक है। इसका अर्थ है कि session lower-classified tool उपयोग करने के लिए बहुत अधिक tainted है। चिंता यह है कि tool call करने से classified context एक कम-सुरक्षित system में leak हो सकता है।

### "Workspace write-down blocked"

Agent workspaces में प्रति-directory classification है। Higher-tainted session से lower-classified directory में लिखना blocked है:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

यह सूचनात्मक है, error नहीं। इसका अर्थ है कि session का classification level अभी बढ़ा है क्योंकि agent ने classified डेटा access किया।

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint केवल ऊपर जाता है, कभी नीचे नहीं। एक बार session CONFIDENTIAL तक tainted हो जाए, यह शेष session के लिए वहीं रहता है।

### "Resource-based taint escalation firing"

एक tool call ने session के वर्तमान taint से उच्च classification वाले resource को access किया। Session taint स्वचालित रूप से मिलान करने के लिए escalate होता है।

### "Non-owner taint applied"

गैर-owner users के sessions channel की classification या user की permissions के आधार पर tainted हो सकते हैं। यह resource-based taint से अलग है।

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

सभी outbound HTTP requests (web_fetch, browser navigation, MCP SSE connections) SSRF सुरक्षा से गुज़रते हैं। यदि target hostname private IP address पर resolve होता है, तो request blocked है।

**Blocked ranges:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (private)
- `172.16.0.0/12` (private)
- `192.168.0.0/16` (private)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (unspecified)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 link-local)

यह सुरक्षा hardcoded है और अक्षम या configure नहीं की जा सकती। यह AI agent को internal services तक पहुँचने के लिए trick होने से रोकती है।

**IPv4-mapped IPv6:** `::ffff:127.0.0.1` जैसे addresses detect और blocked हैं।

### "SSRF check blocked outbound request"

ऊपर के समान, लेकिन SSRF module के बजाय web_fetch tool से log होता है।

### DNS resolution विफलताएँ

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Hostname resolve नहीं हो सका। जाँचें:
- URL सही spell किया गया है
- आपका DNS server पहुँच योग्य है
- Domain वास्तव में मौजूद है

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

एक policy hook ने evaluation के दौरान exception throw किया। जब ऐसा होता है, तो default action BLOCK (deny) है। यह safe default है।

पूर्ण exception के लिए logs जाँचें। यह संभवतः custom policy rule में bug indicate करता है।

### "Policy rule blocked action"

एक policy rule ने स्पष्ट रूप से action deny किया। Log entry में शामिल है कि कौन सा rule fire हुआ और क्यों। यह देखने के लिए अपने config का `policy.rules` section जाँचें कि कौन से rules परिभाषित हैं।

### "Tool floor violation"

एक tool call हुई जिसके लिए minimum classification level आवश्यक है, लेकिन session उस level से नीचे है।

**उदाहरण:** Healthcheck tool को कम से कम INTERNAL classification चाहिए (क्योंकि यह system internals reveal करता है)। यदि PUBLIC session इसे उपयोग करने का प्रयास करता है, तो call blocked हो जाती है।

---

## Plugin और Skill Security

### "Plugin network access blocked"

Plugins प्रतिबंधित network access वाले sandbox में चलते हैं। वे केवल अपने declared endpoint domain पर URLs access कर सकते हैं।

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin ने अपने declared endpoints में नहीं होने वाले URL को access करने का प्रयास किया, या URL private IP पर resolve हुआ।

### "Skill activation blocked by classification ceiling"

Skills अपनी SKILL.md frontmatter में `classification_ceiling` declare करती हैं। यदि ceiling session के taint level से नीचे है, तो skill activate नहीं की जा सकती:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

यह lower-classified skill को higher-classified डेटा तक expose होने से रोकता है।

### "Skill content integrity check failed"

स्थापना के बाद, Triggerfish skill की content को hash करता है। यदि hash बदल जाता है (स्थापना के बाद skill modify की गई), तो integrity check विफल होता है:

```
Skill content hash mismatch detected
```

यह tampering indicate कर सकता है। Trusted source से skill पुनः स्थापित करें।

### "Skill install rejected by scanner"

Security scanner ने skill में संदिग्ध content पाया। Scanner ऐसे patterns की जाँच करता है जो malicious behavior indicate कर सकते हैं। विशिष्ट warnings error message में शामिल हैं।

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

अनुरोधित session session manager में मौजूद नहीं है। यह clean up हो चुका हो सकता है, या session ID अमान्य है।

### "Session status access denied: taint exceeds caller"

आपने किसी session का status देखने का प्रयास किया, लेकिन उस session का आपके वर्तमान session से उच्च taint level है। यह lower-classified sessions को higher-classified operations के बारे में जानने से रोकता है।

### "Session history access denied"

ऊपर के समान concept, लेकिन conversation history देखने के लिए।

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Team `running` status में नहीं है। ऐसा तब होता है जब:

- Team **disband** हो गई (manually या lifecycle monitor द्वारा)
- Lead session विफल होने के कारण team **pause** हो गई
- Team ने अपनी lifetime limit पार करने के बाद **time out** किया

`team_status` से team की वर्तमान स्थिति जाँचें। यदि lead विफलता के कारण team paused है, तो आप `team_disband` से disband कर सकते हैं और नई बना सकते हैं।

### "Team member not found" / "Team member ... is not active"

Target member या तो मौजूद नहीं है (गलत role name) या terminate हो चुका है। Members terminate होते हैं जब:

- वे idle timeout (2x `idle_timeout_seconds`) पार करते हैं
- Team disband होती है
- उनका session crash होता है और lifecycle monitor इसे detect करता है

सभी members और उनकी वर्तमान स्थिति देखने के लिए `team_status` उपयोग करें।

### "Team disband denied: only the lead or creating session can disband"

केवल दो sessions team disband कर सकते हैं:

1. वह session जिसने मूल रूप से `team_create` call किया
2. Lead member का session

यदि आपको team के भीतर से यह error मिल रहा है, तो calling member lead नहीं है। यदि आपको team के बाहर से मिल रहा है, तो आप वह session नहीं हैं जिसने इसे बनाया।

### Team creation के बाद lead तुरंत विफल

Lead का agent session अपना पहला turn पूरा नहीं कर सका। सामान्य कारण:

1. **LLM provider error:** Provider ने error लौटाया (rate limit, auth failure, model not found)। Provider errors के लिए `triggerfish logs` जाँचें।
2. **Classification ceiling बहुत कम:** यदि lead को अपनी ceiling से ऊपर classified tools चाहिए, तो session पहली tool call पर विफल हो सकता है।
3. **गायब tools:** Lead को कार्य decompose करने के लिए विशिष्ट tools चाहिए हो सकते हैं। सुनिश्चित करें कि tool profiles सही ढंग से कॉन्फ़िगर हैं।

### Team members idle रहते हैं और कोई output नहीं देते

Members lead द्वारा `sessions_send` के माध्यम से कार्य भेजने की प्रतीक्षा करते हैं। यदि lead task decompose नहीं करता:

- Lead का model team coordination नहीं समझ सकता। Lead role के लिए अधिक capable model आज़माएँ।
- `task` description lead के लिए sub-tasks में decompose करने के लिए बहुत अस्पष्ट हो सकता है।
- `team_status` जाँचें कि lead `active` है और हाल की activity है।

### Team members के बीच "Write-down blocked"

Team members सभी sessions के समान classification नियमों का पालन करते हैं। यदि एक member `CONFIDENTIAL` तक tainted हो गया है और `PUBLIC` पर member को data भेजने का प्रयास करता है, तो write-down check block करता है। यह अपेक्षित व्यवहार है - classified डेटा lower-classified sessions तक प्रवाहित नहीं हो सकता, team के भीतर भी नहीं।

---

## Delegation और Multi-Agent

### "Delegation certificate signature invalid"

Agent delegation cryptographic certificates उपयोग करता है। यदि signature check विफल होता है, तो delegation rejected हो जाता है। यह forged delegation chains रोकता है।

### "Delegation certificate expired"

Delegation certificate का time-to-live है। यदि यह expire हो गया है, तो delegated agent अब delegator की ओर से कार्य नहीं कर सकता।

### "Delegation chain linkage broken"

Multi-hop delegations (A B को delegate करता है, B C को delegate करता है) में, chain में प्रत्येक link वैध होनी चाहिए। यदि कोई link टूटी है, तो पूरी chain rejected हो जाती है।

---

## Webhooks

### "Webhook HMAC verification failed"

Incoming webhooks को authentication के लिए HMAC signatures चाहिए। यदि signature गायब, malformed, या मेल नहीं खाता:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

जाँचें कि:
- Webhook source सही HMAC signature header भेज रहा है
- आपके config में shared secret source के secret से मेल खाता है
- Signature format मेल खाता है (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Triggerfish में replay protection शामिल है। यदि webhook payload दूसरी बार प्राप्त होता है (समान signature), तो यह rejected हो जाता है।

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

कम समय में एक ही source से बहुत अधिक webhook requests। यह webhook floods से सुरक्षा करता है। प्रतीक्षा करें और पुनः प्रयास करें।

---

## Audit Integrity

### "previousHash mismatch"

Audit log hash chaining उपयोग करता है। प्रत्येक entry में पिछली entry का hash शामिल होता है। यदि chain टूटी है, तो इसका अर्थ है audit log को tamper या corrupt किया गया।

### "HMAC mismatch"

Audit entry का HMAC signature मेल नहीं खाता। Entry बनने के बाद modify की गई हो सकती है।
