# LLM-leverandører og failover

Triggerfish støtter flere LLM-leverandører med automatisk failover, per-agent
modellvalg og sesjons-nivå modellbytte. Ingen innlåsing hos enkelt leverandør.

## Støttede leverandører

| Leverandør | Autentisering | Modeller                    | Merknader                                   |
| ---------- | ------------- | --------------------------- | ------------------------------------------- |
| Anthropic  | API-nøkkel    | Claude Opus, Sonnet, Haiku  | Standard Anthropic API                      |
| OpenAI     | API-nøkkel    | GPT-4o, o1, o3              | Standard OpenAI API                         |
| Google     | API-nøkkel    | Gemini Pro, Flash           | Google AI Studio API                        |
| Local      | Ingen         | Llama, Mistral, osv.        | Ollama-kompatibel, OpenAI-format            |
| OpenRouter | API-nøkkel    | Alle modeller på OpenRouter | Samlet tilgang til mange leverandører       |
| Z.AI       | API-nøkkel    | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-kompatibel         |

## LlmProvider-grensesnitt

Alle leverandører implementerer det samme grensesnittet:

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

Dette betyr at du kan bytte leverandører uten å endre noen applikasjonslogikk.
Agentløkken og all verktøyorkestrering fungerer identisk uavhengig av hvilken
leverandør som er aktiv.

## Konfigurasjon

### Grunnleggende oppsett

Konfigurer din primærmodell og leverandørlegitimasjon i `triggerfish.yaml`:

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
      baseUrl: "http://localhost:11434/v1" # Ollama standard
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Failover-kjede

FailoverChain gir automatisk tilbakefall når en leverandør er utilgjengelig.
Konfigurer en ordnet liste over reservemodeller:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Første reserve
    - gpt-4o # Andre reserve
    - ollama/llama3 # Lokal reserve (krever ikke internett)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Når primærmodellen feiler på grunn av en konfigurert betingelse (hastighetsbegrensning,
serverfeil eller tidsavbrudd), prøver Triggerfish automatisk neste leverandør i
kjeden. Dette skjer transparent — samtalen fortsetter uten avbrudd.

### Failover-betingelser

| Betingelse     | Beskrivelse                                        |
| -------------- | -------------------------------------------------- |
| `rate_limited` | Leverandøren returnerer et 429 hastighetsbegrenset svar |
| `server_error` | Leverandøren returnerer en 5xx-serverfeil          |
| `timeout`      | Forespørselen overskrider det konfigurerte tidsavbruddet |

## Per-agent modellvalg

I et [multi-agent-oppsett](./multi-agent) kan hver agent bruke en annen modell
optimalisert for rollen sin:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Beste resonnering for forskning
    - id: quick-tasks
      model: claude-haiku-4-5 # Rask og billig for enkle oppgaver
    - id: coding
      model: claude-sonnet-4-5 # God balanse for kode
```

## Sesjons-nivå modellbytte

Agenten kan bytte modeller midt i en sesjon for kostnadsoptimalisering. Bruk en
rask modell for enkle spørringer og eskaler til en mer kapabel modell for
kompleks resonnering. Dette er tilgjengelig via `session_status`-verktøyet.

## Hastighetsbegrensning

Triggerfish inkluderer en innebygd glidende-vindu hastighetsbegrenser som
forhindrer å treffe leverandørens API-grenser. Begrenseren omslutter enhver
leverandør transparent — den sporer tokens-per-minutt (TPM) og
forespørsler-per-minutt (RPM) i et glidende vindu og forsinker kall når grenser
nærmes.

Hastighetsbegrensning fungerer sammen med failover: hvis en leverandørs
hastighetsbegrensning er oppbrukt og begrenseren ikke kan vente innenfor
tidsavbruddet, aktiveres failover-kjeden og prøver neste leverandør.

Se [Hastighetsbegrensning](/nb-NO/features/rate-limiting) for fullstendige detaljer
inkludert OpenAI-tiernivågrenser.

::: info API-nøkler lagres aldri i konfigurasjonsfiler. Bruk OS-nøkkelringen
via `triggerfish config set-secret`. Se [Sikkerhetsmodellen](/nb-NO/security/)
for detaljer om hemmelighetsadministrasjon. :::
