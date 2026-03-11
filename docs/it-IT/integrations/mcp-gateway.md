# MCP Gateway

> Utilizzare qualsiasi server MCP. Noi proteggiamo il confine.

Il Model Context Protocol (MCP) è lo standard emergente per la comunicazione
agent-to-tool. Triggerfish fornisce un MCP Gateway sicuro che consente di
connettersi a qualsiasi server compatibile con MCP applicando al contempo
controlli di classificazione, permessi a livello di tool, tracciamento del
taint e registrazione di audit completa.

Si portano i server MCP. Triggerfish protegge ogni richiesta e risposta che
attraversa il confine.

## Come Funziona

Il MCP Gateway si trova tra l'agent e qualsiasi server MCP. Ogni chiamata a un
tool passa attraverso il livello di applicazione delle policy prima di
raggiungere il server esterno, e ogni risposta viene classificata prima di
entrare nel contesto dell'agent.

<img src="/diagrams/mcp-gateway-flow.svg" alt="Flusso del MCP Gateway: Agent → MCP Gateway → Livello delle Policy → Server MCP, con percorso di rifiuto verso BLOCCATO" style="max-width: 100%;" />

Il gateway fornisce cinque funzioni principali:

1. **Autenticazione e classificazione del server** -- I server MCP devono essere
   revisionati e classificati prima dell'uso
2. **Applicazione dei permessi a livello di tool** -- I singoli tool possono
   essere consentiti, limitati o bloccati
3. **Tracciamento del taint richiesta/risposta** -- Il taint della sessione
   aumenta in base alla classificazione del server
4. **Validazione degli schema** -- Tutte le richieste e risposte validate
   rispetto agli schema dichiarati
5. **Registrazione di audit** -- Ogni chiamata a tool, decisione e modifica del
   taint viene registrata

## Stati del Server MCP

Tutti i server MCP hanno lo stato predefinito `UNTRUSTED`. Devono essere
esplicitamente classificati prima che l'agent possa invocarli.

| Stato        | Descrizione                                                                    | L'Agent Può Invocare? |
| ------------ | ------------------------------------------------------------------------------ | :-------------------: |
| `UNTRUSTED`  | Predefinito per i nuovi server. In attesa di revisione.                        |          No           |
| `CLASSIFIED` | Revisionato e con livello di classificazione assegnato con permessi per tool.  |  Sì (entro le policy) |
| `BLOCKED`    | Esplicitamente proibito dall'amministratore.                                   |          No           |

<img src="/diagrams/state-machine.svg" alt="Macchina a stati del server MCP: UNTRUSTED → CLASSIFIED o BLOCKED" style="max-width: 100%;" />

::: warning SICUREZZA Un server MCP `UNTRUSTED` non può essere invocato
dall'agent in nessuna circostanza. Il LLM non può richiedere, convincere o
ingannare il sistema per utilizzare un server non classificato. La
classificazione è un gate a livello di codice, non una decisione del LLM. :::

## Configurazione

I server MCP sono configurati in `triggerfish.yaml` come mappa indicizzata per
ID del server. Ogni server utilizza un sottoprocesso locale (trasporto stdio)
o un endpoint remoto (trasporto SSE).

### Server Locali (Stdio)

I server locali vengono generati come sottoprocessi. Triggerfish comunica con
essi tramite stdin/stdout.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Server Remoti (SSE)

I server remoti vengono eseguiti altrove e sono accessibili tramite HTTP
Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Chiavi di Configurazione

| Chiave           | Tipo     | Obbligatorio | Descrizione                                                                    |
| ---------------- | -------- | ------------ | ------------------------------------------------------------------------------ |
| `command`        | string   | Sì (stdio)   | Binario da avviare (es. `npx`, `deno`, `node`)                                |
| `args`           | string[] | No           | Argomenti passati al comando                                                   |
| `env`            | map      | No           | Variabili d'ambiente per il sottoprocesso                                      |
| `url`            | string   | Sì (SSE)     | Endpoint HTTP per i server remoti                                              |
| `classification` | string   | **Sì**       | Livello di sensibilità dei dati: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` o `RESTRICTED` |
| `enabled`        | boolean  | No           | Predefinito: `true`. Impostare a `false` per saltare senza rimuovere la configurazione. |

Ogni server deve avere `command` (locale) o `url` (remoto). I server senza
nessuno dei due vengono saltati.

### Connessione Lazy

I server MCP si connettono in background dopo l'avvio. Non è necessario
attendere che tutti i server siano pronti prima di utilizzare l'agent.

- I server ritentano con backoff esponenziale: 2s → 4s → 8s → 30s max
- I nuovi server diventano disponibili per l'agent man mano che si connettono --
  non è necessario riavviare la sessione
- Se un server non riesce a connettersi dopo tutti i tentativi, entra nello
  stato `failed` e può essere ritentato al prossimo riavvio del daemon

La CLI e le interfacce Tidepool mostrano lo stato di connessione MCP in tempo
reale. Vedere [Canale CLI](/it-IT/channels/cli#mcp-server-status) per i
dettagli.

### Disabilitare un Server

Per disabilitare temporaneamente un server MCP senza rimuovere la sua
configurazione:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Saltato durante l'avvio
```

### Variabili d'Ambiente e Secret

I valori env con prefisso `keychain:` vengono risolti dal portachiavi del SO
all'avvio:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # Risolto dal portachiavi del SO
  PLAIN_VAR: "literal-value" # Passato così com'è
```

Solo `PATH` viene ereditato dall'ambiente dell'host (affinché `npx`, `node`,
`deno`, ecc. vengano risolti correttamente). Nessun'altra variabile d'ambiente
dell'host filtra nei sottoprocessi dei server MCP.

::: tip Archiviare i secret con `triggerfish config set-secret <name> <value>`.
Poi referenziarli come `keychain:<name>` nella configurazione env del server
MCP. :::

### Denominazione dei Tool

I tool dei server MCP sono denominati come `mcp_<serverId>_<toolName>` per
evitare collisioni con i tool integrati. Ad esempio, se un server denominato
`github` espone un tool chiamato `list_repos`, l'agent lo vede come
`mcp_github_list_repos`.

### Classificazione e Deny Predefinito

Se si omette `classification`, il server viene registrato come **UNTRUSTED** e
il gateway rifiuta tutte le chiamate ai tool. È necessario scegliere
esplicitamente un livello di classificazione. Consultare la
[Guida alla Classificazione](/it-IT/guide/classification-guide) per aiuto nella
scelta del livello giusto.

## Flusso delle Chiamate ai Tool

Quando l'agent richiede una chiamata a un tool MCP, il gateway esegue una
sequenza deterministica di controlli prima di inoltrare la richiesta.

### 1. Controlli Pre-Flight

Tutti i controlli sono deterministici -- nessuna chiamata al LLM, nessuna
casualità.

| Controllo                                                    | Risultato in Caso di Errore                  |
| ------------------------------------------------------------ | -------------------------------------------- |
| Lo stato del server è `CLASSIFIED`?                          | Blocco: "Server non approvato"               |
| Il tool è permesso per questo server?                        | Blocco: "Tool non permesso"                  |
| L'utente ha i permessi richiesti?                            | Blocco: "Permesso negato"                    |
| Il taint della sessione è compatibile con la classificazione del server? | Blocco: "Violerebbe il write-down" |
| La validazione dello schema passa?                           | Blocco: "Parametri non validi"               |

::: info Se il taint della sessione è superiore alla classificazione del server,
la chiamata viene bloccata per prevenire il write-down. Una sessione contaminata
a `CONFIDENTIAL` non può inviare dati a un server MCP `PUBLIC`. :::

### 2. Esecuzione

Se tutti i controlli pre-flight passano, il gateway inoltra la richiesta al
server MCP.

### 3. Elaborazione della Risposta

Quando il server MCP restituisce una risposta:

- Validazione della risposta rispetto allo schema dichiarato
- Classificazione dei dati di risposta al livello di classificazione del server
- Aggiornamento del taint della sessione: `taint = max(taint_attuale, classificazione_server)`
- Creazione di un record di lineage che traccia l'origine dei dati

### 4. Audit

Ogni chiamata a un tool viene registrata con: identità del server, nome del
tool, identità dell'utente, decisione di policy, modifica del taint e
timestamp.

## Regole di Taint delle Risposte

Le risposte dei server MCP ereditano il livello di classificazione del server.
Il taint della sessione può solo aumentare.

| Classificazione del Server | Taint della Risposta | Impatto sulla Sessione                            |
| -------------------------- | -------------------- | ------------------------------------------------- |
| `PUBLIC`                   | `PUBLIC`             | Nessuna modifica del taint                        |
| `INTERNAL`                 | `INTERNAL`           | Il taint sale almeno a `INTERNAL`                 |
| `CONFIDENTIAL`             | `CONFIDENTIAL`       | Il taint sale almeno a `CONFIDENTIAL`             |
| `RESTRICTED`               | `RESTRICTED`         | Il taint sale a `RESTRICTED`                      |

Una volta che una sessione è contaminata a un dato livello, resta a quel livello
o superiore per il resto della sessione. È necessario un reset completo della
sessione (che cancella la cronologia della conversazione) per ridurre il taint.

## Passthrough dell'Autenticazione dell'Utente

Per i server MCP che supportano l'autenticazione a livello di utente, il gateway
passa le credenziali delegate dell'utente anziché credenziali di sistema.

Quando un tool è configurato con `requires_user_auth: true`:

1. Il gateway verifica se l'utente ha connesso questo server MCP
2. Recupera le credenziali delegate dell'utente dallo store sicuro delle
   credenziali
3. Aggiunge l'autenticazione dell'utente agli header della richiesta MCP
4. Il server MCP applica i permessi a livello di utente

Il risultato: il server MCP vede l'**identità dell'utente**, non un'identità
di sistema. L'ereditarietà dei permessi funziona attraverso il confine MCP --
l'agent può accedere solo a ciò a cui l'utente può accedere.

::: tip Il passthrough dell'autenticazione utente è il pattern preferito per
qualsiasi server MCP che gestisce il controllo degli accessi. Significa che
l'agent eredita i permessi dell'utente anziché avere accesso di sistema
indiscriminato. :::

## Validazione degli Schema

Il gateway valida tutte le richieste e risposte MCP rispetto agli schema
dichiarati prima dell'inoltro:

```typescript
// Validazione della richiesta (semplificata)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Validazione dei parametri rispetto allo schema JSON
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Controllo per pattern di injection nei parametri stringa
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

La validazione degli schema intercetta le richieste malformate prima che
raggiungano il server esterno e segnala potenziali pattern di injection nei
parametri stringa.

## Controlli Enterprise

Le distribuzioni enterprise hanno controlli aggiuntivi per la gestione dei
server MCP:

- **Registro dei server gestito dall'amministratore** -- Solo i server MCP
  approvati dall'amministratore possono essere classificati
- **Permessi per tool per dipartimento** -- Team diversi possono avere accesso
  a tool diversi
- **Registrazione per la conformità** -- Tutte le interazioni MCP disponibili
  nelle dashboard di conformità
- **Limitazione della frequenza** -- Limiti di frequenza per server e per tool
- **Monitoraggio della salute del server** -- Il gateway traccia la
  disponibilità e i tempi di risposta del server
