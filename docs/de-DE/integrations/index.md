# Integrationen erstellen

Triggerfish ist fuer Erweiterbarkeit konzipiert. Ob Sie eine neue Datenquelle verbinden, einen Workflow automatisieren, Ihrem Agenten neue Skills geben oder auf externe Ereignisse reagieren moechten -- es gibt einen klar definierten Integrationspfad, und jeder Pfad respektiert dasselbe Sicherheitsmodell.

## Integrationspfade

Triggerfish bietet fuenf verschiedene Wege, die Plattform zu erweitern. Jeder dient einem anderen Zweck, aber alle teilen dieselben Sicherheitsgarantien: Klassifizierungsdurchsetzung, Taint-Tracking, Policy-Hooks und vollstaendiges Audit-Logging.

| Pfad                                   | Zweck                                            | Am besten fuer                                                                        |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)           | Externe Tool-Server verbinden                    | Standardisierte Agent-zu-Tool-Kommunikation ueber das Model Context Protocol          |
| [Plugin SDK](./plugins)                | Sandboxed benutzerdefinierten Code ausfuehren    | CRUD-Operationen auf externen Systemen, komplexe Datentransformationen, Workflows     |
| [Exec-Umgebung](./exec-environment)    | Agent schreibt und fuehrt eigenen Code aus       | Integrationen erstellen, Prototyping, Testen und Iterieren in einer Feedback-Schleife |
| [Skills](./skills)                     | Dem Agenten neue Faehigkeiten per Anweisungen geben | Wiederverwendbare Verhaltensweisen, Community-Marktplatz, Agenten-Selbsterstellung |
| [Browser-Automatisierung](./browser)   | Browser-Instanz ueber CDP steuern               | Web-Recherche, Formular-Ausfuellung, Scraping, automatisierte Web-Workflows           |
| [Webhooks](./webhooks)                 | Eingehende Ereignisse von externen Diensten empfangen | Echtzeit-Reaktionen auf E-Mails, Alerts, CI/CD-Ereignisse, Kalenderaenderungen  |
| [GitHub](./github)                     | Vollstaendige GitHub-Workflow-Integration         | PR-Review-Schleifen, Issue-Triage, Branch-Management ueber Webhooks + Exec + Skills  |
| [Google Workspace](./google-workspace) | Gmail, Calendar, Tasks, Drive, Sheets verbinden  | Gebundelte OAuth2-Integration mit 14 Tools fuer Google Workspace                      |
| [Obsidian](./obsidian)                 | Obsidian-Vault-Notizen lesen, schreiben und durchsuchen | Klassifizierungsgesteuerter Notizzugang mit Ordner-Zuordnungen, Wikilinks, Tagesnotizen |

## Sicherheitsmodell

Jede Integration -- unabhaengig vom Pfad -- operiert unter denselben Sicherheitsbeschraenkungen.

### Alles beginnt als UNTRUSTED

Neue MCP-Server, Plugins, Kanaele und Webhook-Quellen haben standardmaessig den Status `UNTRUSTED`. Sie koennen keine Daten mit dem Agenten austauschen, bis sie explizit vom Eigentuemer (persoenliche Stufe) oder Administrator (Enterprise-Stufe) klassifiziert werden.

```
UNTRUSTED  -->  CLASSIFIED  (nach Ueberpruefung, Klassifizierungsstufe zugewiesen)
UNTRUSTED  -->  BLOCKED     (explizit verboten)
```

### Klassifizierung fliesst durch

Wenn eine Integration Daten zurueckgibt, tragen diese Daten eine Klassifizierungsstufe. Der Zugriff auf klassifizierte Daten eskaliert den Session-Taint entsprechend. Einmal getaintet, kann die Session nicht an ein Ziel niedrigerer Klassifizierung ausgeben. Dies ist die [No-Write-Down-Regel](/de-DE/security/no-write-down) -- sie ist fest und kann nicht ueberschrieben werden.

### Policy-Hooks setzen an jeder Grenze durch

Alle Integrationsaktionen durchlaufen deterministische Policy-Hooks:

| Hook                    | Wann er ausloest                                                              |
| ----------------------- | ----------------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | Externe Daten treten in den Agentenkontext ein (Webhooks, Plugin-Antworten)   |
| `PRE_TOOL_CALL`         | Agent fordert einen Tool-Aufruf an (MCP, Exec, Browser)                      |
| `POST_TOOL_RESPONSE`    | Tool gibt Daten zurueck (Antwort klassifizieren, Taint aktualisieren)         |
| `PRE_OUTPUT`            | Antwort verlaesst das System (abschliessende Klassifizierungspruefung)        |

Diese Hooks sind reine Funktionen -- keine LLM-Aufrufe, keine Zufaelligkeit, kein Bypass. Gleiche Eingabe produziert immer dieselbe Entscheidung.

### Audit-Trail

Jede Integrationsaktion wird protokolliert: was aufgerufen wurde, wer es aufgerufen hat, wie die Policy-Entscheidung war und wie sich der Session-Taint geaendert hat. Dieser Audit-Trail ist unveraenderlich und fuer Compliance-Ueberpruefungen verfuegbar.

::: warning SICHERHEIT Das LLM kann Policy-Hook-Entscheidungen nicht umgehen, modifizieren oder beeinflussen. Hooks laufen im Code unterhalb der LLM-Schicht. Die KI fordert Aktionen an -- die Policy-Schicht entscheidet. :::

## Den richtigen Pfad waehlen

Verwenden Sie diesen Entscheidungsleitfaden, um den Integrationspfad zu waehlen, der zu Ihrem Anwendungsfall passt:

- **Sie moechten einen Standard-Tool-Server verbinden** -- Verwenden Sie das [MCP Gateway](./mcp-gateway). Wenn ein Tool MCP spricht, ist dies der Weg.
- **Sie muessen benutzerdefinierten Code gegen eine externe API ausfuehren** -- Verwenden Sie das [Plugin SDK](./plugins). Plugins laufen in einer doppelten Sandbox mit strikter Isolation.
- **Sie moechten, dass der Agent Code baut und daran iteriert** -- Verwenden Sie die [Exec-Umgebung](./exec-environment). Der Agent erhaelt einen Workspace mit einer vollstaendigen Schreiben/Ausfuehren/Reparieren-Schleife.
- **Sie moechten dem Agenten ein neues Verhalten beibringen** -- Verwenden Sie [Skills](./skills). Schreiben Sie ein `SKILL.md` mit Anweisungen, oder lassen Sie den Agenten sein eigenes erstellen.
- **Sie muessen Web-Interaktionen automatisieren** -- Verwenden Sie [Browser-Automatisierung](./browser). CDP-gesteuertes Chromium mit Domain-Policy-Durchsetzung.
- **Sie muessen in Echtzeit auf externe Ereignisse reagieren** -- Verwenden Sie [Webhooks](./webhooks). Eingehende Ereignisse werden verifiziert, klassifiziert und an den Agenten weitergeleitet.

::: tip Diese Pfade schliessen sich nicht gegenseitig aus. Ein Skill koennte intern Browser-Automatisierung verwenden. Ein Plugin koennte durch einen Webhook ausgeloest werden. Eine vom Agenten erstellte Integration in der Exec-Umgebung kann als Skill persistiert werden. Sie komponieren sich natuerlich. :::
