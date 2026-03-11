# Schnellstart

Diese Anleitung fuehrt Sie durch Ihre ersten 5 Minuten mit Triggerfish -- vom Ausfuehren des Einrichtungsassistenten bis zu einem funktionierenden KI-Agenten, mit dem Sie chatten koennen.

## Einrichtungsassistenten starten

Wenn Sie den Ein-Befehl-Installer verwendet haben, wurde der Assistent bereits waehrend der Installation ausgefuehrt. Um ihn erneut auszufuehren oder neu zu starten:

```bash
triggerfish dive
```

Der Assistent fuehrt Sie durch acht Schritte:

### Schritt 1: LLM-Anbieter waehlen

```
Schritt 1/8: Waehlen Sie Ihren LLM-Anbieter
  > Triggerfish Gateway — keine API-Schluessel noetig
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Waehlen Sie einen Anbieter und geben Sie Ihre Anmeldedaten ein. Triggerfish unterstuetzt mehrere Anbieter mit automatischem Failover. **Triggerfish Gateway** ist die einfachste Option -- abonnieren Sie einen [Pro- oder Power-Tarif](/de-DE/pricing), und Ihr Agent verbindet sich mit verwalteter LLM- und Such-Infrastruktur, ohne dass API-Schluessel konfiguriert werden muessen.

### Schritt 2: Agent benennen

```
Schritt 2/8: Benennen Sie Ihren Agenten und legen Sie seine Persoenlichkeit fest
  Agent-Name: Reef
  Mission (ein Satz): Hilf mir, organisiert und informiert zu bleiben
  Ton: > Professionell  Laessig  Knapp  Benutzerdefiniert
```

Dies generiert Ihre `SPINE.md`-Datei -- die Grundlage des System-Prompts Ihres Agenten. Sie koennen sie jederzeit unter `~/.triggerfish/SPINE.md` bearbeiten.

### Schritt 3: Kanal verbinden

```
Schritt 3/8: Verbinden Sie Ihren ersten Kanal
  > CLI (bereits verfuegbar)
    WebChat
    Telegram (Bot-Token eingeben)
    Jetzt ueberspringen
```

Waehlen Sie eine Messaging-Plattform oder ueberspringen Sie diesen Schritt, um nur mit der CLI zu beginnen. Sie koennen spaeter Kanaele in Ihrer `triggerfish.yaml` hinzufuegen.

### Schritt 4: Optionale Plugins

```
Schritt 4/8: Optionale Plugins installieren
  > Obsidian
    Ueberspringen
```

Verbinden Sie optionale Integrationen wie Obsidian fuer Notizen.

### Schritt 5: Google Workspace verbinden (optional)

Verbinden Sie Ihr Google-Konto fuer Gmail, Kalender, Aufgaben, Drive und Tabellen ueber OAuth2. Sie koennen dies ueberspringen und spaeter mit `triggerfish connect google` verbinden.

### Schritt 6: GitHub verbinden (optional)

Verbinden Sie GitHub durch Einfuegen eines Personal Access Token. Gibt dem Agenten Tools fuer Repos, PRs, Issues und Actions. Sie koennen dies ueberspringen und spaeter mit `triggerfish connect github` verbinden.

### Schritt 7: Websuche einrichten

Waehlen Sie eine Suchmaschine (Brave Search oder selbst gehostetes SearXNG) fuer Ihren Agenten oder ueberspringen Sie dies vorerst.

### Schritt 8: Daemon starten

```
Schritt 8/8: Als Daemon installieren?
  > Ja (beim Login starten, laeuft im Hintergrund)
    Nein (nur manueller Start)
```

Waehlen Sie Ja, damit Ihr Agent laeuft, wann immer Ihr Rechner eingeschaltet ist.

## Chatten beginnen

Nach Abschluss des Assistenten koennen Sie sofort ueber die CLI chatten:

```bash
triggerfish chat
```

Oder, wenn Sie einen Messaging-Kanal verbunden haben, senden Sie Ihrem Agenten dort eine Nachricht.

### Beispielgespraech

```
Sie: Womit kannst du mir helfen?

Reef: Ich kann Ihnen bei einer Vielzahl von Aufgaben helfen. Hier sind
einige Dinge, fuer die ich eingerichtet bin:

  - Fragen beantworten und Gespraeche fuehren
  - Ihren Kalender und Zeitplan verwalten
  - E-Mails und Nachrichten zusammenfassen
  - Dokumente schreiben und bearbeiten
  - Code in einer Sandbox-Umgebung ausfuehren
  - Im Web nach Informationen suchen
  - Wiederkehrende Aufgaben mit Cron-Jobs automatisieren

Womit moechten Sie beginnen?

Sie: Richte ein taegliches Morgenbriefing um 7 Uhr ein

Reef: Ich habe einen Cron-Job fuer Ihr Morgenbriefing erstellt:

  Zeitplan: Taeglich um 7:00 Uhr
  Aufgabe: Briefing mit Kalendereintraegen, ungelesenen E-Mails
           und Wettervorhersage vorbereiten
  Zustellung: CLI (fuegen Sie einen Kanal in der Konfiguration hinzu,
              um es auf Telegram/Slack zu erhalten)

Sie erhalten Ihr erstes Briefing morgen frueh. Sie koennen Cron-Jobs
jederzeit mit /cron list verwalten.
```

## Setup ueberpruefen

Fuehren Sie den Gesundheitscheck aus, um sicherzustellen, dass alles funktioniert:

```bash
triggerfish patrol
```

```
Triggerfish-Gesundheitscheck

  Gateway laeuft (PID 12345, Laufzeit 2m)
  LLM-Anbieter verbunden (Anthropic, Claude Sonnet 4.5)
  1 Kanal aktiv (CLI)
  Policy-Engine geladen (4 Regeln)
  3 Skills installiert (3 mitgeliefert)

Gesamtstatus: GESUND
```

## Was als naechstes zu tun ist

- **Ihren Agenten anpassen** -- bearbeiten Sie `~/.triggerfish/SPINE.md`, um die Persoenlichkeit und Faehigkeiten Ihres Agenten zu verfeinern. Siehe [SPINE und Trigger](./spine-and-triggers).
- **Weitere Kanaele hinzufuegen** -- verbinden Sie Telegram, Slack, Discord oder WhatsApp in Ihrer `triggerfish.yaml`. Siehe [Konfiguration](./configuration).
- **Integrationen verbinden** -- `triggerfish connect google` fuer Google Workspace, `triggerfish connect github` fuer GitHub. Siehe [Integrationen](/de-DE/integrations/).
- **Proaktives Verhalten einrichten** -- erstellen Sie eine `~/.triggerfish/TRIGGER.md`, um Ihrem Agenten mitzuteilen, was er ueberwachen soll. Siehe [SPINE und Trigger](./spine-and-triggers).
- **Befehle erkunden** -- lernen Sie alle verfuegbaren CLI- und In-Chat-Befehle kennen. Siehe [CLI-Befehle](./commands).
