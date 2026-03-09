# Gestione delle Sessioni

L'agent può ispezionare, comunicare con e generare sessioni. Questi tool
abilitano flussi di lavoro tra sessioni, delega di attività in background e
messaggistica tra canali -- il tutto sotto l'applicazione del write-down.

## Tool

### `sessions_list`

Elencare tutte le sessioni attive visibili alla sessione corrente.

Non richiede parametri. I risultati vengono filtrati per livello di taint --
una sessione `PUBLIC` non può vedere i metadati di sessioni `CONFIDENTIAL`.

### `sessions_history`

Ottenere la cronologia dei messaggi per una sessione tramite ID.

| Parametro    | Tipo   | Obbligatorio | Descrizione                                      |
| ------------ | ------ | ------------ | ------------------------------------------------ |
| `session_id` | string | sì           | L'ID della sessione di cui recuperare la cronologia |

L'accesso viene negato se il taint della sessione target è superiore al taint
del chiamante.

### `sessions_send`

Inviare contenuto dalla sessione corrente a un'altra sessione. Soggetto
all'applicazione del write-down.

| Parametro    | Tipo   | Obbligatorio | Descrizione                       |
| ------------ | ------ | ------------ | --------------------------------- |
| `session_id` | string | sì           | ID della sessione target          |
| `content`    | string | sì           | Il contenuto del messaggio da inviare |

**Controllo write-down:** Il taint del chiamante deve poter fluire verso il
livello di classificazione della sessione target. Una sessione `CONFIDENTIAL`
non può inviare dati a una sessione `PUBLIC`.

### `sessions_spawn`

Generare una nuova sessione in background per un'attività autonoma.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                       |
| --------- | ------ | ------------ | ----------------------------------------------------------------- |
| `task`    | string | sì           | Descrizione di cosa la sessione in background dovrebbe fare       |

La sessione generata inizia con taint `PUBLIC` indipendente e il proprio spazio
di lavoro isolato. Viene eseguita autonomamente e restituisce i risultati al
completamento.

### `session_status`

Ottenere metadati e stato per una sessione specifica.

| Parametro    | Tipo   | Obbligatorio | Descrizione                         |
| ------------ | ------ | ------------ | ----------------------------------- |
| `session_id` | string | sì           | L'ID della sessione da controllare  |

Restituisce ID sessione, canale, utente, livello di taint e orario di creazione.
L'accesso è controllato dal taint.

### `message`

Inviare un messaggio a un canale e destinatario. Soggetto all'applicazione del
write-down tramite hook di policy.

| Parametro   | Tipo   | Obbligatorio | Descrizione                                          |
| ----------- | ------ | ------------ | ---------------------------------------------------- |
| `channel`   | string | sì           | Canale target (es. `telegram`, `slack`)               |
| `recipient` | string | sì           | Identificatore del destinatario all'interno del canale |
| `text`      | string | sì           | Testo del messaggio da inviare                        |

### `summarize`

Generare un riassunto conciso della conversazione corrente. Utile per creare
note di passaggio, comprimere il contesto o produrre un riepilogo per la
consegna a un altro canale.

| Parametro | Tipo   | Obbligatorio | Descrizione                                               |
| --------- | ------ | ------------ | --------------------------------------------------------- |
| `scope`   | string | no           | Cosa riassumere: `session` (predefinito), `topic`         |

### `simulate_tool_call`

Simulare una chiamata a un tool per prevedere la decisione del motore delle
policy senza eseguire il tool. Restituisce il risultato della valutazione
dell'hook (ALLOW, BLOCK o REDACT) e le regole che sono state valutate.

| Parametro   | Tipo   | Obbligatorio | Descrizione                                       |
| ----------- | ------ | ------------ | ------------------------------------------------- |
| `tool_name` | string | sì           | Il tool di cui simulare la chiamata               |
| `args`      | object | no           | Argomenti da includere nella simulazione          |

::: tip Utilizzare `simulate_tool_call` per verificare se una chiamata a un tool
sarà consentita prima di eseguirla. Questo è utile per comprendere il
comportamento delle policy senza effetti collaterali. :::

## Casi d'Uso

### Delega di Attività in Background

L'agent può generare una sessione in background per gestire un'attività di
lunga durata senza bloccare la conversazione corrente:

```
Utente: "Cerca i prezzi della concorrenza e prepara un riepilogo"
Agent:  [chiama sessions_spawn con l'attività]
Agent:  "Ho avviato una sessione in background per fare la ricerca. Avrò i risultati a breve."
```

### Comunicazione tra Sessioni

Le sessioni possono inviare dati l'una all'altra, abilitando flussi di lavoro
dove una sessione produce dati che un'altra consuma:

```
Sessione in background completa la ricerca → sessions_send al genitore → il genitore notifica l'utente
```

### Messaggistica tra Canali

Il tool `message` consente all'agent di contattare proattivamente su qualsiasi
canale connesso:

```
L'agent rileva un evento urgente → message({ channel: "telegram", recipient: "owner", text: "Allerta: ..." })
```

## Sicurezza

- Tutte le operazioni sulle sessioni sono controllate dal taint: non è possibile
  vedere, leggere o inviare a sessioni al di sopra del proprio livello di taint
- `sessions_send` applica la prevenzione del write-down: i dati non possono
  fluire verso una classificazione inferiore
- Le sessioni generate iniziano a taint `PUBLIC` con tracciamento del taint
  indipendente
- Il tool `message` passa attraverso gli hook di policy `PRE_OUTPUT` prima della
  consegna
- Gli ID di sessione vengono iniettati dal contesto runtime, non dagli argomenti
  del LLM -- l'agent non può impersonare un'altra sessione

::: warning SICUREZZA La prevenzione del write-down è applicata su tutta la
comunicazione tra sessioni. Una sessione contaminata a `CONFIDENTIAL` non può
inviare dati a una sessione o canale `PUBLIC`. Questo è un confine rigido
applicato dal livello delle policy. :::
