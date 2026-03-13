# سپورٹ سینٹر

Triggerfish کی installation، configuration، اور روزمرہ operations میں مدد حاصل کریں۔

## فوری لنکس

- **ابھی کچھ خراب ہے؟** [Troubleshooting Guide](/ur-PK/support/troubleshooting/) سے شروع کریں
- **کوئی error تلاش کرنی ہے؟** [Error Reference](/ur-PK/support/troubleshooting/error-reference) دیکھیں
- **Bug report کرنا ہے؟** پہلے [اچھا Issue File کرنے کا طریقہ](/ur-PK/support/guides/filing-issues) پڑھیں
- **Upgrade یا migration؟** [Knowledge Base](#knowledge-base) چیک کریں

## Self-Service Resources

### Troubleshooting

عام مسائل diagnose اور fix کرنے کے لیے step-by-step guides، area کے مطابق:

| Area | کیا Cover کرتا ہے |
|------|--------|
| [Installation](/ur-PK/support/troubleshooting/installation) | Install failures، permission errors، platform-specific setup |
| [Daemon](/ur-PK/support/troubleshooting/daemon) | Start/stop issues، service management، port conflicts |
| [Configuration](/ur-PK/support/troubleshooting/configuration) | YAML parsing، validation errors، secret references |
| [Channels](/ur-PK/support/troubleshooting/channels) | Telegram، Slack، Discord، WhatsApp، Signal، Email، WebChat |
| [LLM Providers](/ur-PK/support/troubleshooting/providers) | API key errors، model not found، streaming failures، failover |
| [Integrations](/ur-PK/support/troubleshooting/integrations) | Google، GitHub، Notion، CalDAV، MCP servers |
| [Browser Automation](/ur-PK/support/troubleshooting/browser) | Chrome detection، launch failures، Flatpak، navigation |
| [Security & Classification](/ur-PK/support/troubleshooting/security) | Taint escalation، write-down blocks، SSRF، policy denials |
| [Secrets & Credentials](/ur-PK/support/troubleshooting/secrets) | Keychain backends، permission errors، encrypted file store |
| [Error Reference](/ur-PK/support/troubleshooting/error-reference) | ہر error message کا searchable index |

### How-To Guides

| Guide | تفصیل |
|-------|-------------|
| [Logs جمع کرنا](/ur-PK/support/guides/collecting-logs) | Bug reports کے لیے log bundles کیسے جمع کریں |
| [Diagnostics چلانا](/ur-PK/support/guides/diagnostics) | `triggerfish patrol` اور healthcheck tool کا استعمال |
| [Issues File کرنا](/ur-PK/support/guides/filing-issues) | کیا شامل کریں تاکہ آپ کا issue جلد حل ہو |
| [Platform Notes](/ur-PK/support/guides/platform-notes) | macOS، Linux، Windows، Docker، اور Flatpak کی خصوصیات |

### Knowledge Base

| آرٹیکل | تفصیل |
|---------|-------------|
| [Secrets Migration](/ur-PK/support/kb/secrets-migration) | Plaintext سے encrypted secret storage پر منتقلی |
| [Self-Update Process](/ur-PK/support/kb/self-update) | `triggerfish update` کیسے کام کرتا ہے اور کیا غلط ہو سکتا ہے |
| [Breaking Changes](/ur-PK/support/kb/breaking-changes) | Version-by-version breaking changes کی فہرست |
| [Known Issues](/ur-PK/support/kb/known-issues) | موجودہ معلوم مسائل اور ان کے workarounds |

## پھر بھی پھنسے ہیں؟

اگر اوپر کی docs نے آپ کا مسئلہ حل نہیں کیا:

1. **موجودہ issues تلاش کریں** [GitHub Issues](https://github.com/greghavens/triggerfish/issues) پر دیکھیں کہ آیا کسی نے پہلے ہی report کیا ہے
2. **Community سے پوچھیں** [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) میں
3. **نئی issue file کریں** [issue filing guide](/ur-PK/support/guides/filing-issues) کی پیروی کرتے ہوئے
