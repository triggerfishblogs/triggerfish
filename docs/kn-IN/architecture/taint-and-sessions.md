# Sessions ಮತ್ತು Taint

Sessions Triggerfish ನ ಸಂಭಾಷಣೆ ಸ್ಥಿತಿಯ ಮೂಲಭೂತ ಘಟಕ. ಪ್ರತಿ session ಸ್ವತಂತ್ರವಾಗಿ
**taint ಮಟ್ಟ** ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತದೆ -- session ಸಮಯದಲ್ಲಿ ಪ್ರವೇಶಿಸಿದ ಡೇಟಾದ ಅತ್ಯಧಿಕ
ಸೂಕ್ಷ್ಮತೆ ದಾಖಲಿಸುವ ವರ್ಗೀಕರಣ ಜಲಮಾರ್ಕ್. Taint ನೀತಿ ಎಂಜಿನ್ ನ ಔಟ್‌ಪುಟ್ ನಿರ್ಧಾರಗಳನ್ನು
ನಡೆಸುತ್ತದೆ: session `CONFIDENTIAL` ನಲ್ಲಿ tainted ಆಗಿದ್ದರೆ, ಆ session ನಿಂದ ಯಾವುದೇ
ಡೇಟಾ `CONFIDENTIAL` ಗಿಂತ ಕಡಿಮೆ ವರ್ಗೀಕೃತ ಚಾನೆಲ್‌ಗೆ ಹರಿಯಲಾಗದು.

## Session Taint ಮಾದರಿ

### Taint ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

Session ವರ್ಗೀಕರಣ ಮಟ್ಟದಲ್ಲಿ ಡೇಟಾ ಪ್ರವೇಶಿಸಿದಾಗ, ಇಡೀ session ಆ ಮಟ್ಟದಲ್ಲಿ **tainted**
ಆಗುತ್ತದೆ. Taint ಮೂರು ನಿಯಮಗಳನ್ನು ಅನುಸರಿಸುತ್ತದೆ:

1. **ಪ್ರತಿ-ಸಂಭಾಷಣೆ**: ಪ್ರತಿ session ತನ್ನದೇ ಸ್ವತಂತ್ರ taint ಮಟ್ಟ ಹೊಂದಿದೆ
2. **ಏರಿಕೆ ಮಾತ್ರ**: Taint ಹೆಚ್ಚಾಗಬಹುದು, session ಒಳಗೆ ಎಂದಿಗೂ ಕಡಿಮೆಯಾಗಲಾಗದು
3. **ಸಂಪೂರ್ಣ ಮರುಹೊಂದಿಕೆ ಎಲ್ಲವನ್ನೂ ಅಳಿಸುತ್ತದೆ**: Taint ಮತ್ತು ಸಂಭಾಷಣೆ ಇತಿಹಾಸ
   ಒಟ್ಟಿಗೆ ಅಳಿಸಲ್ಪಡುತ್ತವೆ

<img src="/diagrams/taint-escalation.svg" alt="Taint escalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint can only escalate, never decrease." style="max-width: 100%;" />

::: warning SECURITY Taint ಅನ್ನು ಆಯ್ದಕಟ್ಟಲಾಗಿ ಕಡಿಮೆ ಮಾಡಲಾಗದು. ಇಡೀ ಸಂಭಾಷಣೆ
ಇತಿಹಾಸ ಅಳಿಸದೆ session ಅನ್ನು "un-taint" ಮಾಡುವ ಯಾವುದೇ ಕಾರ್ಯವಿಧಾನ ಇಲ್ಲ. :::

### ಏಕೆ Taint ಕಡಿಮೆಯಾಗಲಾಗದು

ವರ್ಗೀಕೃತ ಡೇಟಾ ಇನ್ನು ಪ್ರದರ್ಶಿಸದಿದ್ದರೂ, LLM ನ ಸಂದರ್ಭ ವಿಂಡೋ ಇನ್ನೂ ಅದನ್ನು ಒಳಗೊಂಡಿದೆ.
Taint ಕಡಿಮೆ ಮಾಡಲು ಏಕೈಕ ಸುರಕ್ಷಿತ ಮಾರ್ಗ ಸಂದರ್ಭ ಸಂಪೂರ್ಣ ತೆಗೆದುಹಾಕುವುದು -- ಇದು
ನಿಖರವಾಗಿ ಸಂಪೂರ್ಣ ಮರುಹೊಂದಿಕೆ ಮಾಡುವುದು.

## Session ಪ್ರಕಾರಗಳು

| Session ಪ್ರಕಾರ  | ವಿವರಣೆ                                     | ಆರಂಭಿಕ Taint | ಮರುಪ್ರಾರಂಭಗಳಾದ್ಯಂತ ಉಳಿಯುತ್ತದೆಯೇ |
| --------------- | ------------------------------------------ | ------------ | -------------------------------- |
| **Main**        | ಮಾಲೀಕರೊಂದಿಗೆ ಪ್ರಾಥಮಿಕ ನೇರ ಸಂಭಾಷಣೆ          | `PUBLIC`     | ಹೌದು                             |
| **Channel**     | ಪ್ರತಿ ಸಂಪರ್ಕಿತ ಚಾನೆಲ್‌ಗೆ ಒಂದು              | `PUBLIC`     | ಹೌದು                             |
| **Background**  | ಸ್ವಾಯತ್ತ ಕೆಲಸಗಳಿಗಾಗಿ ಉತ್ಪಾದಿಸಲಾಗಿದೆ          | `PUBLIC`     | ಕೆಲಸದ ಅವಧಿ                       |
| **Agent**       | ಬಹು-ಏಜೆಂಟ್ ರೂಟಿಂಗ್‌ಗಾಗಿ ಪ್ರತಿ-ಏಜೆಂಟ್        | `PUBLIC`     | ಹೌದು                             |
| **Group**       | ಗ್ರೂಪ್ ಚಾಟ್ sessions                       | `PUBLIC`     | ಹೌದು                             |

::: info Background sessions ಯಾವಾಗಲೂ `PUBLIC` taint ನೊಂದಿಗೆ ಪ್ರಾರಂಭವಾಗುತ್ತವೆ,
ಪೋಷಕ session ನ taint ಮಟ್ಟ ಏನಾದರೂ ಸರಿ. :::

## Taint ಏರಿಕೆ ಉದಾಹರಣೆ

<img src="/diagrams/taint-with-blocks.svg" alt="Taint escalation example: session starts PUBLIC, escalates to CONFIDENTIAL after Salesforce access, then BLOCKS output to PUBLIC WhatsApp channel" style="max-width: 100%;" />

## ಸಂಪೂರ್ಣ ಮರುಹೊಂದಿಕೆ ಕಾರ್ಯವಿಧಾನ

Session ಮರುಹೊಂದಿಕೆ taint ಕಡಿಮೆ ಮಾಡಲು ಏಕೈಕ ಮಾರ್ಗ. ಇದು ಉದ್ದೇಶಪೂರ್ವಕ, ವಿನಾಶಕಾರಿ
ಕ್ರಿಯೆ:

1. **Lineage ದಾಖಲೆಗಳು archive ಮಾಡಿ** -- session ನಿಂದ ಎಲ್ಲ lineage ಡೇಟಾ ಆಡಿಟ್
   storage ನಲ್ಲಿ ಸಂರಕ್ಷಿಸಲ್ಪಡುತ್ತದೆ
2. **ಸಂಭಾಷಣೆ ಇತಿಹಾಸ clear ಮಾಡಿ** -- ಇಡೀ ಸಂದರ್ಭ ವಿಂಡೋ ಅಳಿಸಲ್ಪಡುತ್ತದೆ
3. **Taint PUBLIC ಗೆ ಮರುಹೊಂದಿಸಿ** -- session ತಾಜಾ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ
4. **ಬಳಕೆದಾರ ದೃಢೀಕರಣ ಅಗತ್ಯ** -- `SESSION_RESET` hook ಕಾರ್ಯಗತಗೊಳಿಸುವ ಮೊದಲು
   ಸ್ಪಷ್ಟ ದೃಢೀಕರಣ ಅಗತ್ಯ

## ಡೇಟಾ Lineage

Triggerfish ಪ್ರಕ್ರಿಯೆ ಮಾಡಿದ ಪ್ರತಿ ಡೇಟಾ ಅಂಶ **provenance metadata** ಹೊಂದಿದೆ --
ಡೇಟಾ ಎಲ್ಲಿಂದ ಬಂತು, ಹೇಗೆ ರೂಪಾಂತರಗೊಂಡಿತು ಮತ್ತು ಎಲ್ಲಿ ಹೋಯಿತು ಎಂಬ ಸಂಪೂರ್ಣ ದಾಖಲೆ.

### Lineage ದಾಖಲೆ ರಚನೆ

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "accessed_at": "2025-01-29T10:23:45Z"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z"
    }
  ]
}
```

### Lineage ಟ್ರ್ಯಾಕಿಂಗ್ ನಿಯಮಗಳು

| ಘಟನೆ                              | Lineage ಕ್ರಿಯೆ                                        |
| --------------------------------- | ------------------------------------------------------ |
| ಏಕೀಕರಣದಿಂದ ಡೇಟಾ ಓದಿ               | Origin ನೊಂದಿಗೆ lineage ದಾಖಲೆ ರಚಿಸಿ                     |
| LLM ಡೇಟಾ ರೂಪಾಂತರಿಸಿ               | Transformation append ಮಾಡಿ, input lineages ಲಿಂಕ್ ಮಾಡಿ |
| ಅನೇಕ ಮೂಲಗಳಿಂದ ಡೇಟಾ ಒಟ್ಟುಗೂಡಿಸಿ   | Lineage ವಿಲೀನ ಮಾಡಿ, classification = `max(inputs)`     |
| ಚಾನೆಲ್‌ಗೆ ಡೇಟಾ ಕಳುಹಿಸಿ             | ಗಮ್ಯಸ್ಥಾನ ದಾಖಲಿಸಿ, ವರ್ಗೀಕರಣ ಪರಿಶೀಲಿಸಿ                  |
| Session ಮರುಹೊಂದಿಸಿ                | Lineage ದಾಖಲೆಗಳು archive ಮಾಡಿ, ಸಂದರ್ಭದಿಂದ clear ಮಾಡಿ |

### ಆಡಿಟ್ ಸಾಮರ್ಥ್ಯಗಳು

Lineage ನಾಲ್ಕು ವಿಭಾಗಗಳ ಆಡಿಟ್ ಪ್ರಶ್ನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸುತ್ತದೆ:

- **ಮುಂದಕ್ಕೆ ಟ್ರೇಸ್**: "Salesforce ದಾಖಲೆ X ಗೆ ಏನಾಯಿತು?"
- **ಹಿಂದಕ್ಕೆ ಟ್ರೇಸ್**: "ಈ ಔಟ್‌ಪುಟ್‌ಗೆ ಯಾವ ಮೂಲಗಳು ಕೊಡುಗೆ ನೀಡಿದವು?"
- **ವರ್ಗೀಕರಣ ಸಮರ್ಥನೆ**: "ಇದು CONFIDENTIAL ಎಂದು ಏಕೆ ಗುರುತಿಸಲಾಗಿದೆ?"
- **Compliance export**: ಕಾನೂನು ಅಥವಾ ನಿಯಂತ್ರಕ ಪರಿಶೀಲನೆಗಾಗಿ ಸಂಪೂರ್ಣ ಸರಪಳಿ
