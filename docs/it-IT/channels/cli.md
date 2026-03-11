# Canale CLI

L'interfaccia a riga di comando è il canale predefinito in Triggerfish. È sempre
disponibile, non richiede configurazione esterna, ed è il modo principale con
cui interagisce con il Suo agente durante lo sviluppo e l'uso locale.

## Classificazione

Il canale CLI è predefinito a classificazione `INTERNAL`. L'utente del terminale
è **sempre** trattato come il proprietario -- non c'è un flusso di
accoppiamento o autenticazione perché sta eseguendo il processo direttamente
sulla Sua macchina.

::: info Perché INTERNAL? La CLI è un'interfaccia diretta e locale. Solo chi ha
accesso al Suo terminale può usarla. Questo rende `INTERNAL` il valore
predefinito appropriato -- il Suo agente può condividere dati interni liberamente
in questo contesto. :::

## Funzionalità

### Input Terminale Raw

La CLI utilizza la modalità terminale raw con parsing completo delle sequenze di
escape ANSI. Questo offre un'esperienza di editing ricca direttamente nel
terminale:

- **Editing riga** -- Navighi con i tasti freccia, Home/End, cancelli parole con
  Ctrl+W
- **Cronologia input** -- Prema Su/Giù per scorrere gli input precedenti
- **Suggerimenti** -- Completamento con Tab per i comandi comuni
- **Input multi-riga** -- Inserisca prompt più lunghi in modo naturale

### Visualizzazione Compatta degli Strumenti

Quando l'agente chiama strumenti, la CLI mostra un riepilogo compatto su una
riga per impostazione predefinita:

```
tool_name arg  result
```

Alterni tra output strumenti compatto ed espanso con **Ctrl+O**.

### Interruzione delle Operazioni in Corso

Prema **ESC** per interrompere l'operazione corrente. Questo invia un segnale di
abort attraverso l'orchestratore al provider LLM, fermando la generazione
immediatamente. Non deve attendere che una lunga risposta finisca.

### Visualizzazione del Taint

Può opzionalmente visualizzare il livello di taint corrente della sessione
nell'output abilitando `showTaint` nella configurazione del canale CLI. Questo
antepone il livello di classificazione a ogni risposta:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Barra di Avanzamento della Lunghezza del Contesto

La CLI visualizza una barra di utilizzo della finestra di contesto in tempo
reale nella riga separatrice in fondo al terminale:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- La barra si riempie man mano che i token di contesto vengono consumati
- Un marcatore blu appare alla soglia del 70% (dove si attiva la compattazione
  automatica)
- La barra diventa rossa quando ci si avvicina al limite
- Dopo la compattazione (`/compact` o automatica), la barra si resetta

### Stato dei Server MCP

Il separatore mostra anche lo stato di connessione dei server MCP:

| Visualizzazione    | Significato                                   |
| ------------------ | --------------------------------------------- |
| `MCP 3/3` (verde)  | Tutti i server configurati connessi          |
| `MCP 2/3` (giallo) | Alcuni server ancora in connessione o falliti |
| `MCP 0/3` (rosso)  | Nessun server connesso                       |

I server MCP si connettono in modo lazy in background dopo l'avvio. Lo stato si
aggiorna in tempo reale man mano che i server entrano online.

## Cronologia Input

La cronologia dei Suoi input è persistita tra le sessioni in:

```
~/.triggerfish/data/input_history.json
```

La cronologia viene caricata all'avvio e salvata dopo ogni input. Può cancellarla
eliminando il file.

## Non-TTY / Input Piped

Quando stdin non è un TTY (per esempio, quando si pipe l'input da un altro
processo), la CLI passa automaticamente alla **modalità line-buffered**. In questa
modalità:

- Le funzionalità del terminale raw (tasti freccia, navigazione cronologia) sono
  disabilitate
- L'input viene letto riga per riga da stdin
- L'output viene scritto su stdout senza formattazione ANSI

Questo Le consente di scriptare le interazioni con il Suo agente:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configurazione

Il canale CLI richiede configurazione minima. Viene creato automaticamente quando
esegue `triggerfish run` o usa il REPL interattivo.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Opzione       | Tipo    | Default | Descrizione                                      |
| ------------- | ------- | ------- | ------------------------------------------------ |
| `interactive` | boolean | `true`  | Abilita la modalità REPL interattiva             |
| `showTaint`   | boolean | `false` | Mostra il livello di taint della sessione nell'output |

::: tip Nessuna Configurazione Necessaria Il canale CLI funziona immediatamente.
Non deve configurare nulla per iniziare a usare Triggerfish dal Suo terminale.
:::

## Scorciatoie da Tastiera

| Scorciatoia | Azione                                                       |
| ----------- | ------------------------------------------------------------ |
| Enter       | Invia messaggio                                              |
| Su / Giù    | Naviga nella cronologia input                                |
| Ctrl+V      | Incolla immagine dagli appunti (inviata come contenuto multimodale) |
| Ctrl+O      | Attiva/disattiva visualizzazione compatta/espansa strumenti  |
| ESC         | Interrompe l'operazione corrente                             |
| Ctrl+C      | Esce dalla CLI                                               |
| Ctrl+W      | Cancella la parola precedente                                |
| Home / End  | Vai all'inizio/fine della riga                               |
