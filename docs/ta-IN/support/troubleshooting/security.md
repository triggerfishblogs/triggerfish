# Troubleshooting: Security & Classification

## Write-Down Blocks

### "Write-down blocked"

இது மிகவும் பொதுவான security error. Data higher classification level இலிருந்து lower ஒன்றுக்கு flow செய்ய try செய்கிறது என்று அர்த்தம்.

**Example:** உங்கள் session CONFIDENTIAL data access செய்தது (classified file படித்தது, classified database query செய்தது). Session taint இப்போது CONFIDENTIAL. பின்னர் PUBLIC WebChat channel க்கு response அனுப்ப try செய்தீர்கள். CONFIDENTIAL data PUBLIC destinations க்கு flow செய்ய முடியாது என்பதால் policy engine இதை block செய்கிறது.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**எவ்வாறு resolve செய்வது:**
1. **புதிய session தொடங்கவும்.** Fresh session PUBLIC taint இல் தொடங்குகிறது. புதிய conversation பயன்படுத்தவும்.
2. **Higher-classified channel பயன்படுத்தவும்.** CONFIDENTIAL அல்லது அதற்கு மேல் classified channel மூலம் response அனுப்பவும்.
3. **Taint ஏற்படுத்தியதை புரிந்துகொள்ளவும்.** Session classification raise செய்த tool call பார்க்க logs இல் "Taint escalation" entries சரிபார்க்கவும்.

### "Session taint cannot flow to channel"

Write-down போல், ஆனால் specifically channel classification பற்றி:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Classified integrations க்கு tool calls உம் write-down enforce செய்கின்றன:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

இது backwards ஆகத் தெரிகிறது. Session taint tool இன் classification விட higher. Session too tainted ஆனதால் lower-classified tool பயன்படுத்த முடியவில்லை. Concern என்னவென்றால் tool call session context இலிருந்து classified information leak செய்யலாம்.

### "Workspace write-down blocked"

Agent workspaces per-directory classification வைத்திருக்கின்றன. Higher-tainted session இலிருந்து lower-classified directory க்கு writing blocked:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

இது informational, error இல்லை. Session classification level agent classified data access செய்ததால் just increased என்று அர்த்தம்.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint only goes up, never down. Session ஒரு முறை CONFIDENTIAL க்கு tainted ஆனால், session முழுவதும் அப்படியே இருக்கும்.

### "Resource-based taint escalation firing"

Tool call session இன் current taint விட higher classification உள்ள resource access செய்தது. Session taint automatically match ஆக escalate செய்யப்படுகிறது.

### "Non-owner taint applied"

Non-owner users session channel இன் classification அல்லது user இன் permissions அடிப்படையில் tainted ஆகலாம். இது resource-based taint இலிருந்து separate.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

அனைத்து outbound HTTP requests உம் (web_fetch, browser navigation, MCP SSE connections) SSRF protection மூலம் செல்கின்றன. Target hostname private IP address க்கு resolve ஆனால், request blocked.

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

இந்த protection hardcoded மற்றும் disable அல்லது configure செய்ய முடியாது. AI agent internal services access செய்வதை தடுக்கிறது.

**IPv4-mapped IPv6:** `::ffff:127.0.0.1` போன்ற addresses detected மற்றும் blocked.

### "SSRF check blocked outbound request"

மேலே போல், ஆனால் SSRF module க்கு பதிலாக web_fetch tool இலிருந்து logged.

### DNS resolution failures

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Hostname resolve செய்ய முடியவில்லை. சரிபார்க்கவும்:
- URL correctly spelled
- DNS server reachable
- Domain actually exist

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

Policy hook evaluation போது exception throw செய்தது. இது நடக்கும்போது, default action BLOCK (deny). இது safe default.

Full exception க்கு logs சரிபார்க்கவும். இது likely custom policy rule இல் bug indicate செய்கிறது.

### "Policy rule blocked action"

Policy rule explicitly action deny செய்தது. Log entry எந்த rule fire ஆனது மற்றும் ஏன் என்று include செய்கிறது. Config இல் `policy.rules` section சரிபார்த்து என்ன rules defined என்று பாருங்கள்.

### "Tool floor violation"

Minimum classification level தேவைப்படும் tool call செய்யப்பட்டது, ஆனால் session அந்த level க்கு கீழே இருக்கிறது.

**Example:** Healthcheck tool க்கு minimum INTERNAL classification தேவை (ஏனென்றால் system internals reveal செய்கிறது). PUBLIC session இதை use செய்ய try செய்தால், call blocked.

---

## Plugin & Skill Security

### "Plugin network access blocked"

Plugins restricted network access உடன் sandbox இல் இயங்குகின்றன. அவர்களால் declared endpoint domain இல் URLs மட்டும் access செய்ய முடியும்.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin declared endpoints இல் இல்லாத URL access செய்ய try செய்தது, அல்லது URL private IP க்கு resolve ஆனது.

### "Skill activation blocked by classification ceiling"

Skills SKILL.md frontmatter இல் `classification_ceiling` declare செய்கின்றன. Ceiling session இன் taint level க்கு கீழே இருந்தால், skill activate செய்ய முடியாது:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Lower-classified skill higher-classified data க்கு exposed ஆவதை தடுக்கிறது.

### "Skill content integrity check failed"

Installation க்கு பிறகு, Triggerfish skill இன் content hash செய்கிறது. Hash மாறினால் (skill installation க்கு பிறகு modified ஆனால்), integrity check fail ஆகும்:

```
Skill content hash mismatch detected
```

இது tampering indicate செய்யலாம். Trusted source இலிருந்து skill re-install செய்யவும்.

### "Skill install rejected by scanner"

Security scanner skill இல் suspicious content கண்டுபிடித்தது. Scanner malicious behavior indicate செய்யக்கூடிய patterns check செய்கிறது. Specific warnings error message இல் included.

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

Requested session session manager இல் exist இல்லை. Cleaned up ஆகியிருக்கலாம், அல்லது session ID invalid.

### "Session status access denied: taint exceeds caller"

Session இன் status பார்க்க try செய்தீர்கள், ஆனால் அந்த session உங்கள் current session விட higher taint level வைத்திருக்கிறது. Lower-classified sessions higher-classified operations பற்றி learn செய்வதை தடுக்கிறது.

### "Session history access denied"

மேலே போன்ற concept, ஆனால் conversation history பார்ப்பதற்கு.

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Team `running` status இல் இல்லை. இது நடக்கும்போது:

- Team **disbanded** ஆனது (manually அல்லது lifecycle monitor மூலம்)
- Lead session fail ஆனதால் team **paused** ஆனது
- Team lifetime limit exceed செய்து **timed out** ஆனது

`team_status` உடன் team இன் current status சரிபார்க்கவும். Lead failure காரணமாக team paused ஆனால், `team_disband` மூலம் disband செய்து புதியது உருவாக்கலாம்.

### "Team member not found" / "Team member ... is not active"

Target member exist இல்லை (wrong role name) அல்லது terminated ஆனது. Members terminated ஆகும்போது:

- Idle timeout exceed செய்தனர் (2x `idle_timeout_seconds`)
- Team disbanded ஆனது
- Session crash ஆனது மற்றும் lifecycle monitor detected

அனைத்து members உம் their current status பார்க்க `team_status` பயன்படுத்தவும்.

### "Team disband denied: only the lead or creating session can disband"

இரண்டு sessions மட்டும் team disband செய்ய முடியும்:

1. Originally `team_create` call செய்த session
2. Lead member இன் session

Team இல் இருந்து இந்த error வந்தால், calling member lead இல்லை. Outside இலிருந்து வந்தால், அதை create செய்த session நீங்கள் இல்லை.

### Creation க்கு பிறகு Team lead உடனே fail ஆகிறது

Lead இன் agent session first turn complete செய்ய முடியவில்லை. பொதுவான காரணங்கள்:

1. **LLM provider error:** Provider error return செய்தது (rate limit, auth failure, model not found). Provider errors க்கு `triggerfish logs` சரிபார்க்கவும்.
2. **Classification ceiling too low:** Lead க்கு ceiling மேல் classified tools தேவைப்பட்டால், first tool call இல் session fail ஆகலாம்.
3. **Missing tools:** Lead க்கு work decompose செய்ய specific tools தேவைப்படலாம். Tool profiles correctly configured என்று உறுதிப்படுத்தவும்.

### Team members idle மற்றும் output produce செய்வதில்லை

Members lead `sessions_send` மூலம் work அனுப்பும் வரை காத்திருக்கின்றனர். Lead task decompose செய்யவில்லையென்றால்:

- Lead இன் model team coordination புரியாமல் போகலாம். Lead role க்கு more capable model try செய்யவும்.
- `task` description lead க்கு sub-tasks ஆக decompose செய்ய too vague ஆகலாம்.
- Lead `active` ஆகிருக்கிறதா மற்றும் recent activity உண்டா என்று `team_status` சரிபார்க்கவும்.

### Team members இடையே "Write-down blocked"

Team members அனைத்து sessions போல் same classification rules பின்பற்றுகின்றனர். ஒரு member `CONFIDENTIAL` க்கு tainted ஆகி `PUBLIC` இல் உள்ள member க்கு data அனுப்ப try செய்தால், write-down check block செய்கிறது. இது expected behavior — classified data lower-classified sessions க்கு flow செய்யாது, team இல் கூட.

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Agent delegation cryptographic certificates பயன்படுத்துகிறது. Signature check fail ஆனால், delegation rejected. Forged delegation chains prevent செய்கிறது.

### "Delegation certificate expired"

Delegation certificate time-to-live வைத்திருக்கிறது. Expired ஆனால், delegated agent delegator சார்பாக act செய்ய முடியாது.

### "Delegation chain linkage broken"

Multi-hop delegations இல் (A delegates to B, B delegates to C), chain இல் ஒவ்வொரு link உம் valid ஆக வேண்டும். ஏதாவது link broken ஆனால், entire chain rejected.

---

## Webhooks

### "Webhook HMAC verification failed"

Incoming webhooks authentication க்கு HMAC signatures தேவைப்படுகின்றன. Signature missing, malformed, அல்லது match ஆகவில்லையென்றால்:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

சரிபார்க்கவும்:
- Webhook source correct HMAC signature header அனுப்புகிறது
- Config இல் shared secret source இன் secret உடன் match ஆகிறது
- Signature format match ஆகிறது (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Triggerfish replay protection include செய்கிறது. Webhook payload second time receive ஆனால் (same signature), rejected.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Short period இல் same source இலிருந்து too many webhook requests. Webhook floods க்கு எதிரான protection. காத்திருந்து மீண்டும் try செய்யவும்.

---

## Audit Integrity

### "previousHash mismatch"

Audit log hash chaining பயன்படுத்துகிறது. ஒவ்வொரு entry உம் previous entry இன் hash include செய்கிறது. Chain broken ஆனால், audit log tampered அல்லது corrupted ஆனது என்று அர்த்தம்.

### "HMAC mismatch"

Audit entry இன் HMAC signature match ஆகவில்லை. Entry creation க்கு பிறகு modified ஆகியிருக்கலாம்.
