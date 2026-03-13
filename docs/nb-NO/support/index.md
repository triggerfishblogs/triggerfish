# Brukerstøttesenter

Få hjelp med installasjon, konfigurasjon og daglig drift av Triggerfish.

## Raske lenker

- **Noe ødelagt akkurat nå?** Start med [Feilsøkingsveiledningen](/nb-NO/support/troubleshooting/)
- **Trenger du å slå opp en feil?** Se [Feilreferansen](/nb-NO/support/troubleshooting/error-reference)
- **Vil du rapportere en feil?** Les [Hvordan rapportere en god sak](/nb-NO/support/guides/filing-issues) først
- **Oppgraderer eller migrerer?** Sjekk [Kunnskapsbasen](#kunnskapsbase)

## Selvbetjeningsressurser

### Feilsøking

Trinnvise veiledninger for å diagnostisere og rette vanlige problemer, organisert etter område:

| Område | Dekker |
|--------|--------|
| [Installasjon](/nb-NO/support/troubleshooting/installation) | Installasjonssvikt, tillatelsefeil, plattformspesifikt oppsett |
| [Daemon](/nb-NO/support/troubleshooting/daemon) | Start-/stoppproblemer, tjenesteadministrasjon, portkonflikter |
| [Konfigurasjon](/nb-NO/support/troubleshooting/configuration) | YAML-parsing, valideringsfeil, hemmelighetreferanser |
| [Kanaler](/nb-NO/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [LLM-leverandører](/nb-NO/support/troubleshooting/providers) | API-nøkkelfeil, modell ikke funnet, strømmingsfeil, failover |
| [Integrasjoner](/nb-NO/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, MCP-servere |
| [Nettleserautomatisering](/nb-NO/support/troubleshooting/browser) | Chrome-deteksjon, oppstartsfeil, Flatpak, navigasjon |
| [Sikkerhet og klassifisering](/nb-NO/support/troubleshooting/security) | Taint-eskalering, no-write-down-blokkering, SSRF, policy-nekting |
| [Hemmeligheter og legitimasjon](/nb-NO/support/troubleshooting/secrets) | Nøkkelringservere, tillatelsefeil, kryptert fillagring |
| [Feilreferanse](/nb-NO/support/troubleshooting/error-reference) | Søkbart indeks over alle feilmeldinger |

### Brukerveiledninger

| Veiledning | Beskrivelse |
|------------|-------------|
| [Samle inn logger](/nb-NO/support/guides/collecting-logs) | Slik samler du loggpakker for feilrapporter |
| [Kjøre diagnostikk](/nb-NO/support/guides/diagnostics) | Bruke `triggerfish patrol` og helsesjekk-verktøyet |
| [Rapportere saker](/nb-NO/support/guides/filing-issues) | Hva du bør inkludere for å få saken løst raskt |
| [Plattformmerknader](/nb-NO/support/guides/platform-notes) | macOS, Linux, Windows, Docker og Flatpak-spesifikke detaljer |

### Kunnskapsbase

| Artikkel | Beskrivelse |
|----------|-------------|
| [Hemmelighetsmigrasjon](/nb-NO/support/kb/secrets-migration) | Migrere fra klartekst til kryptert hemmelighetlagring |
| [Selvoppdateringsprosess](/nb-NO/support/kb/self-update) | Slik fungerer `triggerfish update` og hva som kan gå galt |
| [Brytende endringer](/nb-NO/support/kb/breaking-changes) | Versjon-for-versjon liste over brytende endringer |
| [Kjente problemer](/nb-NO/support/kb/known-issues) | Gjeldende kjente problemer og løsningsforslag |

## Fortsatt fast?

Hvis dokumentasjonen ovenfor ikke løste problemet ditt:

1. **Søk etter eksisterende saker** på [GitHub Issues](https://github.com/greghavens/triggerfish/issues) for å se om noen allerede har rapportert det
2. **Spør fellesskapet** i [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)
3. **Opprett en ny sak** ved å følge [sakrapporteringsveiledningen](/nb-NO/support/guides/filing-issues)
