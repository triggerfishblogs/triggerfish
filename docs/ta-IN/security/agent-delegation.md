# Agent Delegation

AI agents பெருகிய முறையில் ஒன்றோடொன்று தொடர்பு கொள்ளும்போது -- ஒரு agent subtasks complete செய்ய மற்றொன்றை அழைக்கும்போது -- ஒரு புதிய வகை பாதுகாப்பு அபாயங்கள் உருவாகின்றன. ஒரு agent chain வகைப்படுத்தல் கட்டுப்பாடுகளை bypass செய்து குறைவாக கட்டுப்படுத்தப்பட்ட agent மூலம் data ஐ launder செய்ய பயன்படுத்தப்படலாம். Triggerfish cryptographic agent அடையாளம், classification ceilings மற்றும் mandatory taint inheritance மூலம் இதை தடுக்கிறது.

## Agent Certificates

Triggerfish இல் ஒவ்வொரு agent க்கும் அதன் அடையாளம், திறன்கள் மற்றும் delegation permissions ஐ வரையறுக்கும் certificate உள்ளது. இந்த certificate agent இன் owner மூலம் signed மற்றும் agent தன்னாலோ மற்ற agents ஆலோ modify செய்ய முடியாது.

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

Certificate இல் முதன்மை fields:

| Field                  | நோக்கம்                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | **Classification ceiling** -- இந்த agent operate செய்யக்கூடிய உயர்ந்த taint நிலை. INTERNAL ceiling உடன் agent CONFIDENTIAL இல் tainted session மூலம் invoke செய்ய முடியாது. |
| `can_invoke_agents`    | இந்த agent மற்ற agents ஐ அழைக்க அனுமதிக்கப்படுகிறதா.                                                                                                    |
| `can_be_invoked_by`    | இதை invoke செய்யக்கூடிய agents இன் வெளிப்படையான allowlist.                                                                                              |

## Taint Inheritance

ஒரு agent மற்றொரு agent ஐ invoke செய்யும்போது, callee session caller இன் taint ஐ வாரிசாகிறது. Taint chain வழியாக மட்டுமே அதிகரிக்கலாம்:

```
Caller taint: CONFIDENTIAL
Callee max_classification: CONFIDENTIAL
--> Callee session taint: CONFIDENTIAL (caller தொடங்கும்)

Caller taint: CONFIDENTIAL
Callee max_classification: INTERNAL
--> BLOCKED: caller taint callee ceiling ஐ விட அதிகம்
```

## Data Laundering தடுப்பு

Data laundering attack இப்படி இருக்கும்:

1. Owner CONFIDENTIAL data அணுகுகிறார், session taint CONFIDENTIAL க்கு உயர்கிறது
2. Owner ஒரு PUBLIC subagent ஐ invoke செய்கிறார் "just to send a message"
3. Subagent CONFIDENTIAL data திரும்பி அனுப்புகிறது PUBLIC சேனலுக்கு

Triggerfish இதை block செய்கிறது ஏனெனில் caller இன் CONFIDENTIAL taint subagent க்கு propagate ஆகும். Subagent அதன் PUBLIC ceiling க்கு மேல் tainted ஆகிறது, எனவே AGENT_INVOCATION hook block ஆகிறது.

## Circular Invocation கண்டறிதல்

Circular agent chains (A → B → A) கண்டறியப்பட்டு reject ஆகின்றன. Delegation depth கட்டமைக்கக்கூடியது மற்றும் அமல்படுத்தப்படுகிறது (இயல்புநிலை: அதிகபட்சம் 3 நிலைகள்).

## Multi-Agent Routing

Multi-agent setups க்கு, routing க்கும் தனிமைப்படுத்தலுக்கும் [Multi-Agent](/ta-IN/features/multi-agent) மற்றும் [Agent Teams](/ta-IN/features/agent-teams) பாருங்கள்.
