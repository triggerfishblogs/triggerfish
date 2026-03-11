# Sessioni e Taint

Le sessioni sono l'unità fondamentale dello stato della conversazione in
Triggerfish. Ogni sessione traccia indipendentemente un **livello di taint** --
un watermark di classificazione che registra la sensibilità più alta dei dati
acceduti durante la sessione. Il taint guida le decisioni di output del motore
di policy: se una sessione è contaminata a `CONFIDENTIAL`, nessun dato da quella
sessione può fluire verso un canale classificato sotto `CONFIDENTIAL`.

## Modello di Taint della Sessione

### Come Funziona il Taint

Quando una sessione accede a dati a un livello di classificazione, l'intera
sessione viene **contaminata** a quel livello. Il taint segue tre regole:

1. **Per-conversazione**: ogni sessione ha il proprio livello di taint
   indipendente
2. **Solo escalation**: il taint può aumentare, mai diminuire all'interno di una
   sessione
3. **Il reset completo cancella tutto**: taint E cronologia della conversazione
   vengono cancellati insieme

<img src="/diagrams/taint-escalation.svg" alt="Escalation del taint: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Il taint può solo escalare, mai diminuire." style="max-width: 100%;" />

::: warning SICUREZZA Il taint non può mai essere ridotto selettivamente. Non
esiste un meccanismo per "decontaminare" una sessione senza cancellare l'intera
cronologia della conversazione. Questo previene la fuga di contesto -- se la
sessione ricorda di aver visto dati confidenziali, il taint deve rifletterlo. :::

### Perché il Taint Non Può Diminuire

Anche se i dati classificati non sono più visualizzati, la finestra di contesto
dell'LLM li contiene ancora. Il modello potrebbe riferirsi a, riassumere o
ripetere informazioni classificate nelle risposte future. L'unico modo sicuro
per abbassare il taint è eliminare completamente il contesto -- che è esattamente
ciò che fa un reset completo.

## Tipi di Sessione

Triggerfish gestisce diversi tipi di sessione, ciascuno con tracciamento
indipendente del taint:

| Tipo Sessione    | Descrizione                                          | Taint Iniziale | Persiste tra i Riavvii |
| ---------------- | ---------------------------------------------------- | -------------- | ---------------------- |
| **Principale**   | Conversazione diretta primaria con il proprietario   | `PUBLIC`       | Sì                     |
| **Canale**       | Una per canale connesso (Telegram, Slack, ecc.)      | `PUBLIC`       | Sì                     |
| **Background**   | Generata per attività autonome (cron, webhook)       | `PUBLIC`       | Durata dell'attività   |
| **Agente**       | Sessioni per-agente per routing multi-agente         | `PUBLIC`       | Sì                     |
| **Gruppo**       | Sessioni di chat di gruppo                           | `PUBLIC`       | Sì                     |

::: info Le sessioni in background iniziano sempre con taint `PUBLIC`,
indipendentemente dal livello di taint della sessione genitrice. Questo è
intenzionale -- i job cron e le attività attivate da webhook non dovrebbero
ereditare il taint di qualunque sessione li abbia generati. :::

## Esempio di Escalation del Taint

Ecco un flusso completo che mostra l'escalation del taint e il conseguente
blocco della policy:

<img src="/diagrams/taint-with-blocks.svg" alt="Esempio di escalation del taint: la sessione inizia PUBLIC, escala a CONFIDENTIAL dopo l'accesso a Salesforce, poi BLOCCA l'output verso il canale WhatsApp PUBLIC" style="max-width: 100%;" />

## Meccanismo di Reset Completo

Un reset della sessione è l'unico modo per abbassare il taint. È un'operazione
deliberata e distruttiva:

1. **Archivia i record di lineage** -- tutti i dati di lineage dalla sessione
   vengono preservati nello storage di audit
2. **Cancella la cronologia della conversazione** -- l'intera finestra di
   contesto viene cancellata
3. **Resetta il taint a PUBLIC** -- la sessione riparte da zero
4. **Richiede la conferma dell'utente** -- l'Hook `SESSION_RESET` richiede
   conferma esplicita prima dell'esecuzione

Dopo un reset, la sessione è indistinguibile da una sessione nuova. L'agente non
ha memoria della conversazione precedente. Questo è l'unico modo per garantire
che i dati classificati non possano fuoriuscire attraverso il contesto dell'LLM.

## Comunicazione Inter-Sessione

Quando un agente invia dati tra sessioni usando `sessions_send`, si applicano le
stesse regole di write-down:

| Taint Sessione Sorgente | Canale Sessione Target | Decisione |
| ------------------------ | ---------------------- | --------- |
| `PUBLIC`                 | Canale `PUBLIC`        | ALLOW     |
| `CONFIDENTIAL`           | Canale `CONFIDENTIAL`  | ALLOW     |
| `CONFIDENTIAL`           | Canale `PUBLIC`        | BLOCK     |
| `RESTRICTED`             | Canale `CONFIDENTIAL`  | BLOCK     |

Strumenti di sessione disponibili per l'agente:

| Strumento          | Descrizione                                  | Impatto sul Taint                          |
| ------------------ | -------------------------------------------- | ------------------------------------------ |
| `sessions_list`    | Elenca le sessioni attive con filtri         | Nessun cambiamento del taint               |
| `sessions_history` | Recupera la trascrizione di una sessione     | Il taint eredita dalla sessione referenziata |
| `sessions_send`    | Invia messaggio a un'altra sessione          | Soggetto al controllo write-down           |
| `sessions_spawn`   | Crea sessione per attività in background     | La nuova sessione inizia a `PUBLIC`        |
| `session_status`   | Controlla stato corrente e metadati sessione | Nessun cambiamento del taint               |

## Lineage dei Dati

Ogni elemento di dati elaborato da Triggerfish porta **metadati di provenienza**
-- un record completo di da dove provengono i dati, come sono stati trasformati
e dove sono andati. La lineage è la traccia di audit che rende le decisioni di
classificazione verificabili.

### Struttura del Record di Lineage

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Regole di Tracciamento della Lineage

| Evento                                     | Azione sulla Lineage                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| Dato letto da un'integrazione              | Crea record di lineage con origine                    |
| Dato trasformato dall'LLM                  | Aggiunge trasformazione, collega lineage di input     |
| Dato aggregato da fonti multiple           | Unisce lineage, classificazione = `max(input)`        |
| Dato inviato a un canale                   | Registra destinazione, verifica classificazione       |
| Reset della sessione                       | Archivia record di lineage, cancella dal contesto     |

### Classificazione dell'Aggregazione

Quando i dati da fonti multiple vengono combinati (es. un riassunto LLM di
record da diverse integrazioni), il risultato aggregato eredita la
**classificazione massima** di tutti gli input:

```
Input 1: INTERNAL    (wiki interna)
Input 2: CONFIDENTIAL (record Salesforce)
Input 3: PUBLIC      (API meteo)

Classificazione output aggregato: CONFIDENTIAL (massimo degli input)
```

::: tip Le distribuzioni enterprise possono configurare regole di downgrade
opzionali per aggregati statistici (medie, conteggi, somme di 10+ record) o
dati anonimizzati certificati. Tutti i downgrade richiedono regole di policy
esplicite, vengono registrati con piena giustificazione e sono soggetti a
revisione di audit. :::

### Funzionalità di Audit

La lineage abilita quattro categorie di query di audit:

- **Traccia in avanti**: "Cosa è successo ai dati del record Salesforce X?" --
  segue i dati in avanti dall'origine a tutte le destinazioni
- **Traccia all'indietro**: "Quali fonti hanno contribuito a questo output?" --
  traccia un output a ritroso fino a tutti i suoi record sorgente
- **Giustificazione della classificazione**: "Perché questo è contrassegnato
  CONFIDENTIAL?" -- mostra la catena di motivazione della classificazione
- **Esportazione di conformità**: catena di custodia completa per revisione
  legale o normativa

## Persistenza del Taint

Il taint di sessione è persistito attraverso il `StorageProvider` sotto il
namespace `taint:`. Questo significa che il taint sopravvive ai riavvii del
daemon -- una sessione che era `CONFIDENTIAL` prima di un riavvio è ancora
`CONFIDENTIAL` dopo.

I record di lineage sono persistiti sotto il namespace `lineage:` con
conservazione guidata dalla conformità (default 90 giorni).
