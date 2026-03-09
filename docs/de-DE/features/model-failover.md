# LLM-Anbieter und Failover

Triggerfish unterstuetzt mehrere LLM-Anbieter mit automatischem Failover, Modellauswahl pro Agent und Modellwechsel auf Session-Ebene. Keine Bindung an einen einzelnen Anbieter.

## Unterstuetzte Anbieter

| Anbieter   | Auth    | Modelle                    | Hinweise                            |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | Standard Anthropic API              |
| OpenAI     | API key | GPT-4o, o1, o3             | Standard OpenAI API                 |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                |
| Local      | Keine   | Llama, Mistral usw.        | Ollama-kompatibel, OpenAI-Format    |
| OpenRouter | API key | Jedes Modell auf OpenRouter | Einheitlicher Zugang zu vielen Anbietern |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-kompatibel |

## LlmProvider-Interface

Alle Anbieter implementieren dasselbe Interface:

```typescript
interface LlmProvider {
  /** Generate a completion from a message history. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Stream a completion token-by-token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Whether this provider supports tool/function calling. */
  supportsTools: boolean;

  /** The model identifier (e.g., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Das bedeutet, Sie koennen Anbieter wechseln, ohne Anwendungslogik zu aendern. Die Agenten-Schleife und die gesamte Tool-Orchestrierung funktionieren identisch, unabhaengig davon, welcher Anbieter aktiv ist.

## Konfiguration

### Grundkonfiguration

Konfigurieren Sie Ihr primaeres Modell und die Anbieter-Anmeldedaten in `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Ollama-Standard
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Failover-Kette

Die FailoverChain bietet automatisches Fallback, wenn ein Anbieter nicht verfuegbar ist. Konfigurieren Sie eine geordnete Liste von Fallback-Modellen:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Erstes Fallback
    - gpt-4o # Zweites Fallback
    - ollama/llama3 # Lokales Fallback (kein Internet erforderlich)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Wenn das primaere Modell aufgrund einer konfigurierten Bedingung (Rate-Limiting, Server-Fehler oder Timeout) fehlschlaegt, versucht Triggerfish automatisch den naechsten Anbieter in der Kette. Dies geschieht transparent -- das Gespraech wird ohne Unterbrechung fortgesetzt.

### Failover-Bedingungen

| Bedingung      | Beschreibung                                          |
| -------------- | ----------------------------------------------------- |
| `rate_limited` | Anbieter gibt eine 429-Rate-Limit-Antwort zurueck     |
| `server_error` | Anbieter gibt einen 5xx-Server-Fehler zurueck         |
| `timeout`      | Anfrage ueberschreitet das konfigurierte Timeout       |

## Modellauswahl pro Agent

In einem [Multi-Agent-Setup](./multi-agent) kann jeder Agent ein anderes Modell verwenden, das fuer seine Rolle optimiert ist:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Bestes Reasoning fuer Recherche
    - id: quick-tasks
      model: claude-haiku-4-5 # Schnell und guenstig fuer einfache Aufgaben
    - id: coding
      model: claude-sonnet-4-5 # Gute Balance fuer Code
```

## Modellwechsel auf Session-Ebene

Der Agent kann Modelle waehrend einer Session zur Kostenoptimierung wechseln. Verwenden Sie ein schnelles Modell fuer einfache Abfragen und eskalieren Sie zu einem leistungsfaehigeren Modell fuer komplexes Reasoning. Dies ist ueber das `session_status`-Tool verfuegbar.

## Rate Limiting

Triggerfish enthaelt einen eingebauten Gleitfenster-Rate-Limiter, der das Erreichen von Anbieter-API-Limits verhindert. Der Limiter umschliesst jeden Anbieter transparent -- er verfolgt Tokens-pro-Minute (TPM) und Requests-pro-Minute (RPM) in einem gleitenden Fenster und verzoegert Aufrufe, wenn Limits erreicht werden.

Rate Limiting arbeitet mit Failover zusammen: Wenn das Rate-Limit eines Anbieters erschoepft ist und der Limiter nicht innerhalb des Timeouts warten kann, wird die Failover-Kette aktiviert und versucht den naechsten Anbieter.

Siehe [Rate Limiting](/de-DE/features/rate-limiting) fuer vollstaendige Details einschliesslich OpenAI-Tier-Limits.

::: info API-Schluessel werden niemals in Konfigurationsdateien gespeichert. Verwenden Sie Ihren Betriebssystem-Schluesselbund ueber `triggerfish config set-secret`. Siehe das [Sicherheitsmodell](/de-DE/security/) fuer Details zur Secrets-Verwaltung. :::
