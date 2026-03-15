# Agent Delegation

जसजसे AI agents एकमेकांशी interact करतात -- एक agent दुसऱ्याला subtasks complete
करण्यासाठी call करतो -- security risks चा एक नवीन class emerge होतो. एक agent chain
कमी-restricted agent मधून data launder करण्यासाठी वापरला जाऊ शकतो, classification
controls bypass करून. Triggerfish हे cryptographic agent identity, classification
ceilings, आणि mandatory taint inheritance सह prevent करतो.

## Agent Certificates

Triggerfish मधील प्रत्येक agent ला certificate आहे जो त्याची identity, capabilities,
आणि delegation permissions define करतो. हे certificate agent च्या owner द्वारे
signed आहे आणि agent स्वतः किंवा इतर agents द्वारे modify केला जाऊ शकत नाही.

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

Certificate मधील Key fields:

| Field                  | Purpose                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | **Classification ceiling** -- सर्वोच्च taint level ज्यावर हा agent operate करू शकतो. INTERNAL ceiling असलेला agent CONFIDENTIAL वर tainted session द्वारे invoke केला जाऊ शकत नाही. |
| `can_invoke_agents`    | हा agent इतर agents call करण्यास permitted आहे का.                                                                                                                               |
| `can_be_invoked_by`    | Agents चा Explicit allowlist जे हे invoke करू शकतात.                                                                                                                             |
| `max_delegation_depth` | Agent invocation chain चा Maximum depth. Unbounded recursion रोखतो.                                                                                                              |
| `signature`            | Owner कडून Ed25519 signature. Certificate tampering रोखतो.                                                                                                                       |

## Invocation Flow

जेव्हा एक agent दुसऱ्याला call करतो, तेव्हा callee agent execute होण्यापूर्वी policy
layer delegation verify करतो. Check deterministic आहे आणि code मध्ये run होतो --
calling agent निर्णय influence करू शकत नाही.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agent delegation sequence: Agent A invokes Agent B, policy layer verifies taint vs ceiling and blocks when taint exceeds ceiling" style="max-width: 100%;" />

या उदाहरणात, Agent A चे session taint CONFIDENTIAL आहे (त्याने आधी Salesforce data
access केले). Agent B चे classification ceiling INTERNAL आहे. CONFIDENTIAL हे
INTERNAL पेक्षा higher असल्याने, invocation blocked आहे. Agent A चा tainted data
lower classification ceiling असलेल्या agent ला flow करू शकत नाही.

::: warning SECURITY Policy layer caller चे **current session taint** check करतो,
त्याचे ceiling नाही. Agent A चे CONFIDENTIAL ceiling असले तरी, invocation वेळी session
चा actual taint level महत्त्वाचा आहे. Agent A ने classified data access केले नसल्यास
(taint PUBLIC आहे), तो Agent B (INTERNAL ceiling) ला कोणत्याही issue शिवाय invoke
करू शकतो. :::

## Delegation Chain Tracking

जेव्हा agents इतर agents invoke करतात, तेव्हा प्रत्येक step वर timestamps आणि taint
levels सह full chain tracked आहे:

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

हे chain audit log मध्ये recorded आहे आणि compliance आणि forensic analysis साठी
queried केले जाऊ शकते. कोणते agents involved होते, त्यांचे taint levels काय होते,
आणि त्यांनी कोणते tasks perform केले हे तुम्ही exactly trace करू शकता.

## Security Invariants

चार invariants agent delegation govern करतात. सर्व policy layer मधील code द्वारे
enforced आहेत आणि chain मधील कोणत्याही agent द्वारे overridden केले जाऊ शकत नाहीत.

| Invariant                       | Enforcement                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint only increases**        | प्रत्येक callee `max(own taint, caller taint)` inherit करतो. Callee ला त्याच्या caller पेक्षा कधीच lower taint असू शकत नाही.                    |
| **Ceiling respected**           | Caller चे taint callee च्या `max_classification` ceiling पेक्षा जास्त असल्यास agent invoke केला जाऊ शकत नाही.                                  |
| **Depth limits enforced**       | Chain `max_delegation_depth` वर terminate होते. Limit 3 असल्यास, fourth-level invocation blocked आहे.                                          |
| **Circular invocation blocked** | एक agent त्याच chain मध्ये दोनदा appear होऊ शकत नाही. Agent A ने Agent B ला call केल्यास जे Agent A ला call करण्याचा प्रयत्न करते, दुसरे invocation blocked आहे. |

### Taint Inheritance in Detail

जेव्हा Agent A (taint: CONFIDENTIAL) successfully Agent B (ceiling: CONFIDENTIAL)
invoke करतो, Agent B CONFIDENTIAL च्या taint सह सुरू होतो -- Agent A कडून inherited.
Agent B नंतर RESTRICTED data access केल्यास, त्याचे taint RESTRICTED ला escalate
होते. Invocation complete झाल्यावर हे elevated taint Agent A ला परत carried होते.

<img src="/diagrams/taint-inheritance.svg" alt="Taint inheritance: Agent A (INTERNAL) invokes Agent B, B inherits taint, accesses Salesforce (CONFIDENTIAL), returns elevated taint to A" style="max-width: 100%;" />

Taint दोन्ही directions मध्ये flows -- invocation वेळी caller कडून callee ला, आणि
completion वेळी callee कडून caller ला परत. ते फक्त escalate करू शकते.

## Data Laundering रोखणे

Multi-agent systems मधील एक key attack vector **data laundering** आहे -- classified
data lower-classification destination ला intermediate agents मधून route करून move
करण्यासाठी agent chain वापरणे.

### Attack

```
Attacker goal: CONFIDENTIAL data PUBLIC channel द्वारे Exfiltrate करणे

Attempted flow:
1. Agent A Salesforce access करतो (taint --> CONFIDENTIAL)
2. Agent A Agent B invoke करतो (ज्याला PUBLIC channel आहे)
3. Agent B PUBLIC channel ला data पाठवतो
```

### ते का Fails होते

Triggerfish हे attack multiple points वर block करतो:

**Block point 1: Invocation check.** Agent B चे ceiling CONFIDENTIAL च्या खाली
असल्यास, invocation outright blocked आहे. Agent A चे taint (CONFIDENTIAL)
Agent B च्या ceiling पेक्षा जास्त आहे.

**Block point 2: Taint inheritance.** Agent B चे CONFIDENTIAL ceiling असले आणि
invocation succeed झाले तरी, Agent B Agent A चे CONFIDENTIAL taint inherit करतो.
जेव्हा Agent B PUBLIC channel ला output करण्याचा प्रयत्न करतो, `PRE_OUTPUT` hook
write-down block करतो.

**Block point 3: Delegation मध्ये taint reset नाही.** Delegation chain मधील Agents
त्यांचे taint reset करू शकत नाहीत. Taint reset फक्त end user ला available आहे,
आणि ते संपूर्ण conversation history clear करते. Agent साठी chain दरम्यान त्याचे
taint level "wash" करण्याचे कोणतेही mechanism नाही.

::: danger Data agent delegation द्वारे त्याच्या classification मधून escape करू
शकत नाही. Ceiling checks, mandatory taint inheritance, आणि no-taint-reset-in-chains
यांचे combination Triggerfish security model मध्ये agent chains द्वारे data laundering
impossible बनवते. :::

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

### Scenario 2: Ceiling द्वारे Blocked

```
Agent A (ceiling: RESTRICTED, current taint: CONFIDENTIAL)
  calls Agent B (ceiling: INTERNAL)

Policy check:
  - A's taint (CONFIDENTIAL) <= B's ceiling (INTERNAL)? NO

Result: BLOCKED
Reason: Agent B ceiling (INTERNAL) below session taint (CONFIDENTIAL)
```

### Scenario 3: Depth Limit द्वारे Blocked

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

### Scenario 4: Circular Reference द्वारे Blocked

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

- [Security-First Design](./) -- security architecture चे overview
- [No Write-Down Rule](./no-write-down) -- delegation enforce करणारा classification flow rule
- [Identity & Auth](./identity) -- user आणि channel identity कसे established होते
- [Audit & Compliance](./audit-logging) -- delegation chains audit log मध्ये कसे recorded होतात
