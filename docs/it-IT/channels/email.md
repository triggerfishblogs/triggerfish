# Email

Connetta il Suo agente Triggerfish all'email affinché possa ricevere messaggi
tramite IMAP e inviare risposte tramite un servizio relay SMTP. L'adattatore
supporta servizi come SendGrid, Mailgun e Amazon SES per l'email in uscita, e
interroga qualsiasi server IMAP per i messaggi in entrata.

## Classificazione Predefinita

Email è predefinito a classificazione `CONFIDENTIAL`. L'email spesso contiene
contenuti sensibili (contratti, notifiche di account, corrispondenza personale),
quindi `CONFIDENTIAL` è il valore predefinito sicuro.

## Configurazione

### Passaggio 1: Scelga un Relay SMTP

Triggerfish invia email in uscita attraverso un'API relay SMTP basata su HTTP.
I servizi supportati includono:

| Servizio   | Endpoint API                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Si registri a uno di questi servizi e ottenga una chiave API.

### Passaggio 2: Configuri IMAP per la Ricezione

Servono credenziali IMAP per ricevere email. La maggior parte dei provider email
supporta IMAP:

| Provider | Host IMAP                 | Porta |
| -------- | ------------------------- | ----- |
| Gmail    | `imap.gmail.com`          | 993   |
| Outlook  | `outlook.office365.com`   | 993   |
| Fastmail | `imap.fastmail.com`       | 993   |
| Custom   | Il Suo server di posta    | 993   |

::: info Password App Gmail Se usa Gmail con l'autenticazione a due fattori,
dovrà generare una
[Password App](https://myaccount.google.com/apppasswords) per l'accesso IMAP. La
Sua password Gmail regolare non funzionerà. :::

### Passaggio 3: Configuri Triggerfish

Aggiunga il canale Email al Suo `triggerfish.yaml`:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

I secret (chiave API SMTP, password IMAP) vengono inseriti durante
`triggerfish config add-channel email` e archiviati nel portachiavi del SO.

| Opzione          | Tipo   | Obbligatorio | Descrizione                                                     |
| ---------------- | ------ | ------------ | --------------------------------------------------------------- |
| `smtpApiUrl`     | string | Sì           | URL endpoint API relay SMTP                                     |
| `imapHost`       | string | Sì           | Hostname del server IMAP                                        |
| `imapPort`       | number | No           | Porta del server IMAP (default: `993`)                          |
| `imapUser`       | string | Sì           | Username IMAP (solitamente il Suo indirizzo email)              |
| `fromAddress`    | string | Sì           | Indirizzo mittente per le email in uscita                       |
| `pollInterval`   | number | No           | Frequenza di controllo nuove email, in ms (default: `30000`)    |
| `classification` | string | No           | Livello di classificazione (default: `CONFIDENTIAL`)            |
| `ownerEmail`     | string | Consigliato  | Il Suo indirizzo email per la verifica proprietario             |

::: warning Credenziali La chiave API SMTP e la password IMAP sono archiviate
nel portachiavi del SO (Linux: GNOME Keyring, macOS: Keychain Access). Non
appaiono mai in `triggerfish.yaml`. :::

### Passaggio 4: Avvii Triggerfish

```bash
triggerfish stop && triggerfish start
```

Invii un'email all'indirizzo configurato per confermare la connessione.

## Identità del Proprietario

Triggerfish determina lo stato di proprietario confrontando l'indirizzo email del
mittente con il `ownerEmail` configurato:

- **Corrispondenza** -- Il messaggio è un comando del proprietario
- **Nessuna corrispondenza** -- Il messaggio è input esterno con taint `PUBLIC`

Se nessun `ownerEmail` è configurato, tutti i messaggi sono trattati come
provenienti dal proprietario.

## Classificazione Basata sul Dominio

Per un controllo più granulare, l'email supporta la classificazione dei
destinatari basata sul dominio. Questo è particolarmente utile in ambienti
enterprise:

- Le email da `@suaazienda.com` possono essere classificate come `INTERNAL`
- Le email da domini sconosciuti sono predefinite come `EXTERNAL`
- L'amministratore può configurare un elenco di domini interni

```yaml
channels:
  email:
    # ... altra configurazione
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

Questo significa che il motore di policy applica regole diverse in base alla
provenienza di un'email:

| Dominio del Mittente             | Classificazione |
| -------------------------------- | :-------------: |
| Dominio interno configurato      |   `INTERNAL`    |
| Dominio sconosciuto              |   `EXTERNAL`    |

## Come Funziona

### Messaggi in Entrata

L'adattatore interroga il server IMAP all'intervallo configurato (default: ogni
30 secondi) per nuovi messaggi non letti. Quando arriva una nuova email:

1. L'indirizzo del mittente viene estratto
2. Lo stato di proprietario viene verificato rispetto a `ownerEmail`
3. Il corpo dell'email viene inoltrato al gestore dei messaggi
4. Ogni thread email viene mappato a un ID sessione basato sull'indirizzo del
   mittente (`email-sender@example.com`)

### Messaggi in Uscita

Quando l'agente risponde, l'adattatore invia la risposta tramite l'API HTTP del
relay SMTP configurato. La risposta include:

- **Da** -- Il `fromAddress` configurato
- **A** -- L'indirizzo email del mittente originale
- **Oggetto** -- "Triggerfish" (default)
- **Corpo** -- La risposta dell'agente come testo semplice

## Intervallo di Polling

L'intervallo di polling predefinito è 30 secondi. Può regolarlo in base alle
Sue esigenze:

```yaml
channels:
  email:
    # ... altra configurazione
    pollInterval: 10000 # Controlla ogni 10 secondi
```

::: tip Bilanci Reattività e Risorse Un intervallo di polling più breve
significa risposte più rapide alle email in arrivo, ma connessioni IMAP più
frequenti. Per la maggior parte degli usi personali, 30 secondi è un buon
equilibrio. :::

## Cambiare la Classificazione

```yaml
channels:
  email:
    # ... altra configurazione
    classification: CONFIDENTIAL
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
