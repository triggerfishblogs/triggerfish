# Risoluzione dei Problemi: Integrazioni

## Google Workspace

### Token OAuth scaduto o revocato

I refresh token OAuth di Google possono essere revocati (dall'utente, da Google, o per inattività). Quando questo accade:

```
Google OAuth token exchange failed
```

Oppure si vedranno errori 401 sulle chiamate API Google.

**Soluzione:** Ri-autenticarsi:

```bash
triggerfish connect google
```

Questo apre un browser per il flusso di consenso OAuth. Dopo aver concesso l'accesso, i nuovi token vengono memorizzati nel portachiavi.

### "No refresh token"

Il flusso OAuth ha restituito un access token ma nessun refresh token. Questo accade quando:

- Si è già autorizzata l'app in precedenza (Google invia il refresh token solo alla prima autorizzazione)
- La schermata di consenso OAuth non ha richiesto l'accesso offline

**Soluzione:** Revocare l'accesso dell'app nelle [Impostazioni dell'Account Google](https://myaccount.google.com/permissions), poi eseguire di nuovo `triggerfish connect google`. Questa volta Google invierà un nuovo refresh token.

### Prevenzione del refresh concorrente

Se più richieste attivano un refresh del token contemporaneamente, Triggerfish le serializza in modo che venga inviata una sola richiesta di refresh. Se si vedono timeout durante il refresh del token, potrebbe essere che il primo refresh stia impiegando troppo tempo.

---

## GitHub

### "GitHub token not found in keychain"

L'integrazione GitHub memorizza il Personal Access Token nel portachiavi del SO sotto la chiave `github-pat`.

**Soluzione:**

```bash
triggerfish connect github
# oppure manualmente:
triggerfish config set-secret github-pat ghp_...
```

### Formato del token

GitHub supporta due formati di token:
- PAT classici: `ghp_...`
- PAT fine-grained: `github_pat_...`

Entrambi funzionano. La procedura guidata di configurazione verifica il token chiamando l'API GitHub. Se la verifica fallisce:

```
GitHub token verification failed
GitHub API request failed
```

Controllare che il token abbia gli scope richiesti. Per la funzionalità completa, sono necessari: `repo`, `read:org`, `read:user`.

### Fallimenti del clone

Il tool di clone GitHub ha una logica di auto-retry:

1. Primo tentativo: clona con il `--branch` specificato
2. Se il branch non esiste: ritenta senza `--branch` (utilizza il branch predefinito)

Se entrambi i tentativi falliscono:

```
Clone failed on retry
Clone failed
```

Verificare:
- Il token ha lo scope `repo`
- Il repository esiste e il token ha accesso
- Connettività di rete verso github.com

### Limitazione della frequenza

Il limite di frequenza dell'API GitHub è di 5.000 richieste/ora per le richieste autenticate. Il conteggio rimanente del limite e l'orario di reset vengono estratti dagli header della risposta e inclusi nei messaggi di errore:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Non c'è backoff automatico. Attendere che la finestra del limite di frequenza si resetti.

---

## Notion

### "Notion enabled but token not found in keychain"

L'integrazione Notion richiede un token di integrazione interna memorizzato nel portachiavi.

**Soluzione:**

```bash
triggerfish connect notion
```

Questo richiede il token e lo memorizza nel portachiavi dopo averlo verificato con l'API Notion.

### Formato del token

Notion utilizza due formati di token:
- Token di integrazione interna: `ntn_...`
- Token legacy: `secret_...`

Entrambi sono accettati. La procedura guidata di connessione valida il formato prima della memorizzazione.

### Limitazione della frequenza (429)

L'API Notion è limitata a circa 3 richieste al secondo. Triggerfish ha limitazione della frequenza integrata (configurabile) e logica di retry:

- Frequenza predefinita: 3 richieste/secondo
- Tentativi: fino a 3 volte sui 429
- Backoff: esponenziale con jitter, a partire da 1 secondo
- Rispetta l'header `Retry-After` dalla risposta di Notion

Se si raggiungono comunque i limiti di frequenza:

```
Notion API rate limited, retrying
```

Ridurre le operazioni concorrenti o abbassare il limite di frequenza nella configurazione.

### 404 Not Found

```
Notion: 404 Not Found
```

La risorsa esiste ma non è condivisa con l'integrazione. In Notion:

1. Aprire la pagina o il database
2. Fare clic sul menu "..." > "Connessioni"
3. Aggiungere l'integrazione Triggerfish

### "client_secret removed" (Breaking Change)

In un aggiornamento di sicurezza, il campo `client_secret` è stato rimosso dalla configurazione Notion. Se si ha questo campo nel `triggerfish.yaml`, rimuoverlo. Notion ora utilizza solo il token OAuth memorizzato nel portachiavi.

### Errori di rete

```
Notion API network request failed
Notion API network error: <message>
```

L'API non è raggiungibile. Verificare la connessione di rete. Se si è dietro un proxy aziendale, l'API di Notion (`api.notion.com`) deve essere accessibile.

---

## CalDAV (Calendario)

### Risoluzione delle credenziali fallita

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

L'integrazione CalDAV necessita di un nome utente e una password:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "your-username"
  credential_ref: "secret:caldav:password"
```

Memorizzare la password:

```bash
triggerfish config set-secret caldav:password <your-password>
```

### Fallimenti nella scoperta

CalDAV utilizza un processo di scoperta multi-step:
1. Trovare l'URL principal (PROPFIND sull'endpoint well-known)
2. Trovare il calendar-home-set
3. Elencare i calendari disponibili

Se un qualsiasi passaggio fallisce:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Cause comuni:
- URL del server errato (alcuni server necessitano di `/dav/principals/` o `/remote.php/dav/`)
- Credenziali rifiutate (nome utente/password errati)
- Il server non supporta CalDAV (alcuni server pubblicizzano WebDAV ma non CalDAV)

### Discrepanza ETag su aggiornamento/eliminazione

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV utilizza gli ETag per il controllo della concorrenza ottimistica. Se un altro client (telefono, web) ha modificato l'evento tra la lettura e l'aggiornamento, l'ETag non corrisponderà.

**Soluzione:** L'agent dovrebbe recuperare nuovamente l'evento per ottenere l'ETag corrente, poi ritentare l'operazione. Questo viene gestito automaticamente nella maggior parte dei casi.

### "CalDAV credentials not available, executor deferred"

L'esecutore CalDAV si avvia in stato differito se le credenziali non possono essere risolte all'avvio. Questo non è fatale; l'esecutore riporterà errori se si tenta di utilizzare i tool CalDAV.

---

## Server MCP (Model Context Protocol)

### Server non trovato

```
MCP server '<name>' not found
```

La chiamata al tool fa riferimento a un server MCP che non è configurato. Verificare la sezione `mcp_servers` in `triggerfish.yaml`.

### Binario del server non nel PATH

I server MCP vengono generati come sottoprocessi. Se il binario non viene trovato:

```
MCP server '<name>': <validation error>
```

Problemi comuni:
- Il comando (es. `npx`, `python`, `node`) non è nel PATH del daemon
- **Problema di PATH systemd/launchd:** Il daemon cattura il PATH al momento dell'installazione. Se si è installato il tool del server MCP dopo l'installazione del daemon, reinstallare il daemon per aggiornare il PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Il server si blocca

Se un processo server MCP si blocca, il ciclo di lettura termina e il server diventa non disponibile. Non c'è riconnessione automatica.

**Soluzione:** Riavviare il daemon per rigenerare tutti i server MCP.

### Trasporto SSE bloccato

I server MCP che utilizzano il trasporto SSE (Server-Sent Events) sono soggetti ai controlli SSRF:

```
MCP SSE connection blocked by SSRF policy
```

Gli URL SSE che puntano a indirizzi IP privati sono bloccati. Questo è per design. Utilizzare il trasporto stdio per i server MCP locali.

### Errori delle chiamate ai tool

```
tools/list failed: <message>
tools/call failed: <message>
```

Il server MCP ha risposto con un errore. Questo è l'errore del server, non di Triggerfish. Controllare i log propri del server MCP per i dettagli.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /path/to/vault
```

Il percorso del vault configurato in `plugins.obsidian.vault_path` non esiste. Assicurarsi che il percorso sia corretto e accessibile.

### Traversal del percorso bloccato

```
Path traversal rejected: <path>
Path escapes vault boundary: <path>
```

Un percorso di nota ha tentato di uscire dalla directory del vault (es. utilizzando `../`). Questo è un controllo di sicurezza. Tutte le operazioni sulle note sono confinate alla directory del vault.

### Cartelle escluse

```
Path is excluded: <path>
```

La nota si trova in una cartella elencata in `exclude_folders`. Per accedervi, rimuovere la cartella dalla lista di esclusione.

### Applicazione della classificazione

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Il vault o una cartella specifica ha un livello di classificazione che è in conflitto con il taint della sessione. Vedere [Risoluzione dei Problemi di Sicurezza](/it-IT/support/troubleshooting/security) per i dettagli sulle regole di write-down.
