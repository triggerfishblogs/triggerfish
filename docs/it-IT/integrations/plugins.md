# SDK dei Plugin e Sandbox

I plugin di Triggerfish consentono di estendere l'agent con codice personalizzato
che interagisce con sistemi esterni -- query CRM, operazioni su database,
integrazioni API, flussi di lavoro multi-step -- il tutto eseguito all'interno
di un doppio sandbox che impedisce al codice di fare qualsiasi cosa non sia
stata esplicitamente permessa.

## Ambiente di Runtime

I plugin vengono eseguiti su Deno + Pyodide (WASM). Nessun Docker. Nessun
container. Nessun prerequisito oltre all'installazione di Triggerfish stessa.

- I **plugin TypeScript** vengono eseguiti direttamente nel sandbox Deno
- I **plugin Python** vengono eseguiti all'interno di Pyodide (un interprete
  Python compilato in WebAssembly), che a sua volta viene eseguito nel sandbox
  Deno

<img src="/diagrams/plugin-sandbox.svg" alt="Sandbox dei plugin: il sandbox Deno avvolge il sandbox WASM, il codice del plugin viene eseguito nello strato più interno" style="max-width: 100%;" />

Questa architettura a doppio sandbox significa che anche se un plugin contiene
codice malevolo, non può accedere al filesystem, effettuare chiamate di rete
non dichiarate o evadere verso il sistema host.

## Cosa Possono Fare i Plugin

I plugin hanno un interno flessibile all'interno di confini rigorosi. All'interno
del sandbox, un plugin può:

- Eseguire operazioni CRUD complete sui sistemi target (usando i permessi
  dell'utente)
- Eseguire query complesse e trasformazioni di dati
- Orchestrare flussi di lavoro multi-step
- Elaborare e analizzare dati
- Mantenere lo stato del plugin tra le invocazioni
- Chiamare qualsiasi endpoint API esterno dichiarato

## Cosa Non Possono Fare i Plugin

| Vincolo                                          | Come Viene Applicato                                            |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Accedere a endpoint di rete non dichiarati        | Il sandbox blocca tutte le chiamate di rete non nella allowlist |
| Emettere dati senza etichetta di classificazione | L'SDK rifiuta i dati non classificati                           |
| Leggere dati senza propagazione del taint        | L'SDK contamina automaticamente la sessione all'accesso ai dati |
| Persistere dati al di fuori di Triggerfish       | Nessun accesso al filesystem dall'interno del sandbox           |
| Esfiltrare tramite canali laterali               | Limiti di risorse applicati, nessun accesso a socket raw        |
| Utilizzare credenziali di sistema                | L'SDK blocca `get_system_credential()`; solo credenziali utente |

::: warning SICUREZZA `sdk.get_system_credential()` è **bloccato** per
progettazione. I plugin devono sempre utilizzare credenziali utente delegate
tramite `sdk.get_user_credential()`. Questo garantisce che l'agent possa
accedere solo a ciò a cui l'utente può accedere -- mai di più. :::

## Metodi dell'SDK dei Plugin

L'SDK fornisce un'interfaccia controllata per i plugin per interagire con i
sistemi esterni e la piattaforma Triggerfish.

### Accesso alle Credenziali

```typescript
// Ottenere le credenziali delegate dell'utente per un servizio
const credential = await sdk.get_user_credential("salesforce");

// Verificare se l'utente ha connesso un servizio
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` recupera il token OAuth o la chiave API
dell'utente per il servizio specificato. Se l'utente non ha connesso il
servizio, la chiamata restituisce `null` e il plugin dovrebbe gestire questo
caso in modo appropriato.

### Operazioni sui Dati

```typescript
// Interrogare un sistema esterno usando i permessi dell'utente
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Emettere dati verso l'agent — l'etichetta di classificazione è OBBLIGATORIA
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info Ogni chiamata a `sdk.emitData()` richiede un'etichetta `classification`.
Se viene omessa, l'SDK rifiuta la chiamata. Questo garantisce che tutti i dati
che fluiscono dai plugin nel contesto dell'agent siano correttamente
classificati. :::

### Verifica della Connessione

```typescript
// Verificare se l'utente ha una connessione attiva a un servizio
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## Ciclo di Vita dei Plugin

Ogni plugin segue un ciclo di vita che garantisce la revisione di sicurezza
prima dell'attivazione.

```
1. Plugin creato (dall'utente, dall'agent o da terze parti)
       |
       v
2. Plugin costruito utilizzando l'SDK dei Plugin
   - Deve implementare le interfacce richieste
   - Deve dichiarare endpoint e capacità
   - Deve superare la validazione
       |
       v
3. Il plugin entra nello stato UNTRUSTED
   - L'agent NON PUÒ utilizzarlo
   - Proprietario/amministratore notificato: "Classificazione in attesa"
       |
       v
4. Il proprietario (personale) o l'amministratore (enterprise) revisiona:
   - A quali dati accede questo plugin?
   - Quali azioni può compiere?
   - Assegna il livello di classificazione
       |
       v
5. Plugin attivo al livello di classificazione assegnato
   - L'agent può invocare entro i vincoli delle policy
   - Tutte le invocazioni passano attraverso gli hook di policy
```

::: tip Nel livello personale, il proprietario è l'utente stesso -- che revisiona
e classifica i propri plugin. Nel livello enterprise, un amministratore gestisce
il registro dei plugin e assegna i livelli di classificazione. :::

## Connettività ai Database

I driver nativi dei database (psycopg2, mysqlclient, ecc.) non funzionano
all'interno del sandbox WASM. I plugin si connettono ai database attraverso API
basate su HTTP.

| Database   | Opzione Basata su HTTP              |
| ---------- | ----------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API   |
| MySQL      | PlanetScale API                     |
| MongoDB    | Atlas Data API                      |
| Snowflake  | REST API                            |
| BigQuery   | REST API                            |
| DynamoDB   | AWS SDK (HTTP)                      |

Questo è un vantaggio di sicurezza, non una limitazione. Tutti gli accessi ai
database fluiscono attraverso richieste HTTP ispezionabili e controllabili che
il sandbox può applicare e il sistema di audit può registrare.

## Scrivere un Plugin TypeScript

Un plugin TypeScript minimale che interroga una REST API:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Verificare se l'utente ha connesso il servizio
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // Interrogare usando le credenziali dell'utente
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Emettere dati classificati verso l'agent
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Scrivere un Plugin Python

Un plugin Python minimale:

```python
async def execute(sdk):
    # Verificare la connessione
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Interrogare usando le credenziali dell'utente
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Emettere con classificazione
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

I plugin Python vengono eseguiti all'interno del runtime Pyodide WASM. I moduli
della libreria standard sono disponibili, ma le estensioni C native no.
Utilizzare API basate su HTTP per la connettività esterna.

## Riepilogo della Sicurezza dei Plugin

- I plugin vengono eseguiti in un doppio sandbox (Deno + WASM) con isolamento
  rigoroso
- Tutti gli accessi di rete devono essere dichiarati nel manifesto del plugin
- Tutti i dati emessi devono portare un'etichetta di classificazione
- Le credenziali di sistema sono bloccate -- sono disponibili solo credenziali
  delegate dell'utente
- Ogni plugin entra nel sistema come `UNTRUSTED` e deve essere classificato
  prima dell'uso
- Tutte le invocazioni dei plugin passano attraverso gli hook di policy e sono
  completamente soggette ad audit
