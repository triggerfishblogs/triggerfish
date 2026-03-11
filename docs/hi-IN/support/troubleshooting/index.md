# समस्या निवारण

जब कुछ काम नहीं कर रहा हो तो यहाँ से शुरू करें। चरणों का क्रम में पालन करें।

## पहले कदम

### 1. जाँचें कि daemon चल रहा है या नहीं

```bash
triggerfish status
```

यदि daemon नहीं चल रहा है, तो इसे शुरू करें:

```bash
triggerfish start
```

### 2. Logs जाँचें

```bash
triggerfish logs
```

यह log फ़ाइल को real time में tail करता है। शोर कम करने के लिए level filter का उपयोग करें:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Diagnostics चलाएँ

```bash
triggerfish patrol
```

Patrol जाँचता है कि gateway पहुँच योग्य है, LLM provider प्रतिक्रिया दे रहा है, channels जुड़े हैं, policy rules loaded हैं, और skills discovered हैं। `CRITICAL` या `WARNING` चिह्नित कोई भी जाँच आपको बताती है कि कहाँ ध्यान देना है।

### 4. अपना config validate करें

```bash
triggerfish config validate
```

यह `triggerfish.yaml` को parse करता है, आवश्यक fields की जाँच करता है, classification levels को validate करता है, और secret references को resolve करता है।

## क्षेत्र के अनुसार समस्या निवारण

यदि ऊपर के पहले कदम आपको समस्या की ओर नहीं ले गए, तो अपने लक्षणों से मेल खाने वाला क्षेत्र चुनें:

- [स्थापना](/hi-IN/support/troubleshooting/installation) - install script विफलताएँ, source से build की समस्याएँ, platform समस्याएँ
- [Daemon](/hi-IN/support/troubleshooting/daemon) - service शुरू नहीं होगी, port conflicts, "already running" errors
- [कॉन्फ़िगरेशन](/hi-IN/support/troubleshooting/configuration) - YAML parse errors, missing fields, secret resolution विफलताएँ
- [Channels](/hi-IN/support/troubleshooting/channels) - bot प्रतिक्रिया नहीं दे रहा, auth विफलताएँ, संदेश वितरण समस्याएँ
- [LLM Providers](/hi-IN/support/troubleshooting/providers) - API errors, model not found, streaming विफलताएँ
- [Integrations](/hi-IN/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP servers
- [Browser Automation](/hi-IN/support/troubleshooting/browser) - Chrome नहीं मिला, launch विफलताएँ, navigation blocked
- [Security और Classification](/hi-IN/support/troubleshooting/security) - write-down blocks, taint समस्याएँ, SSRF, policy denials
- [Secrets और Credentials](/hi-IN/support/troubleshooting/secrets) - keychain errors, encrypted file store, अनुमति समस्याएँ

## अभी भी अटके हुए हैं?

यदि ऊपर की कोई भी गाइड आपकी समस्या का समाधान नहीं कर सकी:

1. एक [log bundle](/hi-IN/support/guides/collecting-logs) एकत्र करें
2. [Issues दर्ज करने की गाइड](/hi-IN/support/guides/filing-issues) पढ़ें
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new) पर एक issue खोलें
