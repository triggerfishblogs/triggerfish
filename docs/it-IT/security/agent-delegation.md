# Delega tra Agent

Man mano che gli agent AI interagiscono sempre più tra loro -- un agent che chiama un
altro per completare sotto-attività -- emerge una nuova classe di rischi di sicurezza.
Una catena di agent potrebbe essere utilizzata per riciclare dati attraverso un agent
meno protetto, aggirando i controlli di classificazione. Triggerfish previene questo
con identità crittografica degli agent, limiti massimi di classificazione e
ereditarietà obbligatoria del taint.

## Certificati degli Agent

Ogni agent in Triggerfish ha un certificato che definisce la sua identità, le sue
capacità e i suoi permessi di delega. Questo certificato è firmato dal proprietario
dell'agent e non può essere modificato dall'agent stesso o da altri agent.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Campi chiave nel certificato:

| Campo                  | Scopo                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `max_classification`   | Il **limite massimo di classificazione** -- il livello di taint più alto a cui questo agent può operare. Un agent con limite INTERNAL non può essere invocato da una sessione con taint CONFIDENTIAL. |
| `can_invoke_agents`    | Se questo agent è autorizzato a chiamare altri agent.                                                                                                                                |
| `can_be_invoked_by`    | Lista esplicita degli agent che possono invocare questo.                                                                                                                             |
| `max_delegation_depth` | Profondità massima della catena di invocazione degli agent. Previene la ricorsione illimitata.                                                                                        |
| `signature`            | Firma Ed25519 del proprietario. Previene la manomissione del certificato.                                                                                                            |

## Flusso di Invocazione

Quando un agent chiama un altro, il livello delle policy verifica la delega prima
che l'agent chiamato esegua. Il controllo è deterministico ed eseguito nel codice --
l'agent chiamante non può influenzare la decisione.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Sequenza di delega tra agent: l'Agent A invoca l'Agent B, il livello delle policy verifica il taint rispetto al limite e blocca quando il taint supera il limite" style="max-width: 100%;" />

In questo esempio, l'Agent A ha un taint di sessione CONFIDENTIAL (ha acceduto a
dati Salesforce in precedenza). L'Agent B ha un limite massimo di classificazione
INTERNAL. Poiché CONFIDENTIAL è superiore a INTERNAL, l'invocazione viene bloccata.
I dati contaminati dell'Agent A non possono fluire verso un agent con un limite di
classificazione inferiore.

::: warning SICUREZZA Il livello delle policy controlla il **taint attuale della
sessione** del chiamante, non il suo limite massimo. Anche se l'Agent A ha un limite
CONFIDENTIAL, ciò che conta è il livello di taint effettivo della sessione al momento
dell'invocazione. Se l'Agent A non ha acceduto ad alcun dato classificato (taint
PUBLIC), può invocare l'Agent B (limite INTERNAL) senza problemi. :::

## Tracciamento della Catena di Delega

Quando gli agent invocano altri agent, l'intera catena viene tracciata con
timestamp e livelli di taint ad ogni passaggio:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Riassumi la pipeline Q4"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calcola i tassi di chiusura"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Questa catena viene registrata nel log di audit e può essere interrogata per analisi
di conformità e forensi. È possibile tracciare esattamente quali agent sono stati
coinvolti, quali erano i loro livelli di taint e quali attività hanno eseguito.

## Invarianti di Sicurezza

Quattro invarianti governano la delega tra agent. Tutte sono applicate dal codice nel
livello delle policy e non possono essere sovrascritte da alcun agent nella catena.

| Invariante                       | Applicazione                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Il taint può solo aumentare**  | Ogni chiamato eredita `max(proprio taint, taint del chiamante)`. Un chiamato non può mai avere un taint inferiore al suo chiamante.     |
| **Limite rispettato**            | Un agent non può essere invocato se il taint del chiamante supera il `max_classification` del chiamato.                                  |
| **Limiti di profondità applicati** | La catena termina a `max_delegation_depth`. Se il limite è 3, un'invocazione di quarto livello viene bloccata.                        |
| **Invocazione circolare bloccata** | Un agent non può apparire due volte nella stessa catena. Se l'Agent A chiama l'Agent B che tenta di chiamare l'Agent A, la seconda invocazione viene bloccata. |

### Ereditarietà del Taint nel Dettaglio

Quando l'Agent A (taint: CONFIDENTIAL) invoca con successo l'Agent B (limite:
CONFIDENTIAL), l'Agent B inizia con un taint CONFIDENTIAL -- ereditato dall'Agent A.
Se l'Agent B accede poi a dati RESTRICTED, il suo taint sale a RESTRICTED. Questo
taint elevato viene riportato all'Agent A quando l'invocazione si completa.

<img src="/diagrams/taint-inheritance.svg" alt="Ereditarietà del taint: l'Agent A (INTERNAL) invoca l'Agent B, B eredita il taint, accede a Salesforce (CONFIDENTIAL), restituisce il taint elevato ad A" style="max-width: 100%;" />

Il taint fluisce in entrambe le direzioni -- dal chiamante al chiamato al momento
dell'invocazione, e dal chiamato al chiamante al completamento. Può solo aumentare.

## Prevenzione del Riciclaggio di Dati

Un vettore di attacco chiave nei sistemi multi-agent è il **riciclaggio di dati** --
l'uso di una catena di agent per spostare dati classificati verso una destinazione
con classificazione inferiore, instradandoli attraverso agent intermedi.

### L'Attacco

```
Obiettivo dell'attaccante: Esfiltrare dati CONFIDENTIAL tramite un canale PUBLIC

Flusso tentato:
1. L'Agent A accede a Salesforce (taint --> CONFIDENTIAL)
2. L'Agent A invoca l'Agent B (che ha un canale PUBLIC)
3. L'Agent B invia i dati al canale PUBLIC
```

### Perché Fallisce

Triggerfish blocca questo attacco in più punti:

**Punto di blocco 1: Controllo dell'invocazione.** Se l'Agent B ha un limite
inferiore a CONFIDENTIAL, l'invocazione viene bloccata direttamente. Il taint
dell'Agent A (CONFIDENTIAL) supera il limite dell'Agent B.

**Punto di blocco 2: Ereditarietà del taint.** Anche se l'Agent B ha un limite
CONFIDENTIAL e l'invocazione ha successo, l'Agent B eredita il taint CONFIDENTIAL
dell'Agent A. Quando l'Agent B tenta di inviare output a un canale PUBLIC, l'hook
`PRE_OUTPUT` blocca il write-down.

**Punto di blocco 3: Nessun reset del taint nella delega.** Gli agent in una catena
di delega non possono resettare il proprio taint. Il reset del taint è disponibile
solo per l'utente finale, e cancella l'intera cronologia della conversazione. Non
esiste un meccanismo per un agent di "lavare" il proprio livello di taint durante
una catena.

::: danger I dati non possono sfuggire alla loro classificazione attraverso la
delega tra agent. La combinazione di controlli sui limiti, ereditarietà obbligatoria
del taint e assenza-di-reset-del-taint-nelle-catene rende impossibile il riciclaggio
di dati attraverso catene di agent all'interno del modello di sicurezza di
Triggerfish. :::

## Scenari di Esempio

### Scenario 1: Delega Riuscita

```
Agent A (limite: CONFIDENTIAL, taint attuale: INTERNAL)
  chiama Agent B (limite: CONFIDENTIAL)

Controllo policy:
  - A può invocare B? SÌ (B è nella lista di delega di A)
  - Taint di A (INTERNAL) <= limite di B (CONFIDENTIAL)? SÌ
  - Limite di profondità OK? SÌ (profondità 1 su massimo 3)
  - Circolare? NO

Risultato: CONSENTITO
Agent B inizia con taint: INTERNAL (ereditato da A)
```

### Scenario 2: Bloccato dal Limite

```
Agent A (limite: RESTRICTED, taint attuale: CONFIDENTIAL)
  chiama Agent B (limite: INTERNAL)

Controllo policy:
  - Taint di A (CONFIDENTIAL) <= limite di B (INTERNAL)? NO

Risultato: BLOCCATO
Motivo: Il limite dell'Agent B (INTERNAL) è inferiore al taint della sessione (CONFIDENTIAL)
```

### Scenario 3: Bloccato dal Limite di Profondità

```
Agent A chiama Agent B (profondità 1)
  Agent B chiama Agent C (profondità 2)
    Agent C chiama Agent D (profondità 3)
      Agent D chiama Agent E (profondità 4)

Controllo policy per Agent E:
  - Profondità 4 > max_delegation_depth (3)

Risultato: BLOCCATO
Motivo: Profondità massima di delega superata
```

### Scenario 4: Bloccato da Riferimento Circolare

```
Agent A chiama Agent B (profondità 1)
  Agent B chiama Agent C (profondità 2)
    Agent C chiama Agent A (profondità 3)

Controllo policy per la seconda invocazione dell'Agent A:
  - Agent A appare già nella catena

Risultato: BLOCCATO
Motivo: Invocazione circolare tra agent rilevata
```

## Pagine Correlate

- [Progettazione Security-First](/it-IT/security/) -- panoramica dell'architettura di sicurezza
- [Regola No Write-Down](/it-IT/security/no-write-down) -- la regola sul flusso di classificazione che la delega applica
- [Identità e Autenticazione](/it-IT/security/identity) -- come viene stabilita l'identità dell'utente e del canale
- [Audit e Conformità](/it-IT/security/audit-logging) -- come le catene di delega vengono registrate nel log di audit
