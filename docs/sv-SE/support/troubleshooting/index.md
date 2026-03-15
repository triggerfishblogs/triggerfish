# Felsökning

Börja här när något inte fungerar. Följ stegen i ordning.

## Första steg

### 1. Kontrollera om daemonen körs

```bash
triggerfish status
```

Om daemonen inte körs, starta den:

```bash
triggerfish start
```

### 2. Kontrollera loggarna

```bash
triggerfish logs
```

Det här följer loggfilen i realtid. Använd ett nivåfilter för att minska bruset:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Kör diagnostik

```bash
triggerfish patrol
```

Patrol kontrollerar om gatewayen är nåbar, om LLM-leverantören svarar, om kanaler är anslutna, om policyregler är laddade och om kunskaper hittas. Varje kontroll markerad som `CRITICAL` eller `WARNING` talar om var du ska fokusera.

### 4. Validera din konfiguration

```bash
triggerfish config validate
```

Det här tolkar `triggerfish.yaml`, kontrollerar obligatoriska fält, validerar klassificeringsnivåer och löser upp hemlighetshänvisningar.

## Felsökning per område

Om stegen ovan inte pekade ut problemet väljer du det område som matchar dina symptom:

- [Installation](/sv-SE/support/troubleshooting/installation) — installationsskriptfel, problem med att bygga från källkod, plattformsproblem
- [Daemon](/sv-SE/support/troubleshooting/daemon) — tjänsten startar inte, portkonflikter, fel om "redan körs"
- [Konfiguration](/sv-SE/support/troubleshooting/configuration) — YAML-tolkningsfel, saknade fält, misslyckad hemlighetslösning
- [Kanaler](/sv-SE/support/troubleshooting/channels) — boten svarar inte, autentiseringsfel, leveransproblem
- [LLM-leverantörer](/sv-SE/support/troubleshooting/providers) — API-fel, modell hittades ej, streamingfel
- [Integrationer](/sv-SE/support/troubleshooting/integrations) — Google OAuth, GitHub PAT, Notion API, CalDAV, MCP-servrar
- [Webbläsarautomatisering](/sv-SE/support/troubleshooting/browser) — Chrome hittades ej, startfel, navigering blockerad
- [Säkerhet och klassificering](/sv-SE/support/troubleshooting/security) — nedskrivningsblock, taint-problem, SSRF, policyavslag
- [Hemligheter och autentiseringsuppgifter](/sv-SE/support/troubleshooting/secrets) — nyckelringsfel, krypterat filarkiv, behörighetsproblem

## Fortfarande fast?

Om ingen av guiderna ovan löste ditt problem:

1. Samla ett [loggpaket](/sv-SE/support/guides/collecting-logs)
2. Läs [guiden för att rapportera ärenden](/sv-SE/support/guides/filing-issues)
3. Öppna ett ärende på [GitHub](https://github.com/greghavens/triggerfish/issues/new)
