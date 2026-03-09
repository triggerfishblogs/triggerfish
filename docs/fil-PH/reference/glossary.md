# Glossary

| Termino                       | Depinisyon                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**                | Isang persistent group ng collaborating agent sessions na may distinct roles. Isang miyembro ang lead na nagko-coordinate ng trabaho. Ginagawa sa pamamagitan ng `team_create`, mino-monitor gamit ang lifecycle checks. |
| **A2UI**                      | Agent-to-UI protocol para sa pag-push ng visual content mula sa agent sa Tide Pool workspace nang real time.                                                      |
| **Background Session**        | Isang session na spawned para sa autonomous tasks (cron, triggers) na nagsisimula na may sariwang PUBLIC taint at tumatakbo sa isolated workspace.                 |
| **Buoy**                      | Isang companion native app (iOS, Android) na nagbibigay ng device capabilities tulad ng camera, location, screen recording, at push notifications sa agent. (Coming soon.) |
| **Classification**            | Isang sensitivity label na naka-assign sa data, channels, at recipients. Apat na level: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                               |
| **Cron**                      | Isang scheduled recurring task na ine-execute ng agent sa specified time gamit ang standard cron expression syntax.                                                |
| **Dive**                      | Ang first-run setup wizard (`triggerfish dive`) na nagsi-scaffold ng `triggerfish.yaml`, SPINE.md, at initial configuration.                                       |
| **Effective Classification**  | Ang classification level na ginagamit para sa output decisions, kinakalkula bilang `min(channel_classification, recipient_classification)`.                        |
| **Exec Environment**          | Ang code workspace ng agent para sa pagsulat, pagpapatakbo, at pag-debug ng code sa masikip na write-run-fix feedback loop, kakaiba sa Plugin Sandbox.            |
| **Failover**                  | Awtomatikong fallback sa alternatibong LLM provider kapag hindi available ang kasalukuyang provider dahil sa rate limiting, server errors, o timeouts.             |
| **Gateway**                   | Ang long-running local control plane na namamahala ng sessions, channels, tools, events, at agent processes sa pamamagitan ng WebSocket JSON-RPC endpoint.         |
| **Hook**                      | Isang deterministic enforcement point sa data flow kung saan nag-e-evaluate ng rules ang policy engine at nagpapasya kung papayagan, i-block, o i-redact ang action. |
| **Lineage**                   | Provenance metadata na tina-track ang pinagmulan, transformations, at kasalukuyang lokasyon ng bawat data element na pini-process ng Triggerfish.                  |
| **LlmProvider**               | Ang interface para sa LLM completions, na ini-implement ng bawat supported provider (Anthropic, OpenAI, Google, Local, OpenRouter).                               |
| **MCP**                       | Model Context Protocol, isang standard para sa agent-tool communication. Nagdadagdag ang MCP Gateway ng Triggerfish ng classification controls sa anumang MCP server. |
| **No Write-Down**             | Ang fixed, non-configurable rule na ang data ay maaari lang dumaloy sa channels o recipients na may pantay o mas mataas na classification level.                  |
| **NotificationService**       | Ang unified abstraction para sa pag-deliver ng owner notifications sa lahat ng connected channels na may priority, queuing, at deduplication.                      |
| **Patrol**                    | Ang diagnostic health check command (`triggerfish patrol`) na bine-verify ang gateway, LLM providers, channels, at policy configuration.                          |
| **Reef (The)**                | Ang community skill marketplace para sa paghahanap, pag-install, pag-publish, at pamamahala ng Triggerfish skills.                                                |
| **Ripple**                    | Real-time typing indicators at online status signals na nire-relay sa mga channels kung saan supported.                                                           |
| **Session**                   | Ang fundamental unit ng conversation state na may independent taint tracking. Bawat session ay may unique ID, user, channel, taint level, at history.             |
| **Skill**                     | Isang folder na naglalaman ng `SKILL.md` file at optional supporting files na nagbibigay sa agent ng bagong capabilities nang hindi nagsusulat ng plugins.        |
| **SPINE.md**                  | Ang agent identity at mission file na nilo-load bilang system prompt foundation. Dine-define ang personality, rules, at boundaries. Ang Triggerfish equivalent ng CLAUDE.md. |
| **StorageProvider**           | Ang unified persistence abstraction (key-value interface) kung saan dumadaloy ang lahat ng stateful data. Mga implementation: Memory, SQLite, at enterprise backends. |
| **Taint**                     | Ang classification level na naka-attach sa session batay sa data na na-access nito. Maaari lang mag-escalate ang taint sa loob ng session, hindi kailanman bumaba. |
| **Tide Pool**                 | Isang agent-driven visual workspace kung saan nagre-render ang Triggerfish ng interactive content (dashboards, charts, forms) gamit ang A2UI protocol.             |
| **TRIGGER.md**                | Ang proactive behavior definition file ng agent, na nagsi-specify kung ano ang iche-check, i-monitor, at aksyunan sa periodic trigger wakeups.                    |
| **Webhook**                   | Isang inbound HTTP endpoint na tumatanggap ng events mula sa external services (GitHub, Sentry, etc.) at nagti-trigger ng agent actions.                          |
| **Team Lead**                 | Ang designated coordinator sa agent team. Tumatanggap ng team objective, dine-decompose ang trabaho, nag-a-assign ng tasks sa members, at nagpapasya kung tapos na ang team. |
| **Workspace**                 | Isang per-agent filesystem directory kung saan nagsusulat at nag-e-execute ng sarili nitong code ang agent, isolated mula sa ibang agents.                        |
| **Write-Down**                | Ang ipinagbabawal na daloy ng data mula sa mas mataas na classification level patungo sa mas mababa (hal., CONFIDENTIAL data na ipinadala sa PUBLIC channel).     |
