# Haeufig gestellte Fragen

## Installation

### Was sind die Systemanforderungen?

Triggerfish laeuft auf macOS (Intel und Apple Silicon), Linux (x64 und arm64) und Windows (x64). Der binaere Installer kuemmert sich um alles. Wenn Sie aus dem Quellcode bauen, benoetigen Sie Deno 2.x.

Fuer Docker-Bereitstellungen funktioniert jedes System mit Docker oder Podman. Das Container-Image basiert auf distroless Debian 12.

### Wo speichert Triggerfish seine Daten?

Standardmaessig befindet sich alles unter `~/.triggerfish/`:

```
~/.triggerfish/
  triggerfish.yaml          # Konfiguration
  SPINE.md                  # Agenten-Identitaet
  TRIGGER.md                # Definition des proaktiven Verhaltens
  logs/                     # Log-Dateien (rotiert bei 1 MB, 10 Backups)
  data/triggerfish.db       # SQLite-Datenbank (Sessions, Memory, Status)
  skills/                   # Installierte Skills
  backups/                  # Zeitgestempelte Konfigurations-Backups
```

Docker-Bereitstellungen verwenden stattdessen `/data`. Sie koennen das Basisverzeichnis mit der Umgebungsvariable `TRIGGERFISH_DATA_DIR` ueberschreiben.

### Kann ich das Datenverzeichnis verschieben?

Ja. Setzen Sie die Umgebungsvariable `TRIGGERFISH_DATA_DIR` auf den gewuenschten Pfad, bevor Sie den Daemon starten. Wenn Sie systemd oder launchd verwenden, muessen Sie die Dienstdefinition aktualisieren (siehe [Plattformhinweise](/de-DE/support/guides/platform-notes)).

### Der Installer sagt, er kann nicht nach `/usr/local/bin` schreiben

Der Installer versucht zuerst `/usr/local/bin`. Wenn dies Root-Zugriff erfordert, faellt er auf `~/.local/bin` zurueck. Wenn Sie den systemweiten Speicherort moechten, fuehren Sie mit `sudo` erneut aus:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Wie deinstalliere ich Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Dies stoppt den Daemon, entfernt die Dienstdefinition (systemd-Unit oder launchd-plist), loescht die Binaerdatei und entfernt das gesamte `~/.triggerfish/`-Verzeichnis einschliesslich aller Daten.

---

## Konfiguration

### Wie aendere ich den LLM-Provider?

Bearbeiten Sie `triggerfish.yaml` oder verwenden Sie die CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Der Daemon startet nach Konfigurationsaenderungen automatisch neu.

### Wo kommen API-Schluessel hin?

API-Schluessel werden in Ihrem Betriebssystem-Schluesselbund gespeichert (macOS Keychain, Linux Secret Service oder eine verschluesselte Datei unter Windows/Docker). Legen Sie niemals rohe API-Schluessel in `triggerfish.yaml` ab. Verwenden Sie die `secret:`-Referenzsyntax:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Speichern Sie den eigentlichen Schluessel:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Was bedeutet `secret:` in meiner Konfiguration?

Werte mit dem Praefix `secret:` sind Referenzen auf Ihren Betriebssystem-Schluesselbund. Beim Start loest Triggerfish jede Referenz auf und ersetzt sie im Speicher durch den tatsaechlichen Secret-Wert. Das rohe Secret erscheint niemals in `triggerfish.yaml` auf der Festplatte. Siehe [Secrets & Anmeldedaten](/de-DE/support/troubleshooting/secrets) fuer Backend-Details nach Plattform.

### Was ist SPINE.md?

`SPINE.md` ist die Identitaetsdatei Ihres Agenten. Sie definiert Namen, Mission, Persoenlichkeit und Verhaltensrichtlinien des Agenten. Betrachten Sie sie als System-Prompt-Grundlage. Der Einrichtungsassistent (`triggerfish dive`) erstellt eine fuer Sie, aber Sie koennen sie frei bearbeiten.

### Was ist TRIGGER.md?

`TRIGGER.md` definiert das proaktive Verhalten Ihres Agenten: Was er bei geplanten Trigger-Wakeups pruefen, ueberwachen und worauf er reagieren soll. Ohne eine `TRIGGER.md` werden Trigger zwar ausgeloest, aber der Agent hat keine Anweisungen, was er tun soll.

### Wie fuege ich einen neuen Kanal hinzu?

```bash
triggerfish config add-channel telegram
```

Dies startet eine interaktive Eingabeaufforderung, die Sie durch die erforderlichen Felder fuehrt (Bot-Token, Owner-ID, Klassifizierungsstufe). Sie koennen auch `triggerfish.yaml` direkt unter dem Abschnitt `channels:` bearbeiten.

### Ich habe meine Konfiguration geaendert, aber nichts ist passiert

Der Daemon muss neu gestartet werden, um Aenderungen zu uebernehmen. Wenn Sie `triggerfish config set` verwendet haben, bietet es einen automatischen Neustart an. Wenn Sie die YAML-Datei manuell bearbeitet haben, starten Sie neu mit:

```bash
triggerfish stop && triggerfish start
```

---

## Kanaele

### Warum antwortet mein Bot nicht auf Nachrichten?

Pruefen Sie zunachst:

1. **Laeuft der Daemon?** Fuehren Sie `triggerfish status` aus
2. **Ist der Kanal verbunden?** Pruefen Sie die Logs: `triggerfish logs`
3. **Ist das Bot-Token gueltig?** Die meisten Kanaele scheitern stillschweigend bei ungueltigen Tokens
4. **Ist die Owner-ID korrekt?** Wenn Sie nicht als Eigentuemer erkannt werden, kann der Bot Antworten einschraenken

Siehe den [Kanaele-Fehlerbehebungsleitfaden](/de-DE/support/troubleshooting/channels) fuer kanalspezifische Checklisten.

### Was ist die Owner-ID und warum ist sie wichtig?

Die Owner-ID teilt Triggerfish mit, welcher Benutzer auf einem bestimmten Kanal Sie (der Betreiber) sind. Nicht-Eigentuemer-Benutzer erhalten eingeschraenkten Tool-Zugriff und koennen Klassifizierungsgrenzen unterliegen. Wenn Sie die Owner-ID leer lassen, variiert das Verhalten je nach Kanal. Einige Kanaele (wie WhatsApp) behandeln jeden als Eigentuemer, was ein Sicherheitsrisiko darstellt.

### Kann ich mehrere Kanaele gleichzeitig nutzen?

Ja. Konfigurieren Sie beliebig viele Kanaele in `triggerfish.yaml`. Jeder Kanal verwaltet seine eigenen Sessions und Klassifizierungsstufe. Der Router uebernimmt die Nachrichtenzustellung ueber alle verbundenen Kanaele.

### Was sind die Nachrichtengroessenlimits?

| Kanal | Limit | Verhalten |
|-------|-------|-----------|
| Telegram | 4.096 Zeichen | Automatisch aufgeteilt |
| Discord | 2.000 Zeichen | Automatisch aufgeteilt |
| Slack | 40.000 Zeichen | Abgeschnitten (nicht aufgeteilt) |
| WhatsApp | 4.096 Zeichen | Abgeschnitten |
| Email | Kein hartes Limit | Vollstaendige Nachricht gesendet |
| WebChat | Kein hartes Limit | Vollstaendige Nachricht gesendet |

### Warum werden Slack-Nachrichten abgeschnitten?

Slack hat ein Limit von 40.000 Zeichen. Im Gegensatz zu Telegram und Discord schneidet Triggerfish Slack-Nachrichten ab, anstatt sie in mehrere Nachrichten aufzuteilen. Sehr lange Antworten (wie grosse Code-Ausgaben) koennen am Ende Inhalt verlieren.

---

## Sicherheit & Klassifizierung

### Was sind die Klassifizierungsstufen?

Vier Stufen, von am wenigsten bis am meisten sensitiv:

1. **PUBLIC** - Keine Einschraenkungen beim Datenfluss
2. **INTERNAL** - Standard-Betriebsdaten
3. **CONFIDENTIAL** - Sensitive Daten (Anmeldedaten, persoenliche Informationen, Finanzunterlagen)
4. **RESTRICTED** - Hoechste Sensitivitaet (regulierte Daten, Compliance-kritisch)

Daten koennen nur von niedrigeren Stufen zu gleichen oder hoeheren Stufen fliessen. CONFIDENTIAL-Daten koennen niemals einen PUBLIC-Kanal erreichen. Dies ist die "No Write-Down"-Regel und sie kann nicht ueberschrieben werden.

### Was bedeutet "Session-Taint"?

Jede Session startet bei PUBLIC. Wenn der Agent auf klassifizierte Daten zugreift (eine CONFIDENTIAL-Datei liest, eine RESTRICTED-Datenbank abfragt), eskaliert der Session-Taint entsprechend. Taint geht nur nach oben, nie nach unten. Eine auf CONFIDENTIAL getaintete Session kann ihre Ausgabe nicht an einen PUBLIC-Kanal senden.

### Warum erhalte ich "Write-Down blocked"-Fehler?

Ihre Session wurde auf eine Klassifizierungsstufe getaintet, die hoeher als das Ziel ist. Wenn Sie beispielsweise auf CONFIDENTIAL-Daten zugegriffen haben und dann versuchen, Ergebnisse an einen PUBLIC-WebChat-Kanal zu senden, blockiert die Policy-Engine dies.

Dies funktioniert wie beabsichtigt. Um dies zu loesen, entweder:
- Starten Sie eine neue Session (neue Konversation)
- Verwenden Sie einen Kanal, der auf oder ueber dem Taint-Level Ihrer Session klassifiziert ist

### Kann ich die Klassifizierungsdurchsetzung deaktivieren?

Nein. Das Klassifizierungssystem ist eine zentrale Sicherheitsinvariante. Es laeuft als deterministischer Code unterhalb der LLM-Schicht und kann nicht umgangen, deaktiviert oder vom Agenten beeinflusst werden. Dies ist beabsichtigt.

---

## LLM-Provider

### Welche Provider werden unterstuetzt?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI und lokale Modelle ueber Ollama oder LM Studio.

### Wie funktioniert Failover?

Konfigurieren Sie eine `failover`-Liste in `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Wenn der primaere Provider ausfaellt, versucht Triggerfish jeden Fallback der Reihe nach. Der Abschnitt `failover_config` steuert Wiederholungsanzahl, Verzoegerung und welche Fehlerbedingungen Failover ausloesen.

### Mein Provider gibt 401-/403-Fehler zurueck

Ihr API-Schluessel ist ungueltig oder abgelaufen. Speichern Sie ihn erneut:

```bash
triggerfish config set-secret provider:<name>:apiKey <ihr-schluessel>
```

Starten Sie dann den Daemon neu. Siehe [LLM-Provider-Fehlerbehebung](/de-DE/support/troubleshooting/providers) fuer provider-spezifische Anleitung.

### Kann ich verschiedene Modelle fuer verschiedene Klassifizierungsstufen verwenden?

Ja. Verwenden Sie die `classification_models`-Konfiguration:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Sessions, die auf eine bestimmte Stufe getaintet sind, verwenden das entsprechende Modell. Stufen ohne explizite Ueberschreibung fallen auf das primaere Modell zurueck.

---

## Docker

### Wie fuehre ich Triggerfish in Docker aus?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Dies laedt das Docker-Wrapper-Skript und die Compose-Datei herunter, zieht das Image und fuehrt den Einrichtungsassistenten aus.

### Wo werden Daten in Docker gespeichert?

Alle persistenten Daten befinden sich in einem Docker-Named-Volume (`triggerfish-data`), das unter `/data` im Container gemountet ist. Dies umfasst Konfiguration, Secrets, die SQLite-Datenbank, Logs, Skills und Agenten-Workspaces.

### Wie funktionieren Secrets in Docker?

Docker-Container koennen nicht auf den Host-Betriebssystem-Schluesselbund zugreifen. Triggerfish verwendet stattdessen einen verschluesselten Dateispeicher: `secrets.json` (verschluesselte Werte) und `secrets.key` (AES-256-Verschluesselungsschluessel), beide im `/data`-Volume gespeichert. Behandeln Sie das Volume als sensitiv.

### Der Container kann meine Konfigurationsdatei nicht finden

Stellen Sie sicher, dass Sie sie korrekt gemountet haben:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Wenn der Container ohne Konfigurationsdatei startet, gibt er eine Hilfemeldung aus und beendet sich.

### Wie aktualisiere ich das Docker-Image?

```bash
triggerfish update    # Wenn Sie das Wrapper-Skript verwenden
# oder
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### Was ist ein Skill?

Ein Skill ist ein Ordner mit einer `SKILL.md`-Datei, die dem Agenten neue Faehigkeiten, Kontext oder Verhaltensrichtlinien verleiht. Skills koennen Tool-Definitionen, Code, Vorlagen und Anweisungen enthalten.

### Was ist The Reef?

The Reef ist Triggerfishs Skill-Marktplatz. Sie koennen Skills darueber entdecken, installieren und veroeffentlichen:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Warum wurde mein Skill vom Sicherheitsscanner blockiert?

Jeder Skill wird vor der Installation gescannt. Der Scanner prueft auf verdaechtige Muster, uebermassige Berechtigungen und Klassifizierungs-Obergrenzen-Verletzungen. Wenn die Obergrenze eines Skills unter Ihrem aktuellen Session-Taint liegt, wird die Aktivierung blockiert, um Write-Down zu verhindern.

### Was ist eine Klassifizierungs-Obergrenze bei einem Skill?

Skills deklarieren eine maximale Klassifizierungsstufe, auf der sie arbeiten duerfen. Ein Skill mit `classification_ceiling: INTERNAL` kann nicht in einer auf CONFIDENTIAL oder hoeher getainteten Session aktiviert werden. Dies verhindert, dass Skills auf Daten ueber ihrer Freigabestufe zugreifen.

---

## Trigger & Planung

### Was sind Trigger?

Trigger sind periodische Agenten-Wakeups fuer proaktives Verhalten. Sie definieren, was der Agent in `TRIGGER.md` pruefen soll, und Triggerfish weckt ihn nach Zeitplan. Der Agent prueft seine Anweisungen, handelt (Kalender pruefen, Dienst ueberwachen, Erinnerung senden) und geht wieder schlafen.

### Wie unterscheiden sich Trigger von Cron-Jobs?

Cron-Jobs fuehren eine feste Aufgabe nach Zeitplan aus. Trigger wecken den Agenten mit seinem vollen Kontext (Memory, Tools, Kanalzugriff) und lassen ihn basierend auf den `TRIGGER.md`-Anweisungen entscheiden, was zu tun ist. Cron ist mechanisch; Trigger sind agentisch.

### Was sind Ruhezeiten?

Die `quiet_hours`-Einstellung in `scheduler.trigger` verhindert, dass Trigger waehrend bestimmter Stunden ausgeloest werden:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Wie funktionieren Webhooks?

Externe Dienste koennen per POST an Triggerfishs Webhook-Endpunkt senden, um Agenten-Aktionen auszuloesen. Jede Webhook-Quelle erfordert HMAC-Signierung zur Authentifizierung und umfasst Replay-Erkennung.

---

## Agent Teams

### Was sind Agent Teams?

Agent Teams sind persistente Gruppen zusammenarbeitender Agenten, die gemeinsam an komplexen Aufgaben arbeiten. Jedes Teammitglied ist eine separate Agenten-Session mit eigener Rolle, Konversationskontext und Tools. Ein Mitglied wird als Lead designiert und koordiniert die Arbeit. Siehe [Agent Teams](/de-DE/features/agent-teams) fuer die vollstaendige Dokumentation.

### Wie unterscheiden sich Teams von Sub-Agenten?

Sub-Agenten sind Fire-and-Forget: Sie delegieren eine einzelne Aufgabe und warten auf das Ergebnis. Teams sind persistent -- Mitglieder kommunizieren ueber `sessions_send`, der Lead koordiniert die Arbeit, und das Team laeuft autonom, bis es aufgeloest wird oder das Zeitlimit ueberschreitet. Verwenden Sie Sub-Agenten fuer fokussierte Delegation; verwenden Sie Teams fuer komplexe Multi-Rollen-Zusammenarbeit.

### Benoetigen Agent Teams einen kostenpflichtigen Plan?

Agent Teams erfordern den **Power**-Plan (149$/Monat) bei Verwendung von Triggerfish Gateway. Open-Source-Benutzer, die eigene API-Schluessel verwenden, haben vollen Zugriff -- jedes Teammitglied verbraucht Inferenz von Ihrem konfigurierten LLM-Provider.

### Warum ist mein Team Lead sofort fehlgeschlagen?

Die haeufigste Ursache ist ein falsch konfigurierter LLM-Provider. Jedes Teammitglied erzeugt seine eigene Agenten-Session, die eine funktionierende LLM-Verbindung benoetigt. Pruefen Sie `triggerfish logs` auf Provider-Fehler zum Zeitpunkt der Team-Erstellung. Siehe [Agent Teams Fehlerbehebung](/de-DE/support/troubleshooting/security#agent-teams) fuer weitere Details.

### Koennen Teammitglieder verschiedene Modelle verwenden?

Ja. Jede Mitgliedsdefinition akzeptiert ein optionales `model`-Feld. Wenn weggelassen, erbt das Mitglied das Modell des erstellenden Agenten. So koennen Sie teure Modelle fuer komplexe Rollen und guenstigere Modelle fuer einfache zuweisen.

### Wie lange kann ein Team laufen?

Standardmaessig haben Teams eine Lebensdauer von 1 Stunde (`max_lifetime_seconds: 3600`). Wenn das Limit erreicht wird, erhaelt der Lead eine 60-Sekunden-Warnung, um eine endgueltige Ausgabe zu erstellen, dann wird das Team automatisch aufgeloest. Sie koennen bei der Erstellung eine laengere Lebensdauer konfigurieren.

### Was passiert, wenn ein Teammitglied abstuerzt?

Der Lebenszyklus-Monitor erkennt Mitglieder-Ausfaelle innerhalb von 30 Sekunden. Ausgefallene Mitglieder werden als `failed` markiert und der Lead wird benachrichtigt, mit den verbleibenden Mitgliedern fortzufahren oder das Team aufzuloesen. Wenn der Lead selbst ausfaellt, wird das Team pausiert und die erstellende Session wird benachrichtigt.

---

## Verschiedenes

### Ist Triggerfish Open Source?

Ja, unter der Apache-2.0-Lizenz. Der vollstaendige Quellcode, einschliesslich aller sicherheitskritischen Komponenten, ist zur Pruefung auf [GitHub](https://github.com/greghavens/triggerfish) verfuegbar.

### Telefoniert Triggerfish nach Hause?

Nein. Triggerfish stellt keine ausgehenden Verbindungen her, ausser zu den Diensten, die Sie explizit konfigurieren (LLM-Provider, Kanal-APIs, Integrationen). Es gibt keine Telemetrie, Analytik oder Update-Pruefung, es sei denn, Sie fuehren `triggerfish update` aus.

### Kann ich mehrere Agenten betreiben?

Ja. Der `agents`-Konfigurationsabschnitt definiert mehrere Agenten, jeder mit eigenem Namen, Modell, Kanalbindungen, Tool-Sets und Klassifizierungs-Obergrenzen. Das Routing-System leitet Nachrichten an den entsprechenden Agenten weiter.

### Was ist das Gateway?

Das Gateway ist Triggerfishs interne WebSocket-Steuerungsebene. Es verwaltet Sessions, leitet Nachrichten zwischen Kanaelen und dem Agenten, dispatcht Tools und setzt Policy durch. Die CLI-Chat-Oberflaeche verbindet sich mit dem Gateway, um mit Ihrem Agenten zu kommunizieren.

### Welche Ports verwendet Triggerfish?

| Port | Zweck | Bindung |
|------|-------|---------|
| 18789 | Gateway WebSocket | Nur localhost |
| 18790 | Tidepool A2UI | Nur localhost |
| 8765 | WebChat (wenn aktiviert) | Konfigurierbar |
| 8443 | WhatsApp-Webhook (wenn aktiviert) | Konfigurierbar |

Alle Standard-Ports binden an localhost. Keiner wird dem Netzwerk ausgesetzt, es sei denn, Sie konfigurieren dies explizit oder verwenden einen Reverse Proxy.
