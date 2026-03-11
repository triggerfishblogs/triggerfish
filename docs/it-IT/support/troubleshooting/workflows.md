---
title: Risoluzione dei problemi dei flussi di lavoro
description: Problemi comuni e soluzioni quando si lavora con i flussi di lavoro di Triggerfish.
---

# Risoluzione dei problemi: Flussi di lavoro

## "Workflow not found or not accessible"

Il flusso di lavoro esiste ma e memorizzato a un livello di classificazione
superiore rispetto al taint della vostra sessione corrente.

I flussi di lavoro salvati durante una sessione `CONFIDENTIAL` sono invisibili
alle sessioni `PUBLIC` o `INTERNAL`. Lo storage utilizza controlli `canFlowTo`
ad ogni caricamento e restituisce `null` (mostrato come "not found") quando la
classificazione del flusso di lavoro supera il taint della sessione.

**Soluzione:** Escalate il taint della vostra sessione accedendo prima a dati
classificati, oppure salvate nuovamente il flusso di lavoro da una sessione con
classificazione inferiore se il contenuto lo consente.

**Verifica:** Eseguite `workflow_list` per vedere quali flussi di lavoro sono
visibili al vostro livello di classificazione corrente. Se il flusso di lavoro
previsto manca, e stato salvato a un livello superiore.

---

## "Workflow classification ceiling breached"

Il livello di taint della sessione supera il `classification_ceiling` del flusso
di lavoro. Questo controllo viene eseguito prima di ogni attivita, quindi puo
essere attivato durante l'esecuzione se un'attivita precedente ha escalato il
taint della sessione.

Ad esempio, un flusso di lavoro con `classification_ceiling: INTERNAL` si
arresera se una chiamata `triggerfish:memory` recupera dati `CONFIDENTIAL` che
escalano il taint della sessione.

**Soluzione:**

- Aumentate il `classification_ceiling` del flusso di lavoro per corrispondere
  alla sensibilita attesa dei dati.
- Oppure ristrutturate il flusso di lavoro in modo che non vengano acceduti dati
  classificati. Utilizzate parametri di input invece di leggere memoria
  classificata.

---

## Errori di analisi YAML

### "YAML parse error: ..."

Errori comuni di sintassi YAML:

**Indentazione.** YAML e sensibile agli spazi bianchi. Utilizzate spazi, non tab.
Ogni livello di annidamento dovrebbe essere esattamente di 2 spazi.

```yaml
# Sbagliato — tab o indentazione inconsistente
do:
- fetch:
      call: http

# Corretto
do:
  - fetch:
      call: http
```

**Virgolette mancanti intorno alle espressioni.** Le stringhe di espressione con
`${ }` devono essere tra virgolette, altrimenti YAML interpreta `{` come un
mapping inline.

```yaml
# Sbagliato — errore di analisi YAML
endpoint: ${ .config.url }

# Corretto
endpoint: "${ .config.url }"
```

**Blocco `document` mancante.** Ogni flusso di lavoro deve avere un campo
`document` con `dsl`, `namespace` e `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

Il YAML e stato analizzato con successo ma il risultato e uno scalare o un
array, non un oggetto. Verificate che il vostro YAML abbia chiavi di primo
livello (`document`, `do`).

### "Task has no recognized type"

Ogni voce di attivita deve contenere esattamente una chiave di tipo: `call`,
`run`, `set`, `switch`, `for`, `raise`, `emit` o `wait`. Se l'analizzatore non
trova nessuna di queste chiavi, segnala un tipo non riconosciuto.

Causa comune: un errore di battitura nel nome del tipo di attivita (es. `calls`
invece di `call`).

---

## Errori nella valutazione delle espressioni

### Valori errati o vuoti

Le espressioni utilizzano la sintassi `${ .path.to.value }`. Il punto iniziale e
obbligatorio -- ancora il percorso alla radice del contesto dati del flusso di
lavoro.

```yaml
# Sbagliato — punto iniziale mancante
value: "${ result.name }"

# Corretto
value: "${ .result.name }"
```

### "undefined" nell'output

Il percorso a punti non ha risolto nulla. Cause comuni:

- **Nome attivita errato.** Ogni attivita memorizza il suo risultato sotto il
  proprio nome. Se la vostra attivita si chiama `fetch_data`, fate riferimento al
  suo risultato come `${ .fetch_data }`, non `${ .data }` o `${ .result }`.
- **Annidamento errato.** Se la chiamata HTTP restituisce
  `{"data": {"items": [...]}}`, gli item si trovano in
  `${ .fetch_data.data.items }`.
- **Indicizzazione di array.** Utilizzate la sintassi con parentesi quadre:
  `${ .items[0].name }`. I percorsi solo a punti non supportano indici numerici.

### Le condizioni booleane non funzionano

I confronti delle espressioni sono stretti (`===`). Assicuratevi che i tipi
corrispondano:

```yaml
# Questo fallisce se .count e una stringa "0"
if: "${ .count == 0 }"

# Funziona quando .count e un numero
if: "${ .count == 0 }"
```

Verificate se le attivita a monte restituiscono stringhe o numeri. Le risposte
HTTP spesso restituiscono valori stringa che non necessitano di conversione per
il confronto -- basta confrontare con la forma stringa.

---

## Errori nelle chiamate HTTP

### Timeout

Le chiamate HTTP passano attraverso lo strumento `web_fetch`. Se il server di
destinazione e lento, la richiesta potrebbe scadere. Non esiste un override del
timeout per attivita per le chiamate HTTP nel DSL dei flussi di lavoro -- viene
applicato il timeout predefinito dello strumento `web_fetch`.

### Blocchi SSRF

Tutto l'HTTP in uscita in Triggerfish risolve prima il DNS e controlla l'IP
risolto contro una lista di blocco codificata. Gli intervalli IP privati e
riservati sono sempre bloccati.

Se il vostro flusso di lavoro chiama un servizio interno su un IP privato (es.
`http://192.168.1.100/api`), verra bloccato dalla prevenzione SSRF. Questo e
intenzionale e non puo essere configurato.

**Soluzione:** Utilizzate un hostname pubblico che risolve a un IP pubblico,
oppure utilizzate `triggerfish:mcp` per instradare attraverso un server MCP che
ha accesso diretto.

### Header mancanti

Il tipo di chiamata `http` mappa `with.headers` direttamente agli header della
richiesta. Se la vostra API richiede autenticazione, includete l'header:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Assicuratevi che il valore del token sia fornito nell'input del flusso di lavoro
o impostato da un'attivita precedente.

---

## Limite di ricorsione dei sotto-flussi di lavoro

### "Workflow recursion depth exceeded maximum of 5"

I sotto-flussi di lavoro possono annidarsi fino a 5 livelli di profondita.
Questo limite previene la ricorsione infinita quando il flusso di lavoro A chiama
il flusso di lavoro B che chiama il flusso di lavoro A.

**Soluzione:**

- Appiattite la catena dei flussi di lavoro. Combinate i passaggi in meno flussi
  di lavoro.
- Verificate la presenza di riferimenti circolari in cui due flussi di lavoro si
  chiamano a vicenda.

---

## Esecuzione shell disabilitata

### "Shell execution failed" o risultato vuoto dalle attivita run

Il flag `allowShellExecution` nel contesto dello strumento del flusso di lavoro
controlla se le attivita `run` con target `shell` o `script` sono consentite.
Quando disabilitato, queste attivita falliscono.

**Soluzione:** Verificate se l'esecuzione shell e abilitata nella vostra
configurazione Triggerfish. Negli ambienti di produzione, l'esecuzione shell
potrebbe essere intenzionalmente disabilitata per sicurezza.

---

## Il flusso di lavoro viene eseguito ma produce un output errato

### Debug con `workflow_history`

Utilizzate `workflow_history` per ispezionare le esecuzioni passate:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Ogni voce della cronologia include:

- **status** — `completed` o `failed`
- **error** — messaggio di errore in caso di fallimento
- **taskCount** — numero di attivita nel flusso di lavoro
- **startedAt / completedAt** — informazioni temporali

### Verifica del flusso del contesto

Ogni attivita memorizza il suo risultato nel contesto dati sotto il nome
dell'attivita. Se il vostro flusso di lavoro ha attivita chiamate `fetch`,
`transform` e `save`, il contesto dati dopo tutte e tre le attivita appare
cosi:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Errori comuni:

- **Sovrascrittura del contesto.** Un'attivita `set` che assegna a una chiave
  gia esistente sostituira il valore precedente.
- **Riferimento attivita errato.** Fare riferimento a `${ .step1 }` quando
  l'attivita si chiama `step_1`.
- **Trasformazione input che sostituisce il contesto.** Una direttiva
  `input.from` sostituisce interamente il contesto di input dell'attivita. Se
  utilizzate `input.from: "${ .config }"`, l'attivita vede solo l'oggetto
  `config`, non il contesto completo.

### Output mancante

Se il flusso di lavoro si completa ma restituisce un output vuoto, verificate se
il risultato dell'ultima attivita e quello che vi aspettate. L'output del flusso
di lavoro e il contesto dati completo al completamento, con le chiavi interne
filtrate.

---

## "Permission denied" su workflow_delete

Lo strumento `workflow_delete` carica il flusso di lavoro prima utilizzando il
livello di taint corrente della sessione. Se il flusso di lavoro e stato salvato
a un livello di classificazione che supera il taint della vostra sessione, il
caricamento restituisce null e `workflow_delete` segnala "not found" anziche
"permission denied."

Questo e intenzionale -- l'esistenza di flussi di lavoro classificati non viene
rivelata alle sessioni con classificazione inferiore.

**Soluzione:** Escalate il taint della vostra sessione per corrispondere o
superare il livello di classificazione del flusso di lavoro prima di eliminarlo.
Oppure eliminatelo dallo stesso tipo di sessione in cui e stato originariamente
salvato.
