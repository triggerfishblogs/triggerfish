# Risoluzione dei Problemi: Sicurezza e Classificazione

## Blocchi Write-Down

### "Write-down blocked"

Questo è l'errore di sicurezza più comune. Significa che i dati stanno tentando di fluire da un livello di classificazione superiore a uno inferiore.

**Esempio:** La sessione ha acceduto a dati CONFIDENTIAL (letto un file classificato, interrogato un database classificato). Il taint della sessione è ora CONFIDENTIAL. Si è poi tentato di inviare la risposta a un canale WebChat PUBLIC. Il motore delle policy lo blocca perché i dati CONFIDENTIAL non possono fluire verso destinazioni PUBLIC.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Come risolvere:**
1. **Avviare una nuova sessione.** Una sessione fresca inizia con taint PUBLIC. Utilizzare una nuova conversazione.
2. **Utilizzare un canale con classificazione superiore.** Inviare la risposta attraverso un canale classificato CONFIDENTIAL o superiore.
3. **Comprendere cosa ha causato il taint.** Controllare i log per le voci "Taint escalation" per vedere quale chiamata a tool ha aumentato la classificazione della sessione.

### "Session taint cannot flow to channel"

Come il write-down, ma specificamente riguardo alla classificazione del canale:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Anche le chiamate a tool verso integrazioni classificate applicano il write-down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Attenzione, questo sembra al contrario. Il taint della sessione è superiore alla classificazione del tool. Questo significa che la sessione è troppo contaminata per utilizzare un tool con classificazione inferiore. La preoccupazione è che chiamare il tool potrebbe far trapelare contesto classificato in un sistema meno sicuro.

### "Workspace write-down blocked"

Gli spazi di lavoro degli agent hanno classificazione per-directory. La scrittura in una directory con classificazione inferiore da una sessione con taint superiore viene bloccata:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Escalation del Taint

### "Taint escalation"

Questa è informativa, non un errore. Significa che il livello di classificazione della sessione è appena aumentato perché l'agent ha acceduto a dati classificati.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Il taint sale solo, non scende mai. Una volta che una sessione ha taint CONFIDENTIAL, rimane tale per il resto della sessione.

### "Resource-based taint escalation firing"

Una chiamata a tool ha acceduto a una risorsa con classificazione superiore al taint corrente della sessione. Il taint della sessione viene automaticamente aumentato per corrispondere.

### "Non-owner taint applied"

Agli utenti non-proprietario il taint delle sessioni può essere applicato in base alla classificazione del canale o ai permessi dell'utente. Questo è separato dal taint basato sulle risorse.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Tutte le richieste HTTP in uscita (web_fetch, navigazione del browser, connessioni MCP SSE) passano attraverso la protezione SSRF. Se l'hostname di destinazione si risolve in un indirizzo IP privato, la richiesta viene bloccata.

**Intervalli bloccati:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privato)
- `172.16.0.0/12` (privato)
- `192.168.0.0/16` (privato)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (non specificato)
- `::1` (loopback IPv6)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 link-local)

Questa protezione è hardcoded e non può essere disabilitata o configurata. Impedisce all'agent AI di essere ingannato nell'accedere a servizi interni.

**IPv4-mapped IPv6:** Indirizzi come `::ffff:127.0.0.1` vengono rilevati e bloccati.

### "SSRF check blocked outbound request"

Come sopra, ma registrato dal tool web_fetch invece che dal modulo SSRF.

### Fallimenti di risoluzione DNS

```
DNS resolution failed for hostname
No DNS records found for hostname
```

L'hostname non può essere risolto. Verificare:
- L'URL è scritto correttamente
- Il server DNS è raggiungibile
- Il dominio esiste effettivamente

---

## Motore delle Policy

### "Hook evaluation failed, defaulting to BLOCK"

Un hook di policy ha lanciato un'eccezione durante la valutazione. Quando questo accade, l'azione predefinita è BLOCK (nega). Questo è il default sicuro.

Controllare i log per l'eccezione completa. Probabilmente indica un bug in una regola di policy personalizzata.

### "Policy rule blocked action"

Una regola di policy ha esplicitamente negato l'azione. La voce di log include quale regola è scattata e perché. Controllare la sezione `policy.rules` della configurazione per vedere quali regole sono definite.

### "Tool floor violation"

Un tool è stato chiamato che richiede un livello minimo di classificazione, ma la sessione è al di sotto di quel livello.

**Esempio:** Il tool healthcheck richiede almeno la classificazione INTERNAL (perché rivela dettagli interni del sistema). Se una sessione PUBLIC tenta di utilizzarlo, la chiamata viene bloccata.

---

## Sicurezza di Plugin e Skill

### "Plugin network access blocked"

I plugin vengono eseguiti in un sandbox con accesso di rete limitato. Possono accedere solo agli URL sul dominio dell'endpoint dichiarato.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Il plugin ha tentato di accedere a un URL non presente nei suoi endpoint dichiarati, oppure l'URL si è risolto in un IP privato.

### "Skill activation blocked by classification ceiling"

Le skill dichiarano un `classification_ceiling` nel frontmatter del loro SKILL.md. Se il tetto è inferiore al livello di taint della sessione, la skill non può essere attivata:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Questo impedisce a una skill con classificazione inferiore di essere esposta a dati con classificazione superiore.

### "Skill content integrity check failed"

Dopo l'installazione, Triggerfish calcola l'hash del contenuto della skill. Se l'hash cambia (la skill è stata modificata dopo l'installazione), il controllo di integrità fallisce:

```
Skill content hash mismatch detected
```

Questo potrebbe indicare una manomissione. Reinstallare la skill da una fonte affidabile.

### "Skill install rejected by scanner"

Lo scanner di sicurezza ha trovato contenuto sospetto nella skill. Lo scanner verifica la presenza di pattern che potrebbero indicare comportamento malevolo. Gli avvisi specifici sono inclusi nel messaggio di errore.

---

## Sicurezza delle Sessioni

### "Session not found"

```
Session not found: <session-id>
```

La sessione richiesta non esiste nel gestore delle sessioni. Potrebbe essere stata ripulita, oppure l'ID di sessione non è valido.

### "Session status access denied: taint exceeds caller"

Si è tentato di visualizzare lo stato di una sessione, ma quella sessione ha un livello di taint superiore alla sessione corrente. Questo impedisce a sessioni con classificazione inferiore di venire a conoscenza di operazioni con classificazione superiore.

### "Session history access denied"

Stesso concetto di sopra, ma per la visualizzazione della cronologia della conversazione.

---

## Team di Agent

### "Team message delivery denied: team status is ..."

Il team non è in stato `running`. Questo accade quando:

- Il team è stato **sciolto** (manualmente o dal monitor del ciclo di vita)
- Il team è stato **messo in pausa** perché la sessione del lead è fallita
- Il team ha **superato il timeout** dopo aver ecceduto il suo limite di tempo di vita

Verificare lo stato corrente del team con `team_status`. Se il team è in pausa a causa del fallimento del lead, è possibile scioglierlo con `team_disband` e crearne uno nuovo.

### "Team member not found" / "Team member ... is not active"

Il membro target non esiste (nome del ruolo errato) o è stato terminato. I membri vengono terminati quando:

- Superano il timeout di inattività (2x `idle_timeout_seconds`)
- Il team viene sciolto
- La loro sessione si blocca e il monitor del ciclo di vita lo rileva

Utilizzare `team_status` per vedere tutti i membri e il loro stato corrente.

### "Team disband denied: only the lead or creating session can disband"

Solo due sessioni possono sciogliere un team:

1. La sessione che ha originariamente chiamato `team_create`
2. La sessione del membro lead

Se si riceve questo errore dall'interno del team, il membro chiamante non è il lead. Se lo si riceve dall'esterno del team, non si è la sessione che lo ha creato.

### Il team lead fallisce immediatamente dopo la creazione

La sessione agent del lead non è riuscita a completare il suo primo turno. Cause comuni:

1. **Errore del provider LLM:** Il provider ha restituito un errore (limite di frequenza, fallimento di autenticazione, modello non trovato). Controllare `triggerfish logs` per errori del provider.
2. **Tetto di classificazione troppo basso:** Se il lead necessita di tool classificati al di sopra del suo tetto, la sessione potrebbe fallire alla prima chiamata a tool.
3. **Tool mancanti:** Il lead potrebbe necessitare di tool specifici per decomporre il lavoro. Assicurarsi che i profili dei tool siano configurati correttamente.

### I membri del team sono inattivi e non producono mai output

I membri attendono che il lead invii loro lavoro tramite `sessions_send`. Se il lead non decompone l'attività:

- Il modello del lead potrebbe non comprendere il coordinamento del team. Provare un modello più capace per il ruolo di lead.
- La descrizione del `task` potrebbe essere troppo vaga perché il lead la decomponga in sotto-attività.
- Controllare `team_status` per vedere se il lead è `active` e ha attività recente.

### "Write-down blocked" tra membri del team

I membri del team seguono le stesse regole di classificazione di tutte le sessioni. Se un membro ha taint CONFIDENTIAL e tenta di inviare dati a un membro a PUBLIC, il controllo write-down lo blocca. Questo è il comportamento previsto -- i dati classificati non possono fluire verso sessioni con classificazione inferiore, anche all'interno di un team.

---

## Delega e Multi-Agent

### "Delegation certificate signature invalid"

La delega tra agent utilizza certificati crittografici. Se il controllo della firma fallisce, la delega viene rifiutata. Questo previene catene di delega contraffatte.

### "Delegation certificate expired"

Il certificato di delega ha un tempo di vita. Se è scaduto, l'agent delegato non può più agire per conto del delegante.

### "Delegation chain linkage broken"

Nelle deleghe multi-hop (A delega a B, B delega a C), ogni anello della catena deve essere valido. Se un qualsiasi anello è rotto, l'intera catena viene rifiutata.

---

## Webhook

### "Webhook HMAC verification failed"

I webhook in ingresso richiedono firme HMAC per l'autenticazione. Se la firma è mancante, malformata o non corrisponde:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Verificare che:
- La sorgente del webhook stia inviando l'header corretto della firma HMAC
- Il secret condiviso nella configurazione corrisponda al secret della sorgente
- Il formato della firma corrisponda (HMAC-SHA256 codificato in esadecimale)

### "Webhook replay detected"

Triggerfish include protezione contro il replay. Se un payload webhook viene ricevuto una seconda volta (stessa firma), viene rifiutato.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Troppe richieste webhook dalla stessa sorgente in un breve periodo. Questo protegge contro le inondazioni di webhook. Attendere e riprovare.

---

## Integrità dell'Audit

### "previousHash mismatch"

Il log di audit utilizza il concatenamento degli hash. Ogni voce include l'hash della voce precedente. Se la catena è rotta, significa che il log di audit è stato manomesso o corrotto.

### "HMAC mismatch"

La firma HMAC della voce di audit non corrisponde. La voce potrebbe essere stata modificata dopo la creazione.
