# Feilsøking: LLM-leverandører

## Vanlige leverandørfeil

### 401 Unauthorized / 403 Forbidden

API-nøkkelen din er ugyldig, utløpt, eller har ikke tilstrekkelige tillatelser.

**Løsning:**

```bash
# Lagre API-nøkkelen på nytt
triggerfish config set-secret provider:<navn>:apiKey <din-nøkkel>

# Restart daemonen
triggerfish stop && triggerfish start
```

Leverandørspesifikke notater:

| Leverandør | Nøkkelformat | Hvor du får den |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Hastighetsbegrenset

Du har overskredet leverandørens hastighetsbegrensning. Triggerfish prøver ikke
automatisk på nytt ved 429 for de fleste leverandører (bortsett fra Notion, som
har innebygd backoff).

**Løsning:** Vent og prøv igjen. Hvis du konsekvent treffer hastighetsbegrensninger,
vurder:
- Å oppgradere API-planen din for høyere grenser
- Å legge til en failover-leverandør slik at forespørsler faller gjennom når den
  primære er hastighetsbegrenset
- Å redusere triggerfrekvens hvis planlagte oppgaver er årsaken

### 500 / 502 / 503 Serverfeil

Leverandørens servere opplever problemer. Disse er typisk forbigående.

Hvis du har en failover-kjede konfigurert, prøver Triggerfish den neste leverandøren
automatisk. Uten failover propageres feilen til brukeren.

### «No response body for streaming»

Leverandøren aksepterte forespørselen, men returnerte en tom svarinstans for et
strømmingskall. Dette kan skje når:

- Leverandørens infrastruktur er overbelastet
- En proxy eller brannmur fjerner svarinstansen
- Modellen er midlertidig utilgjengelig

Dette påvirker: OpenRouter, Lokal (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Leverandørspesifikke problemer

### Anthropic

**Verktøyformatkonvertering.** Triggerfish konverterer mellom internt verktøyformat
og Anthropics native verktøyformat. Hvis du ser verktøyrelaterte feil, sjekk at
verktøydefinisjonene dine har gyldig JSON Schema.

**Systemprompt-håndtering.** Anthropic krever systemprompten som et separat felt,
ikke som en melding. Denne konverteringen er automatisk, men hvis du ser
«system»-meldinger som vises i samtaler, er noe galt med meldingsformatering.

### OpenAI

**Frekvensstraff.** Triggerfish anvender en 0,3 frekvensstraff på alle OpenAI-forespørsler
for å motvirke repetitivt utdata. Dette er hardkodet og kan ikke endres via
konfigurasjon.

**Bildestøtte.** OpenAI støtter base64-kodede bilder i meldingsinnhold. Hvis
visjon ikke fungerer, sørg for at du har en synkapabel modell konfigurert (f.eks.
`gpt-4o`, ikke `gpt-4o-mini`).

### Google Gemini

**Nøkkel i spørringsstreng.** I motsetning til andre leverandører bruker Google
API-nøkkelen som en spørringsparameter, ikke en overskrift. Dette håndteres
automatisk, men det betyr at nøkkelen kan vises i proxy/tilgangslogger hvis du
ruter gjennom en bedriftsproxyserver.

### Ollama / LM Studio (Lokal)

**Serveren må kjøre.** Lokale leverandører krever at modellserveren kjører før
Triggerfish starter. Hvis Ollama eller LM Studio ikke kjører:

```
Local LLM request failed (connection refused)
```

**Start serveren:**

```bash
# Ollama
ollama serve

# LM Studio
# Åpne LM Studio og start den lokale serveren
```

**Modell ikke lastet.** Med Ollama må modellen hentes først:

```bash
ollama pull llama3.3:70b
```

**Endepunkt-overstyring.** Hvis den lokale serveren ikke er på standardporten:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama standard
      # endpoint: "http://localhost:1234"  # LM Studio standard
```

### Fireworks

**Native API.** Triggerfish bruker Fireworks' native API, ikke OpenAI-kompatible
endepunktet. Modell-ID-er kan avvike fra det du ser i OpenAI-kompatibel dokumentasjon.

**Modell-ID-formater.** Fireworks aksepterer flere modell-ID-mønstre. Veiviseren
normaliserer vanlige formater, men hvis verifisering mislykkes, sjekk
[Fireworks modellbibliotek](https://fireworks.ai/models) for den eksakte ID-en.

### OpenRouter

**Modelleruting.** OpenRouter ruter forespørsler til ulike leverandører. Feil fra
den underliggende leverandøren er innpakket i OpenRouters feilformat. Den faktiske
feilmeldingen ekstraheres og vises.

**API-feilformat.** OpenRouter returnerer feil som JSON-objekter. Hvis feilmeldingen
virker generisk, logges den rå feilen på DEBUG-nivå.

### ZenMux / Z.AI

**Strømmestøtte.** Begge leverandørene støtter strømming. Hvis strømming mislykkes:

```
ZenMux stream failed (status): error text
```

Sjekk at API-nøkkelen din har strømmingstillatelser (noen API-nivåer begrenser
strømmingstilgang).

---

## Failover

### Slik fungerer failover

Når den primære leverandøren mislykkes, prøver Triggerfish hver modell i
`failover`-listen i rekkefølge:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Hvis en failover-leverandør lykkes, logges svaret med hvilken leverandør som ble
brukt. Hvis alle leverandører mislykkes, returneres den siste feilen til brukeren.

### «All providers exhausted»

Hver leverandør i kjeden mislyktes. Sjekk:

1. Er alle API-nøkler gyldige? Test hver leverandør individuelt.
2. Opplever alle leverandørene avbrudd? Sjekk statussidene deres.
3. Blokkerer nettverket ditt utgående HTTPS til noen av leverandørendepunktene?

### Failover-konfigurasjon

```yaml
models:
  failover_config:
    max_retries: 3          # Forsøk per leverandør før neste prøves
    retry_delay_ms: 1000    # Basisforsinkelse mellom forsøk
    conditions:             # Hvilke feil utløser failover
      - timeout
      - server_error
      - rate_limited
```

### «Primary provider not found in registry»

Leverandørnavnet i `models.primary.provider` samsvarer ikke med noen konfigurert
leverandør i `models.providers`. Sjekk for skrivefeil.

### «Classification model provider not configured»

Du satte en `classification_models`-overstyring som refererer til en leverandør
som ikke er til stede i `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Denne leverandøren må eksistere i models.providers
      model: llama3.3:70b
  providers:
    # «local» må defineres her
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Forsøksatferd

Triggerfish prøver leverandørforespørsler på nytt ved forbigående feil
(nettverkstidsavbrudd, 5xx-svar). Forsøkslogikken:

1. Venter med eksponentiell backoff mellom forsøk
2. Logger hvert forsøk på WARN-nivå
3. Etter å ha uttømt forsøk for én leverandør, flyttes til neste i failover-kjeden
4. Strømmingstilkoblinger har separat forsøkslogikk for tilkoblingsoppretting vs.
   midtstrøms feil

Du kan se forsøksforsøk i loggene:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
