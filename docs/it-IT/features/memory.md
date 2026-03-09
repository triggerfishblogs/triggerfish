# Memoria Persistente

Gli agent Triggerfish hanno una memoria persistente tra sessioni. L'agent può
salvare fatti, preferenze e contesto che sopravvivono tra conversazioni,
riavvii e persino risvegli dei trigger. La memoria è protetta da gating di
classificazione -- l'agent non può leggere al di sopra del taint della propria
sessione né scrivere al di sotto.

## Tool

### `memory_save`

Salvare un fatto o un'informazione nella memoria persistente.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                       |
| --------- | ------ | ------------ | ----------------------------------------------------------------- |
| `key`     | string | sì           | Identificatore univoco (es. `user-name`, `project-deadline`)     |
| `content` | string | sì           | Il contenuto da ricordare                                         |
| `tags`    | array  | no           | Tag per la categorizzazione (es. `["personal", "preference"]`)   |

La classificazione è **impostata automaticamente** al livello di taint della
sessione corrente. L'agent non può scegliere a quale livello una memoria viene
archiviata.

### `memory_get`

Recuperare una memoria specifica tramite la sua chiave.

| Parametro | Tipo   | Obbligatorio | Descrizione                         |
| --------- | ------ | ------------ | ----------------------------------- |
| `key`     | string | sì           | La chiave della memoria da recuperare |

Restituisce il contenuto della memoria se esiste ed è accessibile al livello di
sicurezza corrente. Le versioni a classificazione superiore oscurano quelle
inferiori.

### `memory_search`

Cercare in tutte le memorie accessibili usando linguaggio naturale.

| Parametro     | Tipo   | Obbligatorio | Descrizione                                  |
| ------------- | ------ | ------------ | -------------------------------------------- |
| `query`       | string | sì           | Query di ricerca in linguaggio naturale      |
| `max_results` | number | no           | Risultati massimi (predefinito: 10)          |

Utilizza la ricerca full-text SQLite FTS5 con stemming. I risultati vengono
filtrati in base al livello di sicurezza della sessione corrente.

### `memory_list`

Elencare tutte le memorie accessibili, opzionalmente filtrate per tag.

| Parametro | Tipo   | Obbligatorio | Descrizione          |
| --------- | ------ | ------------ | -------------------- |
| `tag`     | string | no           | Tag per il filtraggio |

### `memory_delete`

Eliminare una memoria tramite chiave. Il record viene eliminato in modo soft
(nascosto ma conservato per l'audit).

| Parametro | Tipo   | Obbligatorio | Descrizione                           |
| --------- | ------ | ------------ | ------------------------------------- |
| `key`     | string | sì           | La chiave della memoria da eliminare  |

Può eliminare solo memorie al livello di sicurezza della sessione corrente.

## Come Funziona la Memoria

### Estrazione Automatica

L'agent salva proattivamente i fatti importanti condivisi dall'utente -- dati
personali, contesto del progetto, preferenze -- usando chiavi descrittive.
Questo è un comportamento a livello di prompt guidato da SPINE.md. Il LLM
sceglie **cosa** salvare; il livello delle policy forza **a quale livello**.

### Gating della Classificazione

Ogni record di memoria porta un livello di classificazione uguale al taint della
sessione al momento del salvataggio:

- Una memoria salvata durante una sessione `CONFIDENTIAL` è classificata
  `CONFIDENTIAL`
- Una sessione `PUBLIC` non può leggere memorie `CONFIDENTIAL`
- Una sessione `CONFIDENTIAL` può leggere sia memorie `CONFIDENTIAL` che
  `PUBLIC`

Questo è applicato da controlli `canFlowTo` su ogni operazione di lettura. Il
LLM non può aggirare questo.

### Oscuramento della Memoria

Quando la stessa chiave esiste a livelli di classificazione multipli, solo la
versione a classificazione più alta visibile alla sessione corrente viene
restituita. Questo previene la fuga di informazioni attraverso i confini di
classificazione.

**Esempio:** Se `user-name` esiste sia a `PUBLIC` (impostato durante una chat
pubblica) che a `INTERNAL` (aggiornato durante una sessione privata), una
sessione `INTERNAL` vede la versione `INTERNAL`, mentre una sessione `PUBLIC`
vede solo la versione `PUBLIC`.

### Archiviazione

Le memorie sono archiviate tramite l'interfaccia `StorageProvider` (la stessa
astrazione usata per sessioni, cron job e todo). La ricerca full-text utilizza
SQLite FTS5 per query in linguaggio naturale veloci con stemming.

## Sicurezza

- La classificazione è sempre forzata a `session.taint` nell'hook
  `PRE_TOOL_CALL` -- il LLM non può scegliere una classificazione inferiore
- Tutte le letture sono filtrate da `canFlowTo` -- nessuna memoria al di sopra
  del taint della sessione viene mai restituita
- Le eliminazioni sono soft-delete -- il record viene nascosto ma conservato
  per l'audit
- L'agent non può aumentare la classificazione della memoria leggendo dati ad
  alta classificazione e risalvandoli a un livello inferiore (la prevenzione del
  write-down si applica)

::: warning SICUREZZA Il LLM non sceglie mai la classificazione della memoria.
È sempre forzata al livello di taint della sessione corrente dal livello delle
policy. Questo è un confine rigido che non può essere configurato diversamente.
:::
