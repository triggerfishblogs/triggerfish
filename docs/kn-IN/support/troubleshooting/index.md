# Troubleshooting

ಏನಾದರೂ ಕೆಲಸ ಮಾಡದಿದ್ದಾಗ ಇಲ್ಲಿಂದ ಪ್ರಾರಂಭಿಸಿ. Steps ಅನ್ನು ಕ್ರಮದಲ್ಲಿ ಅನುಸರಿಸಿ.

## First Steps

### 1. Daemon ಚಲಿಸುತ್ತಿದೆಯೇ ಎಂದು Check ಮಾಡಿ

```bash
triggerfish status
```

Daemon ಚಲಿಸುತ್ತಿಲ್ಲದಿದ್ದರೆ, start ಮಾಡಿ:

```bash
triggerfish start
```

### 2. Logs Check ಮಾಡಿ

```bash
triggerfish logs
```

ಇದು real time ನಲ್ಲಿ log file tail ಮಾಡುತ್ತದೆ. Noise ಕಡಿಮೆ ಮಾಡಲು level filter ಬಳಸಿ:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Diagnostics ಚಲಾಯಿಸಿ

```bash
triggerfish patrol
```

Patrol gateway reachable ಇದೆಯೇ, LLM provider respond ಮಾಡುತ್ತದೆಯೇ, channels connected ಆಗಿವೆಯೇ, policy rules load ಆಗಿವೆಯೇ, ಮತ್ತು skills discovered ಆಗಿವೆಯೇ ಎಂದು check ಮಾಡುತ್ತದೆ. `CRITICAL` ಅಥವಾ `WARNING` ಎಂದು mark ಆದ check ಎಲ್ಲಿ focus ಮಾಡಬೇಕು ಎಂದು ತಿಳಿಸುತ್ತದೆ.

### 4. ನಿಮ್ಮ Config Validate ಮಾಡಿ

```bash
triggerfish config validate
```

ಇದು `triggerfish.yaml` parse ಮಾಡಿ, required fields check ಮಾಡಿ, classification levels validate ಮಾಡಿ, ಮತ್ತು secret references resolve ಮಾಡುತ್ತದೆ.

## Area ಮೂಲಕ Troubleshooting

ಮೇಲಿನ first steps ಸಮಸ್ಯೆ ಕಾಣಿಸಲಿಲ್ಲವೆಂದರೆ, ನಿಮ್ಮ symptoms ಗೆ match ಆಗುವ area ಆರಿಸಿ:

- [Installation](/kn-IN/support/troubleshooting/installation) - install script failures, build-from-source issues, platform problems
- [Daemon](/kn-IN/support/troubleshooting/daemon) - service start ಆಗುತ್ತಿಲ್ಲ, port conflicts, "already running" errors
- [Configuration](/kn-IN/support/troubleshooting/configuration) - YAML parse errors, missing fields, secret resolution failures
- [Channels](/kn-IN/support/troubleshooting/channels) - bot respond ಮಾಡುತ್ತಿಲ್ಲ, auth failures, message delivery issues
- [LLM Providers](/kn-IN/support/troubleshooting/providers) - API errors, model not found, streaming failures
- [Integrations](/kn-IN/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP servers
- [Browser Automation](/kn-IN/support/troubleshooting/browser) - Chrome ಕಂಡುಹಿಡಿಯಲಾಗಲಿಲ್ಲ, launch failures, navigation blocked
- [Security & Classification](/kn-IN/support/troubleshooting/security) - write-down blocks, taint issues, SSRF, policy denials
- [Secrets & Credentials](/kn-IN/support/troubleshooting/secrets) - keychain errors, encrypted file store, permission problems

## ಇನ್ನೂ ಸಮಸ್ಯೆ ಇದೆಯೇ?

ಮೇಲಿನ guides ಯಾವೂ ನಿಮ್ಮ issue resolve ಮಾಡದಿದ್ದರೆ:

1. [Log bundle](/kn-IN/support/guides/collecting-logs) collect ಮಾಡಿ
2. [Filing issues guide](/kn-IN/support/guides/filing-issues) ಓದಿ
3. [GitHub](https://github.com/greghavens/triggerfish/issues/new) ನಲ್ಲಿ issue open ಮಾಡಿ
