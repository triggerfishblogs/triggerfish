# ವರ್ಗೀಕರಣ ಮಟ್ಟಗಳು ಆಯ್ಕೆ ಮಾಡುವುದು

Triggerfish ನಲ್ಲಿ ಪ್ರತಿ ಚಾನೆಲ್, MCP server, ಏಕೀಕರಣ ಮತ್ತು plugin ಗೆ ವರ್ಗೀಕರಣ
ಮಟ್ಟ ಇರಬೇಕು. ಈ ಪುಟ ಸರಿಯಾದ ಮಟ್ಟ ಆಯ್ಕೆ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.

## ನಾಲ್ಕು ಮಟ್ಟಗಳು

| ಮಟ್ಟ              | ಅರ್ಥ                                              | ಡೇಟಾ ಹರಿಯಬಹುದಾದ ಸ್ಥಳಗಳು           |
| ----------------- | ------------------------------------------------- | ---------------------------------- |
| **PUBLIC**        | ಯಾರಿಗೂ ನೋಡಲು ಸುರಕ್ಷಿತ                            | ಎಲ್ಲೆಡೆ                            |
| **INTERNAL**      | ನಿಮ್ಮ ಕಣ್ಣುಗಳಿಗೆ ಮಾತ್ರ -- ಸೂಕ್ಷ್ಮವಲ್ಲ, ಆದರೆ ಸಾರ್ವಜನಿಕವಲ್ಲ | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL**  | ನೀವೆಂದಿಗೂ ಸೋರಿಕೆ ಬಯಸದ ಸೂಕ್ಷ್ಮ ಡೇಟಾ ಒಳಗೊಂಡಿದೆ     | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**    | ಅತ್ಯಂತ ಸೂಕ್ಷ್ಮ -- ಕಾನೂನು, ವೈದ್ಯಕೀಯ, ಹಣಕಾಸು, PII  | RESTRICTED ಮಾತ್ರ                   |

ಡೇಟಾ ಕೇವಲ **ಮೇಲಕ್ಕೆ ಅಥವಾ ಪಕ್ಕಕ್ಕೆ** ಹರಿಯಬಹುದು, ಎಂದಿಗೂ ಕೆಳಕ್ಕೆ ಅಲ್ಲ. ಇದು
[no-write-down ನಿಯಮ](/kn-IN/security/no-write-down) ಮತ್ತು ಇದನ್ನು ಅತಿಕ್ರಮಿಸಲಾಗುವುದಿಲ್ಲ.

## ಕೇಳಬೇಕಾದ ಎರಡು ಪ್ರಶ್ನೆಗಳು

ನೀವು ಕಾನ್ಫಿಗರ್ ಮಾಡುತ್ತಿರುವ ಯಾವುದೇ ಏಕೀಕರಣಕ್ಕಾಗಿ, ಕೇಳಿ:

**1. ಈ ಮೂಲ ಮರಳಿ ನೀಡಬಹುದಾದ ಅತ್ಯಂತ ಸೂಕ್ಷ್ಮ ಡೇಟಾ ಯಾವುದು?**

ಇದು **ಕನಿಷ್ಠ** ವರ್ಗೀಕರಣ ಮಟ್ಟ ನಿರ್ಧರಿಸುತ್ತದೆ.

**2. Session ಡೇಟಾ ಈ ಗಮ್ಯಸ್ಥಾನಕ್ಕೆ ಹರಿದರೆ ನನಗೆ ಸಮಾಧಾನವಾಗುತ್ತದೆಯೇ?**

ಇದು ನಿಯೋಜಿಸಲು ನೀವು ಬಯಸುವ **ಗರಿಷ್ಠ** ವರ್ಗೀಕರಣ ಮಟ್ಟ ನಿರ್ಧರಿಸುತ್ತದೆ.

## ಡೇಟಾ ಪ್ರಕಾರದ ಅನ್ವಯ ವರ್ಗೀಕರಣ

| ಡೇಟಾ ಪ್ರಕಾರ                                       | ಶಿಫಾರಸು ಮಟ್ಟ   | ಏಕೆ                                        |
| ------------------------------------------------- | ------------- | ------------------------------------------ |
| ಹವಾಮಾನ, ಸಾರ್ವಜನಿಕ ವೆಬ್ ಪುಟಗಳು, ಸಮಯ ವಲಯಗಳು         | **PUBLIC**    | ಯಾರಿಗೂ ಮುಕ್ತವಾಗಿ ಲಭ್ಯ                       |
| ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳು, ಬುಕ್‌ಮಾರ್ಕ್‌ಗಳು, ಕಾರ್ಯ ಪಟ್ಟಿಗಳು | **INTERNAL**  | ಖಾಸಗಿ ಆದರೆ ಬಹಿರಂಗಗೊಂಡರೂ ಹಾನಿಕರವಲ್ಲ         |
| ಆಂತರಿಕ wikis, ತಂಡ ದಾಖಲೆಗಳು, ಯೋಜನಾ ಬೋರ್ಡ್‌ಗಳು       | **INTERNAL**  | ಸಂಸ್ಥೆ-ಆಂತರಿಕ ಮಾಹಿತಿ                        |
| ಇಮೇಲ್, ಕ್ಯಾಲೆಂಡರ್ ಈವೆಂಟ್‌ಗಳು, ಸಂಪರ್ಕಗಳು              | **CONFIDENTIAL** | ಹೆಸರುಗಳು, ವೇಳಾಪಟ್ಟಿಗಳು, ಸಂಬಂಧಗಳನ್ನು ಒಳಗೊಂಡಿದೆ |
| CRM ಡೇಟಾ, ಮಾರಾಟ pipeline, ಗ್ರಾಹಕ ದಾಖಲೆಗಳು         | **CONFIDENTIAL** | ವ್ಯಾಪಾರ-ಸೂಕ್ಷ್ಮ, ಗ್ರಾಹಕ ಡೇಟಾ                |
| ಹಣಕಾಸು ದಾಖಲೆಗಳು, ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು, ಇನ್‌ವಾಯ್ಸ್‌ಗಳು      | **CONFIDENTIAL** | ಆರ್ಥಿಕ ಮಾಹಿತಿ                               |
| ಖಾಸಗಿ ಸೋರ್ಸ್ ಕೋಡ್ repositories                    | **CONFIDENTIAL** | ಬೌದ್ಧಿಕ ಆಸ್ತಿ                               |
| ವೈದ್ಯಕೀಯ ಅಥವಾ ಆರೋಗ್ಯ ದಾಖಲೆಗಳು                     | **RESTRICTED** | ಕಾನೂನಾತ್ಮಕ ರಕ್ಷಣೆ (HIPAA, ಇತ್ಯಾದಿ)           |
| ಸರ್ಕಾರಿ ID ಸಂಖ್ಯೆಗಳು, SSN, ಪಾಸ್‌ಪೋರ್ಟ್‌ಗಳು           | **RESTRICTED** | ಗುರುತು ಕಳವು ಅಪಾಯ                            |
| ಎನ್‌ಕ್ರಿಪ್ಷನ್ ಕೀಗಳು, ರುಜುವಾತುಗಳು, secrets           | **RESTRICTED** | ಸಿಸ್ಟಂ ರಾಜಿ ಅಪಾಯ                            |

## MCP Servers

```yaml
mcp_servers:
  # PUBLIC — ಮುಕ್ತ ಡೇಟಾ, ಯಾವುದೇ ಸೂಕ್ಷ್ಮತೆಯಿಲ್ಲ
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — ನಿಮ್ಮ ಸ್ವಂತ filesystem, ಖಾಸಗಿ ಆದರೆ secrets ಅಲ್ಲ
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — ಖಾಸಗಿ repos, ಗ್ರಾಹಕ ಸಮಸ್ಯೆಗಳಿಗೆ ಪ್ರವೇಶ
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL
```

::: warning DEFAULT DENY `classification` ಬಿಟ್ಟುಬಿಟ್ಟರೆ, server **UNTRUSTED** ಆಗಿ
ನೋಂದಾಯಿಸಲ್ಪಡುತ್ತದೆ ಮತ್ತು gateway ಎಲ್ಲ tool calls ತಿರಸ್ಕರಿಸುತ್ತದೆ. :::

## ಚಾನೆಲ್‌ಗಳು

ಚಾನೆಲ್ ವರ್ಗೀಕರಣ **ಮೇಲ್ಛಾವಣಿ** ನಿರ್ಧರಿಸುತ್ತದೆ -- ಆ ಚಾನೆಲ್‌ಗೆ ತಲುಪಿಸಬಹುದಾದ ಡೇಟಾದ
ಗರಿಷ್ಠ ಸೂಕ್ಷ್ಮತೆ.

```yaml
channels:
  cli:
    classification: INTERNAL
  telegram:
    classification: INTERNAL
  webchat:
    classification: PUBLIC
  email:
    classification: CONFIDENTIAL
```

## Taint ಕ್ಯಾಸ್ಕೇಡ್

ಪ್ರಾಯೋಗಿಕ ಪ್ರಭಾವ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಈ ಉದಾಹರಣೆ ನೋಡಿ:

```
1. Session PUBLIC ನಲ್ಲಿ ಪ್ರಾರಂಭ
2. ಹವಾಮಾನ ಕೇಳಿ (PUBLIC server)     → taint PUBLIC ಉಳಿಯುತ್ತದೆ
3. ಟಿಪ್ಪಣಿಗಳು ಪರಿಶೀಲಿಸಿ (INTERNAL filesystem) → taint INTERNAL ಗೆ ಏರುತ್ತದೆ
4. GitHub issues ಪ್ರಶ್ನಿಸಿ (CONFIDENTIAL) → taint CONFIDENTIAL ಗೆ ಏರುತ್ತದೆ
5. webchat (PUBLIC channel) ಗೆ ಪೋಸ್ಟ್ ಮಾಡಲು ಯತ್ನ → BLOCKED (write-down violation)
6. Session ಮರುಹೊಂದಿಸಿ → taint PUBLIC ಗೆ ಮರಳುತ್ತದೆ
7. webchat ಗೆ ಪೋಸ್ಟ್ ಮಾಡಿ → ಅನುಮತಿಸಲ್ಪಟ್ಟಿದೆ
```

## ಪರಿಶೀಲನಾ ಪಟ್ಟಿ

ಹೊಸ ಏಕೀಕರಣ ಲೈವ್ ಮಾಡುವ ಮೊದಲು:

- [ ] ಈ ಮೂಲ ಮರಳಿ ನೀಡಬಹುದಾದ ಅತ್ಯಂತ ಕೆಟ್ಟ ಡೇಟಾ ಯಾವುದು? ಆ ಮಟ್ಟದಲ್ಲಿ ವರ್ಗೀಕರಿಸಿ.
- [ ] ವರ್ಗೀಕರಣ ಕನಿಷ್ಠ ಡೇಟಾ ಪ್ರಕಾರ ಕೋಷ್ಟಕ ಸೂಚಿಸುವಷ್ಟು ಎತ್ತರವಾಗಿದೆಯೇ?
- [ ] ಸಂಶಯ ಇದ್ದರೆ, ಕಡಿಮೆ ಬದಲಾಗಿ ಎತ್ತರ ವರ್ಗೀಕರಿಸಿದ್ದೀರಾ?

## ಸಂಬಂಧಿತ ಪುಟಗಳು

- [No Write-Down ನಿಯಮ](/kn-IN/security/no-write-down) — ಸ್ಥಿರ ಡೇಟಾ ಹರಿವು ನಿಯಮ
- [ಕಾನ್ಫಿಗರೇಶನ್](/kn-IN/guide/configuration) — ಸಂಪೂರ್ಣ YAML ಉಲ್ಲೇಖ
- [MCP Gateway](/kn-IN/integrations/mcp-gateway) — MCP server ಭದ್ರತಾ ಮಾದರಿ
