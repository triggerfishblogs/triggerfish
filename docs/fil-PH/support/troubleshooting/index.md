# Troubleshooting

Simulan dito kapag may hindi gumagana. Sundin ang mga hakbang nang sunud-sunod.

## Mga Unang Hakbang

### 1. Tingnan kung tumatakbo ang daemon

```bash
triggerfish status
```

Kung hindi tumatakbo ang daemon, i-start ito:

```bash
triggerfish start
```

### 2. Tingnan ang logs

```bash
triggerfish logs
```

Tina-tail nito ang log file nang real time. Gumamit ng level filter para mabawasan ang ingay:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Magpatakbo ng diagnostics

```bash
triggerfish patrol
```

Tinitingnan ng Patrol kung naabot ang gateway, sumasagot ang LLM provider, nakakonekta ang mga channels, naka-load ang policy rules, at natutuklasan ang mga skills. Anumang check na naka-mark na `CRITICAL` o `WARNING` ang magsasabi sa iyo kung saan dapat mag-focus.

### 4. I-validate ang config mo

```bash
triggerfish config validate
```

Pina-parse nito ang `triggerfish.yaml`, tinitingnan ang required fields, vina-validate ang classification levels, at nire-resolve ang secret references.

## Troubleshooting Ayon sa Area

Kung hindi nakatulong ang mga unang hakbang sa itaas para mahanap ang problema, piliin ang area na tumutugma sa iyong mga sintomas:

- [Installation](/fil-PH/support/troubleshooting/installation) - install script failures, build-from-source issues, platform problems
- [Daemon](/fil-PH/support/troubleshooting/daemon) - hindi mag-start ang service, port conflicts, "already running" errors
- [Configuration](/fil-PH/support/troubleshooting/configuration) - YAML parse errors, missing fields, secret resolution failures
- [Channels](/fil-PH/support/troubleshooting/channels) - hindi sumasagot ang bot, auth failures, message delivery issues
- [LLM Providers](/fil-PH/support/troubleshooting/providers) - API errors, model not found, streaming failures
- [Integrations](/fil-PH/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP servers
- [Browser Automation](/fil-PH/support/troubleshooting/browser) - Chrome not found, launch failures, navigation blocked
- [Security & Classification](/fil-PH/support/troubleshooting/security) - write-down blocks, taint issues, SSRF, policy denials
- [Secrets & Credentials](/fil-PH/support/troubleshooting/secrets) - keychain errors, encrypted file store, permission problems

## Hindi Pa Rin Naayos?

Kung wala sa mga guides sa itaas ang nakalutas ng iyong issue:

1. Mangolekta ng [log bundle](/fil-PH/support/guides/collecting-logs)
2. Basahin ang [filing issues guide](/fil-PH/support/guides/filing-issues)
3. Mag-open ng issue sa [GitHub](https://github.com/greghavens/triggerfish/issues/new)
