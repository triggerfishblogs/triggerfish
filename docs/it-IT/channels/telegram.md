# Telegram

Connetta il Suo agente Triggerfish a Telegram per poter interagire con esso da
qualsiasi dispositivo dove usa Telegram. L'adattatore utilizza il framework
[grammY](https://grammy.dev/) per comunicare con l'API Bot di Telegram.

## Configurazione

### Passaggio 1: Crei un Bot

1. Apra Telegram e cerchi [@BotFather](https://t.me/BotFather)
2. Invii `/newbot`
3. Scelga un nome visualizzato per il Suo bot (es. "My Triggerfish")
4. Scelga un username per il Suo bot (deve terminare con `bot`, es.
   `my_triggerfish_bot`)
5. BotFather risponderà con il Suo **token bot** -- lo copi

::: warning Mantenga il Suo Token Segreto Il token bot concede il pieno
controllo del Suo bot. Non lo commetta mai nel controllo versione e non lo
condivida pubblicamente. Triggerfish lo archivia nel portachiavi del Suo sistema
operativo. :::

### Passaggio 2: Ottenga il Suo ID Utente Telegram

Triggerfish ha bisogno del Suo ID utente numerico per verificare che i messaggi
provengano da Lei. Gli username di Telegram possono essere cambiati e non sono
affidabili per l'identità -- l'ID numerico è permanente e assegnato dai server
di Telegram, quindi non può essere falsificato.

1. Cerchi [@getmyid_bot](https://t.me/getmyid_bot) su Telegram
2. Gli invii un messaggio qualsiasi
3. Risponderà con il Suo ID utente (un numero come `8019881968`)

### Passaggio 3: Aggiunga il Canale

Esegua la configurazione interattiva:

```bash
triggerfish config add-channel telegram
```

Questo richiede il token bot, l'ID utente e il livello di classificazione, poi
scrive la configurazione in `triggerfish.yaml` e offre di riavviare il daemon.

Può anche aggiungerlo manualmente:

```yaml
channels:
  telegram:
    # botToken archiviato nel portachiavi del SO
    ownerId: 8019881968
    classification: INTERNAL
```

| Opzione          | Tipo   | Obbligatorio | Descrizione                                       |
| ---------------- | ------ | ------------ | ------------------------------------------------- |
| `botToken`       | string | Sì           | Token API bot da @BotFather                       |
| `ownerId`        | number | Sì           | Il Suo ID utente numerico Telegram                |
| `classification` | string | No           | Tetto di classificazione (default: `INTERNAL`)    |

### Passaggio 4: Inizi a Chattare

Dopo il riavvio del daemon, apra il Suo bot in Telegram e invii `/start`. Il bot
La saluterà per confermare che la connessione è attiva. Può quindi chattare
direttamente con il Suo agente.

## Comportamento della Classificazione

L'impostazione `classification` è un **tetto** -- controlla la sensibilità
massima dei dati che possono fluire attraverso questo canale per le conversazioni
del **proprietario**. Non si applica uniformemente a tutti gli utenti.

**Come funziona per messaggio:**

- **Lei scrive al bot** (il Suo ID utente corrisponde a `ownerId`): la sessione
  usa il tetto del canale. Con il default `INTERNAL`, il Suo agente può
  condividere dati a livello interno con Lei.
- **Qualcun altro scrive al bot**: la sua sessione viene automaticamente
  contaminata `PUBLIC` indipendentemente dalla classificazione del canale. La
  regola no-write-down impedisce che qualsiasi dato interno raggiunga la sua
  sessione.

Questo significa che un singolo bot Telegram gestisce in sicurezza sia le
conversazioni del proprietario che quelle dei non proprietari. Il controllo di
identità avviene nel codice prima che l'LLM veda il messaggio -- l'LLM non può
influenzarlo.

| Classificazione Canale  | Messaggi Proprietario | Messaggi Non-Proprietario |
| ----------------------- | :-------------------: | :-----------------------: |
| `PUBLIC`                |        PUBLIC         |          PUBLIC           |
| `INTERNAL` (default)    |    Fino a INTERNAL    |          PUBLIC           |
| `CONFIDENTIAL`          | Fino a CONFIDENTIAL   |          PUBLIC           |
| `RESTRICTED`            |  Fino a RESTRICTED    |          PUBLIC           |

Veda [Sistema di Classificazione](/it-IT/architecture/classification) per il
modello completo e [Sessioni e Taint](/it-IT/architecture/taint-and-sessions) per
come funziona l'escalation del taint.

## Identità del Proprietario

Triggerfish determina lo stato di proprietario confrontando l'ID utente numerico
Telegram del mittente con il `ownerId` configurato. Questo controllo avviene nel
codice **prima** che l'LLM veda il messaggio:

- **Corrispondenza** -- Il messaggio è etichettato come proprietario e può
  accedere ai dati fino al tetto di classificazione del canale
- **Nessuna corrispondenza** -- Il messaggio è etichettato con taint `PUBLIC`, e
  la regola no-write-down impedisce che qualsiasi dato classificato fluisca verso
  quella sessione

::: danger Imposti Sempre il Suo Owner ID Senza `ownerId`, Triggerfish tratta
**tutti** i mittenti come proprietario. Chiunque trovi il Suo bot può accedere
ai Suoi dati fino al livello di classificazione del canale. Questo campo è
obbligatorio durante la configurazione per questo motivo. :::

## Suddivisione Messaggi

Telegram ha un limite di 4.096 caratteri per messaggio. Quando il Suo agente
genera una risposta più lunga, Triggerfish la divide automaticamente in più
messaggi. Il suddivisore divide su newline o spazi per la leggibilità -- evita
di tagliare parole o frasi a metà.

## Tipi di Messaggio Supportati

L'adattatore Telegram attualmente gestisce:

- **Messaggi di testo** -- Supporto completo invio e ricezione
- **Risposte lunghe** -- Automaticamente suddivise per rispettare i limiti di
  Telegram

## Indicatori di Digitazione

Quando il Suo agente sta elaborando una richiesta, il bot mostra "sta
scrivendo..." nella chat di Telegram. L'indicatore è attivo mentre l'LLM sta
generando una risposta e si cancella quando la risposta viene inviata.

## Cambiare la Classificazione

Per alzare o abbassare il tetto di classificazione:

```bash
triggerfish config add-channel telegram
# Selezioni di sovrascrivere la configurazione esistente quando richiesto
```

Oppure modifichi `triggerfish.yaml` direttamente:

```yaml
channels:
  telegram:
    # botToken archiviato nel portachiavi del SO
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Riavvii il daemon dopo la modifica: `triggerfish stop && triggerfish start`
