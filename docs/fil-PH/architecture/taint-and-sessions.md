# Sessions at Taint

Ang sessions ang fundamental unit ng conversation state sa Triggerfish. Bawat
session ay independyenteng nag-track ng **taint level** -- isang classification
watermark na nagre-record ng pinakamataas na sensitivity ng data na na-access
habang nasa session. Ang taint ang nagda-drive sa output decisions ng policy
engine: kung ang session ay tainted sa `CONFIDENTIAL`, walang data mula sa
session na maaaring dumaloy sa channel na classified na mas mababa sa
`CONFIDENTIAL`.

## Session Taint Model

### Paano Gumagana ang Taint

Kapag nag-access ang session ng data sa isang classification level, ang buong
session ay **nata-taint** sa level na iyon. Tatlong rules ang sinusunod ng
taint:

1. **Per-conversation**: Bawat session ay may sariling independent na taint level
2. **Escalation only**: Maaari lamang tumaas ang taint, hindi bumababa sa loob ng session
3. **Full reset clears everything**: Sabay na binu-bura ang taint AT ang conversation history

<img src="/diagrams/taint-escalation.svg" alt="Taint escalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Maaari lamang mag-escalate ang taint, hindi bumababa." style="max-width: 100%;" />

::: warning SECURITY Hindi kailanman maaaring selective na ibaba ang taint. Walang
mekanismo para "i-un-taint" ang session nang hindi binu-bura ang buong
conversation history. Pinipigilan nito ang context leakage -- kung natatandaan ng
session na nakakita ng confidential data, kailangang i-reflect iyon ng taint. :::

### Bakit Hindi Maaaring Bumaba ang Taint

Kahit na hindi na ipinapakita ang classified data, naglalaman pa rin nito ang
context window ng LLM. Maaaring mag-reference, mag-summarize, o mag-echo ang
model ng classified information sa mga susunod na responses. Ang tanging safe
na paraan para ibaba ang taint ay alisin ang context nang buo -- na eksaktong
ginagawa ng full reset.

## Mga Uri ng Session

Nagma-manage ang Triggerfish ng ilang session types, bawat isa ay may
independent na taint tracking:

| Uri ng Session | Paglalarawan                                     | Initial Taint | Persistent sa Mga Restart |
| -------------- | ------------------------------------------------ | ------------- | ------------------------- |
| **Main**       | Pangunahing direct conversation sa owner         | `PUBLIC`      | Oo                        |
| **Channel**    | Isa sa bawat connected channel (Telegram, Slack, etc.) | `PUBLIC` | Oo                        |
| **Background** | Nag-spawn para sa autonomous tasks (cron, webhooks) | `PUBLIC`   | Habang tumatakbo ang task |
| **Agent**      | Per-agent sessions para sa multi-agent routing   | `PUBLIC`      | Oo                        |
| **Group**      | Group chat sessions                              | `PUBLIC`      | Oo                        |

::: info Palaging nagsisimula ang background sessions sa `PUBLIC` taint, anuman
ang taint level ng parent session. Sadya ito -- hindi dapat mag-inherit ang cron
jobs at webhook-triggered tasks ng taint ng kahit anong session na nag-spawn sa
kanila. :::

## Halimbawa ng Taint Escalation

Narito ang isang kumpletong flow na nagpapakita ng taint escalation at ang
resultang policy block:

<img src="/diagrams/taint-with-blocks.svg" alt="Halimbawa ng taint escalation: nagsisimula ang session sa PUBLIC, nag-escalate sa CONFIDENTIAL pagkatapos mag-access ng Salesforce, pagkatapos BINA-BLOCK ang output sa PUBLIC WhatsApp channel" style="max-width: 100%;" />

## Full Reset Mechanism

Ang session reset ang tanging paraan para ibaba ang taint. Ito ay isang
deliberate at destructive na operasyon:

1. **I-archive ang lineage records** -- Lahat ng lineage data mula sa session ay
   pinapanatili sa audit storage
2. **I-clear ang conversation history** -- Binu-bura ang buong context window
3. **I-reset ang taint sa PUBLIC** -- Nagsisimulang muli ang session
4. **Mangailangan ng user confirmation** -- Nangangailangan ng explicit
   confirmation ang `SESSION_RESET` hook bago mag-execute

Pagkatapos ng reset, hindi na makilala ang session mula sa bagong session. Wala
nang alaala ang agent tungkol sa nakaraang conversation. Ito lang ang paraan
para ma-guarantee na hindi maaaring mag-leak ang classified data sa pamamagitan
ng context ng LLM.

## Inter-Session Communication

Kapag nagpapadala ng data ang agent sa pagitan ng sessions gamit ang
`sessions_send`, ang parehong write-down rules ang nalalapat:

| Taint ng Source Session | Channel ng Target Session | Desisyon |
| ----------------------- | ------------------------- | -------- |
| `PUBLIC`                | `PUBLIC` channel          | ALLOW    |
| `CONFIDENTIAL`          | `CONFIDENTIAL` channel    | ALLOW    |
| `CONFIDENTIAL`          | `PUBLIC` channel          | BLOCK    |
| `RESTRICTED`            | `CONFIDENTIAL` channel    | BLOCK    |

Mga session tools na available sa agent:

| Tool               | Paglalarawan                                      | Epekto sa Taint                         |
| ------------------ | ------------------------------------------------- | --------------------------------------- |
| `sessions_list`    | Mag-list ng active sessions na may filters         | Walang pagbabago sa taint               |
| `sessions_history` | Mag-retrieve ng transcript para sa session         | Ini-inherit ng taint mula sa referenced session |
| `sessions_send`    | Magpadala ng mensahe sa ibang session              | Napapailalim sa write-down check        |
| `sessions_spawn`   | Gumawa ng background task session                  | Nagsisimula ang bagong session sa `PUBLIC` |
| `session_status`   | Mag-check ng current session state at metadata     | Walang pagbabago sa taint               |

## Data Lineage

Bawat data element na pino-process ng Triggerfish ay may **provenance metadata**
-- isang kumpletong record kung saan nanggaling ang data, paano ito na-transform,
at kung saan ito napunta. Ang lineage ang audit trail na nagpapaverify sa mga
classification decisions.

### Istruktura ng Lineage Record

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

### Mga Patakaran sa Lineage Tracking

| Event                                    | Lineage Action                                   |
| ---------------------------------------- | ------------------------------------------------ |
| Binasa ang data mula sa integration      | Gumawa ng lineage record na may origin            |
| Na-transform ang data ng LLM             | Mag-append ng transformation, i-link ang input lineages |
| Na-aggregate ang data mula sa maraming sources | Mag-merge ng lineage, classification = `max(inputs)` |
| Naipadala ang data sa channel            | I-record ang destination, i-verify ang classification |
| Na-reset ang session                     | I-archive ang lineage records, i-clear mula sa context |

### Aggregation Classification

Kapag pinagsama ang data mula sa maraming sources (hal., LLM summary ng records
mula sa iba't ibang integrations), ini-inherit ng aggregated result ang
**maximum classification** ng lahat ng inputs:

```
Input 1: INTERNAL    (internal wiki)
Input 2: CONFIDENTIAL (Salesforce record)
Input 3: PUBLIC      (weather API)

Aggregated output classification: CONFIDENTIAL (max ng inputs)
```

::: tip Maaaring mag-configure ang enterprise deployments ng optional downgrade
rules para sa statistical aggregates (averages, counts, sums ng 10+ records) o
certified anonymized data. Lahat ng downgrades ay nangangailangan ng explicit
policy rules, nilo-log nang may buong justification, at napapailalim sa audit
review. :::

### Mga Kakayahan sa Audit

Pinapagana ng lineage ang apat na kategorya ng audit queries:

- **Forward trace**: "Anong nangyari sa data mula sa Salesforce record X?" --
  sinusundan ang data mula sa origin hanggang sa lahat ng destinations
- **Backward trace**: "Anong sources ang nag-contribute sa output na ito?" --
  tina-trace ang output pabalik sa lahat ng source records nito
- **Classification justification**: "Bakit CONFIDENTIAL ang mark nito?" --
  ipinapakita ang classification reason chain
- **Compliance export**: Buong chain of custody para sa legal o regulatory review

## Taint Persistence

Ang session taint ay persistent sa pamamagitan ng `StorageProvider` sa ilalim ng
`taint:` namespace. Ibig sabihin nito na tumatagal ang taint sa daemon restarts
-- ang session na `CONFIDENTIAL` bago ang restart ay `CONFIDENTIAL` pa rin
pagkatapos.

Ang lineage records ay persistent sa ilalim ng `lineage:` namespace na may
compliance-driven retention (default 90 araw).
