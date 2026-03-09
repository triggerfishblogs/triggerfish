# Fehlerbehebung

Beginnen Sie hier, wenn etwas nicht funktioniert. Folgen Sie den Schritten der Reihe nach.

## Erste Schritte

### 1. Pruefen Sie, ob der Daemon laeuft

```bash
triggerfish status
```

Wenn der Daemon nicht laeuft, starten Sie ihn:

```bash
triggerfish start
```

### 2. Pruefen Sie die Logs

```bash
triggerfish logs
```

Dies zeigt die Log-Datei in Echtzeit an. Verwenden Sie einen Level-Filter, um das Rauschen zu reduzieren:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Diagnose ausfuehren

```bash
triggerfish patrol
```

Patrol prueft, ob das Gateway erreichbar ist, der LLM-Provider antwortet, Kanaele verbunden sind, Policy-Regeln geladen sind und Skills erkannt wurden. Jede Pruefung, die als `CRITICAL` oder `WARNING` markiert ist, zeigt Ihnen, wo Sie sich konzentrieren sollten.

### 4. Konfiguration validieren

```bash
triggerfish config validate
```

Dies parst `triggerfish.yaml`, prueft erforderliche Felder, validiert Klassifizierungsstufen und loest Secret-Referenzen auf.

## Fehlerbehebung nach Bereich

Wenn die obigen ersten Schritte nicht auf das Problem hingewiesen haben, waehlen Sie den Bereich, der zu Ihren Symptomen passt:

- [Installation](/de-DE/support/troubleshooting/installation) - Installationsskript-Fehler, Build-aus-Quellcode-Probleme, Plattformprobleme
- [Daemon](/de-DE/support/troubleshooting/daemon) - Dienst startet nicht, Port-Konflikte, "already running"-Fehler
- [Konfiguration](/de-DE/support/troubleshooting/configuration) - YAML-Parse-Fehler, fehlende Felder, Secret-Aufloesungsfehler
- [Kanaele](/de-DE/support/troubleshooting/channels) - Bot antwortet nicht, Authentifizierungsfehler, Nachrichtenzustellungsprobleme
- [LLM-Provider](/de-DE/support/troubleshooting/providers) - API-Fehler, Modell nicht gefunden, Streaming-Fehler
- [Integrationen](/de-DE/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP-Server
- [Browser-Automatisierung](/de-DE/support/troubleshooting/browser) - Chrome nicht gefunden, Startfehler, Navigation blockiert
- [Sicherheit & Klassifizierung](/de-DE/support/troubleshooting/security) - Write-Down-Blockierungen, Taint-Probleme, SSRF, Policy-Ablehnungen
- [Secrets & Anmeldedaten](/de-DE/support/troubleshooting/secrets) - Schluesselbund-Fehler, verschluesselter Dateispeicher, Berechtigungsprobleme

## Immer noch nicht weiter?

Wenn keiner der obigen Leitfaeden Ihr Problem geloest hat:

1. Sammeln Sie ein [Log-Bundle](/de-DE/support/guides/collecting-logs)
2. Lesen Sie die [Anleitung zum Erstellen von Issues](/de-DE/support/guides/filing-issues)
3. Erstellen Sie ein Issue auf [GitHub](https://github.com/greghavens/triggerfish/issues/new)
