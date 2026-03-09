# Gestione dei Secret

Triggerfish non archivia mai le credenziali nei file di configurazione. Tutti i
secret -- chiavi API, token OAuth, credenziali delle integrazioni -- sono
archiviati nello storage sicuro nativo della piattaforma: il portachiavi del
sistema operativo per il livello personale, o un servizio vault per il livello
enterprise. Plugin e agent interagiscono con le credenziali attraverso l'SDK,
che applica controlli di accesso rigorosi.

## Backend di Archiviazione

| Livello        | Backend               | Dettagli                                                                                          |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| **Personale**  | Portachiavi del SO    | macOS Keychain, Linux Secret Service (via D-Bus), Windows Credential Manager                      |
| **Enterprise** | Integrazione con Vault | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, o altri servizi vault enterprise           |

In entrambi i casi, i secret sono crittografati a riposo dal backend di
archiviazione. Triggerfish non implementa una propria crittografia per i
secret -- delega a sistemi di archiviazione dei secret progettati allo scopo
e sottoposti ad audit.

Sulle piattaforme senza un portachiavi nativo (Windows senza Credential Manager,
container Docker), Triggerfish ricorre a un file JSON crittografato in
`~/.triggerfish/secrets.json`. Le voci sono crittografate con AES-256-GCM
utilizzando una chiave a 256 bit legata alla macchina, archiviata in
`~/.triggerfish/secrets.key` (permessi: `0600`). Ogni voce utilizza un IV
casuale di 12 byte ad ogni scrittura. I file di secret in chiaro legacy vengono
automaticamente migrati al formato crittografato al primo caricamento.

::: tip Il livello personale non richiede alcuna configurazione per i secret.
Quando si connette un'integrazione durante la configurazione (`triggerfish
dive`), le credenziali vengono automaticamente archiviate nel portachiavi del
sistema operativo. Non è necessario installare o configurare nulla oltre a
ciò che il sistema operativo già fornisce. :::

## Riferimenti ai Secret nella Configurazione

Triggerfish supporta i riferimenti `secret:` in `triggerfish.yaml`. Invece di
archiviare le credenziali in chiaro, si fa riferimento ad esse per nome e
vengono risolte dal portachiavi del SO all'avvio.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

Il resolver esegue una visita in profondità del file di configurazione. Qualsiasi
valore stringa che inizia con `secret:` viene sostituito con la voce
corrispondente del portachiavi. Se un secret referenziato non viene trovato,
l'avvio fallisce immediatamente con un messaggio di errore chiaro.

### Migrazione dei Secret Esistenti

Se si hanno credenziali in chiaro nel file di configurazione da una versione
precedente, il comando di migrazione le sposta automaticamente nel portachiavi:

```bash
triggerfish config migrate-secrets
```

Questo comando:

1. Analizza `triggerfish.yaml` alla ricerca di valori di credenziali in chiaro
2. Archivia ciascuno nel portachiavi del SO
3. Sostituisce il valore in chiaro con un riferimento `secret:`
4. Crea un backup del file originale

::: warning Dopo la migrazione, verificare che l'agent si avvii correttamente
prima di eliminare il file di backup. La migrazione non è reversibile senza il
backup. :::

## Architettura delle Credenziali Delegate

Un principio di sicurezza fondamentale in Triggerfish è che le query sui dati
vengono eseguite con le credenziali dell'**utente**, non con credenziali di
sistema. Questo garantisce che l'agent erediti il modello di permessi del sistema
sorgente -- un utente può accedere solo ai dati a cui potrebbe accedere
direttamente.

<img src="/diagrams/delegated-credentials.svg" alt="Architettura delle credenziali delegate: l'utente concede il consenso OAuth, l'agent esegue query con il token dell'utente, il sistema sorgente applica i permessi" style="max-width: 100%;" />

Questa architettura significa:

- **Nessun eccesso di permessi** -- l'agent non può accedere a dati a cui
  l'utente non può accedere direttamente
- **Nessun account di servizio di sistema** -- non esiste una credenziale
  onnipotente che potrebbe essere compromessa
- **Applicazione dal sistema sorgente** -- il sistema sorgente (Salesforce, Jira,
  GitHub, ecc.) applica i propri permessi su ogni query

::: warning SICUREZZA Le piattaforme AI agent tradizionali spesso utilizzano un
singolo account di servizio di sistema per accedere alle integrazioni per conto
di tutti gli utenti. Questo significa che l'agent ha accesso a tutti i dati
nell'integrazione e si affida al LLM per decidere cosa mostrare a ciascun
utente. Triggerfish elimina completamente questo rischio: le query vengono
eseguite con il token OAuth delegato dell'utente. :::

## Applicazione nell'SDK dei Plugin

I plugin interagiscono con le credenziali esclusivamente attraverso l'SDK di
Triggerfish. L'SDK fornisce metodi consapevoli dei permessi e blocca qualsiasi
tentativo di accesso alle credenziali a livello di sistema.

### Consentito: Accesso alle Credenziali dell'Utente

```python
def get_user_opportunities(sdk, params):
    # L'SDK recupera il token delegato dell'utente dallo storage sicuro
    # Se l'utente non ha connesso Salesforce, restituisce un errore utile
    user_token = sdk.get_user_credential("salesforce")

    # La query viene eseguita con i permessi dell'utente
    # Il sistema sorgente applica il controllo degli accessi
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Bloccato: Accesso alle Credenziali di Sistema

```python
def get_all_opportunities(sdk, params):
    # Questo genererà PermissionError -- BLOCCATO dall'SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` è sempre bloccato. Non esiste alcuna
configurazione per abilitarlo, nessun override dell'amministratore e nessuna
via di fuga. Questa è una regola di sicurezza fissa, come la regola
no write-down. :::

## Tool per i Secret Richiamabili dal LLM

L'agent può aiutare a gestire i secret attraverso tre tool. Fondamentalmente,
il LLM non vede mai i valori effettivi dei secret -- l'input e l'archiviazione
avvengono fuori banda.

### `secret_save`

Richiede di inserire un valore secret in modo sicuro:

- **CLI**: Il terminale passa alla modalità di input nascosto (i caratteri non vengono visualizzati)
- **Tidepool**: Appare un popup di input sicuro nell'interfaccia web

Il LLM richiede che un secret venga salvato, ma il valore effettivo viene
inserito dall'utente attraverso il prompt sicuro. Il valore viene archiviato
direttamente nel portachiavi -- non passa mai attraverso il contesto del LLM.

### `secret_list`

Elenca i nomi di tutti i secret archiviati. Non espone mai i valori.

### `secret_delete`

Elimina un secret per nome dal portachiavi.

### Sostituzione negli Argomenti dei Tool

<div v-pre>

Quando l'agent utilizza un tool che necessita di un secret (ad esempio,
impostare una chiave API in una variabile d'ambiente di un server MCP), utilizza
la sintassi <span v-pre>`{{secret:name}}`</span> negli argomenti del tool:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

Il runtime risolve i riferimenti <span v-pre>`{{secret:name}}`</span> **sotto il livello del LLM**
prima che il tool venga eseguito. Il valore risolto non appare mai nella
cronologia della conversazione o nei log.

</div>

::: warning SICUREZZA La sostituzione <code v-pre>{{secret:name}}</code> è
applicata dal codice, non dal LLM. Anche se il LLM tentasse di registrare o
restituire il valore risolto, il livello delle policy intercetterebbe il
tentativo nell'hook `PRE_OUTPUT`. :::

### Metodi di Permesso dell'SDK

| Metodo                                  | Comportamento                                                                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Restituisce il token OAuth delegato dell'utente per l'integrazione specificata. Se l'utente non ha connesso l'integrazione, restituisce un errore con le istruzioni.          |
| `sdk.query_as_user(integration, query)` | Esegue una query sull'integrazione utilizzando le credenziali delegate dell'utente. Il sistema sorgente applica i propri permessi.                                            |
| `sdk.get_system_credential(name)`       | **Sempre bloccato.** Genera `PermissionError`. Registrato come evento di sicurezza.                                                                                          |
| `sdk.has_user_connection(integration)`  | Restituisce `true` se l'utente ha connesso l'integrazione specificata, `false` altrimenti. Non espone alcun dato delle credenziali.                                           |

## Accesso ai Dati Consapevole dei Permessi

L'architettura delle credenziali delegate lavora in sinergia con il sistema di
classificazione. Anche se un utente ha il permesso di accedere ai dati nel
sistema sorgente, le regole di classificazione di Triggerfish governano dove
quei dati possono fluire dopo essere stati recuperati.

<img src="/diagrams/secret-resolution-flow.svg" alt="Flusso di risoluzione dei secret: i riferimenti nel file di configurazione vengono risolti dal portachiavi del SO sotto il livello del LLM" style="max-width: 100%;" />

**Esempio:**

```
Utente: "Riassumi l'affare Acme e invialo a mia moglie"

Passo 1: Controllo dei permessi
  --> Utilizzato il token Salesforce dell'utente
  --> Salesforce restituisce l'opportunità Acme (l'utente ha accesso)

Passo 2: Classificazione
  --> I dati Salesforce classificati come CONFIDENTIAL
  --> Il taint della sessione sale a CONFIDENTIAL

Passo 3: Controllo dell'output
  --> Moglie = destinatario EXTERNAL
  --> CONFIDENTIAL --> EXTERNAL: BLOCCATO

Risultato: Dati recuperati (l'utente ha il permesso), ma non possono essere
           inviati (le regole di classificazione prevengono la fuga)
```

L'utente ha un accesso legittimo all'affare Acme in Salesforce. Triggerfish
rispetta questo e recupera i dati. Ma il sistema di classificazione impedisce a
quei dati di fluire verso un destinatario esterno. Il permesso di accedere ai
dati è separato dal permesso di condividerli.

## Registrazione degli Accessi ai Secret

Ogni accesso alle credenziali viene registrato attraverso l'hook di applicazione
`SECRET_ACCESS`:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Anche i tentativi bloccati vengono registrati:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info I tentativi di accesso alle credenziali bloccati vengono registrati a un
livello di allerta elevato. Nelle distribuzioni enterprise, questi eventi possono
attivare notifiche al team di sicurezza. :::

## Integrazione con Vault Enterprise

Le distribuzioni enterprise possono connettere Triggerfish a un servizio vault
centralizzato per la gestione delle credenziali:

| Servizio Vault      | Integrazione                            |
| ------------------- | --------------------------------------- |
| HashiCorp Vault     | Integrazione API nativa                 |
| AWS Secrets Manager | Integrazione AWS SDK                    |
| Azure Key Vault     | Integrazione Azure SDK                  |
| Vault personalizzato | Interfaccia `SecretProvider` modulare  |

L'integrazione con vault enterprise fornisce:

- **Rotazione centralizzata** -- le credenziali vengono ruotate nel vault e
  automaticamente acquisite da Triggerfish
- **Policy di accesso** -- le policy a livello di vault controllano quali agent
  e utenti possono accedere a quali credenziali
- **Consolidamento dell'audit** -- i log di accesso alle credenziali di
  Triggerfish e del vault possono essere correlati

## Cosa Non Viene Mai Archiviato nei File di Configurazione

I seguenti valori non appaiono mai come valori in chiaro in `triggerfish.yaml` o
in qualsiasi altro file di configurazione. Sono archiviati nel portachiavi del SO
e referenziati tramite la sintassi `secret:`, oppure gestiti attraverso il tool
`secret_save`:

- Chiavi API per i provider LLM
- Token OAuth per le integrazioni
- Credenziali dei database
- Secret dei webhook
- Chiavi di crittografia
- Codici di associazione (effimeri, solo in memoria)

::: danger Se si trovano credenziali in chiaro in un file di configurazione di
Triggerfish (valori che NON sono riferimenti `secret:`), qualcosa è andato
storto. Eseguire `triggerfish config migrate-secrets` per spostarli nel
portachiavi. Le credenziali trovate in chiaro devono essere ruotate
immediatamente. :::

## Pagine Correlate

- [Progettazione Security-First](/it-IT/security/) -- panoramica dell'architettura di sicurezza
- [Regola No Write-Down](/it-IT/security/no-write-down) -- come i controlli di classificazione completano l'isolamento delle credenziali
- [Identità e Autenticazione](/it-IT/security/identity) -- come l'identità dell'utente alimenta l'accesso con credenziali delegate
- [Audit e Conformità](/it-IT/security/audit-logging) -- come vengono registrati gli eventi di accesso alle credenziali
