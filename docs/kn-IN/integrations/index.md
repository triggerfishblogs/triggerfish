# Integrations ನಿರ್ಮಿಸುವುದು

Triggerfish ವಿಸ್ತರಿಸಲು ವಿನ್ಯಾಸ ಮಾಡಲ್ಪಟ್ಟಿದೆ. ಹೊಸ ಡೇಟಾ source ಸಂಪರ್ಕಿಸಲು,
workflow ಸ್ವಯಂಚಾಲಿತಗೊಳಿಸಲು, agent ಗೆ ಹೊಸ skills ನೀಡಲು, ಅಥವಾ ಬಾಹ್ಯ events ಗೆ
ಪ್ರತಿಕ್ರಿಯಿಸಲು, ಸ್ಪಷ್ಟವಾದ integration pathway ಇದೆ -- ಮತ್ತು ಪ್ರತಿ pathway ಅದೇ
security model ಗೌರವಿಸುತ್ತದೆ.

## Integration Pathways

Triggerfish platform ವಿಸ್ತರಿಸಲು ಐದು ಭಿನ್ನ ವಿಧಾನಗಳನ್ನು ಒದಗಿಸುತ್ತದೆ. ಪ್ರತಿಯೊಂದು
ಭಿನ್ನ ಉದ್ದೇಶ ಸೇವಿಸುತ್ತದೆ, ಆದರೆ ಎಲ್ಲ ಒಂದೇ security ಖಾತರಿ ಹಂಚಿಕೊಳ್ಳುತ್ತವೆ:
classification enforcement, taint tracking, policy hooks, ಮತ್ತು ಪೂರ್ಣ audit logging.

| Pathway                                | Purpose                                          | ಯಾವುದಕ್ಕೆ ಉತ್ತಮ                                                                      |
| -------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)           | ಬಾಹ್ಯ tool servers ಸಂಪರ್ಕಿಸಿ                  | Model Context Protocol ಮೂಲಕ ಸ್ಟ್ಯಾಂಡರ್ಡ್ agent-to-tool ಸಂವಾದ              |
| [Plugins](./plugins)                   | Custom tools ಜೊತೆ agent ವಿಸ್ತರಿಸಿ              | Agent-built integrations, API connectors, external system queries, workflows  |
| [Exec Environment](./exec-environment) | Agent ತನ್ನ ಸ್ವಂತ code ಬರೆದು ಚಲಾಯಿಸುತ್ತದೆ    | Feedback loop ನಲ್ಲಿ integrations build, prototype, test, ಮತ್ತು iterate ಮಾಡಿ |
| [Skills](./skills)                     | ಸೂಚನೆಗಳ ಮೂಲಕ agent ಗೆ ಹೊಸ capabilities ನೀಡಿ | Reusable behaviors, community marketplace, agent self-authoring               |
| [Browser Automation](./browser)        | CDP ಮೂಲಕ browser instance ನಿಯಂತ್ರಿಸಿ         | ವೆಬ್ ಸಂಶೋಧನೆ, form filling, scraping, automated web workflows               |
| [Webhooks](./webhooks)                 | ಬಾಹ್ಯ services ನಿಂದ inbound events ಸ್ವೀಕರಿಸಿ  | emails, alerts, CI/CD events, calendar changes ಗೆ real-time ಪ್ರತಿಕ್ರಿಯೆ    |
| [GitHub](./github)                     | ಪೂರ್ಣ GitHub workflow integration               | PR review loops, issue triage, webhooks + exec + skills ಮೂಲಕ branch management |
| [Google Workspace](./google-workspace) | Gmail, Calendar, Tasks, Drive, Sheets ಸಂಪರ್ಕಿಸಿ | Google Workspace ಗಾಗಿ 14 tools ಜೊತೆ bundled OAuth2 integration              |
| [Obsidian](./obsidian)                 | Obsidian vault notes ಓದಿ, ಬರೆಯಿರಿ, ಹುಡುಕಿ    | Folder mappings, wikilinks, daily notes ಜೊತೆ classification-gated note access |

## Security Model

ಪ್ರತಿ integration -- pathway ಲೆಕ್ಕಿಸದೆ -- ಒಂದೇ security ನಿರ್ಬಂಧಗಳ ಅಡಿಯಲ್ಲಿ
operate ಮಾಡುತ್ತದೆ.

### ಎಲ್ಲ UNTRUSTED ನಿಂದ ಪ್ರಾರಂಭ

ಹೊಸ MCP servers, plugins, channels, ಮತ್ತು webhook sources ಎಲ್ಲ `UNTRUSTED`
state ಗೆ default ಆಗುತ್ತವೆ. Owner (personal tier) ಅಥವಾ admin (enterprise tier)
ಸ್ಪಷ್ಟವಾಗಿ classify ಮಾಡುವ ತನಕ agent ಜೊತೆ ಡೇಟಾ exchange ಮಾಡಲಾಗದು.

```
UNTRUSTED  -->  CLASSIFIED  (ಪರಿಶೀಲನೆ ನಂತರ, classification level ನಿಯೋಜಿಸಲ್ಪಟ್ಟಿದೆ)
UNTRUSTED  -->  BLOCKED     (ಸ್ಪಷ್ಟವಾಗಿ ನಿಷೇಧಿಸಲ್ಪಟ್ಟಿದೆ)
```

### Classification ಮೂಲಕ Flow ಮಾಡುತ್ತದೆ

Integration ಡೇಟಾ ಹಿಂದಿರುಗಿಸಿದಾಗ, ಆ ಡೇಟಾ classification level ಒಯ್ಯುತ್ತದೆ.
Classified ಡೇಟಾ ಪ್ರವೇಶಿಸುವುದು session taint ಅನ್ನು ಹೊಂದಾಣಿಕೆಯಾಗಲು escalate ಮಾಡುತ್ತದೆ.
Tainted ಆದ ನಂತರ, session ಕಡಿಮೆ-classification destination ಗೆ output ಮಾಡಲಾಗದು.
ಇದು [No Write-Down rule](/kn-IN/security/no-write-down) -- ಇದು ಸ್ಥಿರ ಮತ್ತು override
ಮಾಡಲಾಗದು.

### Policy Hooks ಪ್ರತಿ ಗಡಿಯಲ್ಲಿ ಜಾರಿಗೊಳಿಸುತ್ತವೆ

ಎಲ್ಲ integration actions deterministic policy hooks ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತವೆ:

| Hook                    | ಯಾವಾಗ ಫೈರ್ ಆಗುತ್ತದೆ                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | ಬಾಹ್ಯ ಡೇಟಾ agent context ಪ್ರವೇಶಿಸುತ್ತದೆ (webhooks, plugin responses)        |
| `PRE_TOOL_CALL`         | Agent tool call ಕೋರುತ್ತದೆ (MCP, exec, browser)                               |
| `POST_TOOL_RESPONSE`    | Tool ಡೇಟಾ ಹಿಂದಿರುಗಿಸುತ್ತದೆ (response classify ಮಾಡಿ, taint update ಮಾಡಿ)     |
| `PRE_OUTPUT`            | Response ವ್ಯವಸ್ಥೆ ತೊರೆಯುತ್ತದೆ (ಅಂತಿಮ classification ತಪಾಸಣೆ)              |

ಈ hooks pure functions -- LLM calls ಇಲ್ಲ, randomness ಇಲ್ಲ, bypass ಇಲ್ಲ.
ಒಂದೇ input ಯಾವಾಗಲೂ ಒಂದೇ ನಿರ್ಧಾರ ತಯಾರಿಸುತ್ತದೆ.

### Audit Trail

ಪ್ರತಿ integration action log ಮಾಡಲ್ಪಡುತ್ತದೆ: ಏನನ್ನು call ಮಾಡಲ್ಪಟ್ಟಿತು, ಯಾರು call
ಮಾಡಿದರು, policy ನಿರ್ಧಾರ ಏನಾಯಿತು, ಮತ್ತು session taint ಹೇಗೆ ಬದಲಾಯಿತು. ಈ audit
trail immutable ಮತ್ತು compliance ಪರಿಶೀಲನೆಗೆ ಲಭ್ಯ.

::: warning SECURITY LLM policy hook ನಿರ್ಧಾರಗಳನ್ನು bypass, modify, ಅಥವಾ
influence ಮಾಡಲಾಗದು. Hooks LLM layer ಕೆಳಗಿನ code ನಲ್ಲಿ ಚಲಿಸುತ್ತವೆ. AI actions
ಕೋರುತ್ತದೆ -- policy layer ನಿರ್ಧರಿಸುತ್ತದೆ. :::

## ಸರಿಯಾದ Pathway ಆಯ್ಕೆ

ನಿಮ್ಮ use case ಗೆ ಸೂಕ್ತ integration pathway ಆಯ್ಕೆ ಮಾಡಲು ಈ decision guide:

- **ಸ್ಟ್ಯಾಂಡರ್ಡ್ tool server ಸಂಪರ್ಕಿಸಲು** -- [MCP Gateway](./mcp-gateway) ಬಳಸಿ.
  Tool MCP ಮಾತನಾಡಿದರೆ, ಇದೇ ಮಾರ್ಗ.
- **ಬಾಹ್ಯ API ಯ ವಿರುದ್ಧ custom code ಚಲಾಯಿಸಬೇಕಾದರೆ** -- [Plugins](./plugins) ಬಳಸಿ.
  Agent runtime ನಲ್ಲಿ plugins build, scan, ಮತ್ತು load ಮಾಡಬಹುದು. Plugins security
  scanning ಜೊತೆ sandboxed ಆಗಿ ಚಲಿಸುತ್ತವೆ.
- **Agent code build ಮಾಡಿ iterate ಮಾಡಬೇಕಾದರೆ** -- [Exec Environment](./exec-environment)
  ಬಳಸಿ. Agent ಪೂರ್ಣ write/run/fix loop ಜೊತೆ workspace ಪಡೆಯುತ್ತದೆ.
- **Agent ಗೆ ಹೊಸ behavior ಕಲಿಸಬೇಕಾದರೆ** -- [Skills](./skills) ಬಳಸಿ.
  ಸೂಚನೆಗಳ ಜೊತೆ `SKILL.md` ಬರೆಯಿರಿ, ಅಥವಾ agent ತನ್ನದೇ author ಮಾಡಲು ಬಿಡಿ.
- **ವೆಬ್ interactions ಸ್ವಯಂಚಾಲಿತಗೊಳಿಸಬೇಕಾದರೆ** -- [Browser Automation](./browser)
  ಬಳಸಿ. Domain policy enforcement ಜೊತೆ CDP-controlled Chromium.
- **Real time ನಲ್ಲಿ ಬಾಹ್ಯ events ಗೆ ಪ್ರತಿಕ್ರಿಯಿಸಬೇಕಾದರೆ** -- [Webhooks](./webhooks)
  ಬಳಸಿ. Inbound events verified, classified, ಮತ್ತು agent ಗೆ routed.

::: tip ಈ pathways ಪರಸ್ಪರ exclusive ಅಲ್ಲ. ಒಂದು skill ಆಂತರಿಕವಾಗಿ browser
automation ಬಳಸಬಹುದು. ಒಂದು plugin webhook ನಿಂದ trigger ಆಗಬಹುದು. Exec environment
ನಲ್ಲಿ agent-authored integration skill ಆಗಿ persist ಮಾಡಬಹುದು. ಇವು ನೈಸರ್ಗಿಕವಾಗಿ
compose ಮಾಡುತ್ತವೆ. :::
