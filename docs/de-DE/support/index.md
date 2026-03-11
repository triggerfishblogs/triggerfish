# Support-Center

Erhalten Sie Hilfe bei der Installation, Konfiguration und dem taeglichen Betrieb von Triggerfish.

## Schnelllinks

- **Etwas funktioniert gerade nicht?** Beginnen Sie mit dem [Fehlerbehebungsleitfaden](/de-DE/support/troubleshooting/)
- **Muessen Sie einen Fehler nachschlagen?** Siehe die [Fehlerreferenz](/de-DE/support/troubleshooting/error-reference)
- **Moechten Sie einen Bug melden?** Lesen Sie zuerst [Wie man ein gutes Issue erstellt](/de-DE/support/guides/filing-issues)
- **Upgrade oder Migration?** Pruefen Sie die [Wissensdatenbank](#wissensdatenbank)

## Selbsthilfe-Ressourcen

### Fehlerbehebung

Schritt-fuer-Schritt-Anleitungen zur Diagnose und Behebung haeufiger Probleme, nach Bereichen geordnet:

| Bereich | Behandelt |
|---------|-----------|
| [Installation](/de-DE/support/troubleshooting/installation) | Installationsfehler, Berechtigungsprobleme, plattformspezifische Einrichtung |
| [Daemon](/de-DE/support/troubleshooting/daemon) | Start/Stopp-Probleme, Dienstverwaltung, Port-Konflikte |
| [Konfiguration](/de-DE/support/troubleshooting/configuration) | YAML-Parsing, Validierungsfehler, Secret-Referenzen |
| [Kanaele](/de-DE/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [LLM-Provider](/de-DE/support/troubleshooting/providers) | API-Schluessel-Fehler, Modell nicht gefunden, Streaming-Fehler, Failover |
| [Integrationen](/de-DE/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, MCP-Server |
| [Browser-Automatisierung](/de-DE/support/troubleshooting/browser) | Chrome-Erkennung, Startfehler, Flatpak, Navigation |
| [Sicherheit & Klassifizierung](/de-DE/support/troubleshooting/security) | Taint-Eskalation, Write-Down-Blockierungen, SSRF, Policy-Ablehnungen |
| [Secrets & Anmeldedaten](/de-DE/support/troubleshooting/secrets) | Schluesselbund-Backends, Berechtigungsfehler, verschluesselte Dateispeicherung |
| [Fehlerreferenz](/de-DE/support/troubleshooting/error-reference) | Durchsuchbarer Index aller Fehlermeldungen |

### Anleitungen

| Anleitung | Beschreibung |
|-----------|-------------|
| [Logs sammeln](/de-DE/support/guides/collecting-logs) | Log-Bundles fuer Fehlermeldungen zusammenstellen |
| [Diagnose ausfuehren](/de-DE/support/guides/diagnostics) | Verwendung von `triggerfish patrol` und dem Healthcheck-Tool |
| [Issues erstellen](/de-DE/support/guides/filing-issues) | Was einzufuegen ist, damit Ihr Issue schnell geloest wird |
| [Plattformhinweise](/de-DE/support/guides/platform-notes) | macOS, Linux, Windows, Docker und Flatpak-Besonderheiten |

### Wissensdatenbank

| Artikel | Beschreibung |
|---------|-------------|
| [Secrets-Migration](/de-DE/support/kb/secrets-migration) | Migration von Klartext zu verschluesselter Secret-Speicherung |
| [Selbst-Update-Prozess](/de-DE/support/kb/self-update) | Wie `triggerfish update` funktioniert und was schiefgehen kann |
| [Breaking Changes](/de-DE/support/kb/breaking-changes) | Version-fuer-Version-Liste der wichtigen Aenderungen |
| [Bekannte Probleme](/de-DE/support/kb/known-issues) | Aktuelle bekannte Probleme und deren Umgehungen |

## Immer noch nicht weiter?

Wenn die obige Dokumentation Ihr Problem nicht geloest hat:

1. **Suchen Sie in bestehenden Issues** auf [GitHub Issues](https://github.com/greghavens/triggerfish/issues), ob jemand dasselbe Problem bereits gemeldet hat
2. **Fragen Sie die Community** in [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)
3. **Erstellen Sie ein neues Issue** gemaess der [Anleitung zum Erstellen von Issues](/de-DE/support/guides/filing-issues)
