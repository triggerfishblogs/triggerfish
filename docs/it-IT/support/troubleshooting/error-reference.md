# Riferimento degli Errori

Un indice ricercabile dei messaggi di errore. Utilizzare la funzione di ricerca del browser (Ctrl+F / Cmd+F) per cercare il testo esatto dell'errore visualizzato nei log.

## Avvio e Daemon

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Fatal startup error` | Eccezione non gestita durante l'avvio del gateway | Controllare lo stack trace completo nei log |
| `Daemon start failed` | Il gestore del servizio non è riuscito ad avviare il daemon | Controllare `triggerfish logs` o il journal di sistema |
| `Daemon stop failed` | Il gestore del servizio non è riuscito ad arrestare il daemon | Terminare il processo manualmente |
| `Failed to load configuration` | File di configurazione illeggibile o malformato | Eseguire `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Sezione `models` mancante o nessun provider definito | Configurare almeno un provider |
| `Configuration file not found` | `triggerfish.yaml` non esiste nel percorso previsto | Eseguire `triggerfish dive` o creare manualmente |
| `Configuration parse failed` | Errore di sintassi YAML | Correggere la sintassi YAML (controllare indentazione, due punti, virgolette) |
| `Configuration file did not parse to an object` | YAML analizzato ma il risultato non è un mapping | Assicurarsi che il livello superiore sia un mapping YAML, non una lista o scalare |
| `Configuration validation failed` | Campi obbligatori mancanti o valori non validi | Controllare il messaggio di validazione specifico |
| `Triggerfish is already running` | File di log bloccato da un'altra istanza | Arrestare prima l'istanza in esecuzione |
| `Linger enable failed` | `loginctl enable-linger` non ha avuto successo | Eseguire `sudo loginctl enable-linger $USER` |

## Gestione dei Secret

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Secret store failed` | Non è stato possibile inizializzare il backend dei secret | Verificare la disponibilità del portachiavi/libsecret |
| `Secret not found` | La chiave del secret referenziata non esiste | Memorizzarla: `triggerfish config set-secret <key> <value>` |
| `Machine key file permissions too open` | Il file della chiave ha permessi più ampi di 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Il file della chiave è illeggibile o troncato | Eliminare e ri-memorizzare tutti i secret |
| `Machine key chmod failed` | Non è possibile impostare i permessi sul file della chiave | Verificare che il filesystem supporti chmod |
| `Secret file permissions too open` | Il file dei secret ha permessi eccessivamente permissivi | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Non è possibile impostare i permessi sul file dei secret | Verificare il tipo di filesystem |
| `Secret backend selection failed` | SO non supportato o nessun portachiavi disponibile | Utilizzare Docker o abilitare il fallback in memoria |
| `Migrating legacy plaintext secrets to encrypted format` | Rilevato file di secret in vecchio formato (INFO, non errore) | Nessuna azione necessaria; la migrazione è automatica |

## Provider LLM

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Primary provider not found in registry` | Nome del provider in `models.primary.provider` non presente in `models.providers` | Correggere il nome del provider |
| `Classification model provider not configured` | `classification_models` fa riferimento a un provider sconosciuto | Aggiungere il provider a `models.providers` |
| `All providers exhausted` | Ogni provider nella catena di failover è fallito | Verificare tutte le chiavi API e lo stato dei provider |
| `Provider request failed with retryable error, retrying` | Errore transitorio, tentativo in corso | Attendere; questo è un recupero automatico |
| `Provider stream connection failed, retrying` | Connessione streaming interrotta | Attendere; questo è un recupero automatico |
| `Local LLM request failed (status): text` | Ollama/LM Studio ha restituito un errore | Verificare che il server locale sia in esecuzione e il modello sia caricato |
| `No response body for streaming` | Il provider ha restituito una risposta streaming vuota | Riprovare; potrebbe essere un problema transitorio del provider |
| `Unknown provider name in createProviderByName` | Il codice fa riferimento a un tipo di provider che non esiste | Verificare l'ortografia del nome del provider |

## Canali

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Channel send failed` | Il router non è riuscito a consegnare un messaggio | Controllare gli errori specifici del canale nei log |
| `WebSocket connection failed` | La chat CLI non riesce a raggiungere il gateway | Verificare che il daemon sia in esecuzione |
| `Message parse failed` | JSON malformato ricevuto dal canale | Verificare che il client invii JSON valido |
| `WebSocket upgrade rejected` | Connessione rifiutata dal gateway | Verificare token di autenticazione e header di origine |
| `Chat WebSocket message rejected: exceeds size limit` | Il corpo del messaggio supera 1 MB | Inviare messaggi più piccoli |
| `Discord channel configured but botToken is missing` | La configurazione Discord esiste ma il token è vuoto | Impostare il token del bot |
| `WhatsApp send failed (status): error` | L'API Meta ha rifiutato la richiesta di invio | Verificare la validità del token di accesso |
| `Signal connect failed` | Non è possibile raggiungere il daemon signal-cli | Verificare che signal-cli sia in esecuzione |
| `Signal ping failed after retries` | signal-cli è in esecuzione ma non risponde | Riavviare signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli non si è avviato in tempo | Verificare l'installazione Java e la configurazione signal-cli |
| `IMAP LOGIN failed` | Credenziali IMAP errate | Verificare nome utente e password |
| `IMAP connection not established` | Non è possibile raggiungere il server IMAP | Verificare hostname del server e porta 993 |
| `Google Chat PubSub poll failed` | Non è possibile fare pull dalla sottoscrizione Pub/Sub | Verificare le credenziali Google Cloud |
| `Clipboard image rejected: exceeds size limit` | L'immagine incollata è troppo grande per il buffer di input | Utilizzare un'immagine più piccola |

## Integrazioni

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Google OAuth token exchange failed` | Lo scambio del codice OAuth ha restituito un errore | Ri-autenticarsi: `triggerfish connect google` |
| `GitHub token verification failed` | Il PAT non è valido o è scaduto | Ri-memorizzare: `triggerfish connect github` |
| `GitHub API request failed` | L'API GitHub ha restituito un errore | Verificare gli scope del token e i limiti di frequenza |
| `Clone failed` | git clone fallito | Verificare token, accesso al repo e rete |
| `Notion enabled but token not found in keychain` | Token dell'integrazione Notion non memorizzato | Eseguire `triggerfish connect notion` |
| `Notion API rate limited` | Superato 3 req/sec | Attendere il retry automatico (fino a 3 tentativi) |
| `Notion API network request failed` | Non è possibile raggiungere api.notion.com | Verificare la connettività di rete |
| `CalDAV credential resolution failed` | Nome utente o password CalDAV mancanti | Impostare le credenziali nella configurazione e nel portachiavi |
| `CalDAV principal discovery failed` | Non è possibile trovare l'URL principal CalDAV | Verificare il formato dell'URL del server |
| `MCP server 'name' not found` | Server MCP referenziato non presente nella configurazione | Aggiungerlo a `mcp_servers` nella configurazione |
| `MCP SSE connection blocked by SSRF policy` | L'URL MCP SSE punta a un IP privato | Utilizzare il trasporto stdio |
| `Vault path does not exist` | Il percorso del vault Obsidian è errato | Correggere `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Il percorso della nota ha tentato di uscire dalla directory del vault | Utilizzare percorsi all'interno del vault |

## Sicurezza e Policy

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Write-down blocked` | Dati che fluiscono da classificazione alta a bassa | Utilizzare un canale/tool al livello di classificazione corretto |
| `SSRF blocked: hostname resolves to private IP` | Richiesta in uscita verso rete interna | Non può essere disabilitato; utilizzare un URL pubblico |
| `Hook evaluation failed, defaulting to BLOCK` | Un hook di policy ha lanciato un'eccezione | Verificare le regole di policy personalizzate |
| `Policy rule blocked action` | Una regola di policy ha negato l'azione | Esaminare `policy.rules` nella configurazione |
| `Tool floor violation` | Il tool richiede classificazione superiore a quella della sessione | Aumentare il livello della sessione o utilizzare un tool diverso |
| `Plugin network access blocked` | Il plugin ha tentato di accedere a un URL non autorizzato | Il plugin deve dichiarare gli endpoint nel suo manifesto |
| `Plugin SSRF blocked` | L'URL del plugin si risolve in un IP privato | I plugin non possono accedere a reti private |
| `Skill activation blocked by classification ceiling` | Il taint della sessione supera il tetto della skill | Non è possibile utilizzare questa skill al livello di taint corrente |
| `Skill content integrity check failed` | I file della skill sono stati modificati dopo l'installazione | Reinstallare la skill |
| `Skill install rejected by scanner` | Lo scanner di sicurezza ha trovato contenuto sospetto | Esaminare gli avvisi della scansione |
| `Delegation certificate signature invalid` | La catena di delega ha una firma non valida | Ri-emettere la delega |
| `Delegation certificate expired` | La delega è scaduta | Ri-emettere con TTL più lungo |
| `Webhook HMAC verification failed` | La firma del webhook non corrisponde | Verificare la configurazione del secret condiviso |
| `Webhook replay detected` | Payload webhook duplicato ricevuto | Non è un errore se previsto; altrimenti investigare |
| `Webhook rate limit exceeded` | Troppe chiamate webhook da una sorgente | Ridurre la frequenza dei webhook |

## Browser

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Browser launch failed` | Non è stato possibile avviare Chrome/Chromium | Installare un browser basato su Chromium |
| `Direct Chrome process launch failed` | Il binario Chrome non è riuscito a eseguire | Verificare permessi del binario e dipendenze |
| `Flatpak Chrome launch failed` | Il wrapper Flatpak Chrome è fallito | Verificare l'installazione Flatpak |
| `CDP endpoint not ready after Xms` | Chrome non ha aperto la porta di debug in tempo | Il sistema potrebbe avere risorse limitate |
| `Navigation blocked by domain policy` | L'URL mira a un dominio bloccato o IP privato | Utilizzare un URL pubblico |
| `Navigation failed` | Errore di caricamento della pagina o timeout | Verificare URL e rete |
| `Click/Type/Select failed on "selector"` | Il selettore CSS non ha corrisposto a nessun elemento | Verificare il selettore rispetto al DOM della pagina |
| `Snapshot failed` | Non è stato possibile catturare lo stato della pagina | La pagina potrebbe essere vuota o JavaScript ha dato errore |

## Esecuzione e Sandbox

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Working directory path escapes workspace jail` | Tentativo di traversal del percorso nell'ambiente di esecuzione | Utilizzare percorsi all'interno dello spazio di lavoro |
| `Working directory does not exist` | Directory di lavoro specificata non trovata | Creare prima la directory |
| `Workspace access denied for PUBLIC session` | Le sessioni PUBLIC non possono utilizzare gli spazi di lavoro | Lo spazio di lavoro richiede classificazione INTERNAL+ |
| `Workspace path traversal attempt blocked` | Il percorso ha tentato di uscire dal confine dello spazio di lavoro | Utilizzare percorsi relativi all'interno dello spazio di lavoro |
| `Workspace agentId rejected: empty after sanitization` | L'ID dell'agent contiene solo caratteri non validi | Verificare la configurazione dell'agent |
| `Sandbox worker unhandled error` | Il worker del sandbox del plugin si è bloccato | Verificare il codice del plugin per errori |
| `Sandbox has been shut down` | Operazione tentata su un sandbox distrutto | Riavviare il daemon |

## Scheduler

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Trigger callback failed` | L'handler del trigger ha lanciato un'eccezione | Verificare TRIGGER.md per problemi |
| `Trigger store persist failed` | Non è possibile salvare i risultati del trigger | Verificare la connettività dello storage |
| `Notification delivery failed` | Non è stato possibile inviare la notifica del trigger | Verificare la connettività del canale |
| `Cron expression parse error` | Espressione cron non valida | Correggere l'espressione in `scheduler.cron.jobs` |

## Auto-Aggiornamento

| Errore | Causa | Soluzione |
|--------|-------|-----------|
| `Triggerfish self-update failed` | Il processo di aggiornamento ha incontrato un errore | Verificare l'errore specifico nei log |
| `Binary replacement failed` | Non è stato possibile sostituire il vecchio binario con il nuovo | Verificare i permessi del file; arrestare prima il daemon |
| `Checksum file download failed` | Non è stato possibile scaricare SHA256SUMS.txt | Verificare la connettività di rete |
| `Asset not found in SHA256SUMS.txt` | Release senza checksum per la piattaforma in uso | Segnalare un issue su GitHub |
| `Checksum verification exception` | L'hash del binario scaricato non corrisponde | Riprovare; il download potrebbe essere stato corrotto |
