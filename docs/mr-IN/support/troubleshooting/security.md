# Troubleshooting: Security & Classification

## Write-Down Blocks

### "Write-down blocked"

हा सर्वात common security error आहे. याचा अर्थ data higher classification level वरून lower ला flow होण्याचा प्रयत्न करत आहे.

**Example:** तुमच्या session ने CONFIDENTIAL data access केला (classified file read, classified database query). Session taint आता CONFIDENTIAL आहे. नंतर PUBLIC WebChat channel ला response पाठवण्याचा प्रयत्न केला. Policy engine हे block करतो कारण CONFIDENTIAL data PUBLIC destinations ला पोहोचू शकत नाही.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**कसे resolve करायचे:**
1. **नवीन session सुरू करा.** Fresh session PUBLIC taint सह सुरू होतो. नवीन conversation वापरा.
2. **Higher-classified channel वापरा.** CONFIDENTIAL किंवा वरील channel द्वारे response पाठवा.
3. **Taint कशामुळे झाला ते समजून घ्या.** Session classification raise केलेल्या tool call पाहण्यासाठी logs मध्ये "Taint escalation" entries check करा.

### "Session taint cannot flow to channel"

Write-down सारखेच, पण specifically channel classification बद्दल:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Classified integrations ला tool calls देखील write-down enforce करतात:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

थांबा, हे backwards दिसते. Session taint tool च्या classification पेक्षा जास्त आहे. याचा अर्थ session खूप tainted आहे lower-classified tool वापरण्यासाठी. Concern असतो की tool call करणे classified context कमी-secure system मध्ये leak करू शकते.

### "Workspace write-down blocked"

Agent workspaces ला per-directory classification आहे. Higher-tainted session मधून lower-classified directory ला write करणे blocked आहे:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

हे informational आहे, error नाही. याचा अर्थ session चा classification level नुकताच वाढला कारण agent ने classified data access केला.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint फक्त वर जातो, खाली कधीच नाही. एकदा session CONFIDENTIAL ला tainted झाल्यास, session च्या उर्वरित भागात तसेच राहतो.

### "Resource-based taint escalation firing"

Tool call ने session च्या current taint पेक्षा higher classification असलेला resource access केला. Session taint automatically match करण्यासाठी escalated होतो.

### "Non-owner taint applied"

Non-owner users ला channel चे classification किंवा user च्या permissions वर आधारित त्यांचे sessions tainted होऊ शकतात. हे resource-based taint पेक्षा वेगळे आहे.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

सर्व outbound HTTP requests (web_fetch, browser navigation, MCP SSE connections) SSRF protection मधून जातात. Target hostname private IP address ला resolve झाल्यास, request blocked होतो.

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

हे protection hardcoded आहे आणि disable किंवा configure करता येत नाही. AI agent ला internal services access करण्यासाठी tricked होण्यापासून prevent करतो.

**IPv4-mapped IPv6:** `::ffff:127.0.0.1` सारखे addresses detected आणि blocked आहेत.

### "SSRF check blocked outbound request"

वरीलसारखेच, पण SSRF module ऐवजी web_fetch tool मधून logged.

### DNS resolution failures

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Hostname resolve करता आला नाही. Check करा:
- URL correctly spelled आहे
- DNS server reachable आहे
- Domain actually exist करतो

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

Policy hook evaluation दरम्यान exception throw झाला. असे झाल्यावर, default action BLOCK (deny) आहे. हे safe default आहे.

Full exception साठी logs check करा. हे custom policy rule मधील bug indicate करते.

### "Policy rule blocked action"

Policy rule ने explicitly action deny केला. Log entry कोणता rule fired झाला आणि का ते include करतो. Config मधील `policy.rules` section check करा rules काय defined आहेत ते पाहण्यासाठी.

### "Tool floor violation"

Minimum classification level आवश्यक असलेला tool call केला गेला, पण session त्या level च्या खाली आहे.

**Example:** Healthcheck tool ला किमान INTERNAL classification आवश्यक आहे (कारण ते system internals reveal करते). PUBLIC session ते वापरण्याचा प्रयत्न केल्यास, call blocked होतो.

---

## Plugin & Skill Security

### "Plugin network access blocked"

Plugins restricted network access असलेल्या sandbox मध्ये run होतात. ते फक्त declared endpoint domain वरील URLs access करू शकतात.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin ने declared endpoints मध्ये नसलेला URL access करण्याचा प्रयत्न केला, किंवा URL private IP ला resolve झाला.

### "Skill activation blocked by classification ceiling"

Skills त्यांच्या SKILL.md frontmatter मध्ये `classification_ceiling` declare करतात. Ceiling session च्या taint level च्या खाली असल्यास, skill activate होऊ शकत नाही:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

हे lower-classified skill ला higher-classified data expose होण्यापासून prevent करतो.

### "Skill content integrity check failed"

Installation नंतर, Triggerfish skill च्या content hash करतो. Hash बदलल्यास (installation नंतर skill modified झाली), integrity check fail होतो:

```
Skill content hash mismatch detected
```

Tampering indicate करू शकते. Trusted source मधून skill re-install करा.

### "Skill install rejected by scanner"

Security scanner ने skill मध्ये suspicious content सापडला. Scanner malicious behavior indicate करू शकणाऱ्या patterns check करतो. Specific warnings error message मध्ये included आहेत.

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

Requested session session manager मध्ये exist करत नाही. Cleaned up झाले असेल, किंवा session ID invalid आहे.

### "Session status access denied: taint exceeds caller"

Session चे status पाहण्याचा प्रयत्न केला, पण त्या session ला तुमच्या current session पेक्षा higher taint level आहे. Lower-classified sessions ला higher-classified operations बद्दल जाणून घेण्यापासून prevent करतो.

### "Session history access denied"

वरीलसारखेच, पण conversation history पाहण्यासाठी.

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Team `running` status मध्ये नाही. हे तेव्हा होते जेव्हा:

- Team **disbanded** झाली (manually किंवा lifecycle monitor द्वारे)
- Lead session fail झाल्यामुळे team **paused** झाली
- Team चे lifetime limit exceed झाल्यामुळे **timed out** झाली

`team_status` सह team चे current status check करा. Team lead failure मुळे paused असल्यास, `team_disband` सह ती disband करा आणि नवीन create करा.

### "Team member not found" / "Team member ... is not active"

Target member exist करत नाही (चुकीचे role name) किंवा terminated झाला. Members terminated होतात जेव्हा:

- ते idle timeout exceed करतात (2x `idle_timeout_seconds`)
- Team disbanded होतो
- त्यांचे session crash होते आणि lifecycle monitor ते detect करतो

सर्व members आणि त्यांचे current status पाहण्यासाठी `team_status` वापरा.

### "Team disband denied: only the lead or creating session can disband"

Team disband करण्यासाठी फक्त दोन sessions आहेत:

1. Originally `team_create` call केलेले session
2. Lead member चे session

Team च्या आत हा error येत असल्यास, calling member lead नाही. Team बाहेरून येत असल्यास, तुम्ही ती create केलेले session नाही.

### Team lead creation नंतर लगेच fail होतो

Lead चे agent session पहिला turn complete करू शकला नाही. Common causes:

1. **LLM provider error:** Provider ने error return केला (rate limit, auth failure, model not found). Provider errors साठी `triggerfish logs` check करा.
2. **Classification ceiling खूप कमी:** Lead ला ceiling च्या वर classified tools आवश्यक असल्यास, पहिल्या tool call वर session fail होऊ शकतो.
3. **Missing tools:** Lead ला काम decompose करण्यासाठी specific tools आवश्यक असतील. Tool profiles correctly configured असल्याची खात्री करा.

### Team members idle आणि कधीच output produce नाहीत

Members lead ने `sessions_send` द्वारे त्यांना काम पाठवण्याची wait करतात. Lead ने task decompose नाही केल्यास:

- Lead चा model team coordination समजत नसेल. Lead role साठी more capable model try करा.
- `task` description lead ला sub-tasks मध्ये decompose करण्यासाठी खूप vague असेल.
- Lead `active` आहे आणि recent activity आहे का ते पाहण्यासाठी `team_status` check करा.

### Team members दरम्यान "Write-down blocked"

Team members सर्व sessions प्रमाणेच classification rules follow करतात. एका member ला `CONFIDENTIAL` ला tainted झाल्यास आणि `PUBLIC` member ला data पाठवण्याचा प्रयत्न केल्यास, write-down check block करतो. हे expected behavior आहे — classified data lower-classified sessions ला flow करू शकत नाही, team च्या आत सुद्धा.

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Agent delegation cryptographic certificates वापरतो. Signature check fail झाल्यास, delegation rejected होतो. Forged delegation chains prevent करतो.

### "Delegation certificate expired"

Delegation certificate ला time-to-live असतो. Expired झाल्यास, delegated agent delegator च्या वतीने act करू शकत नाही.

### "Delegation chain linkage broken"

Multi-hop delegations मध्ये (A, B ला delegate करतो, B, C ला delegate करतो), chain मधील प्रत्येक link valid असणे आवश्यक आहे. कोणताही link broken असल्यास, entire chain rejected होतो.

---

## Webhooks

### "Webhook HMAC verification failed"

Incoming webhooks authentication साठी HMAC signatures आवश्यक करतात. Signature missing, malformed, किंवा match नाही झाल्यास:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Check करा की:
- Webhook source correct HMAC signature header पाठवत आहे
- Config मधील shared secret source च्या secret शी match होतो
- Signature format match होतो (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Triggerfish replay protection include करतो. Webhook payload दुसऱ्यांदा received झाल्यास (same signature), rejected होतो.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Short period मध्ये same source कडून खूप जास्त webhook requests. Webhook floods पासून protect करतो. Wait करा आणि पुन्हा try करा.

---

## Audit Integrity

### "previousHash mismatch"

Audit log hash chaining वापरतो. प्रत्येक entry मागील entry चा hash include करतो. Chain broken असल्यास, याचा अर्थ audit log tampered किंवा corrupted झाला.

### "HMAC mismatch"

Audit entry चे HMAC signature match नाही होत. Entry creation नंतर modified झाली असू शकते.
