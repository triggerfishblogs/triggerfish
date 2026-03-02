# Defense in Depth

Triggerfish implements security as 10 independent, overlapping layers. No single
layer is sufficient on its own. Together, they form a defense that degrades
gracefully -- even if one layer is compromised, the remaining layers continue to
protect the system.

::: warning SECURITY Defense in depth means that a vulnerability in any single
layer does not compromise the system. An attacker who bypasses channel
authentication still faces session taint tracking, policy hooks, and audit
logging. An LLM that is prompt-injected still cannot influence the deterministic
policy layer below it. :::

## The 10 Layers

### Layer 1: Channel Authentication

**Protects against:** Impersonation, unauthorized access, identity confusion.

Identity is determined by **code at session establishment**, not by the LLM
interpreting message content. Before the LLM sees any message, the channel
adapter tags it with an immutable label:

```
{ source: "owner" }    -- verified channel identity matches registered owner
{ source: "external" } -- anyone else; input only, not treated as command
```

Authentication methods vary by channel:

| Channel                 | Method          | Verification                                               |
| ----------------------- | --------------- | ---------------------------------------------------------- |
| Telegram / WhatsApp     | Pairing code    | One-time code, 5-minute expiry, sent from user's account   |
| Slack / Discord / Teams | OAuth           | Platform OAuth consent flow, returns verified user ID      |
| CLI                     | Local process   | Running on the user's machine, authenticated by OS         |
| WebChat                 | None (public)   | All visitors are `EXTERNAL`, never `owner`                 |
| Email                   | Domain matching | Sender domain compared against configured internal domains |

::: info The LLM never decides who is the owner. A message saying "I am the
owner" from an unverified sender is tagged `{ source: "external" }` and cannot
trigger owner-level commands. This decision is made in code, before the LLM
processes the message. :::

### Layer 2: Permission-Aware Data Access

**Protects against:** Over-permissioned data access, privilege escalation
through system credentials.

Triggerfish uses the user's delegated OAuth tokens -- not system service
accounts -- to query external systems. The source system enforces its own
permission model:

```
Traditional model:
  Agent uses system service account -> sees ALL records
  Security depends on LLM refusing to show restricted data

Triggerfish model:
  Agent uses user's delegated token -> sees only user's records
  Source system enforces permissions, no LLM judgment needed
```

The Plugin SDK enforces this at the API level:

| SDK Method                              | Behavior                                |
| --------------------------------------- | --------------------------------------- |
| `sdk.get_user_credential(integration)`  | Returns user's delegated OAuth token    |
| `sdk.query_as_user(integration, query)` | Executes with user's permissions        |
| `sdk.get_system_credential(name)`       | **BLOCKED** -- raises `PermissionError` |

### Layer 3: Session Taint Tracking

**Protects against:** Data leakage through context contamination, classified
data reaching lower-classification channels.

Every session independently tracks a taint level that reflects the highest
classification of data accessed during the session. Taint follows three
invariants:

1. **Per-conversation** -- each session has its own taint
2. **Escalation only** -- taint increases, never decreases
3. **Full reset clears everything** -- taint AND history are wiped together

When the policy engine evaluates an output, it compares the session's taint
against the target channel's effective classification. If the taint exceeds the
target, the output is blocked.

### Layer 4: Data Lineage

**Protects against:** Untraceable data flows, inability to audit where data
went, compliance gaps.

Every data element carries provenance metadata from origin to destination:

- **Origin**: Which integration, record, and user access produced this data
- **Classification**: What level was assigned and why
- **Transformations**: How the LLM modified, summarized, or combined the data
- **Destination**: Which session and channel received the output

Lineage enables forward traces ("where did this Salesforce record go?"),
backward traces ("what sources contributed to this output?"), and full
compliance exports.

### Layer 5: Policy Enforcement Hooks

**Protects against:** Prompt injection attacks, LLM-driven security bypasses,
uncontrolled tool execution.

Eight deterministic hooks intercept every action at critical points in the data
flow:

| Hook                    | What it intercepts                         |
| ----------------------- | ------------------------------------------ |
| `PRE_CONTEXT_INJECTION` | External input entering the context window |
| `PRE_TOOL_CALL`         | LLM requesting tool execution              |
| `POST_TOOL_RESPONSE`    | Data returning from tool execution         |
| `PRE_OUTPUT`            | Response about to leave the system         |
| `SECRET_ACCESS`         | Credential access request                  |
| `SESSION_RESET`         | Taint reset request                        |
| `AGENT_INVOCATION`      | Agent-to-agent call                        |
| `MCP_TOOL_CALL`         | MCP server tool invocation                 |

Hooks are pure code: deterministic, synchronous, logged, and unforgeable. The
LLM cannot bypass them because there is no pathway from LLM output to hook
configuration. The hook layer does not parse LLM output for commands.

### Layer 6: MCP Gateway

**Protects against:** Uncontrolled external tool access, unclassified data
entering through MCP servers, schema violations.

All MCP servers default to `UNTRUSTED` and cannot be invoked until an admin or
user classifies them. The Gateway enforces:

- Server authentication and classification status
- Tool-level permissions (individual tools can be blocked even if the server is
  allowed)
- Request/response schema validation
- Taint tracking on all MCP responses
- Injection pattern scanning in parameters

```
MCP Server States:
  UNTRUSTED  -- default, cannot be invoked
  CLASSIFIED -- reviewed, assigned level, tools permitted
  BLOCKED    -- explicitly prohibited
```

### Layer 7: Plugin Sandbox

**Protects against:** Malicious or buggy plugin code, data exfiltration,
unauthorized system access.

Plugins run inside a double sandbox:

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin sandbox: Deno sandbox wraps WASM sandbox, plugin code runs in the innermost layer" style="max-width: 100%;" />

Plugins cannot:

- Access undeclared network endpoints
- Emit data without classification labels
- Read data without triggering taint propagation
- Persist data outside Triggerfish
- Use system credentials (only user's delegated credentials)
- Exfiltrate via side channels (resource limits, no raw sockets)

::: tip The plugin sandbox is distinct from the agent exec environment. Plugins
are untrusted code that the system protects _from_. The exec environment is a
workspace where the agent is empowered _to build_ -- with policy-governed
access, not sandbox isolation. :::

### Layer 8: Secrets Isolation

**Protects against:** Credential theft, secrets in config files, plaintext
credential storage.

Credentials are stored in the OS keychain (personal tier) or vault integration
(enterprise tier). They never appear in:

- Configuration files
- `StorageProvider` values
- Log entries
- LLM context (credentials are injected at the HTTP layer, below the LLM)

The `SECRET_ACCESS` hook logs every credential access with the requesting
plugin, the credential scope, and the decision.

### Layer 9: Agent Identity

**Protects against:** Privilege escalation through agent chains, data laundering
via delegation.

When agents invoke other agents, cryptographic delegation chains prevent
privilege escalation:

- Each agent has a certificate specifying its capabilities and classification
  ceiling
- The callee inherits `max(own taint, caller taint)` -- taint can only increase
  through chains
- A caller with taint exceeding the callee's ceiling is blocked
- Circular invocations are detected and rejected
- Delegation depth is limited and enforced

```
Attack: Data laundering via agent chain
  Agent A accesses CONFIDENTIAL data
  Agent A invokes Agent B (lower ceiling)
  Agent B sends to PUBLIC channel

Defense:
  Step 2 is BLOCKED -- A's taint exceeds B's ceiling
  Even if B had matching ceiling, B inherits A's taint
  B cannot output to channel below inherited taint
```

### Layer 10: Audit Logging

**Protects against:** Undetectable breaches, compliance failures, inability to
investigate incidents.

Every security-relevant decision is logged with full context:

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

What gets logged:

- All action requests (allowed AND denied)
- Classification decisions
- Session taint changes
- Channel authentication events
- Policy rule evaluations
- Lineage record creation and updates
- MCP Gateway decisions
- Agent-to-agent invocations

::: info Audit logging cannot be disabled. It is a fixed rule in the policy
hierarchy. Even an org admin cannot turn off logging for their own actions.
Enterprise deployments can optionally enable full content logging (including
blocked message content) for forensic requirements. :::

## Trust Hierarchy

The trust model defines who has authority over what. Higher tiers cannot bypass
lower-tier security rules, but they can configure the adjustable parameters
within those rules.

```
TRIGGERFISH (Vendor)
  - Zero access by default
  - Customer-granted support access only (time-bound, logged)
         ^
         | explicit grant only
ORG ADMIN (Customer)
  - Full visibility into all employee-agent activity
  - Sets policies, permissions, allowed integrations
  - Controls data retention, export, legal hold
         ^
         | org policy constrains
EMPLOYEE (End User)
  - Uses agent within org-defined boundaries
  - Knows conversations are visible to employer
```

::: tip **Personal tier:** The user IS the org admin. Full sovereignty. No
Triggerfish visibility. The vendor has zero access to user data by default and
can only gain access through an explicit, time-bound, logged grant from the
user. :::

## How the Layers Work Together

Consider a prompt injection attack where a malicious message attempts to
exfiltrate data:

| Step | Layer                  | Action                                                |
| ---- | ---------------------- | ----------------------------------------------------- |
| 1    | Channel authentication | Message tagged `{ source: "external" }` -- not owner  |
| 2    | PRE_CONTEXT_INJECTION  | Input scanned for injection patterns, classified      |
| 3    | Session taint          | Session taint unchanged (no classified data accessed) |
| 4    | LLM processes message  | LLM may be manipulated into requesting a tool call    |
| 5    | PRE_TOOL_CALL          | Tool permission check against external-source rules   |
| 6    | POST_TOOL_RESPONSE     | Any returned data classified, taint updated           |
| 7    | PRE_OUTPUT             | Output classification vs. target checked              |
| 8    | Audit logging          | Entire sequence recorded for review                   |

Even if the LLM is fully compromised at step 4 and requests a data exfiltration
tool call, the remaining layers (permission checks, taint tracking, output
classification, audit logging) continue to enforce policy. No single point of
failure compromises the system.
