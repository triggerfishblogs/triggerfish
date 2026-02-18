# Sessions & Taint

Sessions are the fundamental unit of conversation state in Triggerfish. Every session independently tracks a **taint level** -- a classification watermark that records the highest sensitivity of data accessed during the session. Taint drives the policy engine's output decisions: if a session is tainted at `CONFIDENTIAL`, no data from that session can flow to a channel classified below `CONFIDENTIAL`.

## Session Taint Model

### How Taint Works

When a session accesses data at a classification level, the entire session is **tainted** at that level. Taint follows three rules:

1. **Per-conversation**: Each session has its own independent taint level
2. **Escalation only**: Taint can increase, never decrease within a session
3. **Full reset clears everything**: Taint AND conversation history are cleared together

<img src="/diagrams/taint-escalation.svg" alt="Taint escalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint can only escalate, never decrease." style="max-width: 100%;" />

::: warning SECURITY
Taint can never be selectively reduced. There is no mechanism to "un-taint" a session without clearing the entire conversation history. This prevents context leakage -- if the session remembers seeing confidential data, the taint must reflect that.
:::

### Why Taint Cannot Decrease

Even if the classified data is no longer displayed, the LLM's context window still contains it. The model may reference, summarize, or echo classified information in future responses. The only safe way to lower taint is to eliminate the context entirely -- which is exactly what a full reset does.

## Session Types

Triggerfish manages several session types, each with independent taint tracking:

| Session Type | Description | Initial Taint | Persists Across Restarts |
|-------------|-------------|---------------|--------------------------|
| **Main** | Primary direct conversation with the owner | `PUBLIC` | Yes |
| **Channel** | One per connected channel (Telegram, Slack, etc.) | `PUBLIC` | Yes |
| **Background** | Spawned for autonomous tasks (cron, webhooks) | `PUBLIC` | Duration of task |
| **Agent** | Per-agent sessions for multi-agent routing | `PUBLIC` | Yes |
| **Group** | Group chat sessions | `PUBLIC` | Yes |

::: info
Background sessions always start with `PUBLIC` taint, regardless of the parent session's taint level. This is by design -- cron jobs and webhook-triggered tasks should not inherit the taint of whichever session happened to spawn them.
:::

## Taint Escalation Example

Here is a complete flow showing taint escalation and the resulting policy block:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint escalation example: session starts PUBLIC, escalates to CONFIDENTIAL after Salesforce access, then BLOCKS output to PUBLIC WhatsApp channel" style="max-width: 100%;" />

## Full Reset Mechanism

A session reset is the only way to lower taint. It is a deliberate, destructive operation:

1. **Archive lineage records** -- All lineage data from the session is preserved in audit storage
2. **Clear conversation history** -- The entire context window is wiped
3. **Reset taint to PUBLIC** -- The session starts fresh
4. **Require user confirmation** -- The `SESSION_RESET` hook requires explicit confirmation before executing

After a reset, the session is indistinguishable from a brand-new session. The agent has no memory of the previous conversation. This is the only way to guarantee that classified data cannot leak through the LLM's context.

## Inter-Session Communication

When an agent sends data between sessions using `sessions_send`, the same write-down rules apply:

| Source Session Taint | Target Session Channel | Decision |
|---------------------|----------------------|----------|
| `PUBLIC` | `PUBLIC` channel | ALLOW |
| `CONFIDENTIAL` | `CONFIDENTIAL` channel | ALLOW |
| `CONFIDENTIAL` | `PUBLIC` channel | BLOCK |
| `RESTRICTED` | `CONFIDENTIAL` channel | BLOCK |

Session tools available to the agent:

| Tool | Description | Taint Impact |
|------|-------------|-------------|
| `sessions_list` | List active sessions with filters | No taint change |
| `sessions_history` | Retrieve transcript for a session | Taint inherits from referenced session |
| `sessions_send` | Send message to another session | Subject to write-down check |
| `sessions_spawn` | Create background task session | New session starts at `PUBLIC` |
| `session_status` | Check current session state and metadata | No taint change |

## Data Lineage

Every data element processed by Triggerfish carries **provenance metadata** -- a complete record of where data came from, how it was transformed, and where it went. Lineage is the audit trail that makes classification decisions verifiable.

### Lineage Record Structure

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Lineage Tracking Rules

| Event | Lineage Action |
|-------|----------------|
| Data read from integration | Create lineage record with origin |
| Data transformed by LLM | Append transformation, link input lineages |
| Data aggregated from multiple sources | Merge lineage, classification = `max(inputs)` |
| Data sent to channel | Record destination, verify classification |
| Session reset | Archive lineage records, clear from context |

### Aggregation Classification

When data from multiple sources is combined (e.g., an LLM summary of records from different integrations), the aggregated result inherits the **maximum classification** of all inputs:

```
Input 1: INTERNAL    (internal wiki)
Input 2: CONFIDENTIAL (Salesforce record)
Input 3: PUBLIC      (weather API)

Aggregated output classification: CONFIDENTIAL (max of inputs)
```

::: tip
Enterprise deployments can configure optional downgrade rules for statistical aggregates (averages, counts, sums of 10+ records) or certified anonymized data. All downgrades require explicit policy rules, are logged with full justification, and are subject to audit review.
:::

### Audit Capabilities

Lineage enables four categories of audit queries:

- **Forward trace**: "What happened to data from Salesforce record X?" -- follows data forward from origin to all destinations
- **Backward trace**: "What sources contributed to this output?" -- traces an output back to all its source records
- **Classification justification**: "Why is this marked CONFIDENTIAL?" -- shows the classification reason chain
- **Compliance export**: Full chain of custody for legal or regulatory review

## Taint Persistence

Session taint is persisted through the `StorageProvider` under the `taint:` namespace. This means taint survives daemon restarts -- a session that was `CONFIDENTIAL` before a restart is still `CONFIDENTIAL` after.

Lineage records are persisted under the `lineage:` namespace with compliance-driven retention (default 90 days).
