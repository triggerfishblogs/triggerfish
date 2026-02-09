# Agent Delegation

As AI agents increasingly interact with each other -- one agent calling another to complete subtasks -- a new class of security risks emerges. An agent chain could be used to launder data through a less-restricted agent, bypassing classification controls. Triggerfish prevents this with cryptographic agent identity, classification ceilings, and mandatory taint inheritance.

## Agent Certificates

Every agent in Triggerfish has a certificate that defines its identity, capabilities, and delegation permissions. This certificate is signed by the agent's owner and cannot be modified by the agent itself or by other agents.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Key fields in the certificate:

| Field | Purpose |
|-------|---------|
| `max_classification` | The **classification ceiling** -- the highest taint level at which this agent can operate. An agent with an INTERNAL ceiling cannot be invoked by a session tainted at CONFIDENTIAL. |
| `can_invoke_agents` | Whether this agent is permitted to call other agents. |
| `can_be_invoked_by` | Explicit allowlist of agents that may invoke this one. |
| `max_delegation_depth` | Maximum depth of the agent invocation chain. Prevents unbounded recursion. |
| `signature` | Ed25519 signature from the owner. Prevents certificate tampering. |

## Invocation Flow

When one agent calls another, the policy layer verifies the delegation before the callee agent executes. The check is deterministic and runs in code -- the calling agent cannot influence the decision.

```
+--------------+         +--------------+         +--------------+
|   Agent A    |         |   Policy     |         |   Agent B    |
|   (Caller)   |         |   Layer      |         |   (Callee)   |
|              |         |              |         |              |
| taint:       |         |              |         | ceiling:     |
| CONFIDENTIAL |         |              |         | INTERNAL     |
+------+-------+         +------+-------+         +------+-------+
       |                        |                        |
       | invoke(agent_b,        |                        |
       |   task, context)       |                        |
       |----------------------->|                        |
       |                        |                        |
       |                        | VERIFY:                |
       |                        | 1. A can invoke B?     |
       |                        | 2. A's taint <= B's    |
       |                        |    ceiling?            |
       |                        |    CONFIDENTIAL <=     |
       |                        |    INTERNAL? NO!       |
       |                        |                        |
       |<-----------------------|                        |
       | BLOCKED: Agent B       |                        |
       | ceiling (INTERNAL)     |                        |
       | below session taint    |                        |
       | (CONFIDENTIAL)         |                        |
```

In this example, Agent A has a session taint of CONFIDENTIAL (it accessed Salesforce data earlier). Agent B has a classification ceiling of INTERNAL. Because CONFIDENTIAL is higher than INTERNAL, the invocation is blocked. Agent A's tainted data cannot flow to an agent with a lower classification ceiling.

::: warning SECURITY
The policy layer checks the caller's **current session taint**, not its ceiling. Even if Agent A has a CONFIDENTIAL ceiling, what matters is the actual taint level of the session at the time of invocation. If Agent A has not accessed any classified data (taint is PUBLIC), it can invoke Agent B (INTERNAL ceiling) without issue.
:::

## Delegation Chain Tracking

When agents invoke other agents, the full chain is tracked with timestamps and taint levels at each step:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

This chain is recorded in the audit log and can be queried for compliance and forensic analysis. You can trace exactly which agents were involved, what their taint levels were, and what tasks they performed.

## Security Invariants

Four invariants govern agent delegation. All are enforced by code in the policy layer and cannot be overridden by any agent in the chain.

| Invariant | Enforcement |
|-----------|-------------|
| **Taint only increases** | Each callee inherits `max(own taint, caller taint)`. A callee can never have a lower taint than its caller. |
| **Ceiling respected** | An agent cannot be invoked if the caller's taint exceeds the callee's `max_classification` ceiling. |
| **Depth limits enforced** | The chain terminates at `max_delegation_depth`. If the limit is 3, a fourth-level invocation is blocked. |
| **Circular invocation blocked** | An agent cannot appear twice in the same chain. If Agent A calls Agent B which tries to call Agent A, the second invocation is blocked. |

### Taint Inheritance in Detail

When Agent A (taint: CONFIDENTIAL) successfully invokes Agent B (ceiling: CONFIDENTIAL), Agent B starts with a taint of CONFIDENTIAL -- inherited from Agent A. If Agent B then accesses RESTRICTED data, its taint escalates to RESTRICTED. This elevated taint is carried back to Agent A when the invocation completes.

```
Agent A (taint: INTERNAL)
  |
  +--> invokes Agent B (ceiling: CONFIDENTIAL)
       Agent B starts with taint: INTERNAL (inherited from A)
       Agent B accesses Salesforce --> taint: CONFIDENTIAL
       Agent B returns result
  |
Agent A taint updates to: CONFIDENTIAL (max of own + callee's)
```

Taint flows in both directions -- from caller to callee at invocation time, and from callee back to caller at completion. It can only escalate.

## Preventing Data Laundering

A key attack vector in multi-agent systems is **data laundering** -- using an agent chain to move classified data to a lower-classification destination by routing it through intermediate agents.

### The Attack

```
Attacker goal: Exfiltrate CONFIDENTIAL data via a PUBLIC channel

Attempted flow:
1. Agent A accesses Salesforce (taint --> CONFIDENTIAL)
2. Agent A invokes Agent B (which has a PUBLIC channel)
3. Agent B sends data to the PUBLIC channel
```

### Why It Fails

Triggerfish blocks this attack at multiple points:

**Block point 1: Invocation check.** If Agent B has a ceiling below CONFIDENTIAL, the invocation is blocked outright. Agent A's taint (CONFIDENTIAL) exceeds Agent B's ceiling.

**Block point 2: Taint inheritance.** Even if Agent B has a CONFIDENTIAL ceiling and the invocation succeeds, Agent B inherits Agent A's CONFIDENTIAL taint. When Agent B tries to output to a PUBLIC channel, the `PRE_OUTPUT` hook blocks the write-down.

**Block point 3: No taint reset in delegation.** Agents in a delegation chain cannot reset their taint. Taint reset is only available to the end user, and it clears the entire conversation history. There is no mechanism for an agent to "wash" its taint level during a chain.

::: danger
Data cannot escape its classification through agent delegation. The combination of ceiling checks, mandatory taint inheritance, and no-taint-reset-in-chains makes data laundering through agent chains impossible within the Triggerfish security model.
:::

## Example Scenarios

### Scenario 1: Successful Delegation

```
Agent A (ceiling: CONFIDENTIAL, current taint: INTERNAL)
  calls Agent B (ceiling: CONFIDENTIAL)

Policy check:
  - A can invoke B? YES (B is in A's delegation list)
  - A's taint (INTERNAL) <= B's ceiling (CONFIDENTIAL)? YES
  - Depth limit OK? YES (depth 1 of max 3)
  - Circular? NO

Result: ALLOWED
Agent B starts with taint: INTERNAL (inherited from A)
```

### Scenario 2: Blocked by Ceiling

```
Agent A (ceiling: RESTRICTED, current taint: CONFIDENTIAL)
  calls Agent B (ceiling: INTERNAL)

Policy check:
  - A's taint (CONFIDENTIAL) <= B's ceiling (INTERNAL)? NO

Result: BLOCKED
Reason: Agent B ceiling (INTERNAL) below session taint (CONFIDENTIAL)
```

### Scenario 3: Blocked by Depth Limit

```
Agent A calls Agent B (depth 1)
  Agent B calls Agent C (depth 2)
    Agent C calls Agent D (depth 3)
      Agent D calls Agent E (depth 4)

Policy check for Agent E:
  - Depth 4 > max_delegation_depth (3)

Result: BLOCKED
Reason: Maximum delegation depth exceeded
```

### Scenario 4: Blocked by Circular Reference

```
Agent A calls Agent B (depth 1)
  Agent B calls Agent C (depth 2)
    Agent C calls Agent A (depth 3)

Policy check for the second Agent A invocation:
  - Agent A already appears in chain

Result: BLOCKED
Reason: Circular agent invocation detected
```

## Related Pages

- [Security-First Design](./) -- overview of the security architecture
- [No Write-Down Rule](./no-write-down) -- the classification flow rule that delegation enforces
- [Identity & Auth](./identity) -- how user and channel identity is established
- [Audit & Compliance](./audit-logging) -- how delegation chains are recorded in the audit log
