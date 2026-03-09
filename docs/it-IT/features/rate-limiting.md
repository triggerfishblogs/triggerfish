# Limitazione della Frequenza

Triggerfish include un limitatore di frequenza a finestra scorrevole che previene
il raggiungimento dei limiti API dei provider LLM. Avvolge qualsiasi provider in
modo trasparente -- il ciclo dell'agent non ha bisogno di conoscere i limiti di
frequenza. Quando la capacità è esaurita, le chiamate vengono ritardate
automaticamente fino a quando la finestra scorre abbastanza da liberare capacità.

## Come Funziona

Il limitatore di frequenza utilizza una finestra scorrevole (predefinita 60
secondi) per tracciare due metriche:

- **Token al minuto (TPM)** -- token totali consumati (prompt + completamento)
  all'interno della finestra
- **Richieste al minuto (RPM)** -- chiamate API totali all'interno della
  finestra

Prima di ogni chiamata LLM, il limitatore verifica la capacità disponibile
rispetto a entrambi i limiti. Se uno dei due è esaurito, la chiamata attende
fino a quando le voci più vecchie escono dalla finestra e liberano abbastanza
capacità. Dopo il completamento di ogni chiamata, l'utilizzo effettivo dei token
viene registrato.

Sia le chiamate in streaming che quelle non in streaming consumano dallo stesso
budget. Per le chiamate in streaming, l'utilizzo dei token viene registrato al
termine dello stream.

<img src="/diagrams/rate-limiter-flow.svg" alt="Flusso del limitatore di frequenza: Ciclo Agent → Limitatore di Frequenza → controllo capacità → inoltrare al provider o attendere" style="max-width: 100%;" />

## Limiti dei Tier OpenAI

Il limitatore di frequenza include valori predefiniti integrati per i limiti dei
tier pubblicati da OpenAI:

| Tier   | GPT-4o TPM  | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ----------- | ---------- | ------- | ------ |
| Free   | 30.000      | 500        | 30.000  | 500    |
| Tier 1 | 30.000      | 500        | 30.000  | 500    |
| Tier 2 | 450.000     | 5.000      | 100.000 | 1.000  |
| Tier 3 | 800.000     | 5.000      | 100.000 | 1.000  |
| Tier 4 | 2.000.000   | 10.000     | 200.000 | 10.000 |
| Tier 5 | 30.000.000  | 10.000     | 200.000 | 10.000 |

::: warning Questi sono valori predefiniti basati sui limiti pubblicati da OpenAI.
I limiti effettivi dipendono dal proprio tier dell'account OpenAI e dalla
cronologia di utilizzo. Altri provider (Anthropic, Google) gestiscono i propri
limiti di frequenza lato server -- il limitatore è più utile per OpenAI dove il
throttling lato client previene errori 429. :::

## Configurazione

La limitazione della frequenza è automatica quando si usa il provider avvolto.
Non è necessaria alcuna configurazione utente per il comportamento predefinito.
Il limitatore rileva il provider e applica i limiti appropriati.

Gli utenti avanzati possono personalizzare i limiti tramite la configurazione del
provider in `triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Token al minuto
        rpm: 5000 # Richieste al minuto
        window_ms: 60000 # Dimensione della finestra (predefinito 60s)
```

::: info La limitazione della frequenza protegge da errori 429 e fatture
inaspettate. Funziona insieme alla catena di failover -- se i limiti di
frequenza vengono raggiunti e il limitatore non può attendere (timeout), il
failover si attiva per provare il provider successivo. :::

## Monitorare l'Utilizzo

Il limitatore di frequenza espone un'istantanea in tempo reale dell'utilizzo
corrente:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

La barra di progresso del contesto nella CLI e in Tide Pool mostra l'utilizzo
del contesto. Lo stato del limitatore di frequenza è visibile nei log di debug:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Quando il limitatore ritarda una chiamata, registra il tempo di attesa:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Limitazione della Frequenza dei Canali

Oltre alla limitazione della frequenza dei provider LLM, Triggerfish applica
limiti di frequenza dei messaggi per canale per prevenire il flooding delle
piattaforme di messaggistica. Ogni adattatore di canale traccia la frequenza dei
messaggi in uscita e ritarda gli invii quando i limiti vengono raggiunti.

Questo protegge da:

- Ban dalle API delle piattaforme per volume eccessivo di messaggi
- Spam accidentale da cicli dell'agent fuori controllo
- Tempeste di messaggi attivate da webhook

I limiti di frequenza dei canali sono applicati in modo trasparente dal router
dei canali. Se l'agent genera output più velocemente di quanto il canale
consenta, i messaggi vengono accodati e consegnati alla frequenza massima
consentita.

## Correlati

- [Provider LLM e Failover](/it-IT/features/model-failover) -- integrazione della
  catena di failover con la limitazione della frequenza
- [Configurazione](/it-IT/guide/configuration) -- schema completo di
  `triggerfish.yaml`
