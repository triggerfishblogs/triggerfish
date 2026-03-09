# Persistent Memory

May persistent cross-session memory ang mga Triggerfish agent. Maaaring mag-save ang agent ng mga facts, preferences, at context na nakakaligtas sa mga conversations, restarts, at trigger wakeups. Ang memory ay classification-gated -- hindi maaaring magbasa ang agent sa itaas ng session taint nito o magsulat sa ibaba nito.

## Mga Tool

### `memory_save`

Mag-save ng fact o piraso ng impormasyon sa persistent memory.

| Parameter | Type   | Required | Paglalarawan                                                     |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| `key`     | string | yes      | Unique identifier (hal. `user-name`, `project-deadline`)         |
| `content` | string | yes      | Ang content na tatandaan                                         |
| `tags`    | array  | no       | Mga tags para sa categorization (hal. `["personal", "preference"]`) |

Ang classification ay **awtomatikong sine-set** sa kasalukuyang taint level ng session. Hindi maaaring pumili ng level ang agent kung saan isi-store ang memory.

### `memory_get`

Mag-retrieve ng specific memory gamit ang key nito.

| Parameter | Type   | Required | Paglalarawan                          |
| --------- | ------ | -------- | ------------------------------------- |
| `key`     | string | yes      | Ang key ng memory na ire-retrieve     |

Ibinabalik ang memory content kung existing ito at accessible sa kasalukuyang security level. Sini-shadow ng higher-classified versions ang mas mababa.

### `memory_search`

Mag-search sa lahat ng accessible memories gamit ang natural language.

| Parameter     | Type   | Required | Paglalarawan                     |
| ------------- | ------ | -------- | -------------------------------- |
| `query`       | string | yes      | Natural language search query    |
| `max_results` | number | no       | Maximum results (default: 10)    |

Gumagamit ng SQLite FTS5 full-text search na may stemming. Ang results ay nifi-filter ng kasalukuyang security level ng session.

### `memory_list`

Mag-list ng lahat ng accessible memories, opsyonal na nifi-filter ng tag.

| Parameter | Type   | Required | Paglalarawan           |
| --------- | ------ | -------- | ---------------------- |
| `tag`     | string | no       | Tag na ifi-filter      |

### `memory_delete`

Mag-delete ng memory gamit ang key. Ang record ay soft-deleted (nakatago pero nire-retain para sa audit).

| Parameter | Type   | Required | Paglalarawan                         |
| --------- | ------ | -------- | ------------------------------------ |
| `key`     | string | yes      | Ang key ng memory na ide-delete      |

Maaari lamang mag-delete ng memories sa kasalukuyang security level ng session.

## Paano Gumagana ang Memory

### Auto-Extraction

Proaktibong nagse-save ang agent ng mahahalagang facts na shine-share ng user -- personal details, project context, preferences -- gamit ang mga descriptive keys. Ito ay prompt-level behavior na ginaguide ng SPINE.md. Pinipili ng LLM **kung ano** ang ise-save; pinipilit ng policy layer **sa anong level**.

### Classification Gating

Bawat memory record ay may classification level na katumbas ng session taint sa oras ng pag-save:

- Ang memory na na-save habang `CONFIDENTIAL` ang session ay classified na `CONFIDENTIAL`
- Hindi maaaring magbasa ng `CONFIDENTIAL` memories ang `PUBLIC` session
- Maaaring magbasa ng parehong `CONFIDENTIAL` at `PUBLIC` memories ang `CONFIDENTIAL` session

Ine-enforce ito ng `canFlowTo` checks sa bawat read operation. Hindi maaaring i-bypass ito ng LLM.

### Memory Shadowing

Kapag may parehong key sa multiple classification levels, ang highest-classified version lang na visible sa kasalukuyang session ang ibinabalik. Pinipigilan nito ang information leakage sa classification boundaries.

**Halimbawa:** Kung ang `user-name` ay existing sa parehong `PUBLIC` (na-set habang public chat) at `INTERNAL` (na-update habang private session), nakikita ng `INTERNAL` session ang `INTERNAL` version, habang ang `PUBLIC` session ay nakikita lang ang `PUBLIC` version.

### Storage

Ang memories ay naka-store sa pamamagitan ng `StorageProvider` interface (ang parehong abstraction na ginagamit para sa sessions, cron jobs, at todos). Gumagamit ang full-text search ng SQLite FTS5 para sa mabilis na natural language queries na may stemming.

## Security

- Palaging pinipilit ang classification sa `session.taint` sa `PRE_TOOL_CALL` hook -- hindi maaaring pumili ng mas mababang classification ang LLM
- Lahat ng reads ay nifi-filter ng `canFlowTo` -- walang memory na mas mataas sa session taint ang ibinalik kailanman
- Ang deletes ay soft-deletes -- ang record ay nakatago pero nire-retain para sa audit
- Hindi maaaring i-escalate ng agent ang memory classification sa pamamagitan ng pagbasa ng high-classified data at pag-re-save nito sa mas mababang level (nalalapat ang write-down prevention)

::: warning SECURITY Hindi kailanman pinipili ng LLM ang memory classification. Palaging pinipilit ito sa kasalukuyang taint level ng session ng policy layer. Ito ay isang hard boundary na hindi maaaring i-configure. :::
