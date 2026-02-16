# Security-First Design

Triggerfish is built on a single premise: **the LLM has zero authority**. It requests actions; the policy layer decides. Every security decision is made by deterministic code that the AI cannot bypass, override, or influence.

This page explains why Triggerfish takes this approach, how it differs from traditional AI agent platforms, and where to find details on each component of the security model.

## Why Security Must Be Below the LLM

Large language models can be prompt-injected. A carefully crafted input -- whether from a malicious external message, a poisoned document, or a compromised tool response -- can cause an LLM to ignore its instructions and take actions it was told not to take. This is not a theoretical risk. It is a well-documented, unsolved problem in the AI industry.

If your security model depends on the LLM following rules, a single successful injection can bypass every safeguard you have built.

Triggerfish solves this by moving all security enforcement to a code layer that sits **below** the LLM. The AI never sees security decisions. It never evaluates whether an action should be allowed. It simply requests actions, and the policy enforcement layer -- running as pure, deterministic code -- decides whether those actions proceed.

```
+----------------------------------------------------------+
|  LLM / Agent Reasoning Layer                             |
|  - Can be manipulated via prompt injection               |
|  - Does NOT make security decisions                      |
|  - Requests actions, does not execute them               |
|  - Has ZERO authority                                    |
+----------------------------------------------------------+
                         |
                         v  action request (structured)
+----------------------------------------------------------+
|  POLICY ENFORCEMENT LAYER                                |
|  - Pure code, deterministic                              |
|  - Tracks taint labels on all data in context            |
|  - Computes effective classification of any output       |
|  - Compares against channel/recipient classification     |
|  - BLOCKS or ALLOWS -- no LLM discretion                 |
|  - Logs all decisions for audit                          |
|  - Cannot be prompt-injected                             |
+----------------------------------------------------------+
                         |
                         v  allowed actions only
+----------------------------------------------------------+
|  Execution Layer (plugins, tool calls, messages)         |
+----------------------------------------------------------+
```

::: warning SECURITY
The LLM layer has no mechanism to override, skip, or influence the policy enforcement layer. There is no "parse LLM output for bypass commands" logic. The separation is architectural, not behavioral.
:::

## The Core Invariant

Every design decision in Triggerfish flows from one invariant:

> **Same input always produces the same security decision. No randomness, no LLM calls, no discretion.**

This means security behavior is:

- **Auditable** -- you can replay any decision and get the same result
- **Testable** -- deterministic code can be covered by automated tests
- **Verifiable** -- the policy engine is open source (MIT licensed) and anyone can inspect it

## Security Principles

| Principle | What It Means | Detail Page |
|-----------|--------------|-------------|
| **Data Classification** | All data carries a sensitivity level (RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC). Classification is assigned by code when data enters the system. | [Architecture: Classification](/architecture/classification) |
| **No Write-Down** | Data can only flow to channels and recipients at an equal or higher classification level. CONFIDENTIAL data cannot reach a PUBLIC channel. No exceptions. | [No Write-Down Rule](./no-write-down) |
| **Session Taint** | When a session accesses data at a classification level, the entire session is tainted to that level. Taint can only escalate, never decrease. | [Architecture: Taint](/architecture/taint-and-sessions) |
| **Deterministic Hooks** | Eight enforcement hooks run at critical points in every data flow. Each hook is synchronous, logged, and unforgeable. | [Architecture: Policy Engine](/architecture/policy-engine) |
| **Identity in Code** | User identity is determined by code at session establishment, not by the LLM interpreting message content. | [Identity & Auth](./identity) |
| **Agent Delegation** | Agent-to-agent calls are governed by cryptographic certificates, classification ceilings, and depth limits. | [Agent Delegation](./agent-delegation) |
| **Secrets Isolation** | Credentials are stored in OS keychains or vaults, never in config files. Plugins cannot access system credentials. | [Secrets Management](./secrets) |
| **Audit Everything** | Every policy decision is logged with full context: timestamp, hook type, session ID, input, result, and rules evaluated. | [Audit & Compliance](./audit-logging) |

## Traditional AI Agents vs. Triggerfish

Most AI agent platforms rely on the LLM to enforce safety. The system prompt says "do not share sensitive data," and the agent is trusted to comply. This approach has fundamental weaknesses.

| Aspect | Traditional AI Agent | Triggerfish |
|--------|---------------------|-------------|
| **Security enforcement** | System prompt instructions to the LLM | Deterministic code below the LLM |
| **Prompt injection defense** | Hope the LLM resists | LLM has no authority to begin with |
| **Data flow control** | LLM decides what is safe to share | Classification labels + no-write-down rule in code |
| **Identity verification** | LLM interprets "I am the admin" | Code checks cryptographic channel identity |
| **Audit trail** | LLM conversation logs | Structured policy decision logs with full context |
| **Credential access** | System service account for all users | Delegated user credentials; source system permissions inherited |
| **Testability** | Fuzzy -- depends on prompt wording | Deterministic -- same input, same decision, every time |
| **Open for verification** | Usually proprietary | MIT licensed, fully auditable |

::: tip
Triggerfish does not claim that LLMs are unreliable. It claims that LLMs are the wrong layer for security enforcement. A well-prompted LLM will follow its instructions most of the time. But "most of the time" is not a security guarantee. Triggerfish provides a guarantee: the policy layer is code, and code does what it is told, every time.
:::

## Defense in Depth

Triggerfish implements ten layers of defense. No single layer is sufficient on its own; together, they form a comprehensive security boundary:

1. **Channel authentication** -- code-verified identity at session establishment
2. **Permission-aware data access** -- source system permissions, not system credentials
3. **Session taint tracking** -- automatic, mandatory, escalation-only
4. **Data lineage** -- full provenance chain for every data element
5. **Policy enforcement hooks** -- deterministic, non-bypassable, logged
6. **MCP Gateway** -- secure external tool access with per-tool permissions
7. **Plugin sandbox** -- Deno + WASM double isolation
8. **Secrets isolation** -- OS keychain or vault, never config files
9. **Agent identity** -- cryptographic delegation chains
10. **Audit logging** -- all decisions recorded, no exceptions

## Next Steps

| Page | Description |
|------|-------------|
| [Classification Guide](/guide/classification-guide) | Practical guide to choosing the right level for channels, MCP servers, and integrations |
| [No Write-Down Rule](./no-write-down) | The fundamental data flow rule and how it is enforced |
| [Identity & Auth](./identity) | Channel authentication and owner identity verification |
| [Agent Delegation](./agent-delegation) | Agent-to-agent identity, certificates, and delegation chains |
| [Secrets Management](./secrets) | How Triggerfish handles credentials across tiers |
| [Audit & Compliance](./audit-logging) | Audit trail structure, tracing, and compliance exports |
