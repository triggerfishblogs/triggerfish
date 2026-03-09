# Rate Limiting

Triggerfish enthaelt einen Gleitfenster-Rate-Limiter, der das Erreichen von LLM-Anbieter-API-Limits verhindert. Er umschliesst jeden Anbieter transparent -- die Agenten-Schleife muss nichts ueber Rate-Limits wissen. Wenn die Kapazitaet erschoepft ist, werden Aufrufe automatisch verzoegert, bis das Fenster weit genug gleitet, um Kapazitaet freizugeben.

## So funktioniert es

Der Rate-Limiter verwendet ein gleitendes Fenster (Standard 60 Sekunden), um zwei Metriken zu verfolgen:

- **Tokens pro Minute (TPM)** -- insgesamt verbrauchte Tokens (Prompt + Completion) innerhalb des Fensters
- **Requests pro Minute (RPM)** -- insgesamt API-Aufrufe innerhalb des Fensters

Vor jedem LLM-Aufruf prueft der Limiter die verfuegbare Kapazitaet gegen beide Limits. Wenn eines erschoepft ist, wartet der Aufruf, bis die aeltesten Eintraege aus dem Fenster gleiten und genug Kapazitaet freigeben. Nach Abschluss jedes Aufrufs wird die tatsaechliche Token-Nutzung aufgezeichnet.

Sowohl Streaming- als auch Nicht-Streaming-Aufrufe verbrauchen aus demselben Budget. Fuer Streaming-Aufrufe wird die Token-Nutzung aufgezeichnet, wenn der Stream beendet ist.

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate-Limiter-Ablauf: Agenten-Schleife --> Rate-Limiter --> Kapazitaetspruefung --> an Anbieter weiterleiten oder warten" style="max-width: 100%;" />

## OpenAI-Tier-Limits

Der Rate-Limiter wird mit eingebauten Standardwerten fuer OpenAIs veroeffentlichte Tier-Limits ausgeliefert:

| Tier   | GPT-4o TPM  | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ----------- | ---------- | ------- | ------ |
| Free   | 30.000      | 500        | 30.000  | 500    |
| Tier 1 | 30.000      | 500        | 30.000  | 500    |
| Tier 2 | 450.000     | 5.000      | 100.000 | 1.000  |
| Tier 3 | 800.000     | 5.000      | 100.000 | 1.000  |
| Tier 4 | 2.000.000   | 10.000     | 200.000 | 10.000 |
| Tier 5 | 30.000.000  | 10.000     | 200.000 | 10.000 |

::: warning Dies sind Standardwerte basierend auf OpenAIs veroeffentlichten Limits. Ihre tatsaechlichen Limits haengen von Ihrem OpenAI-Konto-Tier und Ihrer Nutzungshistorie ab. Andere Anbieter (Anthropic, Google) verwalten ihre eigenen Rate-Limits serverseitig -- der Limiter ist am nuetzlichsten fuer OpenAI, wo clientseitige Drosselung 429-Fehler verhindert. :::

## Konfiguration

Rate Limiting ist automatisch bei Verwendung des umschlossenen Anbieters. Keine Benutzerkonfiguration ist fuer das Standardverhalten erforderlich. Der Limiter erkennt Ihren Anbieter und wendet die entsprechenden Limits an.

Fortgeschrittene Benutzer koennen Limits ueber die Anbieter-Konfiguration in `triggerfish.yaml` anpassen:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens pro Minute
        rpm: 5000 # Requests pro Minute
        window_ms: 60000 # Fenstergroesse (Standard 60s)
```

::: info Rate Limiting schuetzt Sie vor 429-Fehlern und unerwarteten Rechnungen. Es arbeitet mit der Failover-Kette zusammen -- wenn Rate-Limits erreicht werden und der Limiter nicht warten kann (Timeout), greift Failover ein, um den naechsten Anbieter zu versuchen. :::

## Nutzung ueberwachen

Der Rate-Limiter bietet einen Live-Snapshot der aktuellen Nutzung:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

Der Kontextfortschrittsbalken im CLI und Tide Pool zeigt die Kontext-Nutzung an. Der Rate-Limit-Status ist in Debug-Logs sichtbar:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Wenn der Limiter einen Aufruf verzoegert, protokolliert er die Wartezeit:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Kanal-Rate-Limiting

Zusaetzlich zum LLM-Anbieter-Rate-Limiting setzt Triggerfish kanalspezifische Nachrichten-Rate-Limits durch, um das Ueberfluten von Messaging-Plattformen zu verhindern. Jeder Kanal-Adapter verfolgt die ausgehende Nachrichtenfrequenz und verzoegert Sendungen, wenn Limits erreicht werden.

Dies schuetzt vor:

- Plattform-API-Sperren durch uebermassiges Nachrichtenvolumen
- Versehentlichem Spam durch entlaufene Agenten-Schleifen
- Webhook-ausgeloesten Nachrichten-Stuermen

Kanal-Rate-Limits werden transparent durch den Kanal-Router durchgesetzt. Wenn der Agent Ausgaben schneller generiert, als der Kanal erlaubt, werden Nachrichten in die Warteschlange gestellt und mit der maximal erlaubten Rate zugestellt.

## Verwandt

- [LLM-Anbieter und Failover](/de-DE/features/model-failover) -- Failover-Ketten-Integration mit Rate Limiting
- [Konfiguration](/de-DE/guide/configuration) -- Vollstaendiges `triggerfish.yaml`-Schema
