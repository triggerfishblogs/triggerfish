# संरचित लॉगिंग

Triggerfish गंभीरता स्तरों, फ़ाइल रोटेशन, और कॉन्फ़िगर करने योग्य आउटपुट के साथ
संरचित लॉगिंग का उपयोग करता है। प्रत्येक घटक -- gateway, orchestrator, MCP client,
LLM providers, policy engine -- एक एकीकृत logger के माध्यम से लॉग करता है। इसका
अर्थ है कि आपको एक एकल, सुसंगत log stream मिलती है चाहे event कहीं से भी उत्पन्न
हो।

## Log स्तर

`logging.level` सेटिंग नियंत्रित करती है कि कितना विवरण कैप्चर किया जाता है:

| Config Value       | गंभीरता            | क्या लॉग होता है                                        |
| ------------------ | ------------------ | ------------------------------------------------------- |
| `quiet`            | केवल ERROR         | क्रैश और क्रिटिकल विफलताएँ                               |
| `normal` (डिफ़ॉल्ट) | INFO और उससे ऊपर  | Startup, connections, महत्वपूर्ण events                  |
| `verbose`          | DEBUG और उससे ऊपर | Tool calls, policy निर्णय, provider अनुरोध               |
| `debug`            | TRACE (सब कुछ)     | पूर्ण request/response payloads, token-स्तर streaming    |

प्रत्येक स्तर में उससे ऊपर का सब कुछ शामिल है। `verbose` सेट करने से आपको
DEBUG, INFO, और ERROR मिलता है। `quiet` सेट करने से errors को छोड़कर सब कुछ शांत
हो जाता है।

## कॉन्फ़िगरेशन

`triggerfish.yaml` में log स्तर सेट करें:

```yaml
logging:
  level: normal
```

यह एकमात्र आवश्यक कॉन्फ़िगरेशन है। डिफ़ॉल्ट अधिकांश उपयोगकर्ताओं के लिए
उचित हैं -- `normal` इतना कैप्चर करता है कि यह समझा जा सके कि agent क्या कर रहा
है बिना log को शोर से भरे।

## Log आउटपुट

Logs दो गंतव्यों पर एक साथ लिखे जाते हैं:

- **stderr** -- systemd सेवा के रूप में चलते समय `journalctl` कैप्चर के लिए, या
  विकास के दौरान सीधे टर्मिनल आउटपुट
- **फ़ाइल** -- `~/.triggerfish/logs/triggerfish.log`

प्रत्येक log line एक संरचित format का पालन करती है:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Component Tags

कोष्ठक में tag पहचानता है कि कौन सा subsystem log entry उत्सर्जित करता है:

| Tag           | Component                            |
| ------------- | ------------------------------------ |
| `[gateway]`   | WebSocket control plane              |
| `[orch]`      | Agent orchestrator और tool dispatch  |
| `[mcp]`       | MCP client और gateway proxy         |
| `[provider]`  | LLM provider calls                   |
| `[policy]`    | Policy engine और hook मूल्यांकन      |
| `[session]`   | Session lifecycle और taint परिवर्तन   |
| `[channel]`   | Channel adapters (Telegram, Slack, आदि) |
| `[scheduler]` | Cron jobs, triggers, webhooks        |
| `[memory]`    | Memory store संचालन                  |
| `[browser]`   | Browser automation (CDP)              |

## फ़ाइल रोटेशन

Log फ़ाइलें अनबाउंडेड डिस्क उपयोग रोकने के लिए स्वचालित रूप से rotate होती हैं:

- **Rotation सीमा:** प्रति फ़ाइल 1 MB
- **रखी गई फ़ाइलें:** 10 rotated फ़ाइलें (कुल ~10 MB अधिकतम)
- **Rotation जाँच:** प्रत्येक write पर
- **नामकरण:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

जब `triggerfish.log` 1 MB तक पहुँचती है, इसका नाम `triggerfish.1.log` कर दिया
जाता है, पिछली `triggerfish.1.log` `triggerfish.2.log` बन जाती है, इत्यादि। सबसे
पुरानी फ़ाइल (`triggerfish.10.log`) हटा दी जाती है।

## Fire-and-Forget Writes

फ़ाइल writes non-blocking हैं। Logger कभी भी disk write पूर्ण होने की प्रतीक्षा
करने के लिए request processing में देरी नहीं करता। यदि write विफल होती है -- disk
भरी, permissions error, फ़ाइल locked -- error चुपचाप निगल लिया जाता है।

यह जानबूझकर है। Logging कभी भी application को crash नहीं करनी चाहिए या agent को
धीमा नहीं करनी चाहिए। यदि फ़ाइल writes विफल होती हैं तो stderr आउटपुट fallback
के रूप में काम करता है।

## Log Read Tool

`log_read` tool agent को संरचित log इतिहास तक सीधी पहुँच देता है। Agent हाल की
log entries पढ़ सकता है, component tag या गंभीरता के अनुसार filter कर सकता है,
और वार्तालाप छोड़े बिना समस्याओं का निदान कर सकता है।

| Parameter   | Type   | आवश्यक | विवरण                                                          |
| ----------- | ------ | ------ | -------------------------------------------------------------- |
| `lines`     | number | नहीं   | लौटाने के लिए हाल की log lines की संख्या (डिफ़ॉल्ट: 100)        |
| `level`     | string | नहीं   | न्यूनतम गंभीरता filter (`error`, `warn`, `info`, `debug`)       |
| `component` | string | नहीं   | Component tag द्वारा filter (जैसे `gateway`, `orch`, `provider`) |

::: tip अपने agent से पूछें "आज कौन सी errors हुईं" या "हाल के gateway logs
दिखाओ" -- `log_read` tool filtering और retrieval संभालता है। :::

## Logs देखना

### CLI कमांड

```bash
# हाल के logs देखें
triggerfish logs

# वास्तविक समय में stream करें
triggerfish logs --tail

# सीधी फ़ाइल पहुँच
cat ~/.triggerfish/logs/triggerfish.log
```

### journalctl के साथ

जब Triggerfish systemd सेवा के रूप में चलता है, logs journal द्वारा भी कैप्चर
होते हैं:

```bash
journalctl --user -u triggerfish -f
```

## Debug बनाम संरचित Logging

::: info `TRIGGERFISH_DEBUG=1` environment variable अभी भी backward compatibility
के लिए समर्थित है लेकिन `logging.level: debug` config पसंदीदा है। दोनों समकक्ष
आउटपुट उत्पन्न करते हैं -- सभी request/response payloads और आंतरिक स्थिति की
पूर्ण TRACE-स्तर logging। :::

## संबंधित

- [CLI Commands](/hi-IN/guide/commands) -- `triggerfish logs` कमांड संदर्भ
- [कॉन्फ़िगरेशन](/hi-IN/guide/configuration) -- पूर्ण `triggerfish.yaml` schema
