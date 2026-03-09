# Audit at Compliance

Bawat policy decision sa Triggerfish ay nilo-log na may buong context. Walang exceptions, walang "debug mode" na nagdi-disable ng logging, at walang paraan para pigilan ng LLM ang audit records. Nagbibigay ito ng kumpleto, tamper-evident na record ng bawat security decision na ginawa ng system.

## Ano ang Nire-record

Ang audit logging ay isang **fixed rule** -- palaging active at hindi maaaring i-disable. Bawat enforcement hook execution ay nagpo-produce ng audit record na naglalaman ng:

| Field             | Paglalarawan                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Kailan ginawa ang decision (ISO 8601, UTC)                                                                                                                                          |
| `hook_type`       | Aling enforcement hook ang tumakbo (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | Ang session kung saan nangyari ang action                                                                                                                                           |
| `decision`        | `ALLOW`, `BLOCK`, o `REDACT`                                                                                                                                                        |
| `reason`          | Human-readable explanation ng decision                                                                                                                                              |
| `input`           | Ang data o action na nag-trigger ng hook                                                                                                                                            |
| `rules_evaluated` | Aling policy rules ang na-check para makarating sa decision                                                                                                                         |
| `taint_before`    | Session taint level bago ang action                                                                                                                                                 |
| `taint_after`     | Session taint level pagkatapos ng action (kung nagbago)                                                                                                                             |
| `metadata`        | Karagdagang context na specific sa hook type                                                                                                                                        |

## Mga Audit Trace Capability

<img src="/diagrams/audit-trace-flow.svg" alt="Audit trace flow: forward trace, backward trace, at classification justification ang nagpa-feed sa compliance export" style="max-width: 100%;" />

Maaaring i-query ang audit records sa apat na paraan, bawat isa ay nagse-serve ng iba't ibang compliance at forensic need.

### Forward Trace

**Tanong:** "Ano ang nangyari sa data mula sa Salesforce record `opp_00123ABC`?"

Sinusundan ng forward trace ang data element mula sa point of origin nito sa bawat transformation, session, at output.

### Backward Trace

**Tanong:** "Anong mga sources ang nag-contribute sa mensaheng ipinadala noong 10:24 UTC?"

Nagsisimula ang backward trace mula sa output at bumabalik sa lineage chain para matukoy ang bawat data source na nag-impluwensya sa output.

### Classification Justification

**Tanong:** "Bakit naka-mark bilang CONFIDENTIAL ang data na ito?"

Binu-bumalik ang classification justification sa rule o policy na nag-assign ng classification level.

### Compliance Export

Para sa legal, regulatory, o internal review, maaaring i-export ng Triggerfish ang buong chain of custody para sa anumang data element o time range.

::: tip Ang compliance exports ay structured JSON files na maaaring i-ingest ng SIEM systems, compliance dashboards, o legal review tools. Stable at versioned ang export format. :::

## Data Lineage

Gumagana ang audit logging kasabay ng data lineage system ng Triggerfish. Bawat data element na pini-process ng Triggerfish ay may kasamang provenance metadata na may origin, transformations, at classification.

Ang lineage records ay ginagawa sa `POST_TOOL_RESPONSE` (kapag pumasok ang data sa system) at ina-update habang tina-transform ang data. Ang aggregated data ay nag-i-inherit ng `max(input classifications)`.

## Storage at Retention

Ang audit logs ay pini-persist sa pamamagitan ng `StorageProvider` abstraction sa ilalim ng `audit:` namespace. Ang lineage records ay naka-store sa ilalim ng `lineage:` namespace.

| Data Type       | Namespace   | Default Retention         |
| --------------- | ----------- | ------------------------- |
| Audit logs      | `audit:`    | 1 taon                    |
| Lineage records | `lineage:`  | 90 araw                   |
| Session state   | `sessions:` | 30 araw                   |
| Taint history   | `taint:`    | Tumutugma sa session retention |

::: warning SECURITY Configurable ang retention periods, pero ang audit logs ay dina-default sa 1 taon para suportahan ang compliance requirements (SOC 2, GDPR, HIPAA). Responsibilidad ng administrator ang pagbaba ng retention period sa ibaba ng regulatory requirement ng iyong organization. :::

## Mga Kaugnay na Pahina

- [Security-First Design](./) -- overview ng security architecture
- [No Write-Down Rule](./no-write-down) -- ang classification flow rule na ang enforcement ay nilo-log
- [Identity & Auth](./identity) -- paano nire-record ang identity decisions
- [Agent Delegation](./agent-delegation) -- paano lumalabas ang delegation chains sa audit records
- [Secrets Management](./secrets) -- paano nilo-log ang credential access
