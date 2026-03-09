# Provider LLM e Failover

Triggerfish supporta provider LLM multipli con failover automatico, selezione
del modello per agent e cambio di modello a livello di sessione. Nessun
lock-in su un singolo provider.

## Provider Supportati

| Provider   | Auth        | Modelli                    | Note                                 |
| ---------- | ----------- | -------------------------- | ------------------------------------ |
| Anthropic  | Chiave API  | Claude Opus, Sonnet, Haiku | API Anthropic standard               |
| OpenAI     | Chiave API  | GPT-4o, o1, o3             | API OpenAI standard                  |
| Google     | Chiave API  | Gemini Pro, Flash          | API Google AI Studio                 |
| Local      | Nessuna     | Llama, Mistral, ecc.       | Compatibile Ollama, formato OpenAI   |
| OpenRouter | Chiave API  | Qualsiasi modello su OpenRouter | Accesso unificato a molti provider |
| Z.AI       | Chiave API  | GLM-4.7, GLM-4.5, GLM-5   | Z.AI Coding Plan, compatibile OpenAI |

## Interfaccia LlmProvider

Tutti i provider implementano la stessa interfaccia:

```typescript
interface LlmProvider {
  /** Generare un completamento da una cronologia di messaggi. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Fare streaming di un completamento token per token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Se questo provider supporta la chiamata a tool/funzioni. */
  supportsTools: boolean;

  /** L'identificatore del modello (es. "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Questo significa che è possibile cambiare provider senza modificare alcuna
logica dell'applicazione. Il ciclo dell'agent e tutta l'orchestrazione dei tool
funzionano in modo identico indipendentemente dal provider attivo.

## Configurazione

### Configurazione Base

Configurare il modello primario e le credenziali dei provider in
`triggerfish.yaml`:

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
      baseUrl: "http://localhost:11434/v1" # Predefinito Ollama
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Catena di Failover

La FailoverChain fornisce un fallback automatico quando un provider non è
disponibile. Configurare una lista ordinata di modelli di fallback:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Primo fallback
    - gpt-4o # Secondo fallback
    - ollama/llama3 # Fallback locale (non richiede internet)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Quando il modello primario fallisce a causa di una condizione configurata
(limitazione di frequenza, errore del server o timeout), Triggerfish prova
automaticamente il provider successivo nella catena. Questo avviene in modo
trasparente -- la conversazione continua senza interruzione.

### Condizioni di Failover

| Condizione     | Descrizione                                       |
| -------------- | ------------------------------------------------- |
| `rate_limited` | Il provider restituisce una risposta 429 di limite |
| `server_error` | Il provider restituisce un errore 5xx del server  |
| `timeout`      | La richiesta supera il timeout configurato        |

## Selezione del Modello per Agent

In una [configurazione multi-agent](./multi-agent), ogni agent può usare un
modello diverso ottimizzato per il suo ruolo:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Miglior ragionamento per la ricerca
    - id: quick-tasks
      model: claude-haiku-4-5 # Veloce e economico per attività semplici
    - id: coding
      model: claude-sonnet-4-5 # Buon equilibrio per il codice
```

## Cambio di Modello a Livello di Sessione

L'agent può cambiare modello durante la sessione per l'ottimizzazione dei costi.
Utilizzare un modello veloce per query semplici e passare a un modello più
capace per ragionamenti complessi. Questo è disponibile tramite il tool
`session_status`.

## Limitazione della Frequenza

Triggerfish include un limitatore di frequenza a finestra scorrevole integrato
che previene il raggiungimento dei limiti API dei provider. Il limitatore avvolge
qualsiasi provider in modo trasparente -- traccia i token al minuto (TPM) e le
richieste al minuto (RPM) in una finestra scorrevole e ritarda le chiamate
quando i limiti vengono raggiunti.

La limitazione della frequenza funziona insieme al failover: se il limite di
frequenza di un provider è esaurito e il limitatore non può attendere entro il
timeout, la catena di failover si attiva e prova il provider successivo.

Consultare [Limitazione della Frequenza](/it-IT/features/rate-limiting) per i
dettagli completi inclusi i limiti dei tier OpenAI.

::: info Le chiavi API non vengono mai archiviate nei file di configurazione.
Utilizzare il portachiavi del SO tramite `triggerfish config set-secret`.
Consultare il [Modello di Sicurezza](/it-IT/security/) per i dettagli sulla
gestione dei secret. :::
