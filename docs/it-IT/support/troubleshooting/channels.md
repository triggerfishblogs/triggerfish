# Risoluzione dei Problemi: Canali

## Problemi Generali dei Canali

### Il canale appare connesso ma nessun messaggio arriva

1. **Verificare l'ID proprietario.** Se `ownerId` non è impostato o è errato, i messaggi dall'utente possono essere instradati come messaggi esterni (non-proprietario) con permessi limitati.
2. **Verificare la classificazione.** Se la classificazione del canale è inferiore al taint della sessione, le risposte vengono bloccate dalla regola no write-down.
3. **Controllare i log del daemon.** Eseguire `triggerfish logs --level WARN` e cercare errori di consegna.

### I messaggi non vengono inviati

Il router registra i fallimenti di consegna. Controllare `triggerfish logs` per:

```
Channel send failed
```

Questo significa che il router ha tentato la consegna ma l'adattatore del canale ha restituito un errore. L'errore specifico viene registrato insieme ad esso.

### Comportamento dei tentativi

Il router dei canali utilizza il backoff esponenziale per gli invii falliti. Se un messaggio fallisce, viene ritentato con ritardi crescenti. Dopo l'esaurimento di tutti i tentativi, il messaggio viene scartato e l'errore viene registrato.

---

## Telegram

### Il bot non risponde

1. **Verificare il token.** Andare su @BotFather su Telegram, verificare che il token sia valido e corrisponda a quanto memorizzato nel portachiavi.
2. **Inviare un messaggio diretto al bot.** I messaggi di gruppo richiedono che il bot abbia i permessi per i messaggi di gruppo.
3. **Verificare errori di polling.** Telegram utilizza il long polling. Se la connessione cade, l'adattatore si riconnette automaticamente, ma problemi di rete persistenti impediranno la ricezione dei messaggi.

### I messaggi vengono divisi in più parti

Telegram ha un limite di 4.096 caratteri per messaggio. Le risposte lunghe vengono automaticamente suddivise. Questo è il comportamento normale.

### I comandi del bot non appaiono nel menu

L'adattatore registra i comandi slash all'avvio. Se la registrazione fallisce, viene registrato un avviso ma continua a funzionare. Questo non è fatale. Il bot funziona comunque; il menu dei comandi semplicemente non mostrerà i suggerimenti di autocompletamento.

### Non è possibile eliminare i vecchi messaggi

Telegram non permette ai bot di eliminare messaggi più vecchi di 48 ore. I tentativi di eliminare vecchi messaggi falliscono silenziosamente. Questa è una limitazione dell'API Telegram.

---

## Slack

### Il bot non si connette

Slack richiede tre credenziali:

| Credenziale | Formato | Dove trovarla |
|-------------|---------|---------------|
| Bot Token | `xoxb-...` | Pagina OAuth & Permissions nelle impostazioni dell'app Slack |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Stringa esadecimale | Basic Information > App Credentials |

Se una delle tre è mancante o non valida, la connessione fallisce. L'errore più comune è dimenticare l'App Token, che è separato dal Bot Token.

### Problemi con Socket Mode

Triggerfish utilizza la Socket Mode di Slack, non le sottoscrizioni di eventi HTTP. Nelle impostazioni dell'app Slack:

1. Andare su "Socket Mode" e assicurarsi che sia abilitata
2. Creare un token a livello di app con scope `connections:write`
3. Questo token è l'`appToken` (`xapp-...`)

Se Socket Mode non è abilitata, il solo bot token non è sufficiente per la messaggistica in tempo reale.

### I messaggi vengono troncati

Slack ha un limite di 40.000 caratteri. A differenza di Telegram e Discord, Triggerfish tronca i messaggi Slack piuttosto che dividerli. Se si raggiunge regolarmente questo limite, considerare di chiedere all'agent di produrre output più concisi.

### Leak di risorse dell'SDK nei test

L'SDK Slack causa leak di operazioni asincrone all'importazione. Questo è un problema noto upstream. I test che utilizzano l'adattatore Slack necessitano di `sanitizeResources: false` e `sanitizeOps: false`. Questo non influisce sull'uso in produzione.

---

## Discord

### Il bot non riesce a leggere i messaggi nei server

Discord richiede l'intent privilegiato **Message Content**. Senza di esso, il bot riceve gli eventi dei messaggi ma il contenuto del messaggio è vuoto.

**Soluzione:** Nel [Portale Sviluppatori Discord](https://discord.com/developers/applications):
1. Selezionare l'applicazione
2. Andare nelle impostazioni "Bot"
3. Abilitare "Message Content Intent" sotto Privileged Gateway Intents
4. Salvare le modifiche

### Intent del bot richiesti

L'adattatore richiede che questi intent siano abilitati:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privilegiato)

### I messaggi vengono suddivisi

Discord ha un limite di 2.000 caratteri. I messaggi lunghi vengono automaticamente divisi in messaggi multipli.

### L'indicatore di digitazione fallisce

L'adattatore invia indicatori di digitazione prima delle risposte. Se il bot non ha il permesso di inviare messaggi in un canale, l'indicatore di digitazione fallisce silenziosamente (registrato a livello DEBUG). Questo è solo cosmetico.

### Leak di risorse dell'SDK

Come Slack, l'SDK discord.js causa leak di operazioni asincrone all'importazione. I test necessitano di `sanitizeOps: false`. Questo non influisce sulla produzione.

---

## WhatsApp

### Nessun messaggio ricevuto

WhatsApp utilizza un modello webhook. Il bot ascolta le richieste HTTP POST in arrivo dai server di Meta. Perché i messaggi arrivino:

1. **Registrare l'URL del webhook** nella [Dashboard Meta Business](https://developers.facebook.com/)
2. **Configurare il token di verifica.** L'adattatore esegue un handshake di verifica quando Meta si connette per la prima volta
3. **Avviare il listener del webhook.** L'adattatore ascolta sulla porta 8443 per impostazione predefinita. Assicurarsi che questa porta sia raggiungibile da internet (utilizzare un reverse proxy o tunnel)

### Avviso "ownerPhone not configured"

Se `ownerPhone` non è impostato nella configurazione del canale WhatsApp, tutti i mittenti vengono trattati come proprietario. Questo significa che ogni utente ottiene accesso completo a tutti i tool. Questo è un problema di sicurezza.

**Soluzione:** Impostare il numero di telefono del proprietario nella configurazione:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Token di accesso scaduto

I token di accesso dell'API WhatsApp Cloud possono scadere. Se gli invii iniziano a fallire con errori 401, rigenerare il token nella dashboard Meta e aggiornarlo:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### signal-cli non trovato

Il canale Signal richiede `signal-cli`, un'applicazione Java di terze parti. Triggerfish tenta di auto-installarlo durante la configurazione, ma questo può fallire se:

- Java (JRE 21+) non è disponibile e l'auto-installazione del JRE 25 è fallita
- Il download è stato bloccato da restrizioni di rete
- La directory di destinazione non è scrivibile

**Installazione manuale:**

```bash
# Installare signal-cli manualmente
# Vedere https://github.com/AsamK/signal-cli per le istruzioni
```

### Il daemon signal-cli non è raggiungibile

Dopo l'avvio di signal-cli, Triggerfish attende fino a 60 secondi perché diventi raggiungibile. Se questo scade:

```
signal-cli daemon (tcp) not reachable within 60s
```

Verificare:
1. signal-cli è effettivamente in esecuzione? Controllare `ps aux | grep signal-cli`
2. Sta ascoltando sull'endpoint previsto (socket TCP o socket Unix)?
3. L'account Signal deve essere collegato? Eseguire `triggerfish config add-channel signal` per ripetere il processo di collegamento.

### Collegamento del dispositivo fallito

Signal richiede il collegamento del dispositivo all'account Signal tramite codice QR. Se il processo di collegamento fallisce:

1. Assicurarsi che Signal sia installato sul telefono
2. Aprire Signal > Impostazioni > Dispositivi Collegati > Collega Nuovo Dispositivo
3. Scansionare il codice QR mostrato dalla procedura guidata di configurazione
4. Se il codice QR è scaduto, riavviare il processo di collegamento

### Discrepanza di versione signal-cli

Triggerfish si àncora a una versione nota di signal-cli. Se si è installata una versione diversa, si potrebbe vedere un avviso:

```
Signal CLI version older than known-good
```

Questo non è fatale ma potrebbe causare problemi di compatibilità.

---

## Email

### La connessione IMAP fallisce

L'adattatore email si connette al server IMAP per la posta in arrivo. Problemi comuni:

- **Credenziali errate.** Verificare nome utente e password IMAP.
- **Porta 993 bloccata.** L'adattatore utilizza IMAP su TLS (porta 993). Alcune reti la bloccano.
- **Password specifica per app richiesta.** Gmail e altri provider richiedono password specifiche per app quando l'autenticazione a due fattori è abilitata.

Messaggi di errore che si potrebbero vedere:
- `IMAP LOGIN failed` - nome utente o password errati
- `IMAP connection not established` - non è possibile raggiungere il server
- `IMAP connection closed unexpectedly` - il server ha interrotto la connessione

### Fallimenti di invio SMTP

L'adattatore email invia tramite un relay API SMTP (non SMTP diretto). Se gli invii falliscono con errori HTTP:

- 401/403: chiave API non valida
- 429: limite di frequenza raggiunto
- 5xx: il servizio di relay è inattivo

### Il polling IMAP si ferma

L'adattatore controlla nuove email ogni 30 secondi. Se il polling fallisce, l'errore viene registrato ma non c'è riconnessione automatica. Riavviare il daemon per ristabilire la connessione IMAP.

Questa è una limitazione nota. Vedere [Problemi Noti](/it-IT/support/kb/known-issues).

---

## WebChat

### Upgrade WebSocket rifiutato

L'adattatore WebChat valida le connessioni in arrivo:

- **Header troppo grandi (431).** La dimensione combinata degli header supera 8.192 byte. Questo può accadere con cookie eccessivamente grandi o header personalizzati.
- **Rifiuto CORS.** Se `allowedOrigins` è configurato, l'header Origin deve corrispondere. Il valore predefinito è `["*"]` (consenti tutto).
- **Frame malformati.** JSON non valido nei frame WebSocket viene registrato a livello WARN e il frame viene scartato.

### Classificazione

WebChat ha come predefinito la classificazione PUBLIC. I visitatori non vengono mai trattati come proprietario. Se si necessita di una classificazione più alta per WebChat, impostarla esplicitamente:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### Fallimenti del polling PubSub

Google Chat utilizza Pub/Sub per la consegna dei messaggi. Se il polling fallisce:

```
Google Chat PubSub poll failed
```

Verificare:
- Le credenziali Google Cloud sono valide (controllare il `credentials_ref` nella configurazione)
- La sottoscrizione Pub/Sub esiste e non è stata eliminata
- L'account di servizio ha il ruolo `pubsub.subscriber`

### Messaggi di gruppo negati

Se la modalità gruppo non è configurata, i messaggi di gruppo possono essere silenziosamente scartati:

```
Google Chat group message denied by group mode
```

Configurare `defaultGroupMode` nella configurazione del canale Google Chat.

### ownerEmail non configurato

Senza `ownerEmail`, tutti gli utenti vengono trattati come non-proprietario:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Impostarlo nella configurazione per ottenere accesso completo ai tool.
