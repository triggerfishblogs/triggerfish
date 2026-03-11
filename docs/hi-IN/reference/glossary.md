# शब्दावली

| शब्द                          | परिभाषा                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**                | विशिष्ट भूमिकाओं के साथ सहयोगी agent sessions का स्थायी समूह। एक सदस्य lead है जो कार्य का समन्वय करता है। `team_create` से बनाया, lifecycle checks से निगरानी। |
| **A2UI**                      | Agent-to-UI protocol जो agent से Tide Pool workspace में वास्तविक समय में visual सामग्री push करने के लिए है।                                                  |
| **Background Session**        | स्वायत्त कार्यों (cron, triggers) के लिए spawn किया गया session जो ताज़ा PUBLIC taint से शुरू होता है और अलग workspace में चलता है।                              |
| **Buoy**                      | Companion native app (iOS, Android) जो agent को camera, location, screen recording, और push notifications जैसी device क्षमताएँ प्रदान करता है। (शीघ्र आ रहा है।) |
| **Classification**            | डेटा, चैनलों, और प्राप्तकर्ताओं को assigned संवेदनशीलता label। चार स्तर: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC।                                           |
| **Cron**                      | मानक cron expression syntax का उपयोग करके निर्दिष्ट समय पर agent द्वारा निष्पादित शेड्यूल आवर्ती कार्य।                                                         |
| **Dive**                      | प्रथम-रन सेटअप wizard (`triggerfish dive`) जो `triggerfish.yaml`, SPINE.md, और प्रारंभिक कॉन्फ़िगरेशन scaffold करता है।                                         |
| **Effective Classification**  | आउटपुट निर्णयों के लिए उपयोग किया जाने वाला classification स्तर, `min(channel_classification, recipient_classification)` के रूप में गणना।                        |
| **Exec Environment**          | Agent का code workspace लिखने, चलाने, और debug करने के tight write-run-fix feedback loop के लिए, Plugin Sandbox से भिन्न।                                       |
| **Failover**                  | Rate limiting, server errors, या timeouts के कारण वर्तमान provider अनुपलब्ध होने पर वैकल्पिक LLM provider पर स्वचालित fallback।                                  |
| **Gateway**                   | WebSocket JSON-RPC endpoint के माध्यम से sessions, channels, tools, events, और agent processes प्रबंधित करने वाला लंबे समय तक चलने वाला स्थानीय control plane।  |
| **Hook**                      | डेटा flow में निश्चयात्मक प्रवर्तन बिंदु जहाँ policy engine नियमों का मूल्यांकन करता है और action को allow, block, या redact करने का निर्णय लेता है।              |
| **Lineage**                   | Triggerfish द्वारा संसाधित प्रत्येक डेटा तत्व के मूल, परिवर्तनों, और वर्तमान स्थान को ट्रैक करने वाला provenance metadata।                                      |
| **LlmProvider**              | LLM completions के लिए interface, प्रत्येक समर्थित provider (Anthropic, OpenAI, Google, Local, OpenRouter) द्वारा implement।                                     |
| **MCP**                       | Model Context Protocol, agent-tool संचार का मानक। Triggerfish का MCP Gateway किसी भी MCP server में classification नियंत्रण जोड़ता है।                            |
| **No Write-Down**             | निश्चित, गैर-कॉन्फ़िगर करने योग्य नियम कि डेटा केवल समान या उच्च classification स्तर के चैनलों या प्राप्तकर्ताओं तक प्रवाहित हो सकता है।                        |
| **NotificationService**       | प्राथमिकता, queuing, और deduplication के साथ सभी कनेक्टेड चैनलों पर owner notifications डिलीवर करने का एकीकृत abstraction।                                       |
| **Patrol**                    | Diagnostic health check कमांड (`triggerfish patrol`) जो gateway, LLM providers, channels, और policy कॉन्फ़िगरेशन सत्यापित करता है।                                |
| **Reef (The)**                | Triggerfish skills की खोज, installation, प्रकाशन, और प्रबंधन के लिए community skill marketplace।                                                               |
| **Ripple**                    | समर्थित चैनलों पर relay किए जाने वाले वास्तविक समय typing indicators और online status signals।                                                                  |
| **Session**                   | स्वतंत्र taint ट्रैकिंग के साथ वार्तालाप स्थिति की मौलिक इकाई। प्रत्येक session का अद्वितीय ID, user, channel, taint स्तर, और इतिहास होता है।                   |
| **Skill**                     | `SKILL.md` फ़ाइल और वैकल्पिक सहायक files वाला folder जो plugins लिखे बिना agent को नई क्षमताएँ देता है।                                                          |
| **SPINE.md**                  | System prompt foundation के रूप में लोड की जाने वाली agent identity और mission फ़ाइल। व्यक्तित्व, नियम, और सीमाएँ परिभाषित करती है। Triggerfish का CLAUDE.md समकक्ष। |
| **StorageProvider**           | एकीकृत persistence abstraction (key-value interface) जिसके माध्यम से सभी stateful डेटा प्रवाहित होता है। Memory, SQLite, और enterprise backends शामिल।          |
| **Taint**                     | Session से जुड़ा classification स्तर जो एक्सेस किए गए डेटा पर आधारित है। Taint session में केवल बढ़ सकता है, कभी घट नहीं सकता।                                   |
| **Tide Pool**                 | Agent-संचालित visual workspace जहाँ Triggerfish A2UI protocol का उपयोग करके interactive सामग्री (dashboards, charts, forms) render करता है।                        |
| **TRIGGER.md**                | Agent की सक्रिय व्यवहार परिभाषा फ़ाइल, आवधिक trigger wakeups के दौरान क्या जाँचना, निगरानी करना, और कार्य करना है निर्दिष्ट करती है।                              |
| **Webhook**                   | बाहरी सेवाओं (GitHub, Sentry, आदि) से events स्वीकार करने वाला inbound HTTP endpoint जो agent actions ट्रिगर करता है।                                            |
| **Team Lead**                 | Agent team में नामित coordinator। टीम उद्देश्य प्राप्त करता है, कार्य विभाजित करता है, सदस्यों को कार्य सौंपता है, और तय करता है कि टीम कब पूर्ण है।            |
| **Workspace**                 | प्रति-agent filesystem directory जहाँ agent अपना code लिखता और निष्पादित करता है, अन्य agents से अलग।                                                            |
| **Write-Down**                | उच्च classification स्तर से निम्न स्तर पर डेटा का निषिद्ध प्रवाह (जैसे CONFIDENTIAL डेटा PUBLIC चैनल पर भेजा जाना)।                                            |
