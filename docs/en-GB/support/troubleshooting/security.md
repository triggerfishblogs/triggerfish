# Troubleshooting: Security & Classification

## Write-Down Blocks

### "Write-down blocked"

This is the most common security error. It means data is trying to flow from a higher classification level to a lower one.

**Example:** Your session accessed CONFIDENTIAL data (read a classified file, queried a classified database). The session taint is now CONFIDENTIAL. You then tried to send the response to a PUBLIC WebChat channel. The policy engine blocks this because CONFIDENTIAL data cannot flow to PUBLIC destinations.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**How to resolve:**
1. **Start a new session.** A fresh session starts at PUBLIC taint. Use a new conversation.
2. **Use a higher-classified channel.** Send the response through a channel classified at CONFIDENTIAL or above.
3. **Understand what caused the taint.** Check the logs for "Taint escalation" entries to see which tool call raised the session's classification.

### "Session taint cannot flow to channel"

Same as write-down, but specifically about channel classification:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Tool calls to classified integrations also enforce write-down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Wait, this looks backwards. The session taint is higher than the tool's classification. This means the session is too tainted to use a lower-classified tool. The concern is that calling the tool might leak classified context into a less-secure system.

### "Workspace write-down blocked"

Agent workspaces have per-directory classification. Writing to a lower-classified directory from a higher-tainted session is blocked:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint Escalation

### "Taint escalation"

This is informational, not an error. It means the session's classification level just increased because the agent accessed classified data.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint only goes up, never down. Once a session is tainted to CONFIDENTIAL, it stays there for the rest of the session.

### "Resource-based taint escalation firing"

A tool call accessed a resource with a classification higher than the session's current taint. The session taint is automatically escalated to match.

### "Non-owner taint applied"

Non-owner users may have their sessions tainted based on the channel's classification or the user's permissions. This is separate from resource-based taint.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

All outbound HTTP requests (web_fetch, browser navigation, MCP SSE connections) go through SSRF protection. If the target hostname resolves to a private IP address, the request is blocked.

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

This protection is hardcoded and cannot be disabled or configured. It prevents the AI agent from being tricked into accessing internal services.

**IPv4-mapped IPv6:** Addresses like `::ffff:127.0.0.1` are detected and blocked.

### "SSRF check blocked outbound request"

Same as above, but logged from the web_fetch tool instead of the SSRF module.

### DNS resolution failures

```
DNS resolution failed for hostname
No DNS records found for hostname
```

The hostname could not be resolved. Check:
- The URL is spelt correctly
- Your DNS server is reachable
- The domain actually exists

---

## Policy Engine

### "Hook evaluation failed, defaulting to BLOCK"

A policy hook threw an exception during evaluation. When this happens, the default action is BLOCK (deny). This is the safe default.

Check the logs for the full exception. It likely indicates a bug in a custom policy rule.

### "Policy rule blocked action"

A policy rule explicitly denied the action. The log entry includes which rule fired and why. Check the `policy.rules` section of your config to see what rules are defined.

### "Tool floor violation"

A tool was called that requires a minimum classification level, but the session is below that level.

**Example:** The healthcheck tool requires at minimum INTERNAL classification (because it reveals system internals). If a PUBLIC session tries to use it, the call is blocked.

---

## Plugin & Skill Security

### "Plugin network access blocked"

Plugins run in a sandbox with restricted network access. They can only access URLs on their declared endpoint domain.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

The plugin tried to access a URL not in its declared endpoints, or the URL resolved to a private IP.

### "Skill activation blocked by classification ceiling"

Skills declare a `classification_ceiling` in their SKILL.md frontmatter. If the ceiling is below the session's taint level, the skill cannot be activated:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

This prevents a lower-classified skill from being exposed to higher-classified data.

### "Skill content integrity check failed"

After installation, Triggerfish hashes the skill's content. If the hash changes (the skill was modified after installation), the integrity check fails:

```
Skill content hash mismatch detected
```

This could indicate tampering. Re-install the skill from a trusted source.

### "Skill install rejected by scanner"

The security scanner found suspicious content in the skill. The scanner checks for patterns that could indicate malicious behaviour. The specific warnings are included in the error message.

---

## Session Security

### "Session not found"

```
Session not found: <session-id>
```

The requested session does not exist in the session manager. It may have been cleaned up, or the session ID is invalid.

### "Session status access denied: taint exceeds caller"

You tried to view a session's status, but that session has a higher taint level than your current session. This prevents lower-classified sessions from learning about higher-classified operations.

### "Session history access denied"

Same concept as above, but for viewing conversation history.

---

## Agent Teams

### "Team message delivery denied: team status is ..."

The team is not in `running` status. This happens when:

- The team was **disbanded** (manually or by the lifecycle monitor)
- The team was **paused** because the lead session failed
- The team **timed out** after exceeding its lifetime limit

Check the team's current status with `team_status`. If the team is paused due to lead failure, you can disband it with `team_disband` and create a new one.

### "Team member not found" / "Team member ... is not active"

The target member either does not exist (wrong role name) or has been terminated. Members are terminated when:

- They exceed the idle timeout (2x `idle_timeout_seconds`)
- The team is disbanded
- Their session crashes and the lifecycle monitor detects it

Use `team_status` to see all members and their current status.

### "Team disband denied: only the lead or creating session can disband"

Only two sessions can disband a team:

1. The session that originally called `team_create`
2. The lead member's session

If you are getting this error from within the team, the calling member is not the lead. If you are getting it from outside the team, you are not the session that created it.

### Team lead immediately fails after creation

The lead's agent session could not complete its first turn. Common causes:

1. **LLM provider error:** The provider returned an error (rate limit, auth failure, model not found). Check `triggerfish logs` for provider errors.
2. **Classification ceiling too low:** If the lead needs tools classified above its ceiling, the session may fail on its first tool call.
3. **Missing tools:** The lead may need specific tools to decompose work. Ensure tool profiles are configured correctly.

### Team members idle and never produce output

Members wait for the lead to send them work via `sessions_send`. If the lead does not decompose the task:

- The lead's model may not understand team coordination. Try a more capable model for the lead role.
- The `task` description may be too vague for the lead to decompose into sub-tasks.
- Check `team_status` to see if the lead is `active` and has recent activity.

### "Write-down blocked" between team members

Team members follow the same classification rules as all sessions. If one member has been tainted to `CONFIDENTIAL` and tries to send data to a member at `PUBLIC`, the write-down check blocks it. This is expected behaviour -- classified data cannot flow to lower-classified sessions, even within a team.

---

## Delegation & Multi-Agent

### "Delegation certificate signature invalid"

Agent delegation uses cryptographic certificates. If the signature check fails, the delegation is rejected. This prevents forged delegation chains.

### "Delegation certificate expired"

The delegation certificate has a time-to-live. If it has expired, the delegated agent can no longer act on behalf of the delegator.

### "Delegation chain linkage broken"

In multi-hop delegations (A delegates to B, B delegates to C), each link in the chain must be valid. If any link is broken, the entire chain is rejected.

---

## Webhooks

### "Webhook HMAC verification failed"

Incoming webhooks require HMAC signatures for authentication. If the signature is missing, malformed, or does not match:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Check that:
- The webhook source is sending the correct HMAC signature header
- The shared secret in your config matches the source's secret
- The signature format matches (hex-encoded HMAC-SHA256)

### "Webhook replay detected"

Triggerfish includes replay protection. If a webhook payload is received a second time (same signature), it is rejected.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Too many webhook requests from the same source in a short period. This protects against webhook floods. Wait and try again.

---

## Audit Integrity

### "previousHash mismatch"

The audit log uses hash chaining. Each entry includes the hash of the previous entry. If the chain is broken, it means the audit log was tampered with or corrupted.

### "HMAC mismatch"

The audit entry's HMAC signature does not match. The entry may have been modified after creation.
