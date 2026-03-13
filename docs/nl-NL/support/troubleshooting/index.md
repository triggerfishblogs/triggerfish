# Probleemoplossing

Begin hier als iets niet werkt. Volg de stappen in volgorde.

## Eerste stappen

### 1. Controleer of de daemon actief is

```bash
triggerfish status
```

Als de daemon niet actief is, start hem dan:

```bash
triggerfish start
```

### 2. Controleer de logboeken

```bash
triggerfish logs
```

Dit volgt het logboekbestand in realtime. Gebruik een niveaufilter om door de ruis heen te kijken:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Voer diagnostiek uit

```bash
triggerfish patrol
```

Patrol controleert of de gateway bereikbaar is, de LLM-provider reageert, kanalen zijn verbonden, beleidsregels zijn geladen en skills zijn ontdekt. Elke controle gemarkeerd met `CRITICAL` of `WARNING` vertelt u waar u zich op moet focussen.

### 4. Valideer uw configuratie

```bash
triggerfish config validate
```

Dit parseert `triggerfish.yaml`, controleert verplichte velden, valideert classificatieniveaus en lost geheimreferenties op.

## Probleemoplossing per gebied

Als de bovenstaande eerste stappen niet naar het probleem hebben verwezen, kies dan het gebied dat overeenkomt met uw symptomen:

- [Installatie](/nl-NL/support/troubleshooting/installation) — mislukte installatiescripts, bouwen vanuit broncode, platformproblemen
- [Daemon](/nl-NL/support/troubleshooting/daemon) — service start niet, poortconflicten, fouten "already running"
- [Configuratie](/nl-NL/support/troubleshooting/configuration) — YAML-parseerfouten, ontbrekende velden, mislukte geheimoplossing
- [Kanalen](/nl-NL/support/troubleshooting/channels) — bot reageert niet, authenticatiefouten, berichtbezorgingsproblemen
- [LLM-providers](/nl-NL/support/troubleshooting/providers) — API-fouten, model niet gevonden, streamingfouten
- [Integraties](/nl-NL/support/troubleshooting/integrations) — Google OAuth, GitHub PAT, Notion API, CalDAV, MCP-servers
- [Browserautomatisering](/nl-NL/support/troubleshooting/browser) — Chrome niet gevonden, opstartfouten, navigatie geblokkeerd
- [Beveiliging en classificatie](/nl-NL/support/troubleshooting/security) — write-down-blokkades, taint-problemen, SSRF, beleidsweigeringen
- [Geheimen en inloggegevens](/nl-NL/support/troubleshooting/secrets) — sleutelhangerfouten, versleuteld bestandsopslag, machtigingsproblemen

## Nog steeds vastgelopen?

Als geen van de bovenstaande gidsen uw probleem heeft opgelost:

1. Verzamel een [logboekbundel](/nl-NL/support/guides/collecting-logs)
2. Lees de [handleiding voor het indienen van issues](/nl-NL/support/guides/filing-issues)
3. Open een issue op [GitHub](https://github.com/greghavens/triggerfish/issues/new)
