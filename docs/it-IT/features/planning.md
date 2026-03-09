# Modalità Pianificazione e Tracciamento delle Attività

Triggerfish fornisce due tool complementari per il lavoro strutturato: la
**modalità pianificazione** per la pianificazione di implementazioni complesse,
e il **tracciamento delle attività** per la gestione delle attività tra sessioni.

## Modalità Pianificazione

La modalità pianificazione vincola l'agent all'esplorazione in sola lettura e
alla pianificazione strutturata prima di effettuare modifiche. Questo impedisce
all'agent di lanciarsi nell'implementazione prima di aver compreso il problema.

### Tool

#### `plan_enter`

Entrare in modalità pianificazione. Blocca le operazioni di scrittura
(`write_file`, `cron_create`, `cron_delete`) fino all'approvazione del piano.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                   |
| --------- | ------ | ------------ | ------------------------------------------------------------- |
| `goal`    | string | sì           | Cosa l'agent sta pianificando di costruire/modificare         |
| `scope`   | string | no           | Limitare l'esplorazione a directory o moduli specifici        |

#### `plan_exit`

Uscire dalla modalità pianificazione e presentare il piano di implementazione
per l'approvazione dell'utente. **Non** inizia automaticamente l'esecuzione.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                                      |
| --------- | ------ | ------------ | -------------------------------------------------------------------------------- |
| `plan`    | object | sì           | Il piano di implementazione (riepilogo, approccio, passi, rischi, file, test)    |

L'oggetto piano include:

- `summary` -- Cosa il piano realizza
- `approach` -- Come verrà fatto
- `alternatives_considered` -- Quali altri approcci sono stati valutati
- `steps` -- Lista ordinata di passi di implementazione, ciascuno con file,
  dipendenze e verifica
- `risks` -- Rischi noti e mitigazioni
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Restituisce lo stato corrente della modalità pianificazione: modalità attiva,
obiettivo e progresso del piano.

#### `plan_approve`

Approvare il piano in attesa e iniziare l'esecuzione. Chiamato quando l'utente
approva.

#### `plan_reject`

Rifiutare il piano in attesa e tornare alla modalità normale.

#### `plan_step_complete`

Contrassegnare un passo del piano come completato durante l'esecuzione.

| Parametro             | Tipo   | Obbligatorio | Descrizione                                |
| --------------------- | ------ | ------------ | ------------------------------------------ |
| `step_id`             | number | sì           | L'ID del passo da contrassegnare completo  |
| `verification_result` | string | sì           | Output dal comando di verifica             |

#### `plan_complete`

Contrassegnare l'intero piano come completato.

| Parametro    | Tipo   | Obbligatorio | Descrizione                          |
| ------------ | ------ | ------------ | ------------------------------------ |
| `summary`    | string | sì           | Cosa è stato realizzato              |
| `deviations` | array  | no           | Eventuali modifiche dal piano originale |

#### `plan_modify`

Richiedere una modifica a un passo del piano approvato. Richiede l'approvazione
dell'utente.

| Parametro          | Tipo   | Obbligatorio | Descrizione                     |
| ------------------ | ------ | ------------ | ------------------------------- |
| `step_id`          | number | sì           | Quale passo necessita di modifica |
| `reason`           | string | sì           | Perché la modifica è necessaria |
| `new_description`  | string | sì           | Descrizione aggiornata del passo |
| `new_files`        | array  | no           | Lista file aggiornata           |
| `new_verification` | string | no           | Comando di verifica aggiornato  |

### Flusso di Lavoro

```
1. L'utente chiede qualcosa di complesso
2. L'agent chiama plan_enter({ goal: "..." })
3. L'agent esplora il codebase (solo tool in sola lettura)
4. L'agent chiama plan_exit({ plan: { ... } })
5. L'utente revisiona il piano
6. L'utente approva → l'agent chiama plan_approve
   (o rifiuta → l'agent chiama plan_reject)
7. L'agent esegue passo per passo, chiamando plan_step_complete dopo ciascuno
8. L'agent chiama plan_complete quando ha finito
```

### Quando Utilizzare la Modalità Pianificazione

L'agent entra in modalità pianificazione per attività complesse: costruire
funzionalità, refactoring di sistemi, implementare modifiche multi-file. Per
attività semplici (correggere un errore di battitura, rinominare una variabile),
salta la modalità pianificazione e agisce direttamente.

## Tracciamento delle Attività

L'agent ha una lista di attività persistente per tracciare lavoro multi-step
tra sessioni.

### Tool

#### `todo_read`

Leggere la lista di attività corrente. Restituisce tutti gli elementi con il
loro ID, contenuto, stato, priorità e timestamp.

#### `todo_write`

Sostituire l'intera lista di attività. Questa è una sostituzione completa, non
un aggiornamento parziale.

| Parametro | Tipo  | Obbligatorio | Descrizione                             |
| --------- | ----- | ------------ | --------------------------------------- |
| `todos`   | array | sì           | Lista completa degli elementi delle attività |

Ogni elemento delle attività ha:

| Campo        | Tipo   | Valori                                |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Identificatore univoco                |
| `content`    | string | Descrizione dell'attività             |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | Timestamp ISO                         |
| `updated_at` | string | Timestamp ISO                         |

### Comportamento

- Le attività sono limitate per agent (non per sessione) -- persistono tra
  sessioni, risvegli dei trigger e riavvii
- L'agent usa le attività solo per compiti genuinamente complessi (3+ passi
  distinti)
- Un'attività alla volta è `in_progress`; gli elementi completati vengono
  contrassegnati immediatamente
- Quando l'agent scrive una nuova lista che omette elementi precedentemente
  archiviati, quegli elementi vengono automaticamente preservati come
  `completed`
- Quando tutti gli elementi sono `completed`, i vecchi elementi non vengono
  preservati (tabula rasa)

### Visualizzazione

Le attività vengono renderizzate sia nella CLI che in Tidepool:

- **CLI** -- Riquadro ANSI stilizzato con icone di stato: `✓` (completato,
  barrato), `▶` (in corso, grassetto), `○` (pendente)
- **Tidepool** -- Lista HTML con classi CSS per ogni stato
