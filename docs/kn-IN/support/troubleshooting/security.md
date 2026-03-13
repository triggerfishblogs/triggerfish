# Troubleshooting: Security & Classification

## Write-Down Blocks

### "Write-down blocked"

ಇದು ಅತ್ಯಂತ ಸಾಮಾನ್ಯ security error. Data ಹೆಚ್ಚು classified level ನಿಂದ ಕಡಿಮೆ ಒಂದಕ್ಕೆ flow ಮಾಡಲು ಪ್ರಯತ್ನಿಸುತ್ತಿದೆ ಎಂದು ಅರ್ಥ.

**Example:** ನಿಮ್ಮ session CONFIDENTIAL data access ಮಾಡಿದೆ (classified file read ಮಾಡಿದೆ, classified database query ಮಾಡಿದೆ). Session taint ಈಗ CONFIDENTIAL. ನಂತರ PUBLIC WebChat channel ಗೆ response ಕಳಿಸಲು ಪ್ರಯತ್ನಿಸಿದ್ದೀರಿ. CONFIDENTIAL data PUBLIC destinations ಗೆ flow ಮಾಡಲಾಗುವುದಿಲ್ಲ ಕಾರಣ policy engine ಇದನ್ನು block ಮಾಡುತ್ತದೆ.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Resolve ಮಾಡುವ ವಿಧಾನ:**
1. **ಹೊಸ session start ಮಾಡಿ.** Fresh session PUBLIC taint ನಿಂದ ಪ್ರಾರಂಭ. ಹೊಸ conversation ಬಳಸಿ.
2. **Higher-classified channel ಬಳಸಿ.** CONFIDENTIAL ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ channel ಮೂಲಕ response ಕಳಿಸಿ.
3. **Taint cause ಏನು ಎಂದು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.** Session ನ classification ಏರಿಸಿದ tool call ನೋಡಲು "Taint escalation" entries ಗಾಗಿ logs check ಮಾಡಿ.

### "Session taint cannot flow to channel"

Write-down ನಂತೆಯೇ, ಆದರೆ specifically channel classification ಬಗ್ಗೆ:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Classified integrations ಗೆ tool calls ಕೂಡ write-down enforce ಮಾಡುತ್ತವೆ:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

ಒಂದು ಕ್ಷಣ, ಇದು backwards ಕಾಣುತ್ತದೆ. Session taint tool ನ classification ಗಿಂತ ಹೆಚ್ಚು. ಅಂದರೆ session tool ಬಳಸಲು ತುಂಬ tainted ಆಗಿದೆ. ಕಡಿಮೆ-secure system ಗೆ classified context leak ಮಾಡಬಹುದಾದ ಕಾರಣ tool call block ಮಾಡಲಾಗಿದೆ.

### "Workspace write-down blocked"

Agent workspaces per-directory classification ಹೊಂದಿವೆ. Higher-tainted session ನಿಂದ lower-classified directory ಗೆ write ಮಾಡುವುದು block ಮಾಡಲಾಗಿದೆ:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

ಇದು informational, error ಅಲ್ಲ. Session ನ classification level agent classified data access ಮಾಡಿದ ಕಾರಣ ಹೆಚ್ಚಾಗಿದೆ ಎಂದು ಅರ್ಥ.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint ಮೇಲೆ ಮಾತ್ರ ಹೋಗುತ್ತದೆ, ಕೆಳಕ್ಕೆ ಹೋಗುವುದಿಲ್ಲ. Session CONFIDENTIAL ಗೆ taint ಆದ ನಂತರ, session ಉಳಿದ ಭಾಗಕ್ಕೆ ಅಲ್ಲಿಯೇ ಇರುತ್ತದೆ.

### "Resource-based taint escalation firing"

Tool call session ನ current taint ಗಿಂತ ಹೆಚ್ಚಿನ classification ಹೊಂದಿದ resource access ಮಾಡಿದೆ. Session taint automatically match ಮಾಡಲು escalate ಮಾಡಲಾಗುತ್ತದೆ.

### "Non-owner taint applied"

Non-owner users ರ sessions channel ನ classification ಅಥವಾ user ನ permissions ಆಧಾರದ ಮೇಲೆ taint ಆಗಬಹುದು. ಇದು resource-based taint ನಿಂದ separate.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

ಎಲ್ಲ outbound HTTP requests (web_fetch, browser navigation, MCP SSE connections) SSRF protection ಮೂಲಕ ಹೋಗುತ್ತವೆ. Target hostname private IP address ಗೆ resolve ಮಾಡಿದರೆ, request block ಮಾಡಲಾಗುತ್ತದೆ.

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

ಈ protection hardcoded ಆಗಿದ್ದು disable ಅಥವಾ configure ಮಾಡಲಾಗುವುದಿಲ್ಲ. AI agent ಅನ್ನು internal services access ಮಾಡಲು trick ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ.

**IPv4-mapped IPv6:** `::ffff:127.0.0.1` ನಂತಹ Addresses detect ಮಾಡಿ block ಮಾಡಲಾಗುತ್ತದೆ.

### "SSRF check blocked outbound request"

ಮೇಲಿನಂತೆಯೇ, ಆದರೆ SSRF module ಬದಲಾಗಿ web_fetch tool ನಿಂದ log ಮಾಡಲಾಗಿದೆ.

### DNS resolution failures

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Hostname resolve ಮಾಡಲಾಗಲಿಲ್ಲ. Check ಮಾಡಿ:
- URL correctly spell ಮಾಡಲಾಗಿದೆ
- DNS server reachable ಇದೆ
- Domain ನಿಜವಾಗಿ exist ಮಾಡುತ್ತದೆ

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

Policy hook evaluation ಸಮಯದಲ್ಲಿ exception throw ಮಾಡಿದೆ. ಇದು ಆದಾಗ, default action BLOCK (deny). ಇದು safe default.

Full exception ಗಾಗಿ logs check ಮಾಡಿ. ಇದು custom policy rule ನಲ್ಲಿ bug ಎಂದು indicate ಮಾಡುತ್ತದೆ.

### "Policy rule blocked action"

Policy rule action ಅನ್ನು explicitly deny ಮಾಡಿದೆ. Log entry ಯಾವ rule fire ಮಾಡಿತು ಮತ್ತು ಏಕೆ ಎಂದು ಒಳಗೊಂಡಿದೆ. Define ಮಾಡಿದ rules ನೋಡಲು config ನ `policy.rules` section check ಮಾಡಿ.

### "Tool floor violation"

Minimum classification level ಅಗತ್ಯ ಇರುವ tool call ಮಾಡಲಾಯಿತು, ಆದರೆ session ಆ level ಗಿಂತ ಕಡಿಮೆ ಇದೆ.

**Example:** Healthcheck tool ಗೆ ಕನಿಷ್ಠ INTERNAL classification ಅಗತ್ಯ (ಏಕೆಂದರೆ ಇದು system internals reveal ಮಾಡುತ್ತದೆ). PUBLIC session ಇದನ್ನು ಬಳಸಲು ಪ್ರಯತ್ನಿಸಿದರೆ, call block ಮಾಡಲಾಗುತ್ತದೆ.

---

## Plugin & Skill Security

### "Plugin network access blocked"

Plugins restricted network access ಜೊತೆ sandbox ನಲ್ಲಿ ಚಲಿಸುತ್ತವೆ. ಅವು declared endpoint domain ನ URLs ಮಾತ್ರ access ಮಾಡಬಹುದು.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin declared endpoints ನಲ್ಲಿ ಇಲ್ಲದ URL access ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದೆ, ಅಥವಾ URL private IP ಗೆ resolve ಮಾಡಿದೆ.

### "Skill activation blocked by classification ceiling"

Skills ತಮ್ಮ SKILL.md frontmatter ನಲ್ಲಿ `classification_ceiling` declare ಮಾಡುತ್ತವೆ. Ceiling session ನ taint level ಗಿಂತ ಕಡಿಮೆ ಇದ್ದರೆ, skill activate ಮಾಡಲಾಗುವುದಿಲ್ಲ:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

ಇದು lower-classified skill ಅನ್ನು higher-classified data ಗೆ expose ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ.

### "Skill content integrity check failed"

Installation ನಂತರ, Triggerfish skill ನ content hash ಮಾಡುತ್ತದೆ. Hash ಬದಲಾದರೆ (skill installation ನಂತರ modify ಮಾಡಲಾಗಿದೆ), integrity check fail ಆಗುತ್ತದೆ:

```
Skill content hash mismatch detected
```

Tampering indicate ಮಾಡಬಹುದು. Trusted source ನಿಂದ skill re-install ಮಾಡಿ.

### "Skill install rejected by scanner"

Security scanner skill ನಲ್ಲಿ suspicious content ಕಂಡಿದೆ. Scanner malicious behavior indicate ಮಾಡಬಹುದಾದ patterns check ಮಾಡುತ್ತದೆ. Specific warnings error message ನಲ್ಲಿ ಒಳಗೊಂಡಿರುತ್ತವೆ.

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

Requested session session manager ನಲ್ಲಿ exist ಮಾಡುವುದಿಲ್ಲ. Cleaned up ಆಗಿರಬಹುದು, ಅಥವಾ session ID invalid ಆಗಿದೆ.

### "Session status access denied: taint exceeds caller"

Session ನ status ನೋಡಲು ಪ್ರಯತ್ನಿಸಿದ್ದೀರಿ, ಆದರೆ ಆ session ನಿಮ್ಮ current session ಗಿಂತ ಹೆಚ್ಚಿನ taint level ಹೊಂದಿದೆ. ಇದು lower-classified sessions ಅನ್ನು higher-classified operations ಬಗ್ಗೆ learn ಮಾಡದಂತೆ ತಡೆಯುತ್ತದೆ.

### "Session history access denied"

ಮೇಲಿನಂತೆಯೇ concept, ಆದರೆ conversation history ನೋಡಲು.

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Team `running` status ನಲ್ಲಿ ಇಲ್ಲ. ಇದು ಆಗುವುದು:

- Team **disbanded** ಮಾಡಲಾಗಿದೆ (manually ಅಥವಾ lifecycle monitor ಮೂಲಕ)
- Lead session fail ಮಾಡಿದ ಕಾರಣ Team **paused** ಆಗಿದೆ
- Lifetime limit exceed ಮಾಡಿದ ನಂತರ Team **timed out** ಆಗಿದೆ

`team_status` ಜೊತೆ team ನ current status check ಮಾಡಿ. Lead failure ಕಾರಣ team paused ಆಗಿದ್ದರೆ, `team_disband` ಮೂಲಕ disband ಮಾಡಿ ಹೊಸದು create ಮಾಡಬಹುದು.

### "Team member not found" / "Team member ... is not active"

Target member either exist ಮಾಡುವುದಿಲ್ಲ (ತಪ್ಪಾದ role name) ಅಥವಾ terminate ಮಾಡಲಾಗಿದೆ. Members terminate ಮಾಡಲಾಗುವುದು:

- Idle timeout exceed ಮಾಡಿದಾಗ (2x `idle_timeout_seconds`)
- Team disbanded ಮಾಡಿದಾಗ
- ಅವರ session crash ಮಾಡಿ lifecycle monitor detect ಮಾಡಿದಾಗ

ಎಲ್ಲ members ಮತ್ತು ಅವರ current status ನೋಡಲು `team_status` ಬಳಸಿ.

### "Team disband denied: only the lead or creating session can disband"

Team disband ಮಾಡಲು ಎರಡೇ sessions ಮಾಡಬಹುದು:

1. `team_create` originally call ಮಾಡಿದ session
2. Lead member ನ session

Team ಒಳಗಿನಿಂದ ಈ error ಕಂಡರೆ, calling member lead ಅಲ್ಲ. Team ಹೊರಗಿನಿಂದ ಕಂಡರೆ, create ಮಾಡಿದ session ಅಲ್ಲ.

### Team lead creation ನಂತರ ತಕ್ಷಣ fail ಆಗುತ್ತದೆ

Lead ನ agent session first turn complete ಮಾಡಲಾಗಲಿಲ್ಲ. ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:

1. **LLM provider error:** Provider error return ಮಾಡಿದೆ (rate limit, auth failure, model not found). Provider errors ಗಾಗಿ `triggerfish logs` check ಮಾಡಿ.
2. **Classification ceiling too low:** Lead ಗೆ ceiling ಮೇಲೆ classified tools ಅಗತ್ಯ ಇದ್ದರೆ, first tool call ನಲ್ಲಿ session fail ಆಗಬಹುದು.
3. **Missing tools:** Lead ಗೆ work decompose ಮಾಡಲು specific tools ಅಗತ್ಯ. Tool profiles correctly configure ಮಾಡಲಾಗಿದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ.

### Team members idle ಆಗಿದ್ದು output produce ಮಾಡುತ್ತಿಲ್ಲ

Members lead `sessions_send` ಮೂಲಕ work ಕಳಿಸಲು ಕಾಯುತ್ತವೆ. Lead task decompose ಮಾಡದಿದ್ದರೆ:

- Lead ನ model team coordination ಅರ್ಥ ಮಾಡಿಕೊಳ್ಳದಿರಬಹುದು. Lead role ಗಾಗಿ more capable model try ಮಾಡಿ.
- `task` description lead ಗೆ sub-tasks ಆಗಿ decompose ಮಾಡಲು ತುಂಬ vague ಆಗಿರಬಹುದು.
- Lead `active` ಆಗಿ recent activity ಹೊಂದಿದೆ ಎಂದು ನೋಡಲು `team_status` check ಮಾಡಿ.

### Team members ನಡುವೆ "Write-down blocked"

Team members ಎಲ್ಲ sessions ನಂತೆಯೇ ಅದೇ classification rules ಅನುಸರಿಸುತ್ತಾರೆ. ಒಂದು member `CONFIDENTIAL` ಗೆ tainted ಆಗಿ `PUBLIC` member ಗೆ data ಕಳಿಸಲು ಪ್ರಯತ್ನಿಸಿದರೆ, write-down check block ಮಾಡುತ್ತದೆ. ಇದು expected behavior — classified data lower-classified sessions ಗೆ flow ಮಾಡಲಾಗುವುದಿಲ್ಲ, team ಒಳಗೂ ಸಹ.

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Agent delegation cryptographic certificates ಬಳಸುತ್ತದೆ. Signature check fail ಆದರೆ, delegation reject ಮಾಡಲಾಗುತ್ತದೆ. ಇದು forged delegation chains ತಡೆಯುತ್ತದೆ.

### "Delegation certificate expired"

Delegation certificate time-to-live ಹೊಂದಿದೆ. Expire ಆದರೆ, delegated agent ಇನ್ನು delegator ಪರ act ಮಾಡಲಾಗುವುದಿಲ್ಲ.

### "Delegation chain linkage broken"

Multi-hop delegations ನಲ್ಲಿ (A, B ಗೆ delegate ಮಾಡುತ್ತದೆ, B, C ಗೆ delegate ಮಾಡುತ್ತದೆ), chain ನ ಪ್ರತಿ link valid ಇರಬೇಕು. ಯಾವ link ಆದರೂ broken ಆದರೆ, entire chain reject ಮಾಡಲಾಗುತ್ತದೆ.

---

## Webhooks

### "Webhook HMAC verification failed"

Incoming webhooks ಗೆ authentication ಗಾಗಿ HMAC signatures ಅಗತ್ಯ. Signature missing, malformed, ಅಥವಾ match ಆಗದಿದ್ದರೆ:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Check ಮಾಡಿ:
- Webhook source correct HMAC signature header ಕಳಿಸುತ್ತಿದೆ
- Config ನ shared secret source ನ secret ಜೊತೆ match ಮಾಡುತ್ತದೆ
- Signature format match ಮಾಡುತ್ತದೆ (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Triggerfish replay protection ಒಳಗೊಂಡಿದೆ. Webhook payload ಎರಡನೇ ಬಾರಿ receive ಮಾಡಿದರೆ (ಅದೇ signature), reject ಮಾಡಲಾಗುತ್ತದೆ.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

ಒಂದೇ source ನಿಂದ ಕಡಿಮೆ ಸಮಯದಲ್ಲಿ ತುಂಬ ಹೆಚ್ಚು webhook requests. Webhook floods ನಿಂದ ರಕ್ಷಿಸುತ್ತದೆ. ಸ್ವಲ್ಪ ಕಾದು ಮತ್ತೆ try ಮಾಡಿ.

---

## Audit Integrity

### "previousHash mismatch"

Audit log hash chaining ಬಳಸುತ್ತದೆ. ಪ್ರತಿ entry ಹಿಂದಿನ entry ನ hash ಒಳಗೊಂಡಿರುತ್ತದೆ. Chain broken ಆದರೆ, audit log tamper ಅಥವಾ corrupt ಮಾಡಲಾಗಿದೆ ಎಂದು ಅರ್ಥ.

### "HMAC mismatch"

Audit entry ನ HMAC signature match ಆಗುತ್ತಿಲ್ಲ. Creation ನಂತರ entry modify ಮಾಡಲಾಗಿರಬಹುದು.
