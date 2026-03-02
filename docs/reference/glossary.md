# Glossary

| Term                         | Definition                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A2UI**                     | Agent-to-UI protocol for pushing visual content from the agent to the Tide Pool workspace in real time.                                                           |
| **Background Session**       | A session spawned for autonomous tasks (cron, triggers) that starts with fresh PUBLIC taint and runs in an isolated workspace.                                    |
| **Buoy**                     | A companion native app (iOS, Android) that provides device capabilities such as camera, location, screen recording, and push notifications to the agent.          |
| **Classification**           | A sensitivity label assigned to data, channels, and recipients. Four levels: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                          |
| **Cron**                     | A scheduled recurring task executed by the agent at a specified time using standard cron expression syntax.                                                       |
| **Dive**                     | The first-run setup wizard (`triggerfish dive`) that scaffolds `triggerfish.yaml`, SPINE.md, and initial configuration.                                           |
| **Effective Classification** | The classification level used for output decisions, calculated as `min(channel_classification, recipient_classification)`.                                        |
| **Exec Environment**         | The agent's code workspace for writing, running, and debugging code in a tight write-run-fix feedback loop, distinct from the Plugin Sandbox.                     |
| **Failover**                 | Automatic fallback to an alternate LLM provider when the current provider is unavailable due to rate limiting, server errors, or timeouts.                        |
| **Gateway**                  | The long-running local control plane that manages sessions, channels, tools, events, and agent processes through a WebSocket JSON-RPC endpoint.                   |
| **Hook**                     | A deterministic enforcement point in the data flow where the policy engine evaluates rules and decides whether to allow, block, or redact an action.              |
| **Lineage**                  | Provenance metadata tracking the origin, transformations, and current location of every data element processed by Triggerfish.                                    |
| **LlmProvider**              | The interface for LLM completions, implemented by each supported provider (Anthropic, OpenAI, Google, Local, OpenRouter).                                         |
| **MCP**                      | Model Context Protocol, a standard for agent-tool communication. Triggerfish's MCP Gateway adds classification controls to any MCP server.                        |
| **No Write-Down**            | The fixed, non-configurable rule that data can only flow to channels or recipients at an equal or higher classification level.                                    |
| **NotificationService**      | The unified abstraction for delivering owner notifications across all connected channels with priority, queuing, and deduplication.                               |
| **Patrol**                   | The diagnostic health check command (`triggerfish patrol`) that verifies the gateway, LLM providers, channels, and policy configuration.                          |
| **Reef (The)**               | The community skill marketplace for discovering, installing, publishing, and managing Triggerfish skills.                                                         |
| **Ripple**                   | Real-time typing indicators and online status signals relayed across channels where supported.                                                                    |
| **Session**                  | The fundamental unit of conversation state with independent taint tracking. Each session has a unique ID, user, channel, taint level, and history.                |
| **Skill**                    | A folder containing a `SKILL.md` file and optional supporting files that give the agent new capabilities without writing plugins.                                 |
| **SPINE.md**                 | The agent identity and mission file loaded as the system prompt foundation. Defines personality, rules, and boundaries. Triggerfish's equivalent of CLAUDE.md.    |
| **StorageProvider**          | The unified persistence abstraction (key-value interface) through which all stateful data flows. Implementations include Memory, SQLite, and enterprise backends. |
| **Taint**                    | The classification level attached to a session based on the data it has accessed. Taint can only escalate within a session, never decrease.                       |
| **Tide Pool**                | An agent-driven visual workspace where Triggerfish renders interactive content (dashboards, charts, forms) using the A2UI protocol.                               |
| **TRIGGER.md**               | The agent's proactive behavior definition file, specifying what to check, monitor, and act on during periodic trigger wakeups.                                    |
| **Webhook**                  | An inbound HTTP endpoint that accepts events from external services (GitHub, Sentry, etc.) and triggers agent actions.                                            |
| **Workspace**                | A per-agent filesystem directory where the agent writes and executes its own code, isolated from other agents.                                                    |
| **Write-Down**               | The prohibited flow of data from a higher classification level to a lower one (e.g., CONFIDENTIAL data sent to a PUBLIC channel).                                 |
