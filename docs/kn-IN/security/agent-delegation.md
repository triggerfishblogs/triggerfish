# Agent Delegation

AI agents ಪರಸ್ಪರ ಹೆಚ್ಚಿನ ಸಂವಾದಿಸುತ್ತಿರುವಂತೆ -- ಒಂದು agent ಉಪ-ಕಾರ್ಯಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು
ಮತ್ತೊಂದು agent ಕರೆಯುತ್ತದೆ -- ಭದ್ರತಾ ಅಪಾಯಗಳ ಹೊಸ ವರ್ಗ ಉದ್ಭವಿಸುತ್ತದೆ. Agent chain
ಅನ್ನು classification controls ತಪ್ಪಿಸಿ ಕಡಿಮೆ ನಿರ್ಬಂಧಿತ agent ಮೂಲಕ ಡೇಟಾ launder ಮಾಡಲು
ಬಳಸಬಹುದು. Triggerfish ಇದನ್ನು cryptographic agent identity, classification ceilings, ಮತ್ತು
mandatory taint inheritance ನಿಂದ ತಡೆಯುತ್ತದೆ.

## Agent Certificates

Triggerfish ನ ಪ್ರತಿ agent ಅದರ identity, capabilities, ಮತ್ತು delegation permissions
ನಿರ್ಧರಿಸುವ certificate ಹೊಂದಿದೆ. ಈ certificate agent ನ owner ನಿಂದ signed ಮತ್ತು agent
ಸ್ವತಃ ಅಥವಾ ಇತರ agents ನಿಂದ modify ಮಾಡಲಾಗದು.

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

Certificate ನ ಪ್ರಮುಖ fields:

| Field                  | ಉದ್ದೇಶ                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | **Classification ceiling** -- ಈ agent operate ಮಾಡಬಹುದಾದ ಅತ್ಯಧಿಕ taint level. INTERNAL ceiling ಇರುವ agent CONFIDENTIAL tainted session ನಿಂದ invoke ಮಾಡಲಾಗದು.                    |
| `can_invoke_agents`    | ಈ agent ಇತರ agents ಕರೆಯಲು permission ಹೊಂದಿದೆಯೇ.                                                                                                                                |
| `can_be_invoked_by`    | ಈ agent invoke ಮಾಡಬಹುದಾದ agents ನ ಸ್ಪಷ್ಟ allowlist.                                                                                                                             |
| `max_delegation_depth` | Agent invocation chain ನ ಗರಿಷ್ಠ ಆಳ. Unbounded recursion ತಡೆಯುತ್ತದೆ.                                                                                                          |
| `signature`            | Owner ನಿಂದ Ed25519 signature. Certificate tampering ತಡೆಯುತ್ತದೆ.                                                                                                                |

## Invocation Flow

ಒಂದು agent ಮತ್ತೊಂದನ್ನು ಕರೆದಾಗ, callee agent execute ಆಗುವ ಮೊದಲು policy layer delegation
ಪರಿಶೀಲಿಸುತ್ತದೆ. Check deterministic ಮತ್ತು ಕೋಡ್‌ನಲ್ಲಿ ಚಲಿಸುತ್ತದೆ -- calling agent
ನಿರ್ಧಾರ ಪ್ರಭಾವಿಸಲಾಗದು.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agent delegation sequence: Agent A invokes Agent B, policy layer verifies taint vs ceiling and blocks when taint exceeds ceiling" style="max-width: 100%;" />

ಈ ಉದಾಹರಣೆಯಲ್ಲಿ, Agent A ನ session taint CONFIDENTIAL (ಇದು ಮೊದಲೇ Salesforce ಡೇಟಾ
ಪ್ರವೇಶಿಸಿದೆ). Agent B ನ classification ceiling INTERNAL. CONFIDENTIAL INTERNAL ಗಿಂತ
ಹೆಚ್ಚಿರುವ ಕಾರಣ, invocation ತಡೆಯಲ್ಪಡುತ್ತದೆ. Agent A ನ tainted ಡೇಟಾ ಕಡಿಮೆ classification
ceiling ಇರುವ agent ಗೆ ಹರಿಯಲಾಗದು.

::: warning SECURITY Policy layer caller ನ **ಪ್ರಸ್ತುತ session taint** ಪರಿಶೀಲಿಸುತ್ತದೆ, ಅದರ
ceiling ಅಲ್ಲ. Agent A CONFIDENTIAL ceiling ಹೊಂದಿದ್ದರೂ, invocation ಸಮಯದಲ್ಲಿ session ನ ವಾಸ್ತವ
taint level ಮುಖ್ಯ. Agent A ಯಾವ classified ಡೇಟಾ ಪ್ರವೇಶಿಸಿಲ್ಲದಿದ್ದರೆ (taint PUBLIC), ಇದು
ಸಮಸ್ಯೆ ಇಲ್ಲದೆ Agent B (INTERNAL ceiling) invoke ಮಾಡಬಹುದು. :::

## Delegation Chain Tracking

Agents ಇತರ agents invoke ಮಾಡಿದಾಗ, ಸಂಪೂರ್ಣ chain ಪ್ರತಿ step ನಲ್ಲಿ timestamps ಮತ್ತು taint
levels ನೊಂದಿಗೆ tracked ಆಗುತ್ತದೆ:

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

ಈ chain audit log ನಲ್ಲಿ ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ ಮತ್ತು compliance ಮತ್ತು forensic analysis ಗಾಗಿ
query ಮಾಡಬಹುದು. ಯಾವ agents ತೊಡಗಿಕೊಂಡಿದ್ದವು, ಅವರ taint levels ಏನಾಗಿದ್ದವು, ಮತ್ತು ಅವರು
ಯಾವ ಕಾರ್ಯಗಳು ನಿರ್ವಹಿಸಿದರು ಎಂದು ನಿಖರವಾಗಿ trace ಮಾಡಬಹುದು.

## ಭದ್ರತಾ Invariants

ಒಳ್ಳೆಯ ನಾಲ್ಕು invariants agent delegation ನಿಯಂತ್ರಿಸುತ್ತವೆ. ಎಲ್ಲವೂ policy layer ಕೋಡ್‌ನಿಂದ
ಜಾರಿಗೊಳ್ಳುತ್ತವೆ ಮತ್ತು chain ನ ಯಾವ agent ನಿಂದಲೂ override ಮಾಡಲಾಗದು.

| Invariant                        | Enforcement                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Taint ಮಾತ್ರ ಹೆಚ್ಚಾಗುತ್ತದೆ**   | ಪ್ರತಿ callee `max(own taint, caller taint)` ಆನುವಂಶಿಕವಾಗಿ ಪಡೆಯುತ್ತದೆ. Callee caller ಗಿಂತ ಕಡಿಮೆ taint ಎಂದಿಗೂ ಹೊಂದಲಾಗದು.             |
| **Ceiling ಗೌರವಿಸಲ್ಪಡುತ್ತದೆ**     | Caller ನ taint callee ನ `max_classification` ceiling ಮೀರಿದರೆ agent invoke ಮಾಡಲಾಗದು.                                              |
| **Depth limits ಜಾರಿಗೊಳ್ಳುತ್ತವೆ** | Chain `max_delegation_depth` ನಲ್ಲಿ ಕೊನೆಗೊಳ್ಳುತ್ತದೆ. Limit 3 ಆಗಿದ್ದರೆ, ನಾಲ್ಕನೇ ಮಟ್ಟದ invocation ತಡೆಯಲ್ಪಡುತ್ತದೆ.                     |
| **Circular invocation ತಡೆಯಲ್ಪಡುತ್ತದೆ** | Agent ಅದೇ chain ನಲ್ಲಿ ಎರಡು ಬಾರಿ ಕಾಣಿಸಿಕೊಳ್ಳಲಾಗದು. Agent A, Agent B ಕರೆದರೆ ಅದು Agent A ಕರೆಯಲು ಪ್ರಯತ್ನಿಸಿದರೆ, ಎರಡನೇ invocation ತಡೆಯಲ್ಪಡುತ್ತದೆ. |

### Taint Inheritance ವಿವರವಾಗಿ

Agent A (taint: CONFIDENTIAL) ಯಶಸ್ವಿಯಾಗಿ Agent B (ceiling: CONFIDENTIAL) invoke ಮಾಡಿದಾಗ,
Agent B CONFIDENTIAL taint ನೊಂದಿಗೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ -- Agent A ನಿಂದ ಆನುವಂಶಿಕ. Agent B
RESTRICTED ಡೇಟಾ ಪ್ರವೇಶಿಸಿದರೆ, ಅದರ taint RESTRICTED ಗೆ escalate ಆಗುತ್ತದೆ. ಈ elevated taint
invocation ಪೂರ್ಣಗೊಂಡಾಗ Agent A ಗೆ ಹಿಂತಿರುಗಿಸಲ್ಪಡುತ್ತದೆ.

<img src="/diagrams/taint-inheritance.svg" alt="Taint inheritance: Agent A (INTERNAL) invokes Agent B, B inherits taint, accesses Salesforce (CONFIDENTIAL), returns elevated taint to A" style="max-width: 100%;" />

Taint ಎರಡೂ ದಿಕ್ಕಿನಲ್ಲಿ ಹರಿಯುತ್ತದೆ -- invocation ಸಮಯದಲ್ಲಿ caller ನಿಂದ callee ಗೆ, ಮತ್ತು
completion ನಲ್ಲಿ callee ನಿಂದ caller ಗೆ. ಇದು ಮಾತ್ರ escalate ಮಾಡಬಹುದು.

## ಡೇಟಾ Laundering ತಡೆಯುವುದು

Multi-agent systems ನಲ್ಲಿ ಪ್ರಮುಖ attack vector **data laundering** -- ಮಧ್ಯಂತರ agents
ಮೂಲಕ route ಮಾಡಿ classified ಡೇಟಾ ಕಡಿಮೆ-classification destination ಗೆ ಸ್ಥಳಾಂತರಿಸಲು agent
chain ಬಳಸುವುದು.

### Attack

```
ಆಕ್ರಮಣಕಾರ ಗುರಿ: PUBLIC channel ಮೂಲಕ CONFIDENTIAL ಡೇಟಾ exfiltrate ಮಾಡಿ

ಪ್ರಯತ್ನಿಸಿದ flow:
1. Agent A Salesforce ಪ್ರವೇಶಿಸುತ್ತದೆ (taint --> CONFIDENTIAL)
2. Agent A, PUBLIC channel ಹೊಂದಿರುವ Agent B invoke ಮಾಡುತ್ತದೆ
3. Agent B PUBLIC channel ಗೆ ಡೇಟಾ ಕಳುಹಿಸುತ್ತದೆ
```

### ಏಕೆ ವಿಫಲವಾಗುತ್ತದೆ

Triggerfish ಈ attack ಅನ್ನು ಹಲವು ಬಿಂದುಗಳಲ್ಲಿ ತಡೆಯುತ್ತದೆ:

**Block ಬಿಂದು 1: Invocation check.** Agent B ಗೆ CONFIDENTIAL ಗಿಂತ ಕಡಿಮೆ ceiling ಇದ್ದರೆ,
invocation ಸಂಪೂರ್ಣ ತಡೆಯಲ್ಪಡುತ್ತದೆ. Agent A ನ taint (CONFIDENTIAL) Agent B ನ ceiling
ಮೀರುತ್ತದೆ.

**Block ಬಿಂದು 2: Taint inheritance.** Agent B CONFIDENTIAL ceiling ಹೊಂದಿದ್ದರೂ invocation
ಯಶಸ್ವಿಯಾದರೂ, Agent B Agent A ನ CONFIDENTIAL taint ಆನುವಂಶಿಕ ಪಡೆಯುತ್ತದೆ. Agent B PUBLIC
channel ಗೆ output ಕಳುಹಿಸಲು ಪ್ರಯತ್ನಿಸಿದಾಗ, `PRE_OUTPUT` hook write-down ತಡೆಯುತ್ತದೆ.

**Block ಬಿಂದು 3: Delegation ನಲ್ಲಿ taint reset ಇಲ್ಲ.** Delegation chain ನಲ್ಲಿ agents ತಮ್ಮ
taint reset ಮಾಡಿಕೊಳ್ಳಲಾಗದು. Session reset ಕೇವಲ end user ಗೆ ಲಭ್ಯ, ಮತ್ತು ಇದು ಸಂಪೂರ್ಣ
ಸಂಭಾಷಣೆ ಇತಿಹಾಸ clear ಮಾಡುತ್ತದೆ. Chain ಸಮಯದಲ್ಲಿ agent ತನ್ನ taint level "wash" ಮಾಡಿಕೊಳ್ಳಲು
ಯಾವ ಕಾರ್ಯವಿಧಾನ ಇಲ್ಲ.

::: danger ಡೇಟಾ agent delegation ಮೂಲಕ ತನ್ನ classification ತಪ್ಪಿಸಲಾಗದು. Ceiling checks,
mandatory taint inheritance, ಮತ್ತು chains ನಲ್ಲಿ no-taint-reset ಸಂಯೋಜನೆ Triggerfish
ಭದ್ರತಾ ಮಾದರಿಯಲ್ಲಿ agent chains ಮೂಲಕ data laundering ಅಸಾಧ್ಯಗೊಳಿಸುತ್ತದೆ. :::

## ಉದಾಹರಣೆ Scenarios

### Scenario 1: ಯಶಸ್ವಿ Delegation

```
Agent A (ceiling: CONFIDENTIAL, ಪ್ರಸ್ತುತ taint: INTERNAL)
  Agent B ಕರೆಯುತ್ತದೆ (ceiling: CONFIDENTIAL)

Policy check:
  - A, B invoke ಮಾಡಬಹುದೇ? ಹೌದು (B A ನ delegation list ನಲ್ಲಿ ಇದೆ)
  - A ನ taint (INTERNAL) <= B ನ ceiling (CONFIDENTIAL)? ಹೌದು
  - Depth limit OK? ಹೌದು (max 3 ರ ಆಳ 1)
  - Circular? ಇಲ್ಲ

ಫಲಿತಾಂಶ: ALLOWED
Agent B taint ನೊಂದಿಗೆ ಪ್ರಾರಂಭ: INTERNAL (A ನಿಂದ ಆನುವಂಶಿಕ)
```

### Scenario 2: Ceiling ನಿಂದ ತಡೆಯಲ್ಪಟ್ಟಿದೆ

```
Agent A (ceiling: RESTRICTED, ಪ್ರಸ್ತುತ taint: CONFIDENTIAL)
  Agent B ಕರೆಯುತ್ತದೆ (ceiling: INTERNAL)

Policy check:
  - A ನ taint (CONFIDENTIAL) <= B ನ ceiling (INTERNAL)? ಇಲ್ಲ

ಫಲಿತಾಂಶ: BLOCKED
ಕಾರಣ: Agent B ceiling (INTERNAL) session taint (CONFIDENTIAL) ಗಿಂತ ಕಡಿಮೆ
```

### Scenario 3: Depth Limit ನಿಂದ ತಡೆಯಲ್ಪಟ್ಟಿದೆ

```
Agent A, Agent B ಕರೆಯುತ್ತದೆ (depth 1)
  Agent B, Agent C ಕರೆಯುತ್ತದೆ (depth 2)
    Agent C, Agent D ಕರೆಯುತ್ತದೆ (depth 3)
      Agent D, Agent E ಕರೆಯುತ್ತದೆ (depth 4)

Agent E ಗಾಗಿ Policy check:
  - Depth 4 > max_delegation_depth (3)

ಫಲಿತಾಂಶ: BLOCKED
ಕಾರಣ: ಗರಿಷ್ಠ delegation depth ಮೀರಲಾಗಿದೆ
```

### Scenario 4: Circular Reference ನಿಂದ ತಡೆಯಲ್ಪಟ್ಟಿದೆ

```
Agent A, Agent B ಕರೆಯುತ್ತದೆ (depth 1)
  Agent B, Agent C ಕರೆಯುತ್ತದೆ (depth 2)
    Agent C, Agent A ಕರೆಯುತ್ತದೆ (depth 3)

ಎರಡನೇ Agent A invocation ಗಾಗಿ Policy check:
  - Agent A ಈಗಾಗಲೇ chain ನಲ್ಲಿ ಇದೆ

ಫಲಿತಾಂಶ: BLOCKED
ಕಾರಣ: Circular agent invocation ಪತ್ತೆ ಮಾಡಲ್ಪಟ್ಟಿದೆ
```

## ಸಂಬಂಧಿತ ಪುಟಗಳು

- [ಭದ್ರತಾ-ಪ್ರಥಮ ವಿನ್ಯಾಸ](./) -- ಭದ್ರತಾ architecture ಅವಲೋಕನ
- [No Write-Down ನಿಯಮ](./no-write-down) -- delegation ಜಾರಿಗೊಳಿಸುವ classification flow ನಿಯಮ
- [Identity & Auth](./identity) -- ಬಳಕೆದಾರ ಮತ್ತು channel identity ಹೇಗೆ ಸ್ಥಾಪಿಸಲ್ಪಡುತ್ತದೆ
- [Audit & Compliance](./audit-logging) -- delegation chains audit log ನಲ್ಲಿ ಹೇಗೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತವೆ
