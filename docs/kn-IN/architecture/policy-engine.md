# ನೀತಿ ಎಂಜಿನ್ ಮತ್ತು Hooks

ನೀತಿ ಎಂಜಿನ್ LLM ಮತ್ತು ಹೊರಗಿನ ಜಗತ್ತಿನ ನಡುವೆ ಕೂರುವ ಜಾರಿ ಪದರ. ಇದು ಡೇಟಾ ಹರಿವಿನ
ಮುಖ್ಯ ಬಿಂದುಗಳಲ್ಲಿ ಪ್ರತಿ ಕ್ರಿಯೆ ತಡೆಯುತ್ತದೆ ಮತ್ತು ನಿರ್ಧಾರಾತ್ಮಕ ALLOW, BLOCK ಅಥವಾ
REDACT ನಿರ್ಧಾರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ. LLM ಈ ನಿರ್ಧಾರಗಳನ್ನು ಬೈಪಾಸ್ ಮಾಡಲು,
ಮಾರ್ಪಡಿಸಲು ಅಥವಾ ಪ್ರಭಾವಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.

## ಮುಖ್ಯ ತತ್ವ: LLM ಕೆಳಗೆ ಜಾರಿ

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy enforcement layers: LLM sits above the policy layer, which sits above the execution layer" style="max-width: 100%;" />

::: warning SECURITY LLM ನೀತಿ ಪದರದ ಮೇಲೆ ಕೂರುತ್ತದೆ. ಇದನ್ನು prompt-inject
ಮಾಡಬಹುದು, jailbreak ಮಾಡಬಹುದು, ಅಥವಾ ಮ್ಯಾನಿಪ್ಯುಲೇಟ್ ಮಾಡಬಹುದು -- ಅದು ಮುಖ್ಯವಲ್ಲ.
ನೀತಿ ಪದರ LLM ಕೆಳಗೆ ಚಲಿಸುವ ಶುದ್ಧ ಕೋಡ್. LLM ಔಟ್‌ಪುಟ್‌ನಿಂದ hook ಬೈಪಾಸ್‌ಗೆ ಯಾವುದೇ
ಮಾರ್ಗ ಇಲ್ಲ. :::

## Hook ಪ್ರಕಾರಗಳು

ಎಂಟು ಜಾರಿ hooks ಡೇಟಾ ಹರಿವಿನ ಪ್ರತಿ ಮುಖ್ಯ ಬಿಂದುವಿನಲ್ಲಿ ಕ್ರಿಯೆಗಳನ್ನು ತಡೆಯುತ್ತವೆ.

<img src="/diagrams/hook-chain-flow.svg" alt="Hook chain flow: PRE_CONTEXT_INJECTION → LLM Context → PRE_TOOL_CALL → Tool Execution → POST_TOOL_RESPONSE → LLM Response → PRE_OUTPUT → Output Channel" style="max-width: 100%;" />

| Hook                    | ಪ್ರಚೋದಕ                           | ಮುಖ್ಯ ಕ್ರಿಯೆಗಳು                                                   | ವಿಫಲ ಮೋಡ್         |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------ | ----------------- |
| `PRE_CONTEXT_INJECTION` | ಬಾಹ್ಯ ಇನ್‌ಪುಟ್ ಸಂದರ್ಭ ಪ್ರವೇಶಿಸುತ್ತದೆ | ಇನ್‌ಪುಟ್ ವರ್ಗೀಕರಿಸಿ, taint ನಿಯೋಜಿಸಿ, lineage ರಚಿಸಿ, injection ಸ್ಕ್ಯಾನ್ | ಇನ್‌ಪುಟ್ ತಿರಸ್ಕರಿಸಿ |
| `PRE_TOOL_CALL`         | LLM tool ಎಕ್ಸಿಕ್ಯೂಶನ್ ವಿನಂತಿಸುತ್ತದೆ | ಅನುಮತಿ ಪರಿಶೀಲನೆ, rate limit, ಪ್ಯಾರಾಮೀಟರ್ ಮಾನ್ಯತೆ                 | Tool ಕರೆ block ಮಾಡಿ |
| `POST_TOOL_RESPONSE`    | Tool ಡೇಟಾ ಮರಳಿಸುತ್ತದೆ             | Response ವರ್ಗೀಕರಿಸಿ, session taint ಅಪ್‌ಡೇಟ್ ಮಾಡಿ, lineage ರಚಿಸಿ   | Redact ಅಥವಾ block |
| `PRE_OUTPUT`            | Response ಸಿಸ್ಟಂ ಬಿಡಲು ಹೊರಟಿದೆ    | ಗಮ್ಯಸ್ಥಾನ ವಿರುದ್ಧ ಅಂತಿಮ ವರ್ಗೀಕರಣ ಪರಿಶೀಲನೆ, PII ಸ್ಕ್ಯಾನ್           | ಔಟ್‌ಪುಟ್ block ಮಾಡಿ |
| `SECRET_ACCESS`         | Plugin ಒಂದು ರುಜುವಾತು ವಿನಂತಿಸುತ್ತದೆ | ಪ್ರವೇಶ ದಾಖಲಿಸಿ, declared scope ವಿರುದ್ಧ ಅನುಮತಿ ಪರಿಶೀಲಿಸಿ          | ರುಜುವಾತು ನಿರಾಕರಿಸಿ |
| `SESSION_RESET`         | ಬಳಕೆದಾರ taint ಮರುಹೊಂದಿಕೆ ವಿನಂತಿಸುತ್ತಾರೆ | Lineage archive ಮಾಡಿ, ಸಂದರ್ಭ clear ಮಾಡಿ, ದೃಢೀಕರಣ ಪರಿಶೀಲಿಸಿ    | ದೃಢೀಕರಣ ಅಗತ್ಯ    |
| `AGENT_INVOCATION`      | Agent ಮತ್ತೊಂದು agent ಕರೆಯುತ್ತದೆ  | Delegation chain ಪರಿಶೀಲಿಸಿ, taint ಮೇಲ್ಛಾವಣಿ ಜಾರಿಗೊಳಿಸಿ             | Invocation block  |
| `MCP_TOOL_CALL`         | MCP server tool ಇನ್‌ವೋಕ್ ಆಗಿದೆ   | Gateway ನೀತಿ ಪರಿಶೀಲನೆ (server ಸ್ಥಿತಿ, tool ಅನುಮತಿಗಳು, schema)    | MCP ಕರೆ block     |

## Hook ಗ್ಯಾರಂಟಿಗಳು

ಪ್ರತಿ hook ಎಕ್ಸಿಕ್ಯೂಶನ್ ನಾಲ್ಕು ಅಚಲ ತತ್ವಗಳನ್ನು ಹೊಂದಿದೆ:

| ಗ್ಯಾರಂಟಿ           | ಅರ್ಥ                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **ನಿರ್ಧಾರಾತ್ಮಕ**   | ಒಂದೇ ಇನ್‌ಪುಟ್ ಯಾವಾಗಲೂ ಒಂದೇ ನಿರ್ಧಾರ ನೀಡುತ್ತದೆ. Hooks ಒಳಗೆ LLM ಕರೆಗಳಿಲ್ಲ, ಯಾದೃಚ್ಛಿಕತೆಯಿಲ್ಲ.              |
| **ಸಮಕಾಲೀನ**        | Hooks ಕ್ರಿಯೆ ಮುನ್ನಡೆಯುವ ಮೊದಲು ಪೂರ್ಣಗೊಳ್ಳುತ್ತವೆ. Async bypass ಸಾಧ್ಯವಿಲ್ಲ. Timeout = ನಿರಾಕರಣೆ.        |
| **ದಾಖಲಿಸಲ್ಪಟ್ಟ**   | ಪ್ರತಿ hook ಎಕ್ಸಿಕ್ಯೂಶನ್ ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ: ಇನ್‌ಪುಟ್ ಪ್ಯಾರಾಮೀಟರ್‌ಗಳು, ತೆಗೆದ ನಿರ್ಧಾರ, timestamp.       |
| **ಅಭೇದ್ಯ**          | LLM ಔಟ್‌ಪುಟ್ hook bypass ಸೂಚನೆಗಳನ್ನು ಒಳಗೊಂಡಿರಬಾರದು. Hook ಪದರ LLM ಔಟ್‌ಪುಟ್ ಆಜ್ಞೆಗಳಿಗಾಗಿ parse ಮಾಡಲ್ಲ. |

## ನೀತಿ ನಿಯಮ ಶ್ರೇಣಿ

| ಹಂತ                           | ಸ್ವಭಾವ                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| **ಸ್ಥಿರ ನಿಯಮಗಳು**             | Hardcoded ಮತ್ತು ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲಾಗದು: no write-down, UNTRUSTED channels, session taint, audit logging |
| **ಕಾನ್ಫಿಗರ್ ಮಾಡಬಹುದಾದ ನಿಯಮಗಳು** | Admin-ಟ್ಯೂನ್ ಮಾಡಬಹುದಾದ: integration ವರ್ಗೀಕರಣಗಳು, channel ವರ್ಗೀಕರಣಗಳು, rate limits |
| **Declarative YAML**          | Enterprise: SSN ರೆಡಾಕ್ಷನ್, ಅನುಮೋದನೆ workflow ಗಳು, ಸಮಯ-ಆಧಾರಿತ ನಿರ್ಬಂಧಗಳಿಗಾಗಿ ಕಸ್ಟಮ್ ನಿಯಮಗಳು |

## ನಿರಾಕರಣೆ ಬಳಕೆದಾರ ಅನುಭವ

ನೀತಿ ಎಂಜಿನ್ ಕ್ರಿಯೆ block ಮಾಡಿದಾಗ, ಬಳಕೆದಾರ ಸ್ಪಷ್ಟ ವಿವರಣೆ ನೋಡುತ್ತಾರೆ:

**ಡಿಫಾಲ್ಟ್ (ನಿರ್ದಿಷ್ಟ):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**ಐಚ್ಛಿಕ (ಶೈಕ್ಷಣಿಕ):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  -> Reset session and send message
  -> Ask your admin to reclassify the WhatsApp channel
  -> Learn more: [docs link]
```

ಎರಡೂ ಮೋಡ್‌ಗಳು ಕ್ರಿಯಾಯೋಗ್ಯ ಆಯ್ಕೆಗಳನ್ನು ನೀಡುತ್ತವೆ -- ಬಳಕೆದಾರರನ್ನು ಎಂದಿಗೂ dead-end
errors ನಲ್ಲಿ ಬಿಡುವುದಿಲ್ಲ.
