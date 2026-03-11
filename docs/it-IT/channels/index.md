# Panoramica Multicanale

Triggerfish si connette alle Sue piattaforme di messaggistica esistenti. Parli
con il Suo agente ovunque comunichi già -- terminale, Telegram, Slack, Discord,
WhatsApp, un widget web o email. Ogni canale ha il proprio livello di
classificazione, controlli di identità del proprietario e applicazione delle
policy.

## Come Funzionano i Canali

Ogni adattatore di canale implementa la stessa interfaccia: `connect`,
`disconnect`, `send`, `onMessage` e `status`. Il **channel router** si trova
sopra tutti gli adattatori e gestisce l'invio dei messaggi, i controlli di
classificazione e la logica di retry.

<img src="/diagrams/channel-router.svg" alt="Channel router: tutti gli adattatori di canale fluiscono attraverso un gate di classificazione centrale verso il Gateway Server" style="max-width: 100%;" />

Quando un messaggio arriva su qualsiasi canale, il router:

1. Identifica il mittente (proprietario o esterno) usando **controlli di
   identità a livello di codice** -- non interpretazione dell'LLM
2. Etichetta il messaggio con il livello di classificazione del canale
3. Lo inoltra al motore di policy per l'applicazione
4. Instrada la risposta dell'agente attraverso lo stesso canale

## Classificazione dei Canali

Ogni canale ha un livello di classificazione predefinito che determina quali dati
possono fluire attraverso di esso. Il motore di policy applica la **regola no
write-down**: i dati a un dato livello di classificazione non possono mai fluire
verso un canale con una classificazione inferiore.

| Canale                                    | Classificazione Predefinita | Rilevamento Proprietario                   |
| ----------------------------------------- | :-------------------------: | ------------------------------------------ |
| [CLI](/it-IT/channels/cli)                |         `INTERNAL`          | Sempre proprietario (utente del terminale) |
| [Telegram](/it-IT/channels/telegram)      |         `INTERNAL`          | Corrispondenza ID utente Telegram          |
| [Signal](/it-IT/channels/signal)          |          `PUBLIC`           | Mai proprietario (l'adattatore È il telefono) |
| [Slack](/it-IT/channels/slack)            |          `PUBLIC`           | ID utente Slack tramite OAuth              |
| [Discord](/it-IT/channels/discord)        |          `PUBLIC`           | Corrispondenza ID utente Discord           |
| [WhatsApp](/it-IT/channels/whatsapp)      |          `PUBLIC`           | Corrispondenza numero di telefono          |
| [WebChat](/it-IT/channels/webchat)        |          `PUBLIC`           | Mai proprietario (visitatori)              |
| [Email](/it-IT/channels/email)            |       `CONFIDENTIAL`        | Corrispondenza indirizzo email             |

::: tip Completamente Configurabile Tutte le classificazioni sono configurabili
nel Suo `triggerfish.yaml`. Può impostare qualsiasi canale a qualsiasi livello
di classificazione in base ai Suoi requisiti di sicurezza.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Classificazione Effettiva

La classificazione effettiva per qualsiasi messaggio è il **minimo** tra la
classificazione del canale e la classificazione del destinatario:

| Livello Canale | Livello Destinatario | Livello Effettivo |
| -------------- | -------------------- | ----------------- |
| INTERNAL       | INTERNAL             | INTERNAL          |
| INTERNAL       | EXTERNAL             | PUBLIC            |
| CONFIDENTIAL   | INTERNAL             | INTERNAL          |
| CONFIDENTIAL   | EXTERNAL             | PUBLIC            |

Questo significa che anche se un canale è classificato come `CONFIDENTIAL`, i
messaggi a destinatari esterni su quel canale vengono trattati come `PUBLIC`.

## Stati dei Canali

I canali si muovono attraverso stati definiti:

- **UNTRUSTED** -- I canali nuovi o sconosciuti partono qui. Nessun dato fluisce
  in entrata o in uscita. Il canale è completamente isolato finché non lo
  classifica.
- **CLASSIFIED** -- Il canale ha un livello di classificazione assegnato ed è
  attivo. I messaggi fluiscono secondo le regole di policy.
- **BLOCKED** -- Il canale è stato esplicitamente disabilitato. Nessun messaggio
  viene elaborato.

::: warning Canali UNTRUSTED Un canale `UNTRUSTED` non può ricevere dati
dall'agente e non può inviare dati nel contesto dell'agente. Questo è un confine
di sicurezza rigido, non un suggerimento. :::

## Channel Router

Il channel router gestisce tutti gli adattatori registrati e fornisce:

- **Registrazione adattatori** -- Registra e annulla la registrazione degli
  adattatori di canale per ID canale
- **Invio messaggi** -- Instrada i messaggi in uscita verso l'adattatore corretto
- **Retry con backoff esponenziale** -- Gli invii falliti vengono riprovati fino
  a 3 volte con ritardi crescenti (1s, 2s, 4s)
- **Operazioni in blocco** -- `connectAll()` e `disconnectAll()` per la gestione
  del ciclo di vita

```yaml
# Il comportamento di retry del router è configurabile
router:
  maxRetries: 3
  baseDelay: 1000 # millisecondi
```

## Ripple: Digitazione e Presenza

Triggerfish trasmette indicatori di digitazione e stato di presenza tra i canali
che li supportano. Questo si chiama **Ripple**.

| Canale   | Indicatori di Digitazione | Conferme di Lettura |
| -------- | :-----------------------: | :-----------------: |
| Telegram |     Invio e ricezione     |         Sì          |
| Signal   |     Invio e ricezione     |         --          |
| Slack    |       Solo invio          |         --          |
| Discord  |       Solo invio          |         --          |
| WhatsApp |     Invio e ricezione     |         Sì          |
| WebChat  |     Invio e ricezione     |         Sì          |

Stati di presenza dell'agente: `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## Suddivisione Messaggi

Le piattaforme hanno limiti sulla lunghezza dei messaggi. Triggerfish suddivide
automaticamente le risposte lunghe per adattarsi ai vincoli di ogni piattaforma,
dividendo su newline o spazi per la leggibilità:

| Canale   | Lunghezza Massima Messaggio |
| -------- | :-------------------------: |
| Telegram |      4.096 caratteri        |
| Signal   |      4.000 caratteri        |
| Discord  |      2.000 caratteri        |
| Slack    |     40.000 caratteri        |
| WhatsApp |      4.096 caratteri        |
| WebChat  |         Illimitata          |

## Prossimi Passi

Configuri i canali che utilizza:

- [CLI](/it-IT/channels/cli) -- Sempre disponibile, nessuna configurazione necessaria
- [Telegram](/it-IT/channels/telegram) -- Crei un bot tramite @BotFather
- [Signal](/it-IT/channels/signal) -- Si colleghi tramite il daemon signal-cli
- [Slack](/it-IT/channels/slack) -- Crei un'app Slack con Socket Mode
- [Discord](/it-IT/channels/discord) -- Crei un'applicazione bot Discord
- [WhatsApp](/it-IT/channels/whatsapp) -- Si connetta tramite WhatsApp Business Cloud API
- [WebChat](/it-IT/channels/webchat) -- Incorpori un widget di chat nel Suo sito
- [Email](/it-IT/channels/email) -- Si connetta tramite IMAP e relay SMTP
