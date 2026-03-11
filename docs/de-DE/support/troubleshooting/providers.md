# Fehlerbehebung: LLM-Provider

## Haeufige Provider-Fehler

### 401 Unauthorized / 403 Forbidden

Ihr API-Schluessel ist ungueltig, abgelaufen oder hat nicht ausreichende Berechtigungen.

**Loesung:**

```bash
# API-Schluessel erneut speichern
triggerfish config set-secret provider:<name>:apiKey <ihr-schluessel>

# Daemon neu starten
triggerfish stop && triggerfish start
```

Provider-spezifische Hinweise:

| Provider | Schluesselformat | Wo zu bekommen |
|----------|-----------------|----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Sie haben das Rate-Limit des Providers ueberschritten. Triggerfish wiederholt bei 429 nicht automatisch fuer die meisten Provider (ausser Notion, das eingebautes Backoff hat).

**Loesung:** Warten Sie und versuchen Sie es erneut. Wenn Sie konsistent Rate-Limits erreichen, erwaegen Sie:
- Upgrade Ihres API-Plans fuer hoehere Limits
- Hinzufuegen eines Failover-Providers, damit Anfragen weitergeleitet werden, wenn der primaere gedrosselt wird
- Reduzierung der Trigger-Frequenz, wenn geplante Aufgaben die Ursache sind

### 500 / 502 / 503 Server Error

Die Server des Providers haben Probleme. Diese sind typischerweise voruebergehend.

Wenn Sie eine Failover-Kette konfiguriert haben, versucht Triggerfish automatisch den naechsten Provider. Ohne Failover wird der Fehler an den Benutzer weitergegeben.

### "No response body for streaming"

Der Provider hat die Anfrage akzeptiert, aber einen leeren Antwortkoerper fuer einen Streaming-Aufruf zurueckgegeben. Dies kann passieren, wenn:

- Die Infrastruktur des Providers ueberlastet ist
- Ein Proxy oder eine Firewall den Antwortkoerper entfernt
- Das Modell voruebergehend nicht verfuegbar ist

Dies betrifft: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider-spezifische Probleme

### Anthropic

**Tool-Format-Konvertierung.** Triggerfish konvertiert zwischen dem internen Tool-Format und Anthropics nativem Tool-Format. Wenn Sie Tool-bezogene Fehler sehen, pruefen Sie, ob Ihre Tool-Definitionen gueltiges JSON Schema haben.

**System-Prompt-Behandlung.** Anthropic erfordert den System-Prompt als separates Feld, nicht als Nachricht. Diese Konvertierung erfolgt automatisch, aber wenn Sie "system"-Nachrichten in der Konversation erscheinen sehen, stimmt etwas mit der Nachrichtenformatierung nicht.

### OpenAI

**Frequency Penalty.** Triggerfish wendet eine 0.3 Frequency Penalty auf alle OpenAI-Anfragen an, um repetitive Ausgabe zu verhindern. Dies ist fest codiert und kann nicht ueber die Konfiguration geaendert werden.

**Bildunterstuetzung.** OpenAI unterstuetzt base64-kodierte Bilder im Nachrichteninhalt. Wenn Vision nicht funktioniert, stellen Sie sicher, dass ein visionsfaehiges Modell konfiguriert ist (z.B. `gpt-4o`, nicht `gpt-4o-mini`).

### Google Gemini

**Schluessel im Query-String.** Im Gegensatz zu anderen Providern verwendet Google den API-Schluessel als Query-Parameter, nicht als Header. Dies wird automatisch behandelt, bedeutet aber, dass der Schluessel in Proxy-/Zugriffsprotokollen erscheinen kann, wenn Sie ueber einen Firmenproxy routen.

### Ollama / LM Studio (Lokal)

**Server muss laufen.** Lokale Provider erfordern, dass der Modellserver laeuft, bevor Triggerfish startet. Wenn Ollama oder LM Studio nicht laeuft:

```
Local LLM request failed (connection refused)
```

**Server starten:**

```bash
# Ollama
ollama serve

# LM Studio
# Oeffnen Sie LM Studio und starten Sie den lokalen Server
```

**Modell nicht geladen.** Bei Ollama muss das Modell zuerst heruntergeladen werden:

```bash
ollama pull llama3.3:70b
```

**Endpunkt-Override.** Wenn Ihr lokaler Server nicht auf dem Standard-Port laeuft:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama-Standard
      # endpoint: "http://localhost:1234"  # LM-Studio-Standard
```

### Fireworks

**Native API.** Triggerfish verwendet die native API von Fireworks, nicht deren OpenAI-kompatiblen Endpunkt. Modell-IDs koennen sich von dem unterscheiden, was Sie in der OpenAI-kompatiblen Dokumentation sehen.

**Modell-ID-Formate.** Fireworks akzeptiert mehrere Modell-ID-Muster. Der Wizard normalisiert gaengige Formate, aber wenn die Verifizierung fehlschlaegt, pruefen Sie die [Fireworks-Modellbibliothek](https://fireworks.ai/models) fuer die genaue ID.

### OpenRouter

**Modell-Routing.** OpenRouter routet Anfragen an verschiedene Provider. Fehler vom zugrunde liegenden Provider werden in OpenRouters Fehlerformat eingewickelt. Die tatsaechliche Fehlermeldung wird extrahiert und angezeigt.

**API-Fehlerformat.** OpenRouter gibt Fehler als JSON-Objekte zurueck. Wenn die Fehlermeldung generisch erscheint, wird der Roh-Fehler auf DEBUG-Level protokolliert.

### ZenMux / Z.AI

**Streaming-Unterstuetzung.** Beide Provider unterstuetzen Streaming. Wenn Streaming fehlschlaegt:

```
ZenMux stream failed (status): error text
```

Pruefen Sie, ob Ihr API-Schluessel Streaming-Berechtigungen hat (einige API-Tarife beschraenken den Streaming-Zugriff).

---

## Failover

### Wie Failover funktioniert

Wenn der primaere Provider fehlschlaegt, versucht Triggerfish jedes Modell in der `failover`-Liste der Reihe nach:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Wenn ein Failover-Provider erfolgreich ist, wird die Antwort mit dem verwendeten Provider protokolliert. Wenn alle Provider fehlschlagen, wird der letzte Fehler an den Benutzer zurueckgegeben.

### "All providers exhausted"

Jeder Provider in der Kette ist fehlgeschlagen. Pruefen Sie:

1. Sind alle API-Schluessel gueltig? Testen Sie jeden Provider einzeln.
2. Haben alle Provider Ausfaelle? Pruefen Sie deren Statusseiten.
3. Blockiert Ihr Netzwerk ausgehende HTTPS-Verbindungen zu einem der Provider-Endpunkte?

### Failover-Konfiguration

```yaml
models:
  failover_config:
    max_retries: 3          # Versuche pro Provider vor dem Wechsel zum naechsten
    retry_delay_ms: 1000    # Basisverzoegerung zwischen Versuchen
    conditions:             # Welche Fehler Failover ausloesen
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

Der Provider-Name in `models.primary.provider` stimmt mit keinem konfigurierten Provider in `models.providers` ueberein. Pruefen Sie auf Tippfehler.

### "Classification model provider not configured"

Sie haben ein `classification_models`-Override gesetzt, das einen Provider referenziert, der nicht in `models.providers` vorhanden ist:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Dieser Provider muss in models.providers existieren
      model: llama3.3:70b
  providers:
    # "local" muss hier definiert sein
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Wiederholungsverhalten

Triggerfish wiederholt Provider-Anfragen bei voruebergehenden Fehlern (Netzwerk-Timeouts, 5xx-Antworten). Die Wiederholungslogik:

1. Wartet mit exponentiellem Backoff zwischen Versuchen
2. Protokolliert jeden Wiederholungsversuch auf WARN-Level
3. Nach Erschoepfung der Wiederholungsversuche fuer einen Provider wechselt zum naechsten in der Failover-Kette
4. Streaming-Verbindungen haben separate Wiederholungslogik fuer Verbindungsaufbau vs. Fehler waehrend des Streams

Sie koennen Wiederholungsversuche in den Logs sehen:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
