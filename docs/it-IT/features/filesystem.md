# Strumenti Filesystem e Shell

Triggerfish fornisce all'agente strumenti filesystem e shell di uso generale per
leggere, scrivere, cercare ed eseguire comandi. Questi sono gli strumenti
fondamentali su cui si basano le altre funzionalità (ambiente di esecuzione,
explore, skill).

## Strumenti

### `read_file`

Legga il contenuto di un file dato un percorso assoluto.

| Parametro | Tipo   | Obbligatorio | Descrizione                          |
| --------- | ------ | ------------ | ------------------------------------ |
| `path`    | string | sì           | Percorso assoluto del file da leggere |

Restituisce il contenuto testuale completo del file.

### `write_file`

Scriva contenuto in un file dato un percorso relativo al workspace.

| Parametro | Tipo   | Obbligatorio | Descrizione                         |
| --------- | ------ | ------------ | ----------------------------------- |
| `path`    | string | sì           | Percorso relativo nel workspace     |
| `content` | string | sì           | Contenuto del file da scrivere      |

Le scritture sono limitate alla directory workspace dell'agente. L'agente non
può scrivere in posizioni arbitrarie del filesystem.

### `edit_file`

Sostituisca una stringa univoca in un file. Il valore `old_text` deve comparire
esattamente una volta nel file.

| Parametro  | Tipo   | Obbligatorio | Descrizione                                          |
| ---------- | ------ | ------------ | ---------------------------------------------------- |
| `path`     | string | sì           | Percorso assoluto del file da modificare             |
| `old_text` | string | sì           | Testo esatto da trovare (deve essere univoco nel file) |
| `new_text` | string | sì           | Testo sostitutivo                                    |

Questo è uno strumento di modifica chirurgica -- trova una corrispondenza esatta
e la sostituisce. Se il testo compare più di una volta o non compare affatto,
l'operazione fallisce con un errore.

### `list_directory`

Elenchi file e directory in un percorso assoluto dato.

| Parametro | Tipo   | Obbligatorio | Descrizione                                |
| --------- | ------ | ------------ | ------------------------------------------ |
| `path`    | string | sì           | Percorso assoluto della directory da elencare |

Restituisce le voci con suffisso `/` per le directory.

### `search_files`

Cerchi file corrispondenti a un pattern glob, o cerchi nei contenuti dei file con
grep.

| Parametro        | Tipo    | Obbligatorio | Descrizione                                                               |
| ---------------- | ------- | ------------ | ------------------------------------------------------------------------- |
| `path`           | string  | sì           | Directory in cui cercare                                                  |
| `pattern`        | string  | sì           | Pattern glob per i nomi dei file, o testo/regex per cercare nei contenuti |
| `content_search` | boolean | no           | Se `true`, cerca nei contenuti dei file invece che nei nomi               |

### `run_command`

Esegua un comando shell nella directory workspace dell'agente.

| Parametro | Tipo   | Obbligatorio | Descrizione                    |
| --------- | ------ | ------------ | ------------------------------ |
| `command` | string | sì           | Comando shell da eseguire      |

Restituisce stdout, stderr e codice di uscita. I comandi vengono eseguiti nella
directory workspace dell'agente. L'Hook `PRE_TOOL_CALL` verifica i comandi
contro una denylist prima dell'esecuzione.

## Relazione con gli Altri Strumenti

Questi strumenti filesystem si sovrappongono con gli strumenti dell'
[Ambiente di Esecuzione](/it-IT/integrations/exec-environment) (`exec.write`,
`exec.read`, `exec.run`, `exec.ls`). La distinzione:

- Gli **strumenti filesystem** operano su percorsi assoluti e il workspace
  predefinito dell'agente. Sono sempre disponibili.
- Gli **strumenti exec** operano all'interno di un workspace strutturato con
  isolamento esplicito, test runner e installazione di pacchetti. Fanno parte
  dell'integrazione dell'ambiente di esecuzione.

L'agente usa gli strumenti filesystem per operazioni generali sui file e gli
strumenti exec quando lavora in un flusso di sviluppo (ciclo
scrittura/esecuzione/correzione).

## Sicurezza

- `write_file` è limitato alla directory workspace dell'agente
- `run_command` passa attraverso l'Hook `PRE_TOOL_CALL` con il comando come
  contesto
- Una denylist di comandi blocca operazioni pericolose (`rm -rf /`, `sudo`, ecc.)
- Tutte le risposte degli strumenti passano attraverso `POST_TOOL_RESPONSE` per
  la classificazione e il tracciamento del taint
- In modalità pianificazione, `write_file` è bloccato fino all'approvazione del
  piano
