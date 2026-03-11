# Risoluzione dei Problemi: Configurazione

## Errori di Parsing YAML

### "Configuration parse failed"

Il file YAML ha un errore di sintassi. Cause comuni:

- **Indentazione non corrispondente.** YAML è sensibile agli spazi bianchi. Utilizzare spazi, non tabulazioni. Ogni livello di annidamento dovrebbe essere esattamente 2 spazi.
- **Caratteri speciali non quotati.** I valori contenenti `:`, `#`, `{`, `}`, `[`, `]`, o `&` devono essere quotati.
- **Due punti mancante dopo la chiave.** Ogni chiave necessita di `: ` (due punti seguiti da uno spazio).

Validare il YAML:

```bash
triggerfish config validate
```

Oppure utilizzare un validatore YAML online per trovare la riga esatta.

### "Configuration file did not parse to an object"

Il file YAML è stato analizzato con successo ma il risultato non è un mapping YAML (oggetto). Questo accade se il file contiene solo un valore scalare, una lista, o è vuoto.

Il `triggerfish.yaml` deve avere un mapping al livello superiore. Come minimo:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish cerca la configurazione in questi percorsi, in ordine:

1. Variabile d'ambiente `$TRIGGERFISH_CONFIG` (se impostata)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (se `TRIGGERFISH_DATA_DIR` è impostata)
3. `/data/triggerfish.yaml` (ambienti Docker)
4. `~/.triggerfish/triggerfish.yaml` (predefinito)

Eseguire la procedura guidata di configurazione per crearne una:

```bash
triggerfish dive
```

---

## Errori di Validazione

### "Configuration validation failed"

Questo significa che il YAML è stato analizzato ma ha fallito la validazione strutturale. Messaggi specifici:

**"models is required"** o **"models.primary is required"**

La sezione `models` è obbligatoria. Serve almeno un provider primario e un modello:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** o **"primary.model must be non-empty"**

Il campo `primary` deve avere sia `provider` che `model` impostati su stringhe non vuote.

**"Invalid classification level"** in `classification_models`

I livelli validi sono: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Questi sono case-sensitive. Verificare le chiavi di `classification_models`.

---

## Errori dei Riferimenti ai Secret

### Secret non risolto all'avvio

Se la configurazione contiene `secret:some-key` e quella chiave non esiste nel portachiavi, il daemon esce con un errore come:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Soluzione:**

```bash
# Elencare quali secret esistono
triggerfish config get-secret --list

# Memorizzare il secret mancante
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Backend dei secret non disponibile

Su Linux, lo store dei secret utilizza `secret-tool` (libsecret / GNOME Keyring). Se l'interfaccia D-Bus del Secret Service non è disponibile (server headless, container minimali), si vedranno errori durante la memorizzazione o il recupero dei secret.

**Soluzione alternativa per Linux headless:**

1. Installare `gnome-keyring` e `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Avviare il daemon del keyring:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Oppure utilizzare il fallback del file crittografato impostando:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Nota: il fallback in memoria significa che i secret vengono persi al riavvio. È adatto solo per il testing.

---

## Problemi dei Valori di Configurazione

### Coercizione booleana

Quando si utilizza `triggerfish config set`, i valori stringa `"true"` e `"false"` vengono automaticamente convertiti in booleani YAML. Se si necessita effettivamente della stringa letterale `"true"`, modificare il file YAML direttamente.

Allo stesso modo, le stringhe che assomigliano a interi (`"8080"`) vengono convertite in numeri.

### Sintassi dei percorsi con punti

I comandi `config set` e `config get` utilizzano percorsi con punti per navigare il YAML annidato:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Se un segmento del percorso contiene un punto, non esiste una sintassi di escape. Modificare il file YAML direttamente.

### Mascheramento dei secret in `config get`

Quando si esegue `triggerfish config get` su una chiave contenente "key", "secret" o "token", l'output è mascherato: `****...****` con solo i primi e gli ultimi 4 caratteri visibili. Questo è intenzionale. Utilizzare `triggerfish config get-secret <key>` per recuperare il valore effettivo.

---

## Backup della Configurazione

Triggerfish crea un backup con timestamp in `~/.triggerfish/backups/` prima di ogni operazione `config set`, `config add-channel` o `config add-plugin`. Vengono mantenuti fino a 10 backup.

Per ripristinare un backup:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Verifica dei Provider

La procedura guidata di configurazione verifica le chiavi API chiamando l'endpoint di elenco modelli di ogni provider (che non consuma token). Gli endpoint di verifica sono:

| Provider | Endpoint |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Se la verifica fallisce, controllare:
- La chiave API è corretta e non è scaduta
- L'endpoint è raggiungibile dalla rete
- Per i provider locali (Ollama, LM Studio), il server è effettivamente in esecuzione

### Modello non trovato

Se la verifica ha successo ma il modello non viene trovato, la procedura guidata emette un avviso. Questo di solito significa:

- **Errore di battitura nel nome del modello.** Verificare la documentazione del provider per gli ID esatti dei modelli.
- **Modello Ollama non scaricato.** Eseguire prima `ollama pull <model>`.
- **Il provider non elenca il modello.** Alcuni provider (Fireworks) utilizzano formati di naming diversi. La procedura guidata normalizza i pattern comuni, ma ID di modello insoliti potrebbero non corrispondere.
