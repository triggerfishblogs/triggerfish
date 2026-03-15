# Supportcenter

Få hjälp med Triggerfish-installation, konfiguration och dagliga operationer.

## Snabblänkar

- **Något trasigt just nu?** Börja med [Felsökningsguiden](/sv-SE/support/troubleshooting/)
- **Behöver leta upp ett fel?** Se [Felreferensen](/sv-SE/support/troubleshooting/error-reference)
- **Vill rapportera en bugg?** Läs [Hur man rapporterar ett bra ärende](/sv-SE/support/guides/filing-issues) först
- **Uppgraderar eller migrerar?** Kontrollera [Kunskapsbasen](#kunskapsbas)

## Självbetjäningsresurser

### Felsökning

Steg-för-steg-guider för att diagnosticera och åtgärda vanliga problem, ordnade efter område:

| Område | Täcker |
|--------|--------|
| [Installation](/sv-SE/support/troubleshooting/installation) | Installationsfel, behörighetsfel, plattformsspecifik installation |
| [Daemon](/sv-SE/support/troubleshooting/daemon) | Start-/stoppfrågor, tjänsthantering, portkonflikter |
| [Konfiguration](/sv-SE/support/troubleshooting/configuration) | YAML-tolkning, valideringsfel, hemlighetshänvisningar |
| [Kanaler](/sv-SE/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, E-post, WebChat |
| [LLM-leverantörer](/sv-SE/support/troubleshooting/providers) | API-nyckelfel, modell hittades ej, strömningsfel, failover |
| [Integrationer](/sv-SE/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, MCP-servrar |
| [Webbläsarautomatisering](/sv-SE/support/troubleshooting/browser) | Chrome-identifiering, startfel, Flatpak, navigering |
| [Säkerhet och klassificering](/sv-SE/support/troubleshooting/security) | Taint-eskalering, nedskrivningsblockering, SSRF, policyavslagningar |
| [Hemligheter och uppgifter](/sv-SE/support/troubleshooting/secrets) | Nyckelringsbakändar, behörighetsfel, krypterat filarkiv |
| [Arbetsflöden](/sv-SE/support/troubleshooting/workflows) | Arbetsflödesmotor, DSL-fel, körningshistorik |
| [Felreferens](/sv-SE/support/troubleshooting/error-reference) | Sökbart index för varje felmeddelande |

### Instruktionsguider

| Guide | Beskrivning |
|-------|-------------|
| [Samla loggar](/sv-SE/support/guides/collecting-logs) | Hur man samlar loggpaket för buggrapporter |
| [Köra diagnostik](/sv-SE/support/guides/diagnostics) | Använda `triggerfish patrol` och hälsokontrollverktyget |
| [Rapportera ärenden](/sv-SE/support/guides/filing-issues) | Vad man ska inkludera för att ditt ärende löses snabbt |
| [Plattformsanteckningar](/sv-SE/support/guides/platform-notes) | macOS, Linux, Windows, Docker och Flatpak-specifik information |

### Kunskapsbas

| Artikel | Beskrivning |
|---------|-------------|
| [Hemlighetsmigrering](/sv-SE/support/kb/secrets-migration) | Migrera från klartext till krypterad hemlighetlagring |
| [Självuppdateringsprocess](/sv-SE/support/kb/self-update) | Hur `triggerfish update` fungerar och vad som kan gå fel |
| [Bryta ändringar](/sv-SE/support/kb/breaking-changes) | Version-för-version lista med brytande ändringar |
| [Kända problem](/sv-SE/support/kb/known-issues) | Aktuella kända problem och deras lösningar |

## Fortfarande fast?

Om dokumentationen ovan inte löste ditt problem:

1. **Sök befintliga ärenden** på [GitHub Issues](https://github.com/greghavens/triggerfish/issues) för att se om någon redan rapporterat det
2. **Fråga communityn** i [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)
3. **Rapportera ett nytt ärende** enligt [ärenderapporteringsguiden](/sv-SE/support/guides/filing-issues)
