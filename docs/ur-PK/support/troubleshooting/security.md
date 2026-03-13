# Troubleshooting: Security & Classification

## Write-Down Blocks

### "Write-down blocked"

یہ سب سے عام security error ہے۔ اس کا مطلب ہے data ایک higher classification level سے lower level کی طرف flow کرنے کی کوشش کر رہا ہے۔

**مثال:** آپ کے session نے CONFIDENTIAL data access کیا (classified file پڑھی، classified database query کی)۔ Session taint اب CONFIDENTIAL ہے۔ آپ نے پھر response PUBLIC WebChat channel کو بھیجنے کی کوشش کی۔ Policy engine یہ block کرتا ہے کیونکہ CONFIDENTIAL data PUBLIC destinations تک flow نہیں کر سکتا۔

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Resolve کرنے کا طریقہ:**
1. **نئی session شروع کریں۔** Fresh session PUBLIC taint سے شروع ہوتی ہے۔ نئی conversation استعمال کریں۔
2. **Higher-classified channel استعمال کریں۔** CONFIDENTIAL یا اس سے اوپر classified channel کے ذریعے response بھیجیں۔
3. **سمجھیں کیا taint کا باعث بنا۔** Session کی classification کس tool call نے بڑھائی یہ دیکھنے کے لیے logs میں "Taint escalation" entries check کریں۔

### "Session taint cannot flow to channel"

Write-down جیسا ہی، لیکن specifically channel classification کے بارے میں:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Classified integrations کو tool calls بھی write-down enforce کرتی ہیں:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

غور کریں، یہ الٹا لگتا ہے۔ Session taint tool کی classification سے زیادہ ہے۔ اس کا مطلب session tool استعمال کرنے کے لیے بہت زیادہ tainted ہے۔ تشویش یہ ہے کہ tool call کرنے سے classified context کم secure system میں leak ہو سکتا ہے۔

### "Workspace write-down blocked"

Agent workspaces کی per-directory classification ہے۔ Higher-tainted session سے lower-classified directory میں write کرنا block ہے:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

یہ informational ہے، error نہیں۔ اس کا مطلب ہے session کی classification level ابھی بڑھی کیونکہ agent نے classified data access کیا۔

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint صرف اوپر جاتا ہے، کبھی نیچے نہیں۔ ایک بار session CONFIDENTIAL تک tainted ہو جائے تو پوری session کے لیے وہیں رہتا ہے۔

### "Resource-based taint escalation firing"

کسی tool call نے session کی موجودہ taint سے higher classification والا resource access کیا۔ Session taint خود بخود match کرنے کے لیے escalate ہو جاتا ہے۔

### "Non-owner taint applied"

Non-owner users کے sessions channel کی classification یا user کی permissions کی بنیاد پر tainted ہو سکتے ہیں۔ یہ resource-based taint سے الگ ہے۔

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

تمام outbound HTTP requests (web_fetch، browser navigation، MCP SSE connections) SSRF protection سے گزرتے ہیں۔ اگر target hostname private IP address پر resolve ہو تو request block ہو جاتی ہے۔

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

یہ protection hardcoded ہے اور disable یا configure نہیں کی جا سکتی۔ یہ AI agent کو internal services تک access کرنے سے roکتا ہے۔

**IPv4-mapped IPv6:** `::ffff:127.0.0.1` جیسے addresses detect اور block ہوتے ہیں۔

### "SSRF check blocked outbound request"

اوپر جیسا ہی، لیکن SSRF module کی بجائے web_fetch tool سے log ہوتا ہے۔

### DNS resolution failures

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Hostname resolve نہیں ہو سکا۔ Check کریں:
- URL correctly spelled ہے
- آپ کا DNS server reachable ہے
- Domain actually موجود ہے

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

Evaluation کے دوران ایک policy hook نے exception throw کیا۔ جب یہ ہو تو ڈیفالٹ action BLOCK (deny) ہے۔ یہ safe default ہے۔

Full exception کے لیے logs check کریں۔ یہ likely کسی custom policy rule میں bug کی نشاندہی کرتا ہے۔

### "Policy rule blocked action"

ایک policy rule نے action explicitly deny کیا۔ Log entry میں شامل ہے کہ کون سا rule fire ہوا اور کیوں۔ کون سے rules defined ہیں یہ دیکھنے کے لیے config کا `policy.rules` section check کریں۔

### "Tool floor violation"

ایک tool call minimum classification level require کرتی ہے لیکن session اس سے کم ہے۔

**مثال:** Healthcheck tool کم از کم INTERNAL classification require کرتا ہے (کیونکہ یہ system internals reveal کرتا ہے)۔ اگر PUBLIC session اسے استعمال کرنے کی کوشش کرے تو call block ہو جاتی ہے۔

---

## Plugin & Skill Security

### "Plugin network access blocked"

Plugins ایک sandbox میں چلتے ہیں restricted network access کے ساتھ۔ وہ صرف اپنے declared endpoint domain پر URLs access کر سکتے ہیں۔

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin نے کوئی URL access کرنے کی کوشش کی جو اس کے declared endpoints میں نہیں، یا URL private IP پر resolve ہوا۔

### "Skill activation blocked by classification ceiling"

Skills اپنے SKILL.md frontmatter میں `classification_ceiling` declare کرتی ہیں۔ اگر ceiling session کے taint level سے کم ہو تو skill activate نہیں ہو سکتی:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

یہ lower-classified skill کو higher-classified data سے expose ہونے سے روکتا ہے۔

### "Skill content integrity check failed"

Installation کے بعد، Triggerfish skill کے content کا hash کرتا ہے۔ اگر hash بدل جائے (skill installation کے بعد modify ہوئی) تو integrity check fail ہو جاتی ہے:

```
Skill content hash mismatch detected
```

یہ tampering کی نشاندہی کر سکتا ہے۔ Skill کو trusted source سے دوبارہ install کریں۔

### "Skill install rejected by scanner"

Security scanner نے skill میں suspicious content پایا۔ Scanner ایسے patterns check کرتا ہے جو malicious behavior indicate کر سکتے ہیں۔ Specific warnings error message میں شامل ہیں۔

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

Requested session session manager میں موجود نہیں۔ یہ cleanup ہو چکی ہو، یا session ID invalid ہو۔

### "Session status access denied: taint exceeds caller"

آپ نے کسی session کا status دیکھنے کی کوشش کی، لیکن اس session کا taint level آپ کی موجودہ session سے زیادہ ہے۔ یہ lower-classified sessions کو higher-classified operations کے بارے میں جاننے سے روکتا ہے۔

### "Session history access denied"

اوپر جیسا concept، لیکن conversation history دیکھنے کے لیے۔

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Team `running` status میں نہیں۔ یہ تب ہوتا ہے جب:

- Team **disbanded** ہو گئی (manually یا lifecycle monitor کی طرف سے)
- Lead session fail ہونے کی وجہ سے team **paused** ہو
- Team نے اپنی lifetime limit exceed کر کے **timeout** کر لیا

`team_status` سے team کا موجودہ status check کریں۔ اگر team lead failure کی وجہ سے paused ہو تو `team_disband` سے disband کریں اور نئی بنائیں۔

### "Team member not found" / "Team member ... is not active"

Target member یا تو موجود نہیں (غلط role name) یا terminate ہو گیا۔ Members terminate ہوتے ہیں جب:

- Idle timeout exceed کریں (2x `idle_timeout_seconds`)
- Team disband ہو جائے
- ان کا session crash کرے اور lifecycle monitor detect کرے

تمام members اور ان کا موجودہ status دیکھنے کے لیے `team_status` استعمال کریں۔

### "Team disband denied: only the lead or creating session can disband"

صرف دو sessions team disband کر سکتی ہیں:

1. وہ session جس نے originally `team_create` call کیا
2. Lead member کی session

اگر team کے اندر سے یہ error آ رہی ہے تو calling member lead نہیں ہے۔ اگر team کے باہر سے آ رہی ہے تو آپ وہ session نہیں جس نے اسے بنایا۔

### Team lead creation کے فوری بعد fail ہو جاتا ہے

Lead کی agent session اپنی پہلی turn complete نہیں کر سکی۔ عام وجوہات:

1. **LLM provider error:** Provider نے error return کیا (rate limit، auth failure، model not found)۔ Provider errors کے لیے `triggerfish logs` check کریں۔
2. **Classification ceiling بہت کم:** اگر lead کو اپنی ceiling سے اوپر classified tools چاہئیں تو session پہلی tool call پر fail ہو سکتی ہے۔
3. **Missing tools:** Lead کو کام decompose کرنے کے لیے specific tools کی ضرورت ہو۔ یقینی بنائیں کہ tool profiles correctly configure ہیں۔

### Team members idle ہیں اور کبھی output نہیں دیتے

Members lead کا `sessions_send` کے ذریعے کام بھیجنے کا انتظار کرتے ہیں۔ اگر lead task decompose نہ کرے:

- Lead کا model team coordination نہ سمجھتا ہو۔ Lead role کے لیے زیادہ capable model try کریں۔
- `task` description lead کے لیے sub-tasks میں decompose کرنے کے لیے بہت vague ہو۔
- `team_status` check کریں کہ آیا lead `active` ہے اور recent activity ہے۔

### Team members کے درمیان "Write-down blocked"

Team members تمام sessions کی طرح classification rules follow کرتے ہیں۔ اگر کوئی member `CONFIDENTIAL` تک tainted ہو اور `PUBLIC` member کو data بھیجنے کی کوشش کرے تو write-down check block کر دیتا ہے۔ یہ expected behavior ہے — classified data lower-classified sessions کو flow نہیں کر سکتا، چاہے team کے اندر ہو۔

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Agent delegation cryptographic certificates استعمال کرتا ہے۔ اگر signature check fail ہو تو delegation reject ہو جاتی ہے۔ یہ forged delegation chains روکتا ہے۔

### "Delegation certificate expired"

Delegation certificate کی time-to-live ہے۔ Expire ہونے کے بعد، delegated agent مزید delegator کی طرف سے act نہیں کر سکتا۔

### "Delegation chain linkage broken"

Multi-hop delegations میں (A سے B کو delegate، B سے C کو)، chain کا ہر link valid ہونا ضروری ہے۔ اگر کوئی link broken ہو تو پوری chain reject ہو جاتی ہے۔

---

## Webhooks

### "Webhook HMAC verification failed"

Incoming webhooks کو authentication کے لیے HMAC signatures چاہئیں۔ اگر signature missing، malformed، یا match نہ ہو:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Check کریں کہ:
- Webhook source correct HMAC signature header بھیج رہا ہے
- آپ کے config میں shared secret source کے secret سے match کرتا ہے
- Signature format match کرتا ہے (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Triggerfish replay protection شامل کرتا ہے۔ اگر webhook payload دوسری بار receive ہو (ایک ہی signature) تو reject ہو جاتا ہے۔

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

کم وقت میں ایک ہی source سے بہت زیادہ webhook requests۔ یہ webhook floods سے بچاتا ہے۔ انتظار کریں اور دوبارہ کوشش کریں۔

---

## Audit Integrity

### "previousHash mismatch"

Audit log hash chaining استعمال کرتا ہے۔ ہر entry میں پچھلی entry کا hash شامل ہے۔ اگر chain ٹوٹ جائے تو اس کا مطلب audit log tamper یا corrupt ہوا ہے۔

### "HMAC mismatch"

Audit entry کا HMAC signature match نہیں کرتا۔ Entry creation کے بعد modify ہوئی ہو سکتی ہے۔
