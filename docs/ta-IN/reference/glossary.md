# Glossary

| Term                         | Definition                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | Distinct roles உடன் collaborating agent sessions இன் persistent group. ஒரு member lead -- வேலையை coordinate செய்கிறார். `team_create` மூலம் created, lifecycle checks உடன் monitored. |
| **A2UI**                     | Agent-to-UI protocol -- real time இல் Tide Pool workspace க்கு agent இலிருந்து visual content push செய்கிறது.                                                   |
| **Background Session**       | Autonomous tasks க்காக (cron, triggers) spawn ஆகும் session -- fresh PUBLIC taint உடன் தொடங்கி isolated workspace இல் இயங்குகிறது.                              |
| **Buoy**                     | Camera, location, screen recording, மற்றும் push notifications போன்ற device capabilities agent க்கு வழங்கும் ஒரு companion native app (iOS, Android). (Coming soon.) |
| **Classification**           | Data, channels, மற்றும் recipients க்கு assigned sensitivity label. நான்கு levels: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                  |
| **Cron**                     | Standard cron expression syntax பயன்படுத்தி specified time இல் agent execute செய்யும் scheduled recurring task.                                                 |
| **Dive**                     | `triggerfish.yaml`, SPINE.md, மற்றும் initial configuration scaffold செய்யும் first-run setup wizard (`triggerfish dive`).                                        |
| **Effective Classification** | Output decisions க்கு பயன்படுத்தப்படும் classification level, `min(channel_classification, recipient_classification)` ஆக calculated.                            |
| **Exec Environment**         | Agent இன் code workspace -- Plugin Sandbox இலிருந்து distinct, tight write-run-fix feedback loop இல் code எழுதவும், இயக்கவும், debug செய்யவும்.                 |
| **Failover**                 | Rate limiting, server errors, அல்லது timeouts காரணமாக current provider unavailable ஆகும்போது alternate LLM provider க்கு automatic fallback.                    |
| **Gateway**                  | Sessions, channels, tools, events, மற்றும் agent processes ஒரு WebSocket JSON-RPC endpoint மூலம் manage செய்யும் long-running local control plane.               |
| **Hook**                     | Policy engine rules evaluate செய்து ஒரு action allow, block, அல்லது redact செய்வதா என்று decide செய்யும் data flow இல் deterministic enforcement point.          |
| **Lineage**                  | Triggerfish process செய்யும் ஒவ்வொரு data element இன் origin, transformations, மற்றும் current location track செய்யும் provenance metadata.                     |
| **LlmProvider**              | LLM completions க்கான interface, ஒவ்வொரு supported provider (Anthropic, OpenAI, Google, Local, OpenRouter) மூலம் implemented.                                   |
| **MCP**                      | Model Context Protocol, agent-tool communication க்கான standard. Triggerfish இன் MCP Gateway எந்த MCP server க்கும் classification controls சேர்க்கிறது.         |
| **No Write-Down**            | Data channels அல்லது recipients க்கு equal அல்லது higher classification level இல் மட்டுமே flow ஆகலாம் என்ற fixed, non-configurable விதி.                       |
| **NotificationService**      | Priority, queuing, மற்றும் deduplication உடன் அனைத்து connected channels முழுவதும் owner notifications deliver செய்வதற்கான unified abstraction.                 |
| **Patrol**                   | Gateway, LLM providers, channels, மற்றும் policy configuration verify செய்யும் diagnostic health check command (`triggerfish patrol`).                           |
| **Reef (The)**                | Triggerfish skills discover, install, publish, மற்றும் manage செய்வதற்கான community skill marketplace.                                                          |
| **Ripple**                   | Support செய்யும் channels முழுவதும் relayed real-time typing indicators மற்றும் online status signals.                                                           |
| **Session**                  | Independent taint tracking உடன் conversation state இன் fundamental unit. ஒவ்வொரு session உம் unique ID, user, channel, taint level, மற்றும் history கொண்டுள்ளது. |
| **Skill**                    | Plugins எழுதாமல் agent க்கு புதிய capabilities கொடுக்கும் `SKILL.md` file மற்றும் optional supporting files கொண்ட folder.                                       |
| **SPINE.md**                 | System prompt foundation ஆக loaded agent identity மற்றும் mission file. Personality, rules, மற்றும் boundaries define செய்கிறது. Triggerfish இன் CLAUDE.md equivalent. |
| **StorageProvider**          | அனைத்து stateful data flow ஆகும் unified persistence abstraction (key-value interface). Implementations: Memory, SQLite, மற்றும் enterprise backends.             |
| **Taint**                    | Session access செய்த data அடிப்படையில் session க்கு attached classification level. Taint ஒரு session இல் மட்டுமே escalate ஆகலாம், குறைக்க முடியாது.            |
| **Tide Pool**                | A2UI protocol பயன்படுத்தி interactive content (dashboards, charts, forms) render செய்யும் agent-driven visual workspace.                                         |
| **TRIGGER.md**               | Periodic trigger wakeups போது என்ன check, monitor, மற்றும் act செய்வது என்று specify செய்யும் agent இன் proactive behavior definition file.                     |
| **Webhook**                  | External services (GitHub, Sentry, போன்றவை) இலிருந்து events ஏற்றுக்கொண்டு agent actions trigger செய்யும் inbound HTTP endpoint.                               |
| **Team Lead**                | Agent team இல் designated coordinator. Team objective பெறுகிறார், வேலையை decompose செய்கிறார், members க்கு tasks assign செய்கிறார், team எப்போது done என்று decide செய்கிறார். |
| **Workspace**                | Agent தன்னுடைய code எழுதி execute செய்யும் per-agent filesystem directory, மற்ற agents இலிருந்து isolated.                                                      |
| **Write-Down**               | Higher classification level இலிருந்து lower level க்கு data இன் prohibited flow (உதா., CONFIDENTIAL data PUBLIC channel க்கு அனுப்பப்படுகிறது).                 |
