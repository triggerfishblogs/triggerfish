# Agent Delegation

Habang patuloy na nakikipag-interact ang AI agents sa isa't isa -- isang agent na tumatawag sa iba para tapusin ang subtasks -- lumilitaw ang bagong klase ng security risks. Ang agent chain ay maaaring gamitin para i-launder ang data sa pamamagitan ng less-restricted agent, na bina-bypass ang classification controls. Pinipigilan ng Triggerfish ito gamit ang cryptographic agent identity, classification ceilings, at mandatory taint inheritance.

## Mga Agent Certificate

Bawat agent sa Triggerfish ay may certificate na dine-define ang identity, capabilities, at delegation permissions nito. Ang certificate na ito ay signed ng owner ng agent at hindi maaaring i-modify ng agent mismo o ng ibang agents.

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

Mga key field sa certificate:

| Field                  | Layunin                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | Ang **classification ceiling** -- ang pinakamataas na taint level kung saan maaaring mag-operate ang agent na ito. Ang agent na may INTERNAL ceiling ay hindi maaaring i-invoke ng session na tainted sa CONFIDENTIAL. |
| `can_invoke_agents`    | Kung pinapayagan ang agent na ito na tumawag ng ibang agents.                                                                                                                      |
| `can_be_invoked_by`    | Explicit allowlist ng agents na maaaring mag-invoke nito.                                                                                                                          |
| `max_delegation_depth` | Maximum depth ng agent invocation chain. Pinipigilan ang unbounded recursion.                                                                                                      |
| `signature`            | Ed25519 signature mula sa owner. Pinipigilan ang certificate tampering.                                                                                                            |

## Invocation Flow

Kapag tumawag ang isang agent sa iba, bine-verify ng policy layer ang delegation bago mag-execute ang callee agent. Deterministic ang check at tumatakbo sa code -- hindi maaaring impluwensyahan ng calling agent ang decision.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agent delegation sequence: nag-i-invoke ang Agent A ng Agent B, bine-verify ng policy layer ang taint vs ceiling at bina-block kapag lumampas ang taint sa ceiling" style="max-width: 100%;" />

::: warning SECURITY Tine-check ng policy layer ang **kasalukuyang session taint** ng caller, hindi ang ceiling nito. Kahit may CONFIDENTIAL ceiling ang Agent A, ang mahalaga ay ang aktwal na taint level ng session sa oras ng invocation. Kung hindi pa nag-access ng classified data ang Agent A (taint ay PUBLIC), maaari nitong i-invoke ang Agent B (INTERNAL ceiling) nang walang problema. :::

## Mga Security Invariant

Apat na invariants ang naggo-govern sa agent delegation. Lahat ay ine-enforce ng code sa policy layer at hindi maaaring i-override ng anumang agent sa chain.

| Invariant                          | Enforcement                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Taint lang ang tumataas**        | Bawat callee ay nag-i-inherit ng `max(own taint, caller taint)`. Hindi maaaring magkaroon ng mas mababang taint ang callee kaysa sa caller nito. |
| **Nirerespeto ang ceiling**        | Hindi maaaring i-invoke ang agent kung lumampas ang taint ng caller sa `max_classification` ceiling ng callee.                       |
| **Ine-enforce ang depth limits**   | Natatapos ang chain sa `max_delegation_depth`. Kung ang limit ay 3, bina-block ang fourth-level invocation.                         |
| **Bina-block ang circular invocation** | Hindi maaaring lumitaw nang dalawang beses ang agent sa parehong chain.                                                         |

## Pag-prevent ng Data Laundering

Isang key attack vector sa multi-agent systems ang **data laundering** -- paggamit ng agent chain para ilipat ang classified data sa lower-classification destination sa pamamagitan ng pag-route nito sa intermediate agents.

### Ang Attack

```
Layunin ng attacker: Mag-exfiltrate ng CONFIDENTIAL data sa pamamagitan ng PUBLIC channel

Attempted flow:
1. Nag-access si Agent A ng Salesforce (taint --> CONFIDENTIAL)
2. Nag-invoke si Agent A ng Agent B (na may PUBLIC channel)
3. Nagpadala si Agent B ng data sa PUBLIC channel
```

### Bakit Nag-fail Ito

Bina-block ng Triggerfish ang attack na ito sa maramihang punto:

**Block point 1: Invocation check.** Kung ang ceiling ni Agent B ay mas mababa sa CONFIDENTIAL, agad na bina-block ang invocation.

**Block point 2: Taint inheritance.** Kahit may CONFIDENTIAL ceiling si Agent B at nag-succeed ang invocation, nag-i-inherit si Agent B ng CONFIDENTIAL taint ni Agent A. Kapag sinubukan ni Agent B mag-output sa PUBLIC channel, bina-block ng `PRE_OUTPUT` hook ang write-down.

**Block point 3: Walang taint reset sa delegation.** Hindi maaaring i-reset ng agents sa delegation chain ang kanilang taint. Ang taint reset ay available lang sa end user, at nili-clear nito ang buong conversation history.

::: danger Hindi maaaring tumakas ang data sa classification nito sa pamamagitan ng agent delegation. Ang kombinasyon ng ceiling checks, mandatory taint inheritance, at no-taint-reset-in-chains ay ginagawang imposible ang data laundering sa pamamagitan ng agent chains sa loob ng Triggerfish security model. :::

## Mga Kaugnay na Pahina

- [Security-First Design](./) -- overview ng security architecture
- [No Write-Down Rule](./no-write-down) -- ang classification flow rule na ine-enforce ng delegation
- [Identity & Auth](./identity) -- paano nae-establish ang user at channel identity
- [Audit & Compliance](./audit-logging) -- paano lumalabas ang delegation chains sa audit log
