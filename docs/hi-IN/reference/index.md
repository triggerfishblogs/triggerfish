# संदर्भ

यह अनुभाग Triggerfish कॉन्फ़िगर और विस्तारित करने के लिए तकनीकी संदर्भ सामग्री
प्रदान करता है।

## [Config Schema](./config-yaml)

`triggerfish.yaml` का पूर्ण संदर्भ -- प्रत्येक अनुभाग, प्रत्येक key, एक annotated
उदाहरण के साथ। Models, channels, classification, policy, MCP servers, scheduler,
और notifications कवर करता है।

## [मुख्य Interfaces](./interfaces)

Integrations, custom channel adapters, LLM providers, या storage backends बनाने
वाले developers के लिए TypeScript interface संदर्भ। `StorageProvider`,
`ChannelAdapter`, `LlmProvider`, `NotificationService`, hook types, session state,
और `Result<T, E>` pattern शामिल है।

## [शब्दावली](./glossary)

Buoy से Write-Down तक, प्रत्येक Triggerfish-विशिष्ट शब्द की परिभाषाएँ।
