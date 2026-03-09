# Motore di Policy e Hook

Il motore di policy è il livello di applicazione che si interpone tra l'LLM e il
mondo esterno. Intercetta ogni azione nei punti critici del flusso dei dati e
prende decisioni deterministiche ALLOW, BLOCK o REDACT. L'LLM non può aggirare,
modificare o influenzare queste decisioni.

## Principio Fondamentale: Applicazione Sotto l'LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Livelli di applicazione delle policy: l'LLM si trova sopra il livello di policy, che si trova sopra il livello di esecuzione" style="max-width: 100%;" />

::: warning SICUREZZA L'LLM si trova sopra il livello di policy. Può subire
prompt injection, jailbreak o manipolazione -- e non importa. Il livello di
policy è puro codice che viene eseguito sotto l'LLM, esaminando richieste di
azione strutturate e prendendo decisioni binarie basate su regole di
classificazione. Non esiste un percorso dall'output dell'LLM al bypass degli
Hook. :::

## Tipi di Hook

Otto Hook di applicazione intercettano le azioni in ogni punto critico del
flusso dei dati.

### Architettura degli Hook

<img src="/diagrams/hook-chain-flow.svg" alt="Flusso della catena degli Hook: PRE_CONTEXT_INJECTION → Contesto LLM → PRE_TOOL_CALL → Esecuzione Strumento → POST_TOOL_RESPONSE → Risposta LLM → PRE_OUTPUT → Canale di Output" style="max-width: 100%;" />

### Tutti i Tipi di Hook

| Hook                    | Trigger                             | Azioni Chiave                                                             | Modalità di Fallimento   |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| `PRE_CONTEXT_INJECTION` | Input esterno entra nel contesto    | Classifica input, assegna taint, crea lineage, scansiona per injection    | Rifiuta input            |
| `PRE_TOOL_CALL`         | LLM richiede esecuzione strumento   | Controllo permessi, rate limit, validazione parametri                      | Blocca chiamata strumento |
| `POST_TOOL_RESPONSE`    | Strumento restituisce dati          | Classifica risposta, aggiorna taint sessione, crea/aggiorna lineage       | Oscura o blocca          |
| `PRE_OUTPUT`            | Risposta sta per lasciare il sistema | Controllo finale classificazione vs. target, scansione PII                | Blocca output            |
| `SECRET_ACCESS`         | Plugin richiede credenziale         | Registra accesso, verifica permesso rispetto all'ambito dichiarato        | Nega credenziale         |
| `SESSION_RESET`         | Utente richiede reset del taint     | Archivia lineage, cancella contesto, verifica conferma                    | Richiedi conferma        |
| `AGENT_INVOCATION`      | Agente chiama un altro agente       | Verifica catena di delega, applica tetto di taint                         | Blocca invocazione       |
| `MCP_TOOL_CALL`         | Strumento server MCP invocato       | Controllo policy del gateway (stato server, permessi strumento, schema)   | Blocca chiamata MCP      |

## Interfaccia degli Hook

Ogni Hook riceve un contesto e restituisce un risultato. L'handler è una
funzione sincrona e pura.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Il payload specifico dell'Hook varia per tipo
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` è sincrono e restituisce `HookResult` direttamente -- non
una Promise. Questo è intenzionale. Gli Hook devono completare prima che l'azione
proceda, e renderli sincroni elimina qualsiasi possibilità di bypass asincrono.
Se un Hook va in timeout, l'azione viene rifiutata. :::

## Garanzie degli Hook

Ogni esecuzione di Hook porta quattro invarianti:

| Garanzia            | Cosa significa                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Deterministico**  | Lo stesso input produce sempre la stessa decisione. Nessuna casualità. Nessuna chiamata LLM all'interno degli Hook. Nessuna chiamata API esterna che influenzi le decisioni. |
| **Sincrono**        | Gli Hook completano prima che l'azione proceda. Nessun bypass asincrono è possibile. Timeout equivale a rifiuto.                       |
| **Registrato**      | Ogni esecuzione di Hook viene registrata: parametri di input, decisione presa, timestamp e regole di policy valutate.                  |
| **Infalsificabile** | L'output dell'LLM non può contenere istruzioni di bypass degli Hook. Il livello degli Hook non ha logica "analizza l'output dell'LLM per comandi". |

## Gerarchia delle Regole di Policy

Le regole di policy sono organizzate in tre livelli. I livelli superiori non
possono sovrascrivere i livelli inferiori.

### Regole Fisse (sempre applicate, NON configurabili)

Queste regole sono hardcoded e non possono essere disabilitate da nessun
amministratore, utente o configurazione:

- **No write-down**: il flusso di classificazione è unidirezionale. I dati non
  possono fluire verso un livello inferiore.
- **Canali UNTRUSTED**: nessun dato in entrata o in uscita. Punto.
- **Taint di sessione**: una volta elevato, resta elevato per la durata della
  sessione.
- **Audit logging**: tutte le azioni registrate. Nessuna eccezione. Nessun modo
  per disabilitarlo.

### Regole Configurabili (regolabili dall'amministratore)

Gli amministratori possono regolare queste attraverso l'interfaccia utente o i
file di configurazione:

- Classificazioni predefinite delle integrazioni (es. Salesforce predefinito a
  `CONFIDENTIAL`)
- Classificazioni dei canali
- Liste di consentiti/negati per azione per integrazione
- Allowlist di domini per comunicazioni esterne
- Rate limit per strumento, per utente o per sessione

### Escape Hatch Dichiarativo (enterprise)

Le distribuzioni enterprise possono definire regole di policy personalizzate in
YAML strutturato per scenari avanzati:

```yaml
# Blocca qualsiasi query Salesforce contenente pattern SSN
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Richiedi approvazione per transazioni di alto valore
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Restrizione basata sul tempo: nessun invio esterno fuori orario
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "External communications restricted outside business hours"
```

::: tip Le regole YAML personalizzate devono superare la validazione prima
dell'attivazione. Le regole non valide vengono rifiutate al momento della
configurazione, non al runtime. Questo impedisce che errori di configurazione
creino lacune nella sicurezza. :::

## Esperienza Utente in Caso di Rifiuto

Quando il motore di policy blocca un'azione, l'utente vede una spiegazione
chiara -- non un errore generico.

**Predefinito (specifico):**

```
I can't send confidential data to a public channel.

  -> Reset session and send message
  -> Cancel
```

**Opt-in (educativo):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  -> Reset session and send message
  -> Ask your admin to reclassify the WhatsApp channel
  -> Learn more: [docs link]
```

La modalità educativa è opt-in e aiuta gli utenti a capire _perché_ un'azione è
stata bloccata, inclusa quale fonte dati ha causato l'escalation del taint e
qual è il disallineamento di classificazione. Entrambe le modalità offrono passi
successivi azionabili piuttosto che errori senza via d'uscita.

## Come gli Hook si Concatenano

In un tipico ciclo richiesta/risposta, più Hook si attivano in sequenza. Ogni
Hook ha piena visibilità sulle decisioni prese dagli Hook precedenti nella
catena.

```
L'utente invia: "Check my Salesforce pipeline and message my wife"

1. PRE_CONTEXT_INJECTION
   - Input dal proprietario, classificato come PUBLIC
   - Taint di sessione: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Strumento consentito? SÌ
   - L'utente ha la connessione Salesforce? SÌ
   - Rate limit? OK
   - Decisione: ALLOW

3. POST_TOOL_RESPONSE (risultati salesforce)
   - Dati classificati: CONFIDENTIAL
   - Taint di sessione escala: PUBLIC -> CONFIDENTIAL
   - Record di lineage creato

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Strumento consentito? SÌ
   - Decisione: ALLOW (il controllo a livello strumento passa)

5. PRE_OUTPUT (messaggio alla moglie tramite WhatsApp)
   - Taint di sessione: CONFIDENTIAL
   - Classificazione effettiva del target: PUBLIC (destinatario esterno)
   - CONFIDENTIAL -> PUBLIC: BLOCCATO
   - Decisione: BLOCK
   - Motivo: "classification_violation"

6. L'agente presenta l'opzione di reset all'utente
```
