# सहायता केंद्र

Triggerfish की स्थापना, कॉन्फ़िगरेशन और दैनिक संचालन में सहायता प्राप्त करें।

## त्वरित लिंक

- **अभी कुछ टूटा हुआ है?** [समस्या निवारण गाइड](/hi-IN/support/troubleshooting/) से शुरू करें
- **कोई error ढूँढना है?** [Error Reference](/hi-IN/support/troubleshooting/error-reference) देखें
- **बग रिपोर्ट करना चाहते हैं?** पहले [अच्छी Issue कैसे दर्ज करें](/hi-IN/support/guides/filing-issues) पढ़ें
- **अपग्रेड या माइग्रेशन कर रहे हैं?** [Knowledge Base](#knowledge-base) देखें

## स्व-सेवा संसाधन

### समस्या निवारण

सामान्य समस्याओं के निदान और समाधान के लिए चरण-दर-चरण गाइड, क्षेत्र के अनुसार व्यवस्थित:

| क्षेत्र | विषय |
|------|--------|
| [स्थापना](/hi-IN/support/troubleshooting/installation) | स्थापना विफलताएँ, अनुमति त्रुटियाँ, platform-विशिष्ट सेटअप |
| [Daemon](/hi-IN/support/troubleshooting/daemon) | Start/stop समस्याएँ, service प्रबंधन, port conflicts |
| [कॉन्फ़िगरेशन](/hi-IN/support/troubleshooting/configuration) | YAML parsing, validation errors, secret references |
| [Channels](/hi-IN/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [LLM Providers](/hi-IN/support/troubleshooting/providers) | API key errors, model not found, streaming विफलताएँ, failover |
| [Integrations](/hi-IN/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, MCP servers |
| [Browser Automation](/hi-IN/support/troubleshooting/browser) | Chrome detection, launch विफलताएँ, Flatpak, navigation |
| [Security और Classification](/hi-IN/support/troubleshooting/security) | Taint escalation, write-down blocks, SSRF, policy denials |
| [Secrets और Credentials](/hi-IN/support/troubleshooting/secrets) | Keychain backends, अनुमति त्रुटियाँ, encrypted file store |
| [Error Reference](/hi-IN/support/troubleshooting/error-reference) | प्रत्येक error message का खोज योग्य सूचकांक |

### कैसे करें गाइड

| गाइड | विवरण |
|-------|-------------|
| [Logs एकत्र करना](/hi-IN/support/guides/collecting-logs) | बग रिपोर्ट के लिए log bundles कैसे एकत्र करें |
| [Diagnostics चलाना](/hi-IN/support/guides/diagnostics) | `triggerfish patrol` और healthcheck tool का उपयोग |
| [Issues दर्ज करना](/hi-IN/support/guides/filing-issues) | क्या शामिल करें ताकि आपकी issue जल्दी हल हो |
| [Platform Notes](/hi-IN/support/guides/platform-notes) | macOS, Linux, Windows, Docker, और Flatpak विशिष्टताएँ |

### Knowledge Base

| लेख | विवरण |
|---------|-------------|
| [Secrets माइग्रेशन](/hi-IN/support/kb/secrets-migration) | Plaintext से encrypted secret storage में माइग्रेशन |
| [Self-Update प्रक्रिया](/hi-IN/support/kb/self-update) | `triggerfish update` कैसे काम करता है और क्या गलत हो सकता है |
| [Breaking Changes](/hi-IN/support/kb/breaking-changes) | संस्करण-दर-संस्करण breaking changes की सूची |
| [ज्ञात समस्याएँ](/hi-IN/support/kb/known-issues) | वर्तमान ज्ञात समस्याएँ और उनके समाधान |

## अभी भी अटके हुए हैं?

यदि ऊपर दिए गए दस्तावेज़ आपकी समस्या का समाधान नहीं कर सके:

1. **मौजूदा issues खोजें** [GitHub Issues](https://github.com/greghavens/triggerfish/issues) पर देखें कि क्या किसी ने पहले से इसकी रिपोर्ट की है
2. **समुदाय से पूछें** [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) में
3. **नई issue दर्ज करें** [issue दर्ज करने की गाइड](/hi-IN/support/guides/filing-issues) का पालन करते हुए
