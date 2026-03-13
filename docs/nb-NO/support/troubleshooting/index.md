# Feilsøking

Start her når noe ikke fungerer. Følg trinnene i rekkefølge.

## Første trinn

### 1. Sjekk om daemonen kjører

```bash
triggerfish status
```

Hvis daemonen ikke kjører, start den:

```bash
triggerfish start
```

### 2. Sjekk loggene

```bash
triggerfish logs
```

Dette følger loggfilen i sanntid. Bruk et nivåfilter for å redusere støy:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Kjør diagnostikk

```bash
triggerfish patrol
```

Patrol sjekker om gatewayen er nåbar, LLM-leverandøren svarer, kanaler er
tilkoblet, policyregler er lastet, og ferdigheter er oppdaget. Enhver sjekk
merket `CRITICAL` eller `WARNING` forteller deg hvor du bør fokusere.

### 4. Valider konfigurasjonen

```bash
triggerfish config validate
```

Dette tolker `triggerfish.yaml`, sjekker obligatoriske felt, validerer
klassifiseringsnivåer og løser hemmelighetreferanser.

## Feilsøking etter område

Hvis de første trinnene ovenfor ikke pekte deg mot problemet, velg området som
samsvarer med symptomene dine:

- [Installasjon](/nb-NO/support/troubleshooting/installation) - installasjonsskriptfeil, bygg-fra-kildekode-problemer, plattformproblemer
- [Daemon](/nb-NO/support/troubleshooting/daemon) - tjenesten vil ikke starte, portkonflikter, «allerede kjørende»-feil
- [Konfigurasjon](/nb-NO/support/troubleshooting/configuration) - YAML-parserfeil, manglende felt, hemmelighetløsingsfeil
- [Kanaler](/nb-NO/support/troubleshooting/channels) - bot svarer ikke, autentiseringsfeil, leveringsproblemer
- [LLM-leverandører](/nb-NO/support/troubleshooting/providers) - API-feil, modell ikke funnet, strømmingsfeil
- [Integrasjoner](/nb-NO/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP-servere
- [Nettleserautomatisering](/nb-NO/support/troubleshooting/browser) - Chrome ikke funnet, oppstartsfeil, navigasjon blokkert
- [Sikkerhet og klassifisering](/nb-NO/support/troubleshooting/security) - write-down-blokkering, Taint-problemer, SSRF, policynekting
- [Hemmeligheter og legitimasjon](/nb-NO/support/troubleshooting/secrets) - nøkkelringfeil, kryptert fillager, tillatelsefeil

## Fortsatt fast?

Hvis ingen av veiledningene ovenfor løste problemet ditt:

1. Samle inn en [loggpakke](/nb-NO/support/guides/collecting-logs)
2. Les [veiledningen for sakrapportering](/nb-NO/support/guides/filing-issues)
3. Åpne en sak på [GitHub](https://github.com/greghavens/triggerfish/issues/new)
