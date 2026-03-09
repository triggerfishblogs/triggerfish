# Risoluzione dei Problemi: Provider LLM

## Errori Comuni dei Provider

### 401 Unauthorized / 403 Forbidden

La chiave API non è valida, è scaduta o non ha permessi sufficienti.

**Soluzione:**

```bash
# Ri-memorizzare la chiave API
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Riavviare il daemon
triggerfish stop && triggerfish start
```

Note specifiche per provider:

| Provider | Formato chiave | Dove ottenerla |
|----------|---------------|----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Si è superato il limite di frequenza del provider. Triggerfish non ritenta automaticamente sui 429 per la maggior parte dei provider (eccetto Notion, che ha backoff integrato).

**Soluzione:** Attendere e riprovare. Se si raggiungono costantemente i limiti di frequenza, considerare:
- Aggiornare il piano API per limiti più alti
- Aggiungere un provider di failover in modo che le richieste passino al successivo quando il primario è limitato
- Ridurre la frequenza dei trigger se le attività programmate ne sono la causa

### 500 / 502 / 503 Server Error

I server del provider stanno riscontrando problemi. Questi sono tipicamente transitori.

Se si ha una catena di failover configurata, Triggerfish prova automaticamente il provider successivo. Senza failover, l'errore si propaga all'utente.

### "No response body for streaming"

Il provider ha accettato la richiesta ma ha restituito un corpo di risposta vuoto per una chiamata in streaming. Questo può accadere quando:

- L'infrastruttura del provider è sovraccarica
- Un proxy o firewall sta rimuovendo il corpo della risposta
- Il modello è temporaneamente non disponibile

Questo influisce su: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Problemi Specifici dei Provider

### Anthropic

**Conversione del formato dei tool.** Triggerfish converte tra il formato dei tool interno e il formato nativo dei tool di Anthropic. Se si vedono errori relativi ai tool, verificare che le definizioni dei tool abbiano JSON Schema valido.

**Gestione del system prompt.** Anthropic richiede il system prompt come campo separato, non come messaggio. Questa conversione è automatica, ma se si vedono messaggi "system" apparire nella conversazione, qualcosa non va con la formattazione dei messaggi.

### OpenAI

**Frequency penalty.** Triggerfish applica un frequency penalty di 0.3 a tutte le richieste OpenAI per scoraggiare output ripetitivi. Questo è hardcoded e non può essere modificato tramite configurazione.

**Supporto immagini.** OpenAI supporta immagini codificate in base64 nel contenuto dei messaggi. Se la visione non funziona, assicurarsi di avere un modello con capacità di visione configurato (es. `gpt-4o`, non `gpt-4o-mini`).

### Google Gemini

**Chiave nella query string.** A differenza di altri provider, Google utilizza la chiave API come parametro della query, non come header. Questo è gestito automaticamente, ma significa che la chiave potrebbe apparire nei log del proxy/accesso se si instrada attraverso un proxy aziendale.

### Ollama / LM Studio (Local)

**Il server deve essere in esecuzione.** I provider locali richiedono che il server del modello sia in esecuzione prima dell'avvio di Triggerfish. Se Ollama o LM Studio non è in esecuzione:

```
Local LLM request failed (connection refused)
```

**Avviare il server:**

```bash
# Ollama
ollama serve

# LM Studio
# Aprire LM Studio e avviare il server locale
```

**Modello non caricato.** Con Ollama, il modello deve essere scaricato prima:

```bash
ollama pull llama3.3:70b
```

**Override dell'endpoint.** Se il server locale non è sulla porta predefinita:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Predefinito Ollama
      # endpoint: "http://localhost:1234"  # Predefinito LM Studio
```

### Fireworks

**API nativa.** Triggerfish utilizza l'API nativa di Fireworks, non il loro endpoint compatibile con OpenAI. Gli ID dei modelli possono differire da quanto si vede nella documentazione compatibile con OpenAI.

**Formati degli ID dei modelli.** Fireworks accetta diversi pattern di ID dei modelli. La procedura guidata normalizza i formati comuni, ma se la verifica fallisce, controllare la [libreria dei modelli Fireworks](https://fireworks.ai/models) per l'ID esatto.

### OpenRouter

**Routing dei modelli.** OpenRouter instrada le richieste a vari provider. Gli errori dal provider sottostante sono incapsulati nel formato di errore di OpenRouter. Il messaggio di errore effettivo viene estratto e visualizzato.

**Formato degli errori API.** OpenRouter restituisce errori come oggetti JSON. Se il messaggio di errore sembra generico, l'errore grezzo viene registrato a livello DEBUG.

### ZenMux / Z.AI

**Supporto streaming.** Entrambi i provider supportano lo streaming. Se lo streaming fallisce:

```
ZenMux stream failed (status): error text
```

Verificare che la chiave API abbia i permessi per lo streaming (alcuni tier API limitano l'accesso allo streaming).

---

## Failover

### Come funziona il failover

Quando il provider primario fallisce, Triggerfish prova ogni modello nella lista `failover` in ordine:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Se un provider di failover ha successo, la risposta viene registrata con quale provider è stato utilizzato. Se tutti i provider falliscono, l'ultimo errore viene restituito all'utente.

### "All providers exhausted"

Ogni provider nella catena è fallito. Verificare:

1. Tutte le chiavi API sono valide? Testare ogni provider individualmente.
2. Tutti i provider stanno subendo interruzioni? Controllare le loro pagine di stato.
3. La rete sta bloccando HTTPS in uscita verso qualcuno degli endpoint dei provider?

### Configurazione del failover

```yaml
models:
  failover_config:
    max_retries: 3          # Tentativi per provider prima di passare al successivo
    retry_delay_ms: 1000    # Ritardo base tra i tentativi
    conditions:             # Quali errori attivano il failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

Il nome del provider in `models.primary.provider` non corrisponde a nessun provider configurato in `models.providers`. Verificare la presenza di errori di battitura.

### "Classification model provider not configured"

Si è impostato un override `classification_models` che fa riferimento a un provider non presente in `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Questo provider deve esistere in models.providers
      model: llama3.3:70b
  providers:
    # "local" deve essere definito qui
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Comportamento dei Tentativi

Triggerfish ritenta le richieste ai provider su errori transitori (timeout di rete, risposte 5xx). La logica dei tentativi:

1. Attende con backoff esponenziale tra i tentativi
2. Registra ogni tentativo a livello WARN
3. Dopo aver esaurito i tentativi per un provider, passa al successivo nella catena di failover
4. Le connessioni in streaming hanno una logica di tentativi separata per lo stabilimento della connessione rispetto ai fallimenti a metà stream

È possibile vedere i tentativi nei log:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
