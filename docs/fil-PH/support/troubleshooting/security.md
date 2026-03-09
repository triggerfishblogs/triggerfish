# Troubleshooting: Security & Classification

## Mga Write-Down Blocks

### "Write-down blocked"

Ito ang pinakakaraniwang security error. Ibig sabihin nito ay sinusubukan ng data na mag-flow mula sa mas mataas na classification level papuntang mas mababa.

**Halimbawa:** Nag-access ang iyong session ng CONFIDENTIAL data (nagbasa ng classified file, nag-query ng classified database). Ang session taint ay CONFIDENTIAL na ngayon. Sinubukan mong ipadala ang response sa isang PUBLIC WebChat channel. Bina-block ito ng policy engine dahil hindi puwedeng mag-flow ang CONFIDENTIAL data sa PUBLIC destinations.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Paano maayos:**
1. **Mag-start ng bagong session.** Nagsisimula sa PUBLIC taint ang bagong session. Gumamit ng bagong conversation.
2. **Gumamit ng mas mataas na classified channel.** Ipadala ang response sa channel na classified sa CONFIDENTIAL o mas mataas.
3. **Alamin kung ano ang nagdulot ng taint.** Tingnan ang logs para sa mga "Taint escalation" entries para makita kung aling tool call ang nag-taas ng classification ng session.

### "Session taint cannot flow to channel"

Kapareho ng write-down, pero partikular na tungkol sa channel classification:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Nagpa-patupad din ng write-down ang mga tool calls sa classified integrations:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Sandali, mukhang patalikod ito. Mas mataas ang session taint kaysa sa classification ng tool. Ibig sabihin nito ay masyadong tainted ang session para gumamit ng tool na mas mababang classified. Ang concern ay puwedeng mag-leak ng classified context sa isang mas hindi secure na system kapag tinawag ang tool.

### "Workspace write-down blocked"

Ang agent workspaces ay may per-directory classification. Bina-block ang pagsusulat sa mas mababang classified directory mula sa mas mataas na tainted session:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

Ito ay informational, hindi error. Ibig sabihin nito ay tumaas ang classification level ng session dahil nag-access ang agent ng classified data.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Ang taint ay pataas lang, hindi pababa. Kapag na-taint ang session sa CONFIDENTIAL, nananatili ito doon sa buong session.

### "Resource-based taint escalation firing"

Nag-access ang tool call ng resource na may classification na mas mataas kaysa sa kasalukuyang taint ng session. Awtomatikong ines-escalate ang session taint para tumugma.

### "Non-owner taint applied"

Puwedeng ma-taint ang sessions ng mga non-owner users base sa classification ng channel o sa permissions ng user. Ito ay hiwalay sa resource-based taint.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Lahat ng outbound HTTP requests (web_fetch, browser navigation, MCP SSE connections) ay dumadaan sa SSRF protection. Kung ang target hostname ay nare-resolve sa private IP address, bina-block ang request.

**Mga blocked ranges:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (private)
- `172.16.0.0/12` (private)
- `192.168.0.0/16` (private)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (unspecified)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 link-local)

Hardcoded ang proteksyon na ito at hindi puwedeng i-disable o i-configure. Pinipigilan nito ang AI agent na ma-trick sa pag-access ng internal services.

**IPv4-mapped IPv6:** Naide-detect at bina-block ang mga addresses tulad ng `::ffff:127.0.0.1`.

### "SSRF check blocked outbound request"

Kapareho ng sa itaas, pero nila-log mula sa web_fetch tool sa halip na sa SSRF module.

### Mga DNS resolution failures

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Hindi na-resolve ang hostname. Tingnan:
- Tama ba ang pagkaka-spell ng URL
- Naabot ba ang iyong DNS server
- Talagang umiiral ba ang domain

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

Nag-throw ng exception ang policy hook habang nag-e-evaluate. Kapag nangyari ito, ang default action ay BLOCK (deny). Ito ang ligtas na default.

Tingnan ang logs para sa buong exception. Malamang na nagpapahiwatig ito ng bug sa isang custom policy rule.

### "Policy rule blocked action"

Tahasan na na-deny ng policy rule ang action. Kasama sa log entry kung aling rule ang nag-fire at bakit. Tingnan ang `policy.rules` section ng iyong config para makita kung anong mga rules ang defined.

### "Tool floor violation"

Tinawag ang tool na nangangailangan ng minimum classification level, pero nasa ibaba nito ang session.

**Halimbawa:** Nangangailangan ang healthcheck tool ng minimum INTERNAL classification (dahil inilalabas nito ang system internals). Kung susubukang gamitin ito ng PUBLIC session, bina-block ang call.

---

## Plugin & Skill Security

### "Plugin network access blocked"

Tumatakbo ang mga plugins sa sandbox na may restricted network access. Puwede lang silang mag-access ng mga URLs sa kanilang declared endpoint domain.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Sinubukan ng plugin na mag-access ng URL na wala sa declared endpoints nito, o ang URL ay nare-resolve sa private IP.

### "Skill activation blocked by classification ceiling"

Nagde-declare ang mga skills ng `classification_ceiling` sa kanilang SKILL.md frontmatter. Kung mas mababa ang ceiling kaysa sa taint level ng session, hindi ma-activate ang skill:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Pinipigilan nito ang isang mas mababang classified skill na ma-expose sa mas mataas na classified data.

### "Skill content integrity check failed"

Pagkatapos ng installation, hina-hash ng Triggerfish ang content ng skill. Kung magbago ang hash (nabago ang skill pagkatapos ma-install), mabibigo ang integrity check:

```
Skill content hash mismatch detected
```

Puwedeng magpahiwatig ito ng tampering. I-re-install ang skill mula sa trusted source.

### "Skill install rejected by scanner"

Nakahanap ang security scanner ng kahina-hinalang content sa skill. Tinitingnan ng scanner ang mga patterns na puwedeng magpahiwatig ng malicious behavior. Kasama sa error message ang mga specific warnings.

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

Hindi umiiral ang hiniling na session sa session manager. Puwedeng na-clean up na ito, o invalid ang session ID.

### "Session status access denied: taint exceeds caller"

Sinubukan mong tingnan ang status ng session, pero may mas mataas na taint level ang session na iyon kaysa sa iyong kasalukuyang session. Pinipigilan nito ang mas mababang classified sessions na malaman ang tungkol sa mas mataas na classified operations.

### "Session history access denied"

Parehong konsepto tulad ng sa itaas, pero para sa pagtingin ng conversation history.

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Hindi nasa `running` status ang team. Nangyayari ito kapag:

- Na-**disband** ang team (mano-mano o ng lifecycle monitor)
- Na-**pause** ang team dahil nabigo ang lead session
- Nag-**time out** ang team pagkatapos lumampas sa lifetime limit nito

Tingnan ang kasalukuyang status ng team gamit ang `team_status`. Kung naka-pause ang team dahil sa lead failure, puwede mong i-disband ito gamit ang `team_disband` at gumawa ng bago.

### "Team member not found" / "Team member ... is not active"

Hindi umiiral ang target member (maling role name) o na-terminate na. Nate-terminate ang mga members kapag:

- Lumampas sila sa idle timeout (2x `idle_timeout_seconds`)
- Na-disband ang team
- Nag-crash ang session nila at nade-detect ng lifecycle monitor

Gamitin ang `team_status` para makita ang lahat ng members at ang kasalukuyang status nila.

### "Team disband denied: only the lead or creating session can disband"

Dalawang sessions lang ang puwedeng mag-disband ng team:

1. Ang session na orihinal na tumawag ng `team_create`
2. Ang session ng lead member

Kung nakukuha mo ang error na ito mula sa loob ng team, hindi lead ang tumatawag na member. Kung nakukuha mo ito mula sa labas ng team, hindi ikaw ang session na gumawa nito.

### Agad nabigo ang team lead pagkatapos ng creation

Hindi nakumpleto ng agent session ng lead ang unang turn nito. Mga karaniwang dahilan:

1. **LLM provider error:** Nagbalik ng error ang provider (rate limit, auth failure, model not found). Tingnan ang `triggerfish logs` para sa provider errors.
2. **Masyadong mababa ang classification ceiling:** Kung kailangan ng lead ang tools na classified sa itaas ng ceiling nito, puwedeng mabigo ang session sa unang tool call nito.
3. **Kulang ang tools:** Puwedeng kailangan ng lead ang mga specific tools para i-decompose ang trabaho. Siguraduhing tama ang configuration ng tool profiles.

### Idle ang team members at hindi gumagawa ng output

Naghihintay ang mga members na magpadala ng trabaho ang lead sa kanila sa pamamagitan ng `sessions_send`. Kung hindi ni-decompose ng lead ang task:

- Puwedeng hindi nauunawaan ng model ng lead ang team coordination. Subukan ang mas capable na model para sa lead role.
- Puwedeng masyadong malabo ang `task` description para i-decompose ng lead sa mga sub-tasks.
- Tingnan ang `team_status` para makita kung `active` ang lead at may kamakailang activity.

### "Write-down blocked" sa pagitan ng team members

Sumusunod ang team members sa parehong classification rules tulad ng lahat ng sessions. Kung ang isang member ay na-taint sa `CONFIDENTIAL` at sinubukang magpadala ng data sa member na nasa `PUBLIC`, bina-block ito ng write-down check. Inaasahang behavior ito -- hindi puwedeng mag-flow ang classified data sa mas mababang classified sessions, kahit sa loob ng team.

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Gumagamit ang agent delegation ng cryptographic certificates. Kung mabigo ang signature check, nire-reject ang delegation. Pinipigilan nito ang mga forged delegation chains.

### "Delegation certificate expired"

May time-to-live ang delegation certificate. Kung nag-expire na ito, hindi na makakapag-act ang delegated agent sa ngalan ng delegator.

### "Delegation chain linkage broken"

Sa multi-hop delegations (A nagde-delegate sa B, B nagde-delegate sa C), kailangan valid ang bawat link sa chain. Kung may sira ang alinmang link, nire-reject ang buong chain.

---

## Webhooks

### "Webhook HMAC verification failed"

Nangangailangan ang incoming webhooks ng HMAC signatures para sa authentication. Kung nawawala, malformed, o hindi tugma ang signature:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Tingnan na:
- Ipinapadala ng webhook source ang tamang HMAC signature header
- Tugma ang shared secret sa iyong config sa secret ng source
- Tugma ang signature format (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Kasama sa Triggerfish ang replay protection. Kung natanggap ang webhook payload nang pangalawang beses (parehong signature), nire-reject ito.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Masyadong maraming webhook requests mula sa parehong source sa maikling panahon. Pinoprotektahan nito laban sa webhook floods. Maghintay at subukan ulit.

---

## Audit Integrity

### "previousHash mismatch"

Gumagamit ng hash chaining ang audit log. Kasama sa bawat entry ang hash ng nakaraang entry. Kung nasira ang chain, ibig sabihin ay na-tamper o nasira ang audit log.

### "HMAC mismatch"

Hindi tugma ang HMAC signature ng audit entry. Puwedeng nabago ang entry pagkatapos na magawa.
