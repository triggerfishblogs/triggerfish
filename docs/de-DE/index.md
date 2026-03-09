---
layout: home

hero:
  name: Triggerfish
  text: Sichere KI-Agenten
  tagline: Deterministische Policy-Durchsetzung unterhalb der LLM-Schicht. Jeder Kanal. Ohne Ausnahme.
  image:
    src: /triggerfish.png
    alt: Triggerfish — unterwegs im digitalen Meer
  actions:
    - theme: brand
      text: Erste Schritte
      link: /de-DE/guide/
    - theme: alt
      text: Preise
      link: /de-DE/pricing
    - theme: alt
      text: Auf GitHub ansehen
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Sicherheit unterhalb des LLM
    details: Deterministische Policy-Durchsetzung unterhalb des LLM. Reine Code-Hooks, die die KI nicht umgehen, ueberschreiben oder beeinflussen kann. Gleiche Eingabe, gleiche Entscheidung, jedes Mal.
  - icon: "\U0001F4AC"
    title: Jeder Kanal, den Sie nutzen
    details: Telegram, Slack, Discord, WhatsApp, E-Mail, WebChat, CLI — alle mit kanalspezifischer Klassifizierung und automatischer Taint-Verfolgung.
  - icon: "\U0001F528"
    title: Bauen Sie alles
    details: Agent-Ausfuehrungsumgebung mit einer Schreiben/Ausfuehren/Korrigieren-Feedbackschleife. Selbst erstellende Skills. Der Reef-Marktplatz zum Entdecken und Teilen von Faehigkeiten.
  - icon: "\U0001F916"
    title: Jeder LLM-Anbieter
    details: Anthropic, OpenAI, Google Gemini, lokale Modelle ueber Ollama, OpenRouter. Automatische Failover-Ketten. Oder waehlen Sie Triggerfish Gateway — keine API-Schluessel erforderlich.
  - icon: "\U0001F3AF"
    title: Standardmaessig proaktiv
    details: Cron-Jobs, Trigger und Webhooks. Ihr Agent meldet sich, ueberwacht und handelt autonom — innerhalb strenger Policy-Grenzen.
  - icon: "\U0001F310"
    title: Open Source
    details: Apache 2.0 lizenziert. Sicherheitskritische Komponenten vollstaendig offen fuer Pruefungen. Vertrauen Sie uns nicht — ueberpruefen Sie den Code.
---

<LatestRelease />

## Installation mit einem Befehl

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

Die Binaer-Installer laden ein vorgefertigtes Release herunter, ueberpruefen dessen Pruefsumme und starten den Einrichtungsassistenten. Weitere Informationen zu Docker-Setup, Kompilierung aus dem Quellcode und dem Release-Prozess finden Sie in der [Installationsanleitung](/de-DE/guide/installation).

Moechten Sie keine API-Schluessel verwalten? [Sehen Sie sich die Preise an](/de-DE/pricing) fuer Triggerfish Gateway — verwaltete LLM- und Such-Infrastruktur, einsatzbereit in Minuten.

## So funktioniert es

Triggerfish platziert eine deterministische Policy-Schicht zwischen Ihrem KI-Agenten und allem, was er beruehrt. Das LLM schlaegt Aktionen vor — reine Code-Hooks entscheiden, ob sie erlaubt sind.

- **Deterministische Policy** — Sicherheitsentscheidungen sind reiner Code. Kein Zufall, kein LLM-Einfluss, keine Ausnahmen. Gleiche Eingabe, gleiche Entscheidung, jedes Mal.
- **Informationsfluss-Kontrolle** — Vier Klassifizierungsstufen (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) propagieren automatisch durch Session-Taint. Daten koennen niemals abwaerts in einen weniger sicheren Kontext fliessen.
- **Sechs Enforcement-Hooks** — Jede Stufe der Datenpipeline ist gesichert: was in den LLM-Kontext gelangt, welche Tools aufgerufen werden, welche Ergebnisse zurueckkommen und was das System verlaesst. Jede Entscheidung wird im Audit-Log festgehalten.
- **Standard-Verweigerung** — Nichts wird stillschweigend erlaubt. Nicht klassifizierte Tools, Integrationen und Datenquellen werden abgelehnt, bis sie explizit konfiguriert sind.
- **Agenten-Identitaet** — Die Mission Ihres Agenten liegt in SPINE.md, proaktive Verhaltensweisen in TRIGGER.md. Skills erweitern Faehigkeiten durch einfache Ordner-Konventionen. Der Reef-Marktplatz laesst Sie diese entdecken und teilen.

[Erfahren Sie mehr ueber die Architektur.](/de-DE/architecture/)
