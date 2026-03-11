# Logging Strutturato

Triggerfish utilizza il logging strutturato con livelli di severità, rotazione
dei file e output configurabile. Ogni componente -- il gateway, l'orchestrator,
il client MCP, i provider LLM, il motore di policy -- registra attraverso un
logger unificato. Questo significa che si ottiene un flusso di log singolo e
coerente indipendentemente da dove origina un evento.

## Livelli di Log

L'impostazione `logging.level` controlla quanti dettagli vengono catturati:

| Valore Config        | Severità           | Cosa Viene Registrato                                             |
| -------------------- | ------------------ | ----------------------------------------------------------------- |
| `quiet`              | Solo ERROR         | Crash e fallimenti critici                                        |
| `normal` (default)   | INFO e superiori   | Avvio, connessioni, eventi significativi                          |
| `verbose`            | DEBUG e superiori   | Chiamate strumenti, decisioni di policy, richieste ai provider    |
| `debug`              | TRACE (tutto)      | Payload completi richiesta/risposta, streaming a livello di token |

Ogni livello include tutto quello sopra di esso. Impostare `verbose` fornisce
DEBUG, INFO e ERROR. Impostare `quiet` silenzia tutto tranne gli errori.

## Configurazione

Imposti il livello di log in `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Questa è l'unica configurazione richiesta. I default sono ragionevoli per la
maggior parte degli utenti -- `normal` cattura abbastanza per capire cosa sta
facendo l'agente senza inondare il log di rumore.

## Output dei Log

I log vengono scritti su due destinazioni simultaneamente:

- **stderr** -- per la cattura con `journalctl` quando eseguito come servizio
  systemd, o output diretto nel terminale durante lo sviluppo
- **File** -- `~/.triggerfish/logs/triggerfish.log`

Ogni riga di log segue un formato strutturato:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Tag dei Componenti

Il tag tra parentesi identifica quale sottosistema ha emesso la voce di log:

| Tag           | Componente                                    |
| ------------- | --------------------------------------------- |
| `[gateway]`   | Piano di controllo WebSocket                  |
| `[orch]`      | Orchestrator dell'agente e dispatch strumenti |
| `[mcp]`       | Client MCP e proxy gateway                    |
| `[provider]`  | Chiamate ai provider LLM                      |
| `[policy]`    | Motore di policy e valutazione Hook           |
| `[session]`   | Ciclo di vita delle sessioni e cambiamenti di taint |
| `[channel]`   | Adattatori di canale (Telegram, Slack, ecc.)  |
| `[scheduler]` | Job cron, trigger, webhook                    |
| `[memory]`    | Operazioni sullo storage della memoria        |
| `[browser]`   | Automazione browser (CDP)                     |

## Rotazione dei File

I file di log vengono ruotati automaticamente per prevenire un uso disco
illimitato:

- **Soglia di rotazione:** 1 MB per file
- **File conservati:** 10 file ruotati (massimo ~10 MB totali)
- **Controllo rotazione:** ad ogni scrittura
- **Denominazione:** `triggerfish.1.log`, `triggerfish.2.log`, ...,
  `triggerfish.10.log`

Quando `triggerfish.log` raggiunge 1 MB, viene rinominato in
`triggerfish.1.log`, il precedente `triggerfish.1.log` diventa
`triggerfish.2.log`, e così via. Il file più vecchio (`triggerfish.10.log`)
viene eliminato.

## Scritture Fire-and-Forget

Le scritture su file sono non-bloccanti. Il logger non ritarda mai
l'elaborazione delle richieste per attendere il completamento di una scrittura
su disco. Se una scrittura fallisce -- disco pieno, errore di permessi, file
bloccato -- l'errore viene ignorato silenziosamente.

Questo è intenzionale. Il logging non dovrebbe mai far crashare l'applicazione o
rallentare l'agente. L'output su stderr serve come fallback se le scritture su
file falliscono.

## Strumento Log Read

Lo strumento `log_read` fornisce all'agente accesso diretto alla cronologia
strutturata dei log. L'agente può leggere le voci di log recenti, filtrare per
tag del componente o severità, e diagnosticare problemi senza uscire dalla
conversazione.

| Parametro   | Tipo   | Obbligatorio | Descrizione                                                                  |
| ----------- | ------ | ------------ | ---------------------------------------------------------------------------- |
| `lines`     | number | no           | Numero di righe di log recenti da restituire (default: 100)                  |
| `level`     | string | no           | Filtro severità minima (`error`, `warn`, `info`, `debug`)                    |
| `component` | string | no           | Filtra per tag del componente (es. `gateway`, `orch`, `provider`)            |

::: tip Chieda al Suo agente "quali errori ci sono stati oggi" o "mostrami i log
recenti del gateway" -- lo strumento `log_read` gestisce il filtraggio e il
recupero. :::

## Visualizzazione dei Log

### Comandi CLI

```bash
# Visualizza i log recenti
triggerfish logs

# Stream in tempo reale
triggerfish logs --tail

# Accesso diretto al file
cat ~/.triggerfish/logs/triggerfish.log
```

### Con journalctl

Quando Triggerfish viene eseguito come servizio systemd, i log vengono catturati
anche dal journal:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Logging Strutturato

::: info La variabile d'ambiente `TRIGGERFISH_DEBUG=1` è ancora supportata per
compatibilità retroattiva ma la configurazione `logging.level: debug` è
preferita. Entrambe producono output equivalente -- logging completo a livello
TRACE di tutti i payload richiesta/risposta e stato interno. :::

## Correlati

- [Comandi CLI](/it-IT/guide/commands) -- Riferimento del comando `triggerfish logs`
- [Configurazione](/it-IT/guide/configuration) -- Schema completo di `triggerfish.yaml`
