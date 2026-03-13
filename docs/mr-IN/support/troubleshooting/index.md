# Troubleshooting

काहीतरी काम नसेल तेव्हा येथे सुरू करा. Steps क्रमाने follow करा.

## पहिले Steps

### 1. Daemon running आहे का check करा

```bash
triggerfish status
```

Daemon running नसल्यास, start करा:

```bash
triggerfish start
```

### 2. Logs check करा

```bash
triggerfish logs
```

हे real time मध्ये log file tail करतो. Noise cut करण्यासाठी level filter वापरा:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Diagnostics run करा

```bash
triggerfish patrol
```

Patrol gateway reachable आहे का, LLM provider respond करतो का, channels connected आहेत का, policy rules loaded आहेत का, आणि skills discovered आहेत का ते check करतो. `CRITICAL` किंवा `WARNING` marked कोणताही check तुम्हाला कोठे focus करायचे ते सांगतो.

### 4. Config validate करा

```bash
triggerfish config validate
```

हे `triggerfish.yaml` parse करतो, required fields check करतो, classification levels validate करतो, आणि secret references resolve करतो.

## Area नुसार Troubleshooting

वरील first steps तुम्हाला problem कडे point नाही केल्यास, तुमच्या symptoms शी match होणारा area निवडा:

- [Installation](/mr-IN/support/troubleshooting/installation) - install script failures, source मधून build issues, platform problems
- [Daemon](/mr-IN/support/troubleshooting/daemon) - service start होणार नाही, port conflicts, "already running" errors
- [Configuration](/mr-IN/support/troubleshooting/configuration) - YAML parse errors, missing fields, secret resolution failures
- [Channels](/mr-IN/support/troubleshooting/channels) - bot respond करत नाही, auth failures, message delivery issues
- [LLM Providers](/mr-IN/support/troubleshooting/providers) - API errors, model not found, streaming failures
- [Integrations](/mr-IN/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP servers
- [Browser Automation](/mr-IN/support/troubleshooting/browser) - Chrome सापडत नाही, launch failures, navigation blocked
- [Security & Classification](/mr-IN/support/troubleshooting/security) - write-down blocks, taint issues, SSRF, policy denials
- [Secrets & Credentials](/mr-IN/support/troubleshooting/secrets) - keychain errors, encrypted file store, permission problems

## अजूनही Stuck?

वरील guides पैकी कोणत्याही guide ने तुमची issue resolve नाही केल्यास:

1. [Log bundle](/mr-IN/support/guides/collecting-logs) collect करा
2. [Filing issues guide](/mr-IN/support/guides/filing-issues) वाचा
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new) वर issue open करा
