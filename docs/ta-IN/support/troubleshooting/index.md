# Troubleshooting

ஏதாவது வேலை செய்யாதபோது இங்கே தொடங்கவும். Steps ஐ order இல் பின்பற்றவும்.

## முதல் Steps

### 1. Daemon இயங்குகிறதா என்று சரிபார்க்கவும்

```bash
triggerfish status
```

Daemon இயங்காவிட்டால், start செய்யவும்:

```bash
triggerfish start
```

### 2. Logs சரிபார்க்கவும்

```bash
triggerfish logs
```

இது log file ஐ real time இல் tail செய்கிறது. Noise குறைக்க level filter பயன்படுத்தவும்:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Diagnostics இயக்கவும்

```bash
triggerfish patrol
```

Gateway reachable ஆ, LLM provider respond செய்கிறதா, channels connected ஆ, policy rules loaded ஆ, மற்றும் skills discovered ஆ என்று Patrol சரிபார்க்கிறது. `CRITICAL` அல்லது `WARNING` marked check எங்கே focus செய்வது என்று சொல்கிறது.

### 4. Config validate செய்யவும்

```bash
triggerfish config validate
```

இது `triggerfish.yaml` parse செய்கிறது, required fields சரிபார்க்கிறது, classification levels validate செய்கிறது, மற்றும் secret references resolve செய்கிறது.

## Area அடிப்படையில் Troubleshooting

மேலே உள்ள first steps problem point out செய்யவில்லையென்றால், உங்கள் symptoms match ஆகும் area தேர்ந்தெடுக்கவும்:

- [Installation](/ta-IN/support/troubleshooting/installation) - install script failures, build-from-source issues, platform problems
- [Daemon](/ta-IN/support/troubleshooting/daemon) - service start ஆகாது, port conflicts, "already running" errors
- [Configuration](/ta-IN/support/troubleshooting/configuration) - YAML parse errors, missing fields, secret resolution failures
- [Channels](/ta-IN/support/troubleshooting/channels) - bot respond செய்வதில்லை, auth failures, message delivery issues
- [LLM Providers](/ta-IN/support/troubleshooting/providers) - API errors, model not found, streaming failures
- [Integrations](/ta-IN/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP servers
- [Browser Automation](/ta-IN/support/troubleshooting/browser) - Chrome not found, launch failures, navigation blocked
- [Security & Classification](/ta-IN/support/troubleshooting/security) - write-down blocks, taint issues, SSRF, policy denials
- [Secrets & Credentials](/ta-IN/support/troubleshooting/secrets) - keychain errors, encrypted file store, permission problems

## இன்னும் Stuck ஆ?

மேலே உள்ள guides உங்கள் issue resolve செய்யவில்லையென்றால்:

1. [Log bundle](/ta-IN/support/guides/collecting-logs) collect செய்யவும்
2. [Filing issues guide](/ta-IN/support/guides/filing-issues) படிக்கவும்
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new) இல் issue open செய்யவும்
