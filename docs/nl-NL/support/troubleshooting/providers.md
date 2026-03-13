# Probleemoplossing: LLM-providers

## Veelvoorkomende providerfouten

### 401 Unauthorized / 403 Forbidden

Uw API-sleutel is ongeldig, verlopen of heeft onvoldoende machtigingen.

**Oplossing:**

```bash
# API-sleutel opnieuw opslaan
triggerfish config set-secret provider:<naam>:apiKey <uw-sleutel>

# Daemon herstarten
triggerfish stop && triggerfish start
```

Provider-specifieke opmerkingen:

| Provider | Sleutelformaat | Waar te verkrijgen |
|----------|---------------|-------------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Snelheidslimiet overschreden

U heeft de snelheidslimiet van de provider overschreden. Triggerfish probeert niet automatisch opnieuw bij 429 voor de meeste providers (behalve Notion, dat ingebouwde terugval heeft).

**Oplossing:** Wacht en probeer opnieuw. Als u consequent snelheidsbegrenzingen bereikt, overweeg dan:
- Uw API-plan upgraden voor hogere limieten
- Een failover-provider toevoegen zodat verzoeken doorkomen wanneer de primaire wordt beperkt
- De triggerfrequentie verminderen als geplande taken de oorzaak zijn

### 500 / 502 / 503 Serverfout

De servers van de provider ondervinden problemen. Dit zijn doorgaans tijdelijke storingen.

Als u een failover-keten heeft geconfigureerd, probeert Triggerfish automatisch de volgende provider. Zonder failover wordt de fout doorgegeven aan de gebruiker.

### "No response body for streaming"

De provider heeft het verzoek geaccepteerd maar een lege responsinhoud teruggegeven voor een streaming-aanroep. Dit kan gebeuren wanneer:

- De infrastructuur van de provider overbelast is
- Een proxy of firewall de responsinhoud verwijdert
- Het model tijdelijk niet beschikbaar is

Dit beïnvloedt: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider-specifieke problemen

### Anthropic

**Toolformaatconversie.** Triggerfish converteert tussen intern toolformaat en het native toolformaat van Anthropic. Als u toolfouten ziet, controleer dan of uw tooldefinities geldige JSON Schema hebben.

**Systeempromptafhandeling.** Anthropic vereist de systeemprompt als een afzonderlijk veld, niet als een bericht. Deze conversie is automatisch, maar als u "system"-berichten ziet verschijnen in een gesprek, is er iets mis met de berichtopmaak.

### OpenAI

**Frequentiepenalty.** Triggerfish past een frequentiepenalty van 0,3 toe op alle OpenAI-verzoeken om herhaalde uitvoer te ontmoedigen. Dit is hardgecodeerd en kan niet worden gewijzigd via de configuratie.

**Afbeeldingsondersteuning.** OpenAI ondersteunt base64-gecodeerde afbeeldingen in berichtinhoud. Als vision niet werkt, zorg er dan voor dat u een vision-capabel model heeft geconfigureerd (bijv. `gpt-4o`, niet `gpt-4o-mini`).

### Google Gemini

**Sleutel in querystring.** Anders dan andere providers gebruikt Google de API-sleutel als queryparameter, niet als header. Dit wordt automatisch afgehandeld, maar het betekent dat de sleutel in proxy-/toegangslogboeken kan verschijnen als u via een bedrijfsproxy routeert.

### Ollama / LM Studio (Lokaal)

**Server moet actief zijn.** Lokale providers vereisen dat de modelserver actief is voordat Triggerfish start. Als Ollama of LM Studio niet actief is:

```
Local LLM request failed (connection refused)
```

**Start de server:**

```bash
# Ollama
ollama serve

# LM Studio
# Open LM Studio en start de lokale server
```

**Model niet geladen.** Met Ollama moet het model eerst worden opgehaald:

```bash
ollama pull llama3.3:70b
```

**Eindpuntoverschrijving.** Als uw lokale server niet op de standaardpoort staat:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama standaard
      # endpoint: "http://localhost:1234"  # LM Studio standaard
```

### Fireworks

**Native API.** Triggerfish gebruikt de native API van Fireworks, niet hun OpenAI-compatibele eindpunt. Model-ID's kunnen verschillen van wat u ziet in OpenAI-compatibele documentatie.

**Model-ID-formaten.** Fireworks accepteert meerdere model-ID-patronen. De wizard normaliseert veelgebruikte formaten, maar als verificatie mislukt, raadpleeg dan de [Fireworks modelbibliotheek](https://fireworks.ai/models) voor het exacte ID.

### OpenRouter

**Modelrouting.** OpenRouter routeert verzoeken naar verschillende providers. Fouten van de onderliggende provider worden verpakt in het foutformaat van OpenRouter. De werkelijke foutmelding wordt geëxtraheerd en weergegeven.

**API-foutformaat.** OpenRouter geeft fouten terug als JSON-objecten. Als de foutmelding generiek lijkt, wordt de onbewerkte fout gelogd op DEBUG-niveau.

### ZenMux / Z.AI

**Streamingondersteuning.** Beide providers ondersteunen streaming. Als streaming mislukt:

```
ZenMux stream failed (status): foutmelding
```

Controleer of uw API-sleutel streamingmachtigingen heeft (sommige API-niveaus beperken streamingtoegang).

---

## Failover

### Hoe failover werkt

Wanneer de primaire provider mislukt, probeert Triggerfish elk model in de `failover`-lijst in volgorde:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Als een failover-provider slaagt, wordt de reactie gelogd met welke provider is gebruikt. Als alle providers mislukken, wordt de laatste fout teruggegeven aan de gebruiker.

### "All providers exhausted"

Elke provider in de keten heeft gefaald. Controleer:

1. Zijn alle API-sleutels geldig? Test elke provider afzonderlijk.
2. Ondervinden alle providers storingen? Controleer hun statuspagina's.
3. Blokkeert uw netwerk uitgaande HTTPS naar een van de providereindpunten?

### Failover-configuratie

```yaml
models:
  failover_config:
    max_retries: 3          # Pogingen per provider vóór overstap naar volgende
    retry_delay_ms: 1000    # Basisvertraging tussen pogingen
    conditions:             # Welke fouten failover activeren
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

De providernaam in `models.primary.provider` komt niet overeen met een geconfigureerde provider in `models.providers`. Controleer op typfouten.

### "Classification model provider not configured"

U heeft een `classification_models`-overschrijving ingesteld die verwijst naar een provider die niet aanwezig is in `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Deze provider moet bestaan in models.providers
      model: llama3.3:70b
  providers:
    # "local" moet hier worden gedefinieerd
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Herproberinggedrag

Triggerfish probeert providerverzoeken opnieuw bij tijdelijke fouten (netwerktimeouts, 5xx-reacties). De herproberingslogica:

1. Wacht met exponentiële terugval tussen pogingen
2. Logt elke herpoging op WARN-niveau
3. Na het uitputten van pogingen voor één provider, schakelt naar de volgende in de failover-keten
4. Streamingverbindingen hebben aparte herproberingslogica voor verbindingsopbouw versus fouten halverwege de stream

U kunt herpoginginspanningen zien in de logboeken:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
