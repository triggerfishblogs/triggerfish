# LLM-leverantörer och felöver

Triggerfish stöder flera LLM-leverantörer med automatisk felöver, per-agent modellval och session-nivå modellbyte. Ingen inlåsning till en enda leverantör.

## Stödda leverantörer

| Leverantör | Autentisering | Modeller                   | Noteringar                                    |
| ---------- | ------------- | -------------------------- | --------------------------------------------- |
| Anthropic  | API-nyckel    | Claude Opus, Sonnet, Haiku | Standard Anthropic API                        |
| OpenAI     | API-nyckel    | GPT-4o, o1, o3             | Standard OpenAI API                           |
| Google     | API-nyckel    | Gemini Pro, Flash          | Google AI Studio API                          |
| Lokal      | Ingen         | Llama, Mistral, etc.       | Ollama-kompatibel, OpenAI-format              |
| OpenRouter | API-nyckel    | Alla modeller på OpenRouter | Enhetlig åtkomst till många leverantörer     |
| Z.AI       | API-nyckel    | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-kompatibel           |

## LlmProvider-gränssnittet

Alla leverantörer implementerar samma gränssnitt:

```typescript
interface LlmProvider {
  /** Generera en komplettering från en meddelandehistorik. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Strömma en komplettering token-för-token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Om den här leverantören stöder verktyg/funktionsanrop. */
  supportsTools: boolean;

  /** Modellidentifieraren (t.ex. "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Det innebär att du kan byta leverantörer utan att ändra någon applikationslogik. Agentslingan och all verktygsorkestrering fungerar identiskt oavsett vilken leverantör som är aktiv.

## Konfiguration

### Grundläggande installation

Konfigurera din primärmodell och leverantörsuppgifter i `triggerfish.yaml`:

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

### Felöverkedja

FailoverChain tillhandahåller automatisk återgång när en leverantör är otillgänglig. Konfigurera en ordnad lista med reservmodeller:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Första reserv
    - gpt-4o # Andra reserv
    - ollama/llama3 # Lokal reserv (ingen internet krävs)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

När primärmodellen misslyckas på grund av ett konfigurerat tillstånd (hastighetsbegränsning, serverfel eller timeout) provar Triggerfish automatiskt nästa leverantör i kedjan. Det sker transparent — konversationen fortsätter utan avbrott.

### Felövertillstånd

| Tillstånd      | Beskrivning                                      |
| -------------- | ------------------------------------------------ |
| `rate_limited` | Leverantören returnerar ett 429 rate limit-svar  |
| `server_error` | Leverantören returnerar ett 5xx serverfel        |
| `timeout`      | Förfrågan överstiger den konfigurerade timeoutgränsen |

## Per-agent modellval

I en [multi-agentuppsättning](./multi-agent) kan varje agent använda en annan modell optimerad för sin roll:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Bäst resonerande för undersökning
    - id: quick-tasks
      model: claude-haiku-4-5 # Snabb och billig för enkla uppgifter
    - id: coding
      model: claude-sonnet-4-5 # Bra balans för kod
```

## Session-nivå modellbyte

Agenten kan byta modeller mitt i en session för kostnadsoptimering. Använd en snabb modell för enkla frågor och eskalera till en mer kapabel modell för komplexa resonemang. Det här är tillgängligt via verktyget `session_status`.

## Hastighetsbegränsning

Triggerfish inkluderar en inbyggd glidande fönster-hastighetsbegränsare som förhindrar att leverantörers API-gränser nås. Begränsaren omsluter valfri leverantör transparent — den spårar tokens-per-minut (TPM) och förfrågningar-per-minut (RPM) i ett glidande fönster och fördröjer anrop när gränser nås.

Hastighetsbegränsning fungerar tillsammans med felöver: om en leverantörs hastighetsgräns är uttömd och begränsaren inte kan vänta inom timeout, aktiveras felöverkedjan och provar nästa leverantör.

Se [Hastighetsbegränsning](/sv-SE/features/rate-limiting) för fullständiga detaljer inklusive OpenAI-nivåbegränsningar.

::: info API-nycklar lagras aldrig i konfigurationsfiler. Använd din OS-nyckelring via `triggerfish config set-secret`. Se [Säkerhetsmodellen](/sv-SE/security/) för detaljer om hemlighethantering. :::
