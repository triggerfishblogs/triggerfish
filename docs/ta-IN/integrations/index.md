# Integrations உருவாக்குதல்

Triggerfish extend ஆக வடிவமைக்கப்பட்டுள்ளது. ஒரு புதிய data source இணைக்க, ஒரு workflow automate செய்ய, உங்கள் agent க்கு புதிய skills கொடுக்க, அல்லது external events க்கு react செய்ய விரும்பினாலும், ஒரு நன்கு வரையறுக்கப்பட்ட integration pathway உள்ளது -- மற்றும் ஒவ்வொரு pathway உம் அதே பாதுகாப்பு model ஐ மதிக்கிறது.

## Integration Pathways

Triggerfish platform extend செய்ய ஐந்து வேறு வழிகள் வழங்குகிறது. ஒவ்வொன்றும் வேறு நோக்கத்திற்கு serve செய்கிறது, ஆனால் அனைத்தும் அதே பாதுகாப்பு guarantees share செய்கின்றன: classification enforcement, taint tracking, policy hooks, மற்றும் full audit logging.

| Pathway                                    | நோக்கம்                                     | சிறந்தது                                                                      |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------ |
| [MCP Gateway](./mcp-gateway)               | External tool servers இணைக்கவும்             | Model Context Protocol மூலம் Standardized agent-to-tool communication         |
| [Plugins](./plugins)                       | Custom tools உடன் agent extend செய்யவும்     | Agent-built integrations, API connectors, external system queries, workflows   |
| [Exec Environment](./exec-environment)     | Agent தன்னுடைய code எழுதி இயக்கவும்         | Feedback loop இல் integrations building, prototyping, testing, மற்றும் iterating |
| [Skills](./skills)                         | Instructions மூலம் agent க்கு புதிய திறன்கள் | Reusable behaviors, community marketplace, agent self-authoring                |
| [Browser Automation](./browser)            | CDP மூலம் browser instance கட்டுப்படுத்தவும் | Web research, form filling, scraping, automated web workflows                  |
| [Webhooks](./webhooks)                     | External services இலிருந்து inbound events பெறவும் | Emails, alerts, CI/CD events, calendar மாற்றங்களுக்கு Real-time reactions    |
| [GitHub](./github)                         | முழு GitHub workflow integration              | PR review loops, issue triage, webhooks + exec + skills மூலம் branch management |
| [Google Workspace](./google-workspace)     | Gmail, Calendar, Tasks, Drive, Sheets இணைக்கவும் | Google Workspace க்கு 14 tools உடன் Bundled OAuth2 integration              |
| [Obsidian](./obsidian)                     | Obsidian vault notes படிக்கவும், எழுதவும், தேடவும் | Folder mappings, wikilinks, daily notes உடன் Classification-gated note access |

## பாதுகாப்பு Model

ஒவ்வொரு integration உம் -- pathway பொருட்படுத்தாமல் -- அதே பாதுகாப்பு constraints இல் operate செய்கிறது.

### எல்லாமே UNTRUSTED ஆக தொடங்குகிறது

புதிய MCP servers, plugins, channels, மற்றும் webhook sources அனைத்தும் default ஆக `UNTRUSTED` நிலைக்கு default ஆகின்றன. Owner (personal tier) அல்லது admin (enterprise tier) வெளிப்படையாக classify செய்யும் வரை அவை agent உடன் data exchange செய்ய முடியாது.

```
UNTRUSTED  -->  CLASSIFIED  (review க்கு பிறகு, ஒரு classification நிலை assigned)
UNTRUSTED  -->  BLOCKED     (வெளிப்படையாக prohibited)
```

### Classification Flow ஆகிறது

ஒரு integration data return செய்யும்போது, அந்த data ஒரு classification நிலை கொண்டுவருகிறது. Classified data அணுகுவது session taint ஐ பொருந்த escalate செய்கிறது. Tainted ஆன பிறகு, session குறைந்த classification destination க்கு output செய்ய முடியாது. இதுதான் [No Write-Down விதி](/ta-IN/security/no-write-down) -- இது fixed மற்றும் override செய்ய முடியாது.

### Policy Hooks ஒவ்வொரு Boundary இலும் Enforce செய்கின்றன

அனைத்து integration actions உம் deterministic policy hooks மூலம் செல்கின்றன:

| Hook                    | எப்போது Fire ஆகிறது                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `PRE_CONTEXT_INJECTION` | External data agent context க்கு நுழைகிறது (webhooks, plugin responses) |
| `PRE_TOOL_CALL`         | Agent ஒரு tool call request செய்கிறது (MCP, exec, browser)       |
| `POST_TOOL_RESPONSE`    | Tool data return செய்கிறது (classify response, taint update செய்யவும்) |
| `PRE_OUTPUT`            | Response system விட்டு வெளியேறுகிறது (final classification check) |

இந்த hooks pure functions -- LLM calls இல்லை, randomness இல்லை, bypass இல்லை. ஒரே input எப்போதும் ஒரே முடிவு produce செய்கிறது.

### Audit Trail

ஒவ்வொரு integration action உம் log ஆகிறது: என்ன அழைக்கப்பட்டது, யார் அழைத்தது, policy முடிவு என்ன, மற்றும் session taint எவ்வாறு மாறியது. இந்த audit trail immutable மற்றும் compliance review க்கு available.

::: warning SECURITY LLM policy hook முடிவுகளை bypass செய்யவோ, மாற்றவோ, அல்லது பாதிக்கவோ முடியாது. Hooks LLM அடுக்கிற்கு கீழ் code இல் இயங்குகின்றன. AI actions request செய்கிறது -- policy layer தீர்மானிக்கிறது. :::

## சரியான Pathway தேர்வு செய்யவும்

உங்கள் use case க்கு பொருந்தும் integration pathway தேர்வு செய்ய இந்த decision guide பயன்படுத்தவும்:

- **Standard tool server இணைக்க விரும்புகிறீர்கள்** -- [MCP Gateway](./mcp-gateway) பயன்படுத்தவும். ஒரு tool MCP பேசினால், இதுதான் path.
- **External API க்கு எதிராக custom code இயக்க வேண்டும்** -- [Plugins](./plugins) பயன்படுத்தவும். Agent runtime இல் plugins build, scan, மற்றும் load செய்யலாம். Plugins security scanning உடன் sandboxed ஆக இயங்குகின்றன.
- **Agent code build மற்றும் iterate செய்ய விரும்புகிறீர்கள்** -- [Exec Environment](./exec-environment) பயன்படுத்தவும். Agent ஒரு full write/run/fix loop உடன் workspace பெறுகிறது.
- **Agent க்கு புதிய behavior கற்பிக்க விரும்புகிறீர்கள்** -- [Skills](./skills) பயன்படுத்தவும். Instructions உடன் ஒரு `SKILL.md` எழுதவும், அல்லது agent தன்னை author செய்யட்டும்.
- **Web interactions automate செய்ய வேண்டும்** -- [Browser Automation](./browser) பயன்படுத்தவும். Domain policy enforcement உடன் CDP-controlled Chromium.
- **Real time இல் external events க்கு react செய்ய வேண்டும்** -- [Webhooks](./webhooks) பயன்படுத்தவும். Inbound events verified, classified, மற்றும் agent க்கு routed.

::: tip இந்த pathways mutually exclusive அல்ல. ஒரு skill internally browser automation பயன்படுத்தலாம். ஒரு plugin ஒரு webhook மூலம் trigger ஆகலாம். Exec environment இல் agent-authored integration ஒரு skill ஆக persist செய்யலாம். அவை இயற்கையாகவே compose ஆகின்றன. :::
