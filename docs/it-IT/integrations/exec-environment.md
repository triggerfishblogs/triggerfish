# Ambiente di Esecuzione dell'Agent

L'Ambiente di Esecuzione dell'Agent è la capacità di auto-sviluppo di
Triggerfish -- uno spazio di lavoro di codice di prima classe dove l'agent può
scrivere codice, eseguirlo, osservare output ed errori, correggere i problemi
e iterare fino a quando qualcosa funziona. Questo è ciò che consente all'agent
di costruire integrazioni, testare idee e creare nuovi tool autonomamente.

## Non È il Sandbox dei Plugin

L'ambiente di esecuzione è fondamentalmente diverso dal
[Sandbox dei Plugin](./plugins). Comprendere la distinzione è importante:

- Il **Sandbox dei Plugin** protegge il sistema **DA** codice di terze parti
  non fidato
- L'**Ambiente di Esecuzione** abilita l'agent **A** scrivere, eseguire e
  debuggare il proprio codice

Il sandbox dei plugin è difensivo. L'ambiente di esecuzione è produttivo.
Servono scopi opposti e hanno profili di sicurezza diversi.

| Aspetto               | Sandbox dei Plugin                       | Ambiente di Esecuzione dell'Agent       |
| --------------------- | ---------------------------------------- | --------------------------------------- |
| **Scopo**             | Proteggere il sistema DA codice non fidato | Abilitare l'agent A costruire cose     |
| **Filesystem**        | Nessuno (completamente in sandbox)       | Solo directory dello spazio di lavoro   |
| **Rete**              | Solo endpoint dichiarati                 | Liste allow/deny governate dalle policy |
| **Installazione pacchetti** | Non consentita                     | Consentita (npm, pip, deno add)         |
| **Tempo di esecuzione** | Timeout rigoroso                       | Timeout generoso (configurabile)        |
| **Iterazione**        | Esecuzione singola                       | Cicli scrittura/esecuzione/correzione illimitati |
| **Persistenza**       | Effimera                                 | Lo spazio di lavoro persiste tra le sessioni |

## Il Ciclo di Feedback

Il differenziatore qualitativo fondamentale. Questo è lo stesso pattern che rende
efficaci tool come Claude Code -- un ciclo stretto di scrittura/esecuzione/
correzione dove l'agent vede esattamente ciò che vedrebbe uno sviluppatore umano.

### Passo 1: Scrivere

L'agent crea o modifica file nel proprio spazio di lavoro usando `write_file`.
Lo spazio di lavoro è una directory del filesystem reale limitata all'agent
corrente.

### Passo 2: Eseguire

L'agent esegue il codice tramite `run_command`, ricevendo stdout, stderr e
codice di uscita completi. Nessun output viene nascosto o riassunto. L'agent
vede esattamente ciò che si vedrebbe in un terminale.

### Passo 3: Osservare

L'agent legge l'output completo. Se si sono verificati errori, vede lo stack
trace completo, i messaggi di errore e l'output diagnostico. Se i test hanno
fallito, vede quali test hanno fallito e perché.

### Passo 4: Correggere

L'agent modifica il codice in base a ciò che ha osservato, usando `write_file`
o `edit_file` per aggiornare file specifici.

### Passo 5: Ripetere

L'agent esegue di nuovo. Questo ciclo continua fino a quando il codice funziona
-- superando i test, producendo l'output corretto o raggiungendo l'obiettivo
dichiarato.

### Passo 6: Persistere

Una volta funzionante, l'agent può salvare il proprio lavoro come una
[skill](./skills) (SKILL.md + file di supporto), registrarlo come
integrazione, collegarlo a un cron job o renderlo disponibile come tool.

::: tip Il passo di persistenza è ciò che rende l'ambiente di esecuzione più
di un semplice blocco note. Il codice funzionante non scompare semplicemente --
l'agent può pacchettizzarlo in una skill riutilizzabile che viene eseguita a
orario, risponde ai trigger o viene invocata su richiesta. :::

## Tool Disponibili

| Tool             | Descrizione                                       | Output                                      |
| ---------------- | ------------------------------------------------- | ------------------------------------------- |
| `write_file`     | Scrivere o sovrascrivere un file nello spazio di lavoro | Percorso del file, byte scritti         |
| `read_file`      | Leggere il contenuto di un file dallo spazio di lavoro  | Contenuto del file come stringa         |
| `edit_file`      | Applicare modifiche mirate a un file              | Contenuto del file aggiornato               |
| `run_command`    | Eseguire un comando shell nello spazio di lavoro  | stdout, stderr, codice di uscita, durata    |
| `list_directory` | Elencare i file nello spazio di lavoro (ricorsivo opzionale) | Elenco file con dimensioni         |
| `search_files`   | Cercare nei contenuti dei file (simile a grep)    | Righe corrispondenti con riferimenti file:riga |

## Struttura dello Spazio di Lavoro

Ogni agent ottiene una directory di spazio di lavoro isolata che persiste tra le
sessioni:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Spazio di lavoro per agent
    scratch/                      # File di lavoro temporanei
    integrations/                 # Codice di integrazione in sviluppo
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skill in fase di creazione
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Log di esecuzione per l'audit
  background/
    <session-id>/                 # Spazio di lavoro temporaneo per attività in background
```

Gli spazi di lavoro sono isolati tra gli agent. Un agent non può accedere allo
spazio di lavoro di un altro agent. Le attività in background (cron job, trigger)
ottengono il proprio spazio di lavoro temporaneo limitato alla sessione.

## Flusso di Sviluppo delle Integrazioni

Quando si chiede all'agent di costruire una nuova integrazione (ad esempio,
"connettiti al mio Notion e sincronizza le attività"), l'agent segue un flusso
di sviluppo naturale:

1. **Esplorare** -- Usa `run_command` per testare gli endpoint API, verificare
   l'autenticazione, comprendere la forma delle risposte
2. **Scaffolding** -- Scrive il codice dell'integrazione usando `write_file`,
   crea un file di test accanto
3. **Testare** -- Esegue i test con `run_command`, vede i fallimenti, itera
4. **Installare le dipendenze** -- Usa `run_command` per aggiungere i pacchetti
   necessari (npm, pip, deno add)
5. **Iterare** -- Ciclo di scrittura, esecuzione, correzione fino a quando i
   test passano e l'integrazione funziona end-to-end
6. **Persistere** -- Salva come skill (scrive SKILL.md con metadati) o collega
   a un cron job
7. **Approvazione** -- La skill auto-creata entra nello stato
   `PENDING_APPROVAL`; l'utente revisiona e approva

## Supporto Linguaggi e Runtime

L'ambiente di esecuzione viene eseguito sul sistema host (non in WASM), con
accesso a runtime multipli:

| Runtime | Disponibile Tramite                    | Caso d'Uso                              |
| ------- | -------------------------------------- | --------------------------------------- |
| Deno    | Esecuzione diretta                     | TypeScript/JavaScript (prima classe)    |
| Node.js | `run_command node`                     | Accesso all'ecosistema npm              |
| Python  | `run_command python`                   | Data science, ML, scripting             |
| Shell   | `run_command sh` / `run_command bash`  | Automazione di sistema, script di collegamento |

L'agent può rilevare i runtime disponibili e scegliere il migliore per
l'attività. L'installazione dei pacchetti funziona tramite la toolchain standard
per ciascun runtime.

## Confini di Sicurezza

L'ambiente di esecuzione è più permissivo del sandbox dei plugin, ma comunque
controllato dalle policy ad ogni passo.

### Integrazione con le Policy

- Ogni chiamata `run_command` attiva l'hook `PRE_TOOL_CALL` con il comando come
  contesto
- La allowlist/denylist dei comandi viene verificata prima dell'esecuzione
- L'output viene catturato e passato attraverso l'hook `POST_TOOL_RESPONSE`
- Gli endpoint di rete acceduti durante l'esecuzione sono tracciati tramite
  lineage
- Se il codice accede a dati classificati (ad esempio, legge da un'API CRM), il
  taint della sessione aumenta
- La cronologia delle esecuzioni viene registrata in `.exec_history` per l'audit

### Confini Invalicabili

Questi confini non vengono mai superati, indipendentemente dalla configurazione:

- Non può scrivere al di fuori della directory dello spazio di lavoro
- Non può eseguire comandi nella denylist (`rm -rf /`, `sudo`, ecc.)
- Non può accedere agli spazi di lavoro di altri agent
- Tutte le chiamate di rete governate dagli hook di policy
- Tutto l'output classificato e contribuisce al taint della sessione
- Limiti di risorse applicati: spazio su disco, tempo CPU per esecuzione, memoria

::: warning SICUREZZA Ogni comando eseguito dall'agent passa attraverso l'hook
`PRE_TOOL_CALL`. Il motore delle policy lo verifica rispetto alla
allowlist/denylist dei comandi prima che l'esecuzione inizi. I comandi
pericolosi vengono bloccati deterministicamente -- il LLM non può influenzare
questa decisione. :::

### Controlli Enterprise

Gli amministratori enterprise hanno controlli aggiuntivi sull'ambiente di
esecuzione:

- **Disabilitare completamente l'exec** per agent o ruoli specifici
- **Limitare i runtime disponibili** (ad esempio, consentire solo Deno, bloccare
  Python e shell)
- **Impostare limiti di risorse** per agent (quota disco, tempo CPU, limite di
  memoria)
- **Richiedere approvazione** per tutte le operazioni exec al di sopra di una
  soglia di classificazione
- **Denylist di comandi personalizzata** oltre la lista predefinita di comandi
  pericolosi
