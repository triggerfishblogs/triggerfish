# Building Integrations

Triggerfish extend करण्यासाठी designed आहे. नवीन data source connect करायची
असो, workflow automate करायचे असो, एजंटला नवीन skills द्यायच्या असोत, किंवा
external events ला react करायचे असोत, एक well-defined integration pathway आहे
-- आणि प्रत्येक pathway समान security model respect करतो.

## Integration Pathways

Triggerfish platform extend करण्यासाठी पाच distinct ways offer करतो. प्रत्येक
वेगळ्या purpose साठी serve करतो, पण सर्व समान security guarantees share करतात:
classification enforcement, taint tracking, policy hooks, आणि full audit logging.

| Pathway                                | Purpose                                           | Best For                                                                       |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| [MCP Gateway](./mcp-gateway)           | External tool servers connect करा                 | Model Context Protocol द्वारे standardized agent-to-tool communication        |
| [Plugins](./plugins)                   | Custom tools सह एजंट extend करा                  | Agent-built integrations, API connectors, external system queries, workflows   |
| [Exec Environment](./exec-environment) | एजंट स्वतःचा code write आणि run करतो             | Integrations building, prototyping, testing, आणि feedback loop मध्ये iterating |
| [Skills](./skills)                     | Instructions द्वारे एजंटला नवीन capabilities द्या | Reusable behaviors, community marketplace, agent self-authoring                |
| [Browser Automation](./browser)        | CDP द्वारे browser instance control करा           | Web research, form filling, scraping, automated web workflows                  |
| [Webhooks](./webhooks)                 | External services कडून inbound events receive करा | Emails, alerts, CI/CD events, calendar changes ला real-time reactions          |
| [GitHub](./github)                     | Full GitHub workflow integration                  | PR review loops, issue triage, webhooks + exec + skills द्वारे branch management |
| [Google Workspace](./google-workspace) | Gmail, Calendar, Tasks, Drive, Sheets connect करा | Google Workspace साठी 14 tools सह bundled OAuth2 integration                   |
| [Obsidian](./obsidian)                 | Obsidian vault notes read, write, आणि search करा  | Folder mappings, wikilinks, daily notes सह classification-gated note access    |

## Security Model

प्रत्येक integration -- pathway विचारात न घेता -- समान security constraints
खाली operate करतो.

### सर्वकाही UNTRUSTED म्हणून सुरू होते

नवीन MCP servers, plugins, channels, आणि webhook sources सर्व `UNTRUSTED` state
ला default करतात. Owner (personal tier) किंवा admin (enterprise tier) द्वारे
explicitly classified होईपर्यंत ते एजंटशी data exchange करू शकत नाहीत.

```
UNTRUSTED  -->  CLASSIFIED  (review नंतर, classification level assigned)
UNTRUSTED  -->  BLOCKED     (explicitly prohibited)
```

### Classification Flow होतो

Integration data return करतो तेव्हा, त्या data ला classification level असतो.
Classified data access करणे session taint match करण्यासाठी escalate करते. Once
tainted, session lower-classification destination ला output करू शकत नाही. हा
[No Write-Down rule](/mr-IN/security/no-write-down) आहे -- तो fixed आहे आणि
override केला जाऊ शकत नाही.

### Policy Hooks प्रत्येक Boundary वर Enforce करतात

सर्व integration actions deterministic policy hooks मधून जातात:

| Hook                    | केव्हा Fire होतो                                                          |
| ----------------------- | ------------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | External data एजंट context मध्ये enter होतो (webhooks, plugin responses) |
| `PRE_TOOL_CALL`         | एजंट tool call request करतो (MCP, exec, browser)                         |
| `POST_TOOL_RESPONSE`    | Tool data return करतो (response classify, taint update)                   |
| `PRE_OUTPUT`            | Response system सोडतो (final classification check)                        |

हे hooks pure functions आहेत -- कोणतेही LLM calls नाहीत, कोणताही randomness
नाही, कोणताही bypass नाही. Same input नेहमी same decision produce करतो.

### Audit Trail

प्रत्येक integration action logged आहे: काय called केले, कोणी called केले, policy
decision काय होता, आणि session taint कसा बदलला. Audit trail immutable आहे आणि
compliance review साठी available आहे.

::: warning SECURITY LLM policy hook decisions bypass, modify, किंवा influence
करू शकत नाही. Hooks LLM layer खाली code मध्ये run होतात. AI actions request
करतो -- policy layer decide करतो. :::

## Right Pathway निवडणे

तुमच्या use case साठी fit होणारा integration pathway निवडण्यासाठी हा decision
guide वापरा:

- **तुम्हाला standard tool server connect करायचा आहे** -- [MCP Gateway](./mcp-gateway)
  वापरा. Tool MCP बोलत असल्यास, हा path आहे.
- **तुम्हाला external API विरुद्ध custom code run करायचा आहे** -- [Plugins](./plugins)
  वापरा. एजंट runtime मध्ये plugins build, scan, आणि load करू शकतो. Plugins
  security scanning सह sandboxed run होतात.
- **तुम्हाला एजंटला code build आणि iterate करायचे आहे** -- [Exec Environment](./exec-environment)
  वापरा. एजंटला full write/run/fix loop सह workspace मिळतो.
- **तुम्हाला एजंटला नवीन वर्तन शिकवायचे आहे** -- [Skills](./skills) वापरा.
  Instructions सह `SKILL.md` लिहा, किंवा एजंटला स्वतः author करू द्या.
- **तुम्हाला web interactions automate करायच्या आहेत** -- [Browser Automation](./browser)
  वापरा. Domain policy enforcement सह CDP-controlled Chromium.
- **तुम्हाला real time मध्ये external events ला react करायचे आहे** -- [Webhooks](./webhooks)
  वापरा. Inbound events verified, classified, आणि एजंटला routed केले जातात.

::: tip हे pathways mutually exclusive नाहीत. Skill internally browser automation
वापरू शकते. Plugin webhook द्वारे triggered होऊ शकतो. Exec environment मधील
agent-authored integration skill म्हणून persist केले जाऊ शकते. ते naturally
compose होतात. :::
