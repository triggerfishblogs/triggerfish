# ಶಾಶ್ವತ ಮೆಮೊರಿ

Triggerfish agents ಗೆ ಶಾಶ್ವತ cross-session ಮೆಮೊರಿ ಇದೆ. Agent ಸಂಗತಿಗಳು,
preferences, ಮತ್ತು context ಉಳಿಸಬಹುದು, conversations, restarts, ಮತ್ತು trigger
wakeups ನಾದ್ಯಂತ ಉಳಿಯುತ್ತದೆ. ಮೆಮೊರಿ classification-gated -- agent ತನ್ನ session
taint ಗಿಂತ ಮೇಲೆ ಓದಲು ಅಥವಾ ಕೆಳಗೆ ಬರೆಯಲು ಸಾಧ್ಯವಿಲ್ಲ.

## Tools

### `memory_save`

ಶಾಶ್ವತ ಮೆಮೊರಿಗೆ ಒಂದು ಸಂಗತಿ ಅಥವಾ ಮಾಹಿತಿ ಉಳಿಸಿ.

| Parameter | Type   | Required | Description                                                 |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `key`     | string | yes      | ಅನನ್ಯ identifier (ಉದಾ. `user-name`, `project-deadline`)    |
| `content` | string | yes      | ನೆನಪಿಸಿಕೊಳ್ಳಬೇಕಾದ ವಿಷಯ                                     |
| `tags`    | array  | no       | ವರ್ಗೀಕರಣಕ್ಕಾಗಿ tags (ಉದಾ. `["personal", "preference"]`) |

Classification ಪ್ರಸ್ತುತ session ನ taint ಮಟ್ಟಕ್ಕೆ **ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹೊಂದಿಸಲ್ಪಡುತ್ತದೆ**.
Agent ಯಾವ ಮಟ್ಟದಲ್ಲಿ ಮೆಮೊರಿ ಉಳಿಸಲ್ಪಡುತ್ತದೆ ಎಂದು ಆಯ್ಕೆ ಮಾಡಲಾಗದು.

### `memory_get`

Key ಮೂಲಕ ನಿರ್ದಿಷ್ಟ ಮೆಮೊರಿ ತರಿಸಿ.

| Parameter | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| `key`     | string | yes      | ತರಿಸಬೇಕಾದ ಮೆಮೊರಿಯ key |

ಮೆಮೊರಿ ಅಸ್ತಿತ್ವದಲ್ಲಿದ್ದರೆ ಮತ್ತು ಪ್ರಸ್ತುತ security ಮಟ್ಟದಲ್ಲಿ ಪ್ರವೇಶಿಸಬಹುದಾದರೆ
ಮೆಮೊರಿ ವಿಷಯ ಹಿಂದಿರುಗಿಸುತ್ತದೆ. ಹೆಚ್ಚು-classified ಆವೃತ್ತಿಗಳು ಕಡಿಮೆ ಆವೃತ್ತಿಗಳನ್ನು
shadow ಮಾಡುತ್ತವೆ.

### `memory_search`

ನೈಸರ್ಗಿಕ ಭಾಷೆ ಬಳಸಿ ಎಲ್ಲ ಪ್ರವೇಶಿಸಬಹುದಾದ memories ನಾದ್ಯಂತ ಹುಡುಕಿ.

| Parameter     | Type   | Required | Description                   |
| ------------- | ------ | -------- | ----------------------------- |
| `query`       | string | yes      | ನೈಸರ್ಗಿಕ ಭಾಷಾ search query |
| `max_results` | number | no       | ಗರಿಷ್ಠ ಫಲಿತಾಂಶಗಳು (ಡಿಫಾಲ್ಟ್: 10) |

Stemming ಜೊತೆ SQLite FTS5 full-text search ಬಳಸುತ್ತದೆ. ಫಲಿತಾಂಶಗಳನ್ನು ಪ್ರಸ್ತುತ
session ನ security ಮಟ್ಟದಿಂದ ಫಿಲ್ಟರ್ ಮಾಡಲಾಗುತ್ತದೆ.

### `memory_list`

ಎಲ್ಲ ಪ್ರವೇಶಿಸಬಹುದಾದ memories ಪಟ್ಟಿ ಮಾಡಿ, ಐಚ್ಛಿಕವಾಗಿ tag ನಿಂದ ಫಿಲ್ಟರ್ ಮಾಡಿ.

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `tag`     | string | no       | ಫಿಲ್ಟರ್ ಮಾಡಬೇಕಾದ tag |

### `memory_delete`

Key ಮೂಲಕ ಮೆಮೊರಿ ಅಳಿಸಿ. ದಾಖಲೆಯನ್ನು soft-delete ಮಾಡಲಾಗುತ್ತದೆ (ಮರೆಮಾಚಲಾಗುತ್ತದೆ
ಆದರೆ audit ಗಾಗಿ ಉಳಿಸಿಕೊಳ್ಳಲ್ಪಡುತ್ತದೆ).

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `key`     | string | yes      | ಅಳಿಸಬೇಕಾದ ಮೆಮೊರಿಯ key |

ಪ್ರಸ್ತುತ session ನ security ಮಟ್ಟದಲ್ಲಿ memories ಮಾತ್ರ ಅಳಿಸಬಹುದು.

## ಮೆಮೊರಿ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

### ಸ್ವಯಂ-ಹೊರಡಿಸುವಿಕೆ

Agent ಬಳಕೆದಾರ ಹಂಚಿಕೊಳ್ಳುವ ಮುಖ್ಯ ಸಂಗತಿಗಳನ್ನು ಸಕ್ರಿಯವಾಗಿ ಉಳಿಸುತ್ತದೆ --
ವ್ಯಕ್ತಿಗತ ವಿವರಗಳು, project context, preferences -- ವಿವರಣಾತ್ಮಕ keys ಬಳಸಿ. ಇದು
SPINE.md ಮೂಲಕ ಮಾರ್ಗದರ್ಶನ ಪಡೆಯುವ prompt-level ನಡವಳಿಕೆ. LLM **ಏನನ್ನು** ಉಳಿಸಬೇಕು
ಆಯ್ಕೆ ಮಾಡುತ್ತದೆ; policy layer **ಯಾವ ಮಟ್ಟದಲ್ಲಿ** ಒತ್ತಾಯಪಡಿಸುತ್ತದೆ.

### Classification Gating

ಪ್ರತಿ ಮೆಮೊರಿ ದಾಖಲೆ ಉಳಿಸಲ್ಪಟ್ಟ ಸಮಯದಲ್ಲಿ session taint ಗೆ ಸಮಾನ classification
ಮಟ್ಟ ಹೊಂದಿರುತ್ತದೆ:

- `CONFIDENTIAL` session ನಲ್ಲಿ ಉಳಿಸಿದ ಮೆಮೊರಿ `CONFIDENTIAL` ಆಗಿ classified ಆಗುತ್ತದೆ
- `PUBLIC` session `CONFIDENTIAL` memories ಓದಲಾಗದು
- `CONFIDENTIAL` session `CONFIDENTIAL` ಮತ್ತು `PUBLIC` ಎರಡೂ memories ಓದಬಹುದು

ಇದನ್ನು ಪ್ರತಿ read operation ನಲ್ಲಿ `canFlowTo` ಪರಿಶೀಲನೆಗಳ ಮೂಲಕ ಜಾರಿಗೊಳಿಸಲ್ಪಡುತ್ತದೆ.
LLM ಇದನ್ನು bypass ಮಾಡಲಾಗದು.

### Memory Shadowing

ಅದೇ key ಬಹು classification ಮಟ್ಟಗಳಲ್ಲಿ ಅಸ್ತಿತ್ವದಲ್ಲಿದ್ದರೆ, ಪ್ರಸ್ತುತ session ಗೆ
ಗೋಚರಿಸುವ ಹೆಚ್ಚು-classified ಆವೃತ್ತಿ ಮಾತ್ರ ಹಿಂದಿರುಗಿಸಲ್ಪಡುತ್ತದೆ. ಇದು classification
ಗಡಿಗಳಾದ್ಯಂತ ಮಾಹಿತಿ ಸೋರಿಕೆ ತಡೆಯುತ್ತದೆ.

**ಉದಾಹರಣೆ:** `user-name` `PUBLIC` (ಸಾರ್ವಜನಿಕ chat ಸಮಯದಲ್ಲಿ ಹೊಂದಿಸಲ್ಪಟ್ಟ) ಮತ್ತು
`INTERNAL` (ಖಾಸಗಿ session ಸಮಯದಲ್ಲಿ ನವೀಕರಿಸಲ್ಪಟ್ಟ) ಎರಡರಲ್ಲೂ ಅಸ್ತಿತ್ವದಲ್ಲಿದ್ದರೆ,
`INTERNAL` session `INTERNAL` ಆವೃತ್ತಿ ನೋಡುತ್ತದೆ, `PUBLIC` session `PUBLIC`
ಆವೃತ್ತಿ ಮಾತ್ರ ನೋಡುತ್ತದೆ.

### Storage

Memories `StorageProvider` interface ಮೂಲಕ ಉಳಿಸಲ್ಪಡುತ್ತವೆ (sessions, cron jobs,
ಮತ್ತು todos ಗಾಗಿ ಬಳಸುವ ಅದೇ abstraction). Full-text search stemming ಜೊತೆ
ವೇಗದ ನೈಸರ್ಗಿಕ ಭಾಷಾ queries ಗಾಗಿ SQLite FTS5 ಬಳಸುತ್ತದೆ.

## ಭದ್ರತೆ

- Classification ಯಾವಾಗಲೂ `PRE_TOOL_CALL` hook ನಲ್ಲಿ `session.taint` ಗೆ ಒತ್ತಾಯಪಡಿಸಲ್ಪಡುತ್ತದೆ
  -- LLM ಕಡಿಮೆ classification ಆಯ್ಕೆ ಮಾಡಲಾಗದು
- ಎಲ್ಲ reads `canFlowTo` ಮೂಲಕ ಫಿಲ್ಟರ್ ಮಾಡಲ್ಪಡುತ್ತವೆ -- session taint ಮೇಲಿನ ಮೆಮೊರಿ
  ಎಂದಿಗೂ ಹಿಂದಿರುಗಿಸಲ್ಪಡುವುದಿಲ್ಲ
- Deletes soft-deletes -- ದಾಖಲೆ ಮರೆಮಾಚಲ್ಪಡುತ್ತದೆ ಆದರೆ audit ಗಾಗಿ ಉಳಿಸಿಕೊಳ್ಳಲ್ಪಡುತ್ತದೆ
- Agent ಹೆಚ್ಚು-classified ಡೇಟಾ ಓದಿ ಕಡಿಮೆ ಮಟ್ಟದಲ್ಲಿ ಮರು-ಉಳಿಸುವ ಮೂಲಕ memory
  classification escalate ಮಾಡಲಾಗದು (write-down prevention ಅನ್ವಯಿಸುತ್ತದೆ)

::: warning SECURITY LLM ಎಂದಿಗೂ memory classification ಆಯ್ಕೆ ಮಾಡುವುದಿಲ್ಲ. ಇದು
policy layer ನಿಂದ ಯಾವಾಗಲೂ ಪ್ರಸ್ತುತ session ನ taint ಮಟ್ಟಕ್ಕೆ ಒತ್ತಾಯಪಡಿಸಲ್ಪಡುತ್ತದೆ.
Configure ಮಾಡಿ ತೆಗೆದುಹಾಕಲಾಗದ ಕಠಿಣ ಗಡಿ ಇದು. :::
