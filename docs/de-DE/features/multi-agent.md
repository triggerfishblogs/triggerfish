# Multi-Agent-Routing

Triggerfish unterstuetzt das Routing verschiedener Kanaele, Konten oder Kontakte an separate isolierte Agenten, jeder mit eigenem Workspace, Sessions, Persoenlichkeit und Klassifizierungsobergrenze.

## Warum mehrere Agenten?

Ein einzelner Agent mit einer einzelnen Persoenlichkeit reicht nicht immer aus. Sie moechten vielleicht:

- Einen **persoenlichen Assistenten** auf WhatsApp, der Kalender, Erinnerungen und Familiennachrichten verwaltet.
- Einen **Arbeitsassistenten** auf Slack, der Jira-Tickets, GitHub-PRs und Code-Reviews verwaltet.
- Einen **Support-Agenten** auf Discord, der Community-Fragen mit einem anderen Ton und eingeschraenktem Zugang beantwortet.

Multi-Agent-Routing ermoeglicht es Ihnen, all dies gleichzeitig von einer einzigen Triggerfish-Installation aus zu betreiben.

## So funktioniert es

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-Agent-Routing: eingehende Kanaele werden ueber AgentRouter an isolierte Agenten-Workspaces weitergeleitet" style="max-width: 100%;" />

Der **AgentRouter** untersucht jede eingehende Nachricht und ordnet sie basierend auf konfigurierbaren Routing-Regeln einem Agenten zu. Wenn keine Regel zutrifft, gehen Nachrichten an einen Standard-Agenten.

## Routing-Regeln

Nachrichten koennen nach folgenden Kriterien geroutet werden:

| Kriterium | Beschreibung                                    | Beispiel                                     |
| --------- | ----------------------------------------------- | -------------------------------------------- |
| Kanal     | Routing nach Messaging-Plattform                | Alle Slack-Nachrichten gehen an "Arbeit"     |
| Konto     | Routing nach spezifischem Konto innerhalb eines Kanals | Arbeits-E-Mail vs. persoenliche E-Mail  |
| Kontakt   | Routing nach Absender-/Peer-Identitaet          | Nachrichten von Ihrem Chef gehen an "Arbeit" |
| Standard  | Fallback, wenn keine Regel zutrifft             | Alles andere geht an "Persoenlich"           |

## Konfiguration

Definieren Sie Agenten und Routing in `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Jeder Agent spezifiziert:

- **id** -- Eindeutige Kennung fuer das Routing.
- **name** -- Menschenlesbarer Name.
- **channels** -- Welche Kanal-Instanzen dieser Agent behandelt.
- **tools** -- Tool-Profil und explizite Allow/Deny-Listen.
- **model** -- Welches LLM-Modell verwendet werden soll (kann pro Agent unterschiedlich sein).
- **classification_ceiling** -- Maximale Klassifizierungsstufe, die dieser Agent erreichen kann.

## Agenten-Identitaet

Jeder Agent hat sein eigenes `SPINE.md`, das seine Persoenlichkeit, Mission und Grenzen definiert. SPINE.md-Dateien befinden sich im Workspace-Verzeichnis des Agenten:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Persoenlicher Assistent Persoenlichkeit
    work/
      SPINE.md          # Arbeitsassistent Persoenlichkeit
    support/
      SPINE.md          # Support-Bot Persoenlichkeit
```

## Isolation

Multi-Agent-Routing setzt strikte Isolation zwischen Agenten durch:

| Aspekt     | Isolation                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Sessions   | Jeder Agent hat unabhaengigen Session-Raum. Sessions werden niemals geteilt.                        |
| Taint      | Taint wird pro Agent verfolgt, nicht agentenuebergreifend. Arbeits-Taint beeinflusst keine persoenlichen Sessions. |
| Skills     | Skills werden pro Workspace geladen. Ein Arbeits-Skill ist fuer den persoenlichen Agenten nicht verfuegbar. |
| Secrets    | Anmeldedaten sind pro Agent isoliert. Der Support-Agent kann nicht auf Arbeits-API-Schluessel zugreifen. |
| Workspaces | Jeder Agent hat seinen eigenen Dateisystem-Workspace fuer Code-Ausfuehrung.                         |

::: warning Inter-Agent-Kommunikation ist ueber `sessions_send` moeglich, wird aber durch die Policy-Schicht gesteuert. Ein Agent kann nicht stillschweigend auf die Daten oder Sessions eines anderen Agenten zugreifen, ohne explizite Policy-Regeln, die dies erlauben. :::

::: tip Multi-Agent-Routing dient der Trennung von Zustaendigkeiten ueber Kanaele und Personas hinweg. Fuer Agenten, die an einer gemeinsamen Aufgabe zusammenarbeiten muessen, siehe [Agenten-Teams](/de-DE/features/agent-teams). :::

## Standard-Agent

Wenn keine Routing-Regel auf eine eingehende Nachricht zutrifft, geht sie an den Standard-Agenten. Sie koennen dies in der Konfiguration festlegen:

```yaml
agents:
  default: personal
```

Wenn kein Standard konfiguriert ist, wird der erste Agent in der Liste als Standard verwendet.
