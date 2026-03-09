# La Regola No Write-Down

La regola no write-down è il fondamento del modello di protezione dei dati di
Triggerfish. È una regola fissa, non configurabile, che si applica a ogni sessione,
ogni canale e ogni agent -- senza eccezioni e senza possibilità di override da parte
del LLM.

**La regola:** I dati possono fluire solo verso canali e destinatari con un livello
di classificazione **uguale o superiore**.

Questa singola regola previene un'intera classe di scenari di fuga di dati, dalla
condivisione accidentale ad attacchi sofisticati di prompt injection progettati per
esfiltrare informazioni sensibili.

## Come Fluisce la Classificazione

Triggerfish utilizza quattro livelli di classificazione (dal più alto al più basso):

<img src="/diagrams/write-down-rules.svg" alt="Regole write-down: i dati fluiscono solo verso livelli di classificazione uguali o superiori" style="max-width: 100%;" />

I dati classificati a un dato livello possono fluire verso quel livello o qualsiasi
livello superiore. Non possono mai fluire verso il basso. Questa è la regola
no write-down.

::: danger La regola no write-down è **fissa e non configurabile**. Non può essere
attenuata dagli amministratori, sovrascritta dalle regole di policy o aggirata dal
LLM. È il fondamento architetturale su cui poggiano tutti gli altri controlli di
sicurezza. :::

## Classificazione Effettiva

Quando i dati stanno per lasciare il sistema, Triggerfish calcola la
**classificazione effettiva** della destinazione:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Sia il canale che il destinatario devono essere al livello o sopra il livello di
classificazione dei dati. Se uno dei due è inferiore, l'output viene bloccato.

| Canale              | Destinatario                 | Classificazione Effettiva |
| -------------------- | --------------------------- | ------------------------ |
| INTERNAL (Slack)     | INTERNAL (collega)          | INTERNAL                 |
| INTERNAL (Slack)     | EXTERNAL (fornitore)        | PUBLIC                   |
| CONFIDENTIAL (Slack) | INTERNAL (collega)          | INTERNAL                 |
| CONFIDENTIAL (Email) | EXTERNAL (contatto personale) | PUBLIC                 |

::: info Un canale CONFIDENTIAL con un destinatario EXTERNAL ha una classificazione
effettiva di PUBLIC. Se la sessione ha acceduto a dati superiori a PUBLIC, l'output
viene bloccato. :::

## Esempio Reale

Ecco uno scenario concreto che mostra la regola no write-down in azione.

```
Utente: "Controlla la mia pipeline Salesforce"

Agent: [accede a Salesforce tramite il token delegato dell'utente]
       [dati Salesforce classificati come CONFIDENTIAL]
       [il taint della sessione sale a CONFIDENTIAL]

       "Hai 3 trattative in chiusura questa settimana per un totale di 2,1M$..."

Utente: "Manda un messaggio a mia moglie che farò tardi stasera"

Livello policy: BLOCCATO
  - Taint della sessione: CONFIDENTIAL
  - Destinatario (moglie): EXTERNAL
  - Classificazione effettiva: PUBLIC
  - CONFIDENTIAL > PUBLIC --> violazione write-down

Agent: "Non posso inviare messaggi a contatti esterni in questa sessione
        perché abbiamo acceduto a dati riservati.

        -> Resetta la sessione e invia il messaggio
        -> Annulla"
```

L'utente ha acceduto ai dati Salesforce (classificati CONFIDENTIAL), il che ha
contaminato l'intera sessione. Quando ha poi tentato di inviare un messaggio a un
contatto esterno (classificazione effettiva PUBLIC), il livello delle policy ha
bloccato l'output perché i dati CONFIDENTIAL non possono fluire verso una
destinazione PUBLIC.

::: tip Il messaggio dell'agent alla moglie ("Farò tardi stasera") non contiene di
per sé dati Salesforce. Ma la sessione è stata contaminata dall'accesso precedente a
Salesforce, e l'intero contesto della sessione -- incluso tutto ciò che il LLM
potrebbe aver trattenuto dalla risposta Salesforce -- potrebbe influenzare l'output.
La regola no write-down previene questa intera classe di fuga di contesto. :::

## Cosa Vede l'Utente

Quando la regola no write-down blocca un'azione, l'utente riceve un messaggio
chiaro e utilizzabile. Triggerfish offre due modalità di risposta:

**Predefinita (specifica):**

```
Non posso inviare dati riservati a un canale pubblico.

-> Resetta la sessione e invia il messaggio
-> Annulla
```

**Educativa (opt-in tramite configurazione):**

```
Non posso inviare dati riservati a un canale pubblico.

Perché: Questa sessione ha acceduto a Salesforce (CONFIDENTIAL).
WhatsApp personale è classificato come PUBLIC.
I dati possono fluire solo verso classificazioni uguali o superiori.

Opzioni:
  - Resetta la sessione e invia il messaggio
  - Chiedi al tuo amministratore di riclassificare il canale WhatsApp
  - Scopri di più: https://trigger.fish/security/no-write-down
```

In entrambi i casi, all'utente vengono offerte opzioni chiare. Non resta mai
confuso su cosa sia successo o cosa possa fare al riguardo.

## Reset della Sessione

Quando un utente sceglie "Resetta la sessione e invia il messaggio", Triggerfish
esegue un **reset completo**:

1. Il taint della sessione viene riportato a PUBLIC
2. L'intera cronologia della conversazione viene cancellata (prevenendo la fuga di contesto)
3. L'azione richiesta viene quindi rivalutata rispetto alla sessione pulita
4. Se l'azione è ora consentita (dati PUBLIC verso un canale PUBLIC), procede

::: warning SICUREZZA Il reset della sessione cancella sia il taint **che** la
cronologia della conversazione. Questo non è opzionale. Se venisse cancellata solo
l'etichetta di taint mantenendo il contesto della conversazione, il LLM potrebbe
ancora fare riferimento a informazioni classificate da messaggi precedenti, vanificando
lo scopo del reset. :::

## Come Funziona l'Applicazione

La regola no write-down viene applicata all'hook `PRE_OUTPUT` -- l'ultimo punto di
applicazione prima che qualsiasi dato lasci il sistema. L'hook viene eseguito come
codice sincrono e deterministico:

```typescript
// Logica di applicazione semplificata
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Il taint della sessione (${sessionTaint}) supera la classificazione ` +
        `effettiva (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Controllo classificazione superato" };
}
```

Questo codice è:

- **Deterministico** -- gli stessi input producono sempre la stessa decisione
- **Sincrono** -- l'hook si completa prima che qualsiasi output venga inviato
- **Non falsificabile** -- il LLM non può influenzare la decisione dell'hook
- **Registrato** -- ogni esecuzione viene registrata con contesto completo

## Taint di Sessione ed Escalazione

Il taint di sessione tiene traccia del livello di classificazione più alto dei dati
acceduti durante una sessione. Segue due regole rigide:

1. **Solo escalazione** -- il taint può aumentare, mai diminuire all'interno di una sessione
2. **Automatico** -- il taint viene aggiornato dall'hook `POST_TOOL_RESPONSE` ogni volta che dati entrano nella sessione

| Azione                             | Taint Prima    | Taint Dopo               |
| ----------------------------------- | -------------- | ------------------------ |
| Accesso API meteo (PUBLIC)         | PUBLIC         | PUBLIC                   |
| Accesso wiki interno (INTERNAL)    | PUBLIC         | INTERNAL                 |
| Accesso Salesforce (CONFIDENTIAL)  | INTERNAL       | CONFIDENTIAL             |
| Accesso API meteo di nuovo (PUBLIC)| CONFIDENTIAL   | CONFIDENTIAL (invariato) |

Una volta che una sessione raggiunge CONFIDENTIAL, resta CONFIDENTIAL fino a quando
l'utente non esegue esplicitamente un reset. Non c'è decadimento automatico, nessun
timeout e nessun modo per il LLM di abbassare il taint.

## Perché Questa Regola È Fissa

La regola no write-down non è configurabile perché renderla configurabile
comprometterebbe l'intero modello di sicurezza. Se un amministratore potesse creare
un'eccezione -- "consenti ai dati CONFIDENTIAL di fluire verso canali PUBLIC per
questa singola integrazione" -- quell'eccezione diventerebbe una superficie di
attacco.

Ogni altro controllo di sicurezza in Triggerfish si basa sull'assunto che la regola
no write-down sia assoluta. Il taint di sessione, il lineage dei dati, i limiti
massimi di delega degli agent e la registrazione di audit dipendono tutti da essa.
Renderla configurabile richiederebbe di ripensare l'intera architettura.

::: info Gli amministratori **possono** configurare i livelli di classificazione
assegnati a canali, destinatari e integrazioni. Questo è il modo corretto per
regolare il flusso dei dati: se un canale dovrebbe ricevere dati con classificazione
più alta, si classifichi il canale a un livello più alto. La regola stessa resta
fissa; gli input alla regola sono configurabili. :::

## Pagine Correlate

- [Progettazione Security-First](/it-IT/security/) -- panoramica dell'architettura di sicurezza
- [Identità e Autenticazione](/it-IT/security/identity) -- come viene stabilita l'identità del canale
- [Audit e Conformità](/it-IT/security/audit-logging) -- come vengono registrate le azioni bloccate
- [Architettura: Taint e Sessioni](/it-IT/architecture/taint-and-sessions) -- meccanismi del taint di sessione nel dettaglio
