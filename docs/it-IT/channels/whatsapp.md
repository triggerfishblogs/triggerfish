# WhatsApp

Connetta il Suo agente Triggerfish a WhatsApp per poter interagire con esso dal
Suo telefono. L'adattatore utilizza la **WhatsApp Business Cloud API** (l'API
HTTP ufficiale ospitata da Meta), ricevendo messaggi tramite webhook e inviando
tramite REST.

## Classificazione Predefinita

WhatsApp è predefinito a classificazione `PUBLIC`. I contatti WhatsApp possono
includere chiunque abbia il Suo numero di telefono, quindi `PUBLIC` è il valore
predefinito sicuro.

## Configurazione

### Passaggio 1: Crei un Account Meta Business

1. Vada al portale [Meta for Developers](https://developers.facebook.com/)
2. Crei un account sviluppatore se non ne ha uno
3. Crei una nuova app e selezioni **Business** come tipo di app
4. Nel dashboard della Sua app, aggiunga il prodotto **WhatsApp**

### Passaggio 2: Ottenga le Sue Credenziali

Dalla sezione WhatsApp del dashboard della Sua app, raccolga questi valori:

- **Access Token** -- Un token di accesso permanente (o ne generi uno temporaneo
  per i test)
- **Phone Number ID** -- L'ID del numero di telefono registrato con WhatsApp
  Business
- **Verify Token** -- Una stringa a Sua scelta, usata per verificare la
  registrazione del webhook

### Passaggio 3: Configuri i Webhook

1. Nelle impostazioni del prodotto WhatsApp, navighi su **Webhooks**
2. Imposti l'URL di callback all'indirizzo pubblico del Suo server (es.
   `https://your-server.com:8443/webhook`)
3. Imposti il **Verify Token** allo stesso valore che userà nella configurazione
   di Triggerfish
4. Si iscriva al campo webhook `messages`

::: info URL Pubblico Richiesto I webhook WhatsApp richiedono un endpoint HTTPS
accessibile pubblicamente. Se sta eseguendo Triggerfish localmente, avrà bisogno
di un servizio tunnel (es. ngrok, Cloudflare Tunnel) o di un server con IP
pubblico. :::

### Passaggio 4: Configuri Triggerfish

Aggiunga il canale WhatsApp al Suo `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken archiviato nel portachiavi del SO
    phoneNumberId: "your-phone-number-id"
    # verifyToken archiviato nel portachiavi del SO
    ownerPhone: "15551234567"
```

| Opzione          | Tipo   | Obbligatorio | Descrizione                                                          |
| ---------------- | ------ | ------------ | -------------------------------------------------------------------- |
| `accessToken`    | string | Sì           | Token di accesso API WhatsApp Business                               |
| `phoneNumberId`  | string | Sì           | Phone Number ID dal Dashboard Meta Business                          |
| `verifyToken`    | string | Sì           | Token per la verifica del webhook (lo sceglie Lei)                   |
| `webhookPort`    | number | No           | Porta per ascoltare i webhook (default: `8443`)                      |
| `ownerPhone`     | string | Consigliato  | Il Suo numero di telefono per la verifica proprietario (es. `"15551234567"`) |
| `classification` | string | No           | Livello di classificazione (default: `PUBLIC`)                       |

::: warning Archivi i Secret in Modo Sicuro Non commetta mai i token di accesso
nel controllo versione. Utilizzi variabili d'ambiente o il portachiavi del SO. :::

### Passaggio 5: Avvii Triggerfish

```bash
triggerfish stop && triggerfish start
```

Invii un messaggio dal Suo telefono al numero WhatsApp Business per confermare
la connessione.

## Identità del Proprietario

Triggerfish determina lo stato di proprietario confrontando il numero di telefono
del mittente con il `ownerPhone` configurato. Questo controllo avviene nel
codice prima che l'LLM veda il messaggio:

- **Corrispondenza** -- Il messaggio è un comando del proprietario
- **Nessuna corrispondenza** -- Il messaggio è input esterno con taint `PUBLIC`

Se nessun `ownerPhone` è configurato, tutti i messaggi sono trattati come
provenienti dal proprietario.

::: tip Imposti Sempre il Telefono del Proprietario Se altri potrebbero
scrivere al Suo numero WhatsApp Business, configuri sempre `ownerPhone` per
impedire l'esecuzione non autorizzata di comandi. :::

## Come Funziona il Webhook

L'adattatore avvia un server HTTP sulla porta configurata (default `8443`) che
gestisce due tipi di richieste:

1. **GET /webhook** -- Meta lo invia per verificare il Suo endpoint webhook.
   Triggerfish risponde con il token di challenge se il verify token corrisponde.
2. **POST /webhook** -- Meta invia qui i messaggi in arrivo. Triggerfish analizza
   il payload del webhook Cloud API, estrae i messaggi di testo e li inoltra al
   gestore dei messaggi.

## Limiti dei Messaggi

WhatsApp supporta messaggi fino a 4.096 caratteri. I messaggi che superano
questo limite vengono suddivisi in più messaggi prima dell'invio.

## Indicatori di Digitazione

Triggerfish invia e riceve indicatori di digitazione su WhatsApp. Quando il Suo
agente sta elaborando una richiesta, la chat mostra un indicatore di
digitazione. Sono supportate anche le conferme di lettura.

## Cambiare la Classificazione

```yaml
channels:
  whatsapp:
    # accessToken archiviato nel portachiavi del SO
    phoneNumberId: "your-phone-number-id"
    # verifyToken archiviato nel portachiavi del SO
    classification: INTERNAL
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
