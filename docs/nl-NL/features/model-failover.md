# LLM-providers en failover

Triggerfish ondersteunt meerdere LLM-providers met automatische failover, per-agent modelkeuze en modelwisseling op sessieniveau. Geen lock-in aan één provider.

## Ondersteunde providers

| Provider   | Auth      | Modellen                   | Opmerkingen                               |
| ---------- | --------- | -------------------------- | ----------------------------------------- |
| Anthropic  | API-sleutel | Claude Opus, Sonnet, Haiku | Standaard Anthropic API                  |
| OpenAI     | API-sleutel | GPT-4o, o1, o3             | Standaard OpenAI API                     |
| Google     | API-sleutel | Gemini Pro, Flash          | Google AI Studio API                     |
| Local      | Geen      | Llama, Mistral, enz.       | Ollama-compatibel, OpenAI-formaat        |
| OpenRouter | API-sleutel | Elk model op OpenRouter    | Uniforme toegang tot veel providers      |
| Z.AI       | API-sleutel | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-compatibel      |

## LlmProvider-interface

Alle providers implementeren dezelfde interface:

```typescript
interface LlmProvider {
  /** Genereer een voltooiing vanuit een berichtengeschiedenis. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Stream een voltooiing token voor token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Of deze provider tool/functieaanroepen ondersteunt. */
  supportsTools: boolean;

  /** De modelidentificatie (bijv. "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Dit betekent dat u van provider kunt wisselen zonder applicatielogica te wijzigen. De agentlus en alle toolorkestratie werken identiek ongeacht welke provider actief is.

## Configuratie

### Basisinstallatie

Configureer uw primaire model en providerinloggegevens in `triggerfish.yaml`:

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
      baseUrl: "http://localhost:11434/v1" # Ollama standaard
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Failover-keten

De FailoverChain biedt automatische terugval wanneer een provider niet beschikbaar is. Configureer een geordende lijst van terugvalmodellen:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Eerste terugval
    - gpt-4o # Tweede terugval
    - ollama/llama3 # Lokale terugval (geen internet vereist)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Wanneer het primaire model mislukt vanwege een geconfigureerde conditie (snelheidslimiet, serverfout of time-out), probeert Triggerfish automatisch de volgende provider in de keten. Dit gebeurt transparant — het gesprek gaat door zonder onderbreking.

### Failover-condities

| Conditie       | Beschrijving                                          |
| -------------- | ----------------------------------------------------- |
| `rate_limited` | Provider geeft een 429-snelheidslimiereactie          |
| `server_error` | Provider geeft een 5xx-serverfout                     |
| `timeout`      | Verzoek overschrijdt de geconfigureerde time-out      |

## Per-agent modelkeuze

In een [multi-agent setup](./multi-agent) kan elke agent een ander model gebruiken dat is geoptimaliseerd voor zijn rol:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Beste redenering voor onderzoek
    - id: quick-tasks
      model: claude-haiku-4-5 # Snel en goedkoop voor eenvoudige taken
    - id: coding
      model: claude-sonnet-4-5 # Goede balans voor code
```

## Modelwisseling op sessieniveau

De agent kan mid-sessie van model wisselen voor kostenoptimalisatie. Gebruik een snel model voor eenvoudige vragen en escaleer naar een capabeler model voor complexe redenering. Dit is beschikbaar via de `session_status`-tool.

## Snelheidsbegrenzing

Triggerfish bevat een ingebouwde schuifvenster-snelheidsbegrenzer die voorkomt dat API-limieten van providers worden bereikt. De begrenzer omhult elke provider transparant — het bijhoudt tokens-per-minuut (TPM) en verzoeken-per-minuut (RPM) in een schuifvenster en vertraagt aanroepen wanneer limieten worden benaderd.

Snelheidsbegrenzing werkt samen met failover: als de snelheidslimiet van een provider is uitgeput en de begrenzer niet kan wachten binnen de time-out, activeert de failover-keten en probeert de volgende provider.

Zie [Snelheidsbegrenzing](/nl-NL/features/rate-limiting) voor volledige details inclusief OpenAI-tierlimieten.

::: info API-sleutels worden nooit opgeslagen in configuratiebestanden. Gebruik uw OS-sleutelhanger via `triggerfish config set-secret`. Zie het [Beveiligingsmodel](/nl-NL/security/) voor details over geheimenbeheer. :::
