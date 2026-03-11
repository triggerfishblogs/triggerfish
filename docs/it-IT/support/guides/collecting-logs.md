# Raccolta dei Log

Quando si segnala un bug, un bundle di log fornisce ai manutentori le informazioni necessarie per diagnosticare il problema senza dover chiedere dettagli in modo iterativo.

## Bundle Rapido

Il modo più veloce per creare un bundle di log:

```bash
triggerfish logs bundle
```

Questo crea un archivio contenente tutti i file di log da `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Se l'archiviazione fallisce per qualsiasi motivo, ripiega sulla copia dei file di log grezzi in una directory che è possibile comprimere manualmente.

## Cosa Contiene il Bundle

- `triggerfish.log` (file di log corrente)
- Da `triggerfish.1.log` a `triggerfish.10.log` (backup ruotati, se esistono)

Il bundle **non** contiene:
- Il file di configurazione `triggerfish.yaml`
- Chiavi segrete o credenziali
- Il database SQLite
- SPINE.md o TRIGGER.md

## Raccolta Manuale dei Log

Se il comando bundle non è disponibile (versione precedente, Docker, ecc.):

```bash
# Trovare i file di log
ls ~/.triggerfish/logs/

# Creare un archivio manualmente
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Aumentare il Dettaglio dei Log

Per impostazione predefinita, i log sono a livello INFO. Per catturare più dettagli per una segnalazione di bug:

1. Impostare il livello di log su verbose o debug:
   ```bash
   triggerfish config set logging.level verbose
   # oppure per il massimo dettaglio:
   triggerfish config set logging.level debug
   ```

2. Riprodurre il problema

3. Raccogliere il bundle:
   ```bash
   triggerfish logs bundle
   ```

4. Reimpostare il livello su normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Dettaglio dei Livelli di Log

| Livello | Cosa cattura |
|---------|-------------|
| `quiet` | Solo errori |
| `normal` | Errori, avvisi, info (predefinito) |
| `verbose` | Aggiunge messaggi di debug (chiamate ai tool, interazioni con i provider, decisioni di classificazione) |
| `debug` | Tutto inclusi messaggi a livello trace (dati grezzi del protocollo, cambiamenti di stato interni) |

**Attenzione:** Il livello `debug` genera molto output. Utilizzarlo solo quando si sta riproducendo attivamente un problema, poi ripristinare.

## Filtraggio dei Log in Tempo Reale

Durante la riproduzione di un problema, è possibile filtrare il flusso di log in tempo reale:

```bash
# Mostrare solo gli errori
triggerfish logs --level ERROR

# Mostrare avvisi e superiori
triggerfish logs --level WARN
```

Su Linux/macOS, questo utilizza `tail -f` nativo con filtraggio. Su Windows, utilizza `Get-Content -Wait -Tail` di PowerShell.

## Formato dei Log

Ogni riga di log segue questo formato:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** ISO 8601 in UTC
- **Livello:** ERROR, WARN, INFO, DEBUG o TRACE
- **Componente:** Quale modulo ha generato il log (es. `gateway`, `anthropic`, `telegram`, `policy`)
- **Messaggio:** Il messaggio di log con contesto strutturato

## Cosa Includere in una Segnalazione di Bug

Insieme al bundle di log, includere:

1. **Passaggi per riprodurre.** Cosa si stava facendo quando il problema si è verificato?
2. **Comportamento atteso.** Cosa sarebbe dovuto succedere?
3. **Comportamento effettivo.** Cosa è successo invece?
4. **Informazioni sulla piattaforma.** SO, architettura, versione di Triggerfish (`triggerfish version`)
5. **Estratto della configurazione.** La sezione pertinente del `triggerfish.yaml` (oscurare i secret)

Vedere [Segnalazione degli Issue](/it-IT/support/guides/filing-issues) per la checklist completa.

## Informazioni Sensibili nei Log

Triggerfish sanitizza i dati esterni nei log racchiudendo i valori nei delimitatori `<<` e `>>`. Le chiavi API e i token non dovrebbero mai apparire nell'output dei log. Tuttavia, prima di inviare un bundle di log:

1. Scansionare alla ricerca di qualsiasi cosa che non si desidera condividere (indirizzi email, percorsi di file, contenuto dei messaggi)
2. Oscurare se necessario
3. Annotare nell'issue che il bundle è stato oscurato

I file di log contengono il contenuto dei messaggi delle conversazioni. Se le conversazioni contengono informazioni sensibili, oscurare quelle porzioni prima della condivisione.
