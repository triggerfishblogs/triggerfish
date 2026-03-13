# Felsökning: LLM-leverantörer

## Vanliga leverantörsfel

### 401 Unauthorized / 403 Forbidden

Din API-nyckel är ogiltig, utgången eller saknar tillräckliga behörigheter.

**Åtgärd:**

```bash
# Lagra om API-nyckeln
triggerfish config set-secret provider:<namn>:apiKey <din-nyckel>

# Starta om daemonen
triggerfish stop && triggerfish start
```

Leverantörsspecifika noteringar:

| Leverantör | Nyckelformat | Var du hämtar den |
|------------|-------------|-------------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Hastighetsbegränsad

Du har överskridit leverantörens hastighetsgräns. Triggerfish gör inte automatiska återförsök vid 429 för de flesta leverantörer (förutom Notion, som har inbyggd backoff).

**Åtgärd:** Vänta och försök igen. Om du konsekvent når hastighetsgränserna, överväg:
- Uppgradera din API-plan för högre gränser
- Lägga till en failover-leverantör så att förfrågningar faller igenom när den primära är begränsad
- Minska triggerfrekvensen om schemalagda uppgifter är orsaken

### 500 / 502 / 503 Serverfel

Leverantörens servrar upplever problem. Dessa är vanligtvis övergående.

Om du har en failover-kedja konfigurerad provar Triggerfish nästa leverantör automatiskt. Utan failover sprids felet till användaren.

### "No response body for streaming"

Leverantören accepterade förfrågan men returnerade en tom svarstropp för ett streamingsamtal. Det kan hända när:

- Leverantörens infrastruktur är överbelastad
- En proxy eller brandvägg strippar svarstroppen
- Modellen tillfälligt inte är tillgänglig

Det påverkar: OpenRouter, Lokala (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Leverantörsspecifika problem

### Anthropic

**Verktygsformatkonvertering.** Triggerfish konverterar mellan internt verktygsformat och Anthropics eget verktygsformat. Om du ser verktygsrelaterade fel, kontrollera att dina verktygsdefintioner har giltig JSON Schema.

**Systemprompthantering.** Anthropic kräver systemprompt som ett separat fält, inte som ett meddelande. Den här konverteringen är automatisk, men om du ser "system"-meddelanden som visas i konversationen är något fel med meddelandeformateringen.

### OpenAI

**Frekvensstraff.** Triggerfish tillämpar ett 0,3 frekvensstraff på alla OpenAI-förfrågningar för att motverka repetitiv utdata. Det är hårdkodat och kan inte ändras via konfigurationen.

**Bildstöd.** OpenAI stöder base64-kodade bilder i meddelandeinnehåll. Om vision inte fungerar, se till att du har en visionförmögen modell konfigurerad (t.ex. `gpt-4o`, inte `gpt-4o-mini`).

### Google Gemini

**Nyckel i frågeparameter.** Till skillnad från andra leverantörer använder Google API-nyckeln som en frågeparameter, inte en header. Det hanteras automatiskt, men det innebär att nyckeln kan visas i proxy/åtkomstloggar om du dirigerar via en företagsproxy.

### Ollama / LM Studio (Lokalt)

**Servern måste köra.** Lokala leverantörer kräver att modellservern körs innan Triggerfish startar. Om Ollama eller LM Studio inte körs:

```
Local LLM request failed (connection refused)
```

**Starta servern:**

```bash
# Ollama
ollama serve

# LM Studio
# Öppna LM Studio och starta den lokala servern
```

**Modell ej laddad.** Med Ollama måste modellen hämtas först:

```bash
ollama pull llama3.3:70b
```

**Endpoint-åsidosättning.** Om din lokala server inte är på standardporten:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama standard
      # endpoint: "http://localhost:1234"  # LM Studio standard
```

### Fireworks

**Eget API.** Triggerfish använder Fireworks eget API, inte deras OpenAI-kompatibla endpoint. Modell-ID:n kan skilja sig från vad du ser i OpenAI-kompatibel dokumentation.

**Modell-ID-format.** Fireworks accepterar flera modell-ID-mönster. Guiden normaliserar vanliga format, men om verifiering misslyckas kontrollera [Fireworks modellbibliotek](https://fireworks.ai/models) för exakt ID.

### OpenRouter

**Modellroutning.** OpenRouter dirigerar förfrågningar till olika leverantörer. Fel från den underliggande leverantören är inbäddade i OpenRouters felformat. Det faktiska felmeddelandet extraheras och visas.

**API-felformat.** OpenRouter returnerar fel som JSON-objekt. Om felmeddelandet verkar generiskt loggas råfelet på DEBUG-nivå.

### ZenMux / Z.AI

**Streamingstöd.** Båda leverantörerna stöder streaming. Om streaming misslyckas:

```
ZenMux stream failed (status): error text
```

Kontrollera att din API-nyckel har streamingbehörigheter (vissa API-nivåer begränsar streamingåtkomst).

---

## Failover

### Hur failover fungerar

När den primära leverantören misslyckas provar Triggerfish varje modell i `failover`-listan i ordning:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Om en failover-leverantör lyckas loggas svaret med vilken leverantör som användes. Om alla leverantörer misslyckas returneras det sista felet till användaren.

### "All providers exhausted"

Varje leverantör i kedjan misslyckades. Kontrollera:

1. Är alla API-nycklar giltiga? Testa varje leverantör individuellt.
2. Upplever alla leverantörer driftstopp? Kontrollera deras statussidor.
3. Blockerar ditt nätverk utgående HTTPS till någon av leverantörs-endpointerna?

### Failover-konfiguration

```yaml
models:
  failover_config:
    max_retries: 3          # Återförsök per leverantör innan nästa provas
    retry_delay_ms: 1000    # Grundfördröjning mellan återförsök
    conditions:             # Vilka fel utlöser failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

Leverantörsnamnet i `models.primary.provider` matchar ingen konfigurerad leverantör i `models.providers`. Kontrollera stavningen.

### "Classification model provider not configured"

Du angav en `classification_models`-åsidosättning som refererar till en leverantör som inte finns i `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Den här leverantören måste finnas i models.providers
      model: llama3.3:70b
  providers:
    # "local" måste definieras här
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Återförsöksbeteende

Triggerfish gör återförsök på leverantörsförfrågningar vid övergående fel (nätverkstimeouts, 5xx-svar). Återförsökslogiken:

1. Väntar med exponentiell backoff mellan försök
2. Loggar varje återförsök på WARN-nivå
3. Efter att ha uttömt återförsök för en leverantör går den vidare till nästa i failover-kedjan
4. Streaminganslutningar har separat återförsökslogik för anslutningsetablering kontra fel mitt i streamen

Du kan se återförsök i loggarna:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
