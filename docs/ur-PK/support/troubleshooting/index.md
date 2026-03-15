# Troubleshooting

جب کچھ کام نہ کرے تو یہاں سے شروع کریں۔ Steps کو order میں follow کریں۔

## پہلے Steps

### 1. Check کریں کہ آیا daemon چل رہا ہے

```bash
triggerfish status
```

اگر daemon نہیں چل رہا تو start کریں:

```bash
triggerfish start
```

### 2. Logs check کریں

```bash
triggerfish logs
```

یہ log file کو real time میں tail کرتا ہے۔ Noise کم کرنے کے لیے level filter استعمال کریں:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Diagnostics چلائیں

```bash
triggerfish patrol
```

Patrol check کرتا ہے کہ آیا gateway reachable ہے، LLM provider respond کرتا ہے، channels connected ہیں، policy rules load ہیں، اور skills discover ہوئی ہیں۔ `CRITICAL` یا `WARNING` marked کوئی بھی check بتاتا ہے کہ کہاں focus کریں۔

### 4. اپنا config validate کریں

```bash
triggerfish config validate
```

یہ `triggerfish.yaml` parse کرتا ہے، required fields check کرتا ہے، classification levels validate کرتا ہے، اور secret references resolve کرتا ہے۔

## Area کے مطابق Troubleshooting

اگر اوپر کے first steps نے مسئلہ نہیں بتایا تو اپنی symptoms سے match کرنے والا area چنیں:

- [Installation](/ur-PK/support/troubleshooting/installation) - install script failures، build-from-source issues، platform problems
- [Daemon](/ur-PK/support/troubleshooting/daemon) - service start نہیں ہو رہی، port conflicts، "already running" errors
- [Configuration](/ur-PK/support/troubleshooting/configuration) - YAML parse errors، missing fields، secret resolution failures
- [Channels](/ur-PK/support/troubleshooting/channels) - bot respond نہیں کر رہا، auth failures، message delivery issues
- [LLM Providers](/ur-PK/support/troubleshooting/providers) - API errors، model not found، streaming failures
- [Integrations](/ur-PK/support/troubleshooting/integrations) - Google OAuth، GitHub PAT، Notion API، CalDAV، MCP servers
- [Browser Automation](/ur-PK/support/troubleshooting/browser) - Chrome not found، launch failures، navigation blocked
- [Security & Classification](/ur-PK/support/troubleshooting/security) - write-down blocks، taint issues، SSRF، policy denials
- [Secrets & Credentials](/ur-PK/support/troubleshooting/secrets) - keychain errors، encrypted file store، permission problems

## پھر بھی پھنسے ہیں؟

اگر اوپر کے guides میں سے کوئی بھی آپ کا issue resolve نہ کرے:

1. [Log bundle](/ur-PK/support/guides/collecting-logs) جمع کریں
2. [Filing issues guide](/ur-PK/support/guides/filing-issues) پڑھیں
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new) پر issue کھولیں
