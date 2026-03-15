# No Write-Down ನಿಯಮ

No write-down ನಿಯಮ Triggerfish ನ ಡೇಟಾ ರಕ್ಷಣಾ ಮಾದರಿಯ ಅಡಿಪಾಯ. ಇದು ಪ್ರತಿ session,
ಪ್ರತಿ ಚಾನೆಲ್ ಮತ್ತು ಪ್ರತಿ agent ಗೆ ಅನ್ವಯಿಸುವ ಸ್ಥಿರ, ಕಾನ್ಫಿಗರ್ ಮಾಡಲಾಗದ ನಿಯಮ --
ಯಾವ ಅಪವಾದ ಇಲ್ಲ ಮತ್ತು LLM override ಇಲ್ಲ.

**ನಿಯಮ:** ಡೇಟಾ ಕೇವಲ **ಸಮಾನ ಅಥವಾ ಹೆಚ್ಚಿನ** ವರ್ಗೀಕರಣ ಮಟ್ಟ ಹೊಂದಿರುವ ಚಾನೆಲ್‌ಗಳಿಗೆ
ಮತ್ತು ಸ್ವೀಕರಿಸುವವರಿಗೆ ಹರಿಯಬಹುದು.

## ವರ್ಗೀಕರಣ ಹೇಗೆ ಹರಿಯುತ್ತದೆ

<img src="/diagrams/write-down-rules.svg" alt="Write-down rules: data flows only to equal or higher classification levels" style="max-width: 100%;" />

::: danger No write-down ನಿಯಮ **ಸ್ಥಿರ ಮತ್ತು ಕಾನ್ಫಿಗರ್ ಮಾಡಲಾಗದ**. Administrators
ಇದನ್ನು ಸಡಿಲಿಸಲಾಗದು, ನೀತಿ ನಿಯಮಗಳಿಂದ ಅತಿಕ್ರಮಿಸಲಾಗದು, ಅಥವಾ LLM ಬೈಪಾಸ್ ಮಾಡಲಾಗದು.
ಇದು ಎಲ್ಲ ಇತರ ಭದ್ರತಾ ನಿಯಂತ್ರಣಗಳು ಅವಲಂಬಿಸುವ ವಾಸ್ತುಶಾಸ್ತ್ರದ ಅಡಿಪಾಯ. :::

## ಪರಿಣಾಮಕಾರಿ ವರ್ಗೀಕರಣ

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

| ಚಾನೆಲ್              | ಸ್ವೀಕರಿಸುವವರು        | ಪರಿಣಾಮಕಾರಿ ವರ್ಗೀಕರಣ |
| ------------------- | -------------------- | --------------------- |
| INTERNAL (Slack)    | INTERNAL (ಸಹೋದ್ಯೋಗಿ) | INTERNAL              |
| INTERNAL (Slack)    | EXTERNAL (ವಿಕ್ರೇತ)   | PUBLIC                |
| CONFIDENTIAL (Email)| EXTERNAL (ಸ್ನೇಹಿತ)   | PUBLIC                |

## ನಿಜ-ಜಗತ್ತಿನ ಉದಾಹರಣೆ

```
ಬಳಕೆದಾರ: "ನನ್ನ Salesforce pipeline ಪರಿಶೀಲಿಸಿ"

ಏಜೆಂಟ್: [ಬಳಕೆದಾರ ಪ್ರತಿನಿಧಿಸಿದ token ಮೂಲಕ Salesforce ಪ್ರವೇಶಿಸುತ್ತದೆ]
         [Salesforce ಡೇಟಾ CONFIDENTIAL ಎಂದು ವರ್ಗೀಕರಿಸಲ್ಪಟ್ಟಿದೆ]
         [Session taint CONFIDENTIAL ಗೆ ಏರುತ್ತದೆ]

         "ಈ ವಾರ 3 deals ಮುಕ್ತಾಯ ಒಟ್ಟು $2.1M..."

ಬಳಕೆದಾರ: "ನನ್ನ ಹೆಂಡತಿಗೆ ಇಂದು ರಾತ್ರಿ ತಡವಾಗಿ ಬರುತ್ತೇನೆ ಎಂದು ಸಂದೇಶ ಕಳುಹಿಸಿ"

ನೀತಿ ಪದರ: BLOCKED
  - Session taint: CONFIDENTIAL
  - ಸ್ವೀಕರಿಸುವವರು (ಹೆಂಡತಿ): EXTERNAL
  - ಪರಿಣಾಮಕಾರಿ ವರ್ಗೀಕರಣ: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down violation

ಏಜೆಂಟ್: "ಈ session ನಲ್ಲಿ ಗೌಪ್ಯ ಡೇಟಾ ಪ್ರವೇಶಿಸಿದ್ದರಿಂದ ಬಾಹ್ಯ
          ಸಂಪರ್ಕಗಳಿಗೆ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.

          -> Session ಮರುಹೊಂದಿಸಿ ಮತ್ತು ಸಂದೇಶ ಕಳುಹಿಸಿ
          -> ರದ್ದು ಮಾಡಿ"
```

## Session ಮರುಹೊಂದಿಕೆ

ಬಳಕೆದಾರ "Session ಮರುಹೊಂದಿಸಿ ಮತ್ತು ಸಂದೇಶ ಕಳುಹಿಸಿ" ಆಯ್ಕೆ ಮಾಡಿದಾಗ, Triggerfish
**ಸಂಪೂರ್ಣ ಮರುಹೊಂದಿಕೆ** ಮಾಡುತ್ತದೆ:

1. Session taint PUBLIC ಗೆ ಮರಳಿಸಲಾಗುತ್ತದೆ
2. ಸಂಭಾಷಣೆ ಇತಿಹಾಸ ಸಂಪೂರ್ಣ ಅಳಿಸಲ್ಪಡುತ್ತದೆ (ಸಂದರ್ಭ ಸೋರಿಕೆ ತಡೆಯುತ್ತದೆ)
3. ವಿನಂತಿಸಿದ ಕ್ರಿಯೆ ತಾಜಾ session ವಿರುದ್ಧ ಮರು-ಮೌಲ್ಯಮಾಪನ ಮಾಡಲ್ಪಡುತ್ತದೆ

::: warning SECURITY Session ಮರುಹೊಂದಿಕೆ taint ಮತ್ತು ಸಂಭಾಷಣೆ ಇತಿಹಾಸ ಎರಡನ್ನೂ
ಅಳಿಸುತ್ತದೆ. ಇದು ಐಚ್ಛಿಕ ಅಲ್ಲ. :::

## ಜಾರಿ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

No write-down ನಿಯಮ `PRE_OUTPUT` hook ನಲ್ಲಿ ಜಾರಿಗೊಳ್ಳುತ್ತದೆ -- ಯಾವ ಡೇಟಾ ಸಿಸ್ಟಂ
ಬಿಡುವ ಮೊದಲು ಕೊನೆಯ ಜಾರಿ ಬಿಂದು:

```typescript
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const effectiveClassification = min(
    getChannelClassification(context.channelId),
    getRecipientClassification(context.recipientId),
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

ಈ ಕೋಡ್ **ನಿರ್ಧಾರಾತ್ಮಕ**, **ಸಮಕಾಲೀನ**, **ಅಭೇದ್ಯ** ಮತ್ತು **ದಾಖಲಿಸಲ್ಪಟ್ಟ**.

## ಸಂಬಂಧಿತ ಪುಟಗಳು

- [ಭದ್ರತಾ-ಪ್ರಥಮ ವಿನ್ಯಾಸ](./) -- ಭದ್ರತಾ ಆರ್ಕಿಟೆಕ್ಚರ್ ಅವಲೋಕನ
- [Identity & Auth](./identity) -- ಚಾನೆಲ್ ಗುರುತು ಹೇಗೆ ಸ್ಥಾಪಿಸಲ್ಪಡುತ್ತದೆ
- [Audit & Compliance](./audit-logging) -- Block ಆದ ಕ್ರಿಯೆಗಳು ಹೇಗೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತವೆ
