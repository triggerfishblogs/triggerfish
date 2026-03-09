# Domande Frequenti

## Installazione

### Quali sono i requisiti di sistema?

Triggerfish funziona su macOS (Intel e Apple Silicon), Linux (x64 e arm64) e Windows (x64). L'installer binario gestisce tutto. Se si compila da sorgente, è necessario Deno 2.x.

Per i deployment Docker, funziona qualsiasi sistema che esegue Docker o Podman. L'immagine del container è basata su Debian 12 distroless.

### Dove memorizza i dati Triggerfish?

Tutto risiede sotto `~/.triggerfish/` per impostazione predefinita:

```
~/.triggerfish/
  triggerfish.yaml          # Configurazione
  SPINE.md                  # Identità dell'agent
  TRIGGER.md                # Definizione del comportamento proattivo
  logs/                     # File di log (rotazione a 1 MB, 10 backup)
  data/triggerfish.db       # Database SQLite (sessioni, memoria, stato)
  skills/                   # Skill installate
  backups/                  # Backup della configurazione con timestamp
```

I deployment Docker utilizzano `/data` al suo posto. È possibile sovrascrivere la directory base con la variabile d'ambiente `TRIGGERFISH_DATA_DIR`.

### Posso spostare la directory dei dati?

Sì. Impostare la variabile d'ambiente `TRIGGERFISH_DATA_DIR` sul percorso desiderato prima di avviare il daemon. Se si utilizza systemd o launchd, sarà necessario aggiornare la definizione del servizio (vedere [Note sulle Piattaforme](/it-IT/support/guides/platform-notes)).

### L'installer dice che non può scrivere in `/usr/local/bin`

L'installer prova prima `/usr/local/bin`. Se ciò richiede l'accesso root, ripiegherà su `~/.local/bin`. Se si desidera la posizione a livello di sistema, rieseguire con `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Come disinstallo Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Questo arresta il daemon, rimuove la definizione del servizio (unit systemd o plist launchd), elimina il binario e rimuove l'intera directory `~/.triggerfish/` compresi tutti i dati.

---

## Configurazione

### Come cambio il provider LLM?

Modificare `triggerfish.yaml` o utilizzare la CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Il daemon si riavvia automaticamente dopo le modifiche alla configurazione.

### Dove vanno le chiavi API?

Le chiavi API sono memorizzate nel portachiavi del SO (macOS Keychain, Linux Secret Service, o un file crittografato su Windows/Docker). Non inserire mai chiavi API grezze in `triggerfish.yaml`. Utilizzare la sintassi di riferimento `secret:`:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Memorizzare la chiave effettiva:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Cosa significa `secret:` nella mia configurazione?

I valori con prefisso `secret:` sono riferimenti al portachiavi del SO. All'avvio, Triggerfish risolve ogni riferimento e lo sostituisce con il valore effettivo del secret in memoria. Il secret grezzo non appare mai in `triggerfish.yaml` su disco. Vedere [Secret e Credenziali](/it-IT/support/troubleshooting/secrets) per i dettagli sui backend per piattaforma.

### Cos'è SPINE.md?

`SPINE.md` è il file di identità dell'agent. Definisce il nome, la missione, la personalità e le linee guida comportamentali dell'agent. Si può pensare ad esso come il fondamento del system prompt. La procedura guidata di configurazione (`triggerfish dive`) ne genera uno automaticamente, ma è possibile modificarlo liberamente.

### Cos'è TRIGGER.md?

`TRIGGER.md` definisce il comportamento proattivo dell'agent: cosa dovrebbe controllare, monitorare e su cosa agire durante i risvegli programmati dei trigger. Senza un `TRIGGER.md`, i trigger si attiveranno comunque ma l'agent non avrà istruzioni su cosa fare.

### Come aggiungo un nuovo canale?

```bash
triggerfish config add-channel telegram
```

Questo avvia un prompt interattivo che guida attraverso i campi richiesti (token del bot, ID proprietario, livello di classificazione). È anche possibile modificare `triggerfish.yaml` direttamente nella sezione `channels:`.

### Ho modificato la configurazione ma non è successo nulla

Il daemon deve riavviarsi per recepire le modifiche. Se si è utilizzato `triggerfish config set`, esso offre di riavviare automaticamente. Se si è modificato il file YAML manualmente, riavviare con:

```bash
triggerfish stop && triggerfish start
```

---

## Canali

### Perché il mio bot non risponde ai messaggi?

Iniziare verificando:

1. **Il daemon è in esecuzione?** Eseguire `triggerfish status`
2. **Il canale è connesso?** Controllare i log: `triggerfish logs`
3. **Il token del bot è valido?** La maggior parte dei canali fallisce silenziosamente con token non validi
4. **L'ID proprietario è corretto?** Se non si viene riconosciuti come proprietario, il bot potrebbe limitare le risposte

Vedere la guida [Risoluzione dei Problemi dei Canali](/it-IT/support/troubleshooting/channels) per checklist specifiche per canale.

### Cos'è l'ID proprietario e perché è importante?

L'ID proprietario indica a Triggerfish quale utente su un dato canale è il proprietario (l'operatore). Gli utenti non-proprietario ottengono accesso limitato ai tool e possono essere soggetti a limiti di classificazione. Se si lascia l'ID proprietario vuoto, il comportamento varia per canale. Alcuni canali (come WhatsApp) tratteranno tutti come proprietario, il che rappresenta un rischio per la sicurezza.

### Posso utilizzare più canali contemporaneamente?

Sì. Configurare quanti canali si desidera in `triggerfish.yaml`. Ogni canale mantiene le proprie sessioni e il proprio livello di classificazione. Il router gestisce la consegna dei messaggi attraverso tutti i canali connessi.

### Quali sono i limiti di dimensione dei messaggi?

| Canale | Limite | Comportamento |
|--------|--------|---------------|
| Telegram | 4.096 caratteri | Suddivisione automatica |
| Discord | 2.000 caratteri | Suddivisione automatica |
| Slack | 40.000 caratteri | Troncato (non suddiviso) |
| WhatsApp | 4.096 caratteri | Troncato |
| Email | Nessun limite fisso | Messaggio completo inviato |
| WebChat | Nessun limite fisso | Messaggio completo inviato |

### Perché i messaggi Slack vengono tagliati?

Slack ha un limite di 40.000 caratteri. A differenza di Telegram e Discord, Triggerfish tronca i messaggi Slack invece di dividerli in messaggi multipli. Risposte molto lunghe (come output di codice estesi) possono perdere contenuto alla fine.

---

## Sicurezza e Classificazione

### Quali sono i livelli di classificazione?

Quattro livelli, dal meno al più sensibile:

1. **PUBLIC** - Nessuna restrizione sul flusso dei dati
2. **INTERNAL** - Dati operativi standard
3. **CONFIDENTIAL** - Dati sensibili (credenziali, informazioni personali, registri finanziari)
4. **RESTRICTED** - Massima sensibilità (dati regolamentati, critici per la conformità)

I dati possono fluire solo da livelli inferiori a livelli uguali o superiori. I dati CONFIDENTIAL non possono mai raggiungere un canale PUBLIC. Questa è la regola "no write-down" e non può essere sovrascritta.

### Cosa significa "session taint"?

Ogni sessione inizia a PUBLIC. Quando l'agent accede a dati classificati (legge un file CONFIDENTIAL, interroga un database RESTRICTED), il taint della sessione aumenta per corrispondere. Il taint sale solo, non scende mai. Una sessione con taint CONFIDENTIAL non può inviare il suo output a un canale PUBLIC.

### Perché ricevo errori "write-down blocked"?

La sessione è stata contaminata a un livello di classificazione superiore rispetto alla destinazione. Per esempio, se si è acceduto a dati CONFIDENTIAL e poi si è provato a inviare i risultati a un canale WebChat PUBLIC, il motore delle policy lo blocca.

Questo funziona come previsto. Per risolvere:
- Avviare una nuova sessione (nuova conversazione)
- Utilizzare un canale classificato pari o superiore al livello di taint della sessione

### Posso disabilitare l'applicazione della classificazione?

No. Il sistema di classificazione è un invariante di sicurezza fondamentale. Viene eseguito come codice deterministico sotto il livello LLM e non può essere aggirato, disabilitato o influenzato dall'agent. Questo è per design.

---

## Provider LLM

### Quali provider sono supportati?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI e modelli locali tramite Ollama o LM Studio.

### Come funziona il failover?

Configurare una lista `failover` in `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Se il provider primario fallisce, Triggerfish prova ogni fallback in ordine. La sezione `failover_config` controlla i conteggi dei tentativi, il ritardo e quali condizioni di errore attivano il failover.

### Il mio provider restituisce errori 401 / 403

La chiave API non è valida o è scaduta. Ri-memorizzarla:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

Poi riavviare il daemon. Vedere [Risoluzione dei Problemi dei Provider LLM](/it-IT/support/troubleshooting/providers) per indicazioni specifiche per provider.

### Posso utilizzare modelli diversi per diversi livelli di classificazione?

Sì. Utilizzare la configurazione `classification_models`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Le sessioni con taint a un livello specifico utilizzeranno il modello corrispondente. I livelli senza override espliciti ricadono sul modello primario.

---

## Docker

### Come eseguo Triggerfish in Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Questo scarica lo script wrapper Docker e il file compose, scarica l'immagine ed esegue la procedura guidata di configurazione.

### Dove sono memorizzati i dati in Docker?

Tutti i dati persistenti risiedono in un volume Docker con nome (`triggerfish-data`) montato in `/data` all'interno del container. Questo include configurazione, secret, il database SQLite, log, skill e spazi di lavoro degli agent.

### Come funzionano i secret in Docker?

I container Docker non possono accedere al portachiavi del SO host. Triggerfish utilizza invece un file store crittografato: `secrets.json` (valori crittografati) e `secrets.key` (chiave di crittografia AES-256), entrambi memorizzati nel volume `/data`. Trattare il volume come sensibile.

### Il container non riesce a trovare il mio file di configurazione

Assicurarsi di averlo montato correttamente:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Se il container si avvia senza un file di configurazione, stamperà un messaggio di aiuto e uscirà.

### Come aggiorno l'immagine Docker?

```bash
triggerfish update    # Se si utilizza lo script wrapper
# oppure
docker compose pull && docker compose up -d
```

---

## Skill e The Reef

### Cos'è una skill?

Una skill è una cartella contenente un file `SKILL.md` che dà all'agent nuove capacità, contesto o linee guida comportamentali. Le skill possono includere definizioni di tool, codice, template e istruzioni.

### Cos'è The Reef?

The Reef è il marketplace delle skill di Triggerfish. È possibile scoprire, installare e pubblicare skill attraverso di esso:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Perché la mia skill è stata bloccata dallo scanner di sicurezza?

Ogni skill viene scansionata prima dell'installazione. Lo scanner verifica la presenza di pattern sospetti, permessi eccessivi e violazioni del tetto di classificazione. Se il tetto di una skill è inferiore al taint corrente della sessione, l'attivazione viene bloccata per prevenire il write-down.

### Cos'è un tetto di classificazione su una skill?

Le skill dichiarano un livello massimo di classificazione a cui sono autorizzate a operare. Una skill con `classification_ceiling: INTERNAL` non può essere attivata in una sessione con taint CONFIDENTIAL o superiore. Questo impedisce alle skill di accedere a dati al di sopra della loro autorizzazione.

---

## Trigger e Programmazione

### Cosa sono i trigger?

I trigger sono risvegli periodici dell'agent per comportamento proattivo. Si definisce cosa l'agent dovrebbe controllare in `TRIGGER.md`, e Triggerfish lo risveglia secondo una programmazione. L'agent esamina le sue istruzioni, agisce (controllare un calendario, monitorare un servizio, inviare un promemoria) e torna in standby.

### In cosa differiscono i trigger dai job cron?

I job cron eseguono un'attività fissa secondo una programmazione. I trigger risvegliano l'agent con il suo contesto completo (memoria, tool, accesso ai canali) e gli permettono di decidere cosa fare basandosi sulle istruzioni di `TRIGGER.md`. Cron è meccanico; i trigger sono agentici.

### Cosa sono le ore di silenzio?

L'impostazione `quiet_hours` in `scheduler.trigger` impedisce ai trigger di attivarsi durante le ore specificate:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Come funzionano i webhook?

I servizi esterni possono inviare POST all'endpoint webhook di Triggerfish per attivare azioni dell'agent. Ogni sorgente webhook richiede la firma HMAC per l'autenticazione e include il rilevamento del replay.

---

## Team di Agent

### Cosa sono i team di agent?

I team di agent sono gruppi persistenti di agent collaboranti che lavorano insieme su attività complesse. Ogni membro del team è una sessione agent separata con il proprio ruolo, contesto di conversazione e tool. Un membro è designato come lead e coordina il lavoro. Vedere [Team di Agent](/it-IT/features/agent-teams) per la documentazione completa.

### In cosa differiscono i team dai sub-agent?

I sub-agent sono del tipo fire-and-forget: si delega una singola attività e si attende il risultato. I team sono persistenti -- i membri comunicano tra loro tramite `sessions_send`, il lead coordina il lavoro e il team viene eseguito autonomamente fino allo scioglimento o al timeout. Utilizzare i sub-agent per la delega focalizzata; utilizzare i team per la collaborazione complessa multi-ruolo.

### I team di agent richiedono un piano a pagamento?

I team di agent richiedono il piano **Power** ($149/mese) quando si utilizza Triggerfish Gateway. Gli utenti open source che utilizzano le proprie chiavi API hanno accesso completo -- ogni membro del team consuma inferenza dal provider LLM configurato.

### Perché il mio team lead è fallito immediatamente?

La causa più comune è un provider LLM mal configurato. Ogni membro del team genera la propria sessione agent che necessita di una connessione LLM funzionante. Controllare `triggerfish logs` per errori del provider al momento della creazione del team. Vedere [Risoluzione dei Problemi dei Team di Agent](/it-IT/support/troubleshooting/security#agent-teams) per maggiori dettagli.

### I membri del team possono utilizzare modelli diversi?

Sì. La definizione di ogni membro accetta un campo `model` opzionale. Se omesso, il membro eredita il modello dell'agent creatore. Questo permette di assegnare modelli costosi a ruoli complessi e modelli economici a quelli semplici.

### Per quanto tempo può funzionare un team?

Per impostazione predefinita, i team hanno un tempo di vita di 1 ora (`max_lifetime_seconds: 3600`). Quando il limite viene raggiunto, il lead riceve un avviso di 60 secondi per produrre l'output finale, poi il team viene auto-sciolto. È possibile configurare un tempo di vita più lungo al momento della creazione.

### Cosa succede se un membro del team si blocca?

Il monitor del ciclo di vita rileva i fallimenti dei membri entro 30 secondi. I membri falliti vengono contrassegnati come `failed` e il lead viene notificato per continuare con i membri rimanenti o sciogliere il team. Se il lead stesso fallisce, il team viene messo in pausa e la sessione creatrice viene notificata.

---

## Varie

### Triggerfish è open source?

Sì, con licenza Apache 2.0. Il codice sorgente completo, inclusi tutti i componenti critici per la sicurezza, è disponibile per audit su [GitHub](https://github.com/greghavens/triggerfish).

### Triggerfish comunica con server esterni?

No. Triggerfish non effettua connessioni in uscita tranne che verso i servizi esplicitamente configurati (provider LLM, API dei canali, integrazioni). Non c'è telemetria, analytics o controllo degli aggiornamenti a meno che non si esegua `triggerfish update`.

### Posso eseguire più agent?

Sì. La sezione `agents` della configurazione definisce agent multipli, ciascuno con il proprio nome, modello, associazioni ai canali, set di tool e tetti di classificazione. Il sistema di routing dirige i messaggi all'agent appropriato.

### Cos'è il gateway?

Il gateway è il piano di controllo WebSocket interno di Triggerfish. Gestisce le sessioni, instrada i messaggi tra i canali e l'agent, invia i tool e applica le policy. L'interfaccia chat CLI si connette al gateway per comunicare con l'agent.

### Quali porte utilizza Triggerfish?

| Porta | Scopo | Binding |
|-------|-------|---------|
| 18789 | Gateway WebSocket | solo localhost |
| 18790 | Tidepool A2UI | solo localhost |
| 8765 | WebChat (se abilitato) | configurabile |
| 8443 | Webhook WhatsApp (se abilitato) | configurabile |

Tutte le porte predefinite sono associate a localhost. Nessuna è esposta alla rete a meno che non si configuri esplicitamente diversamente o si utilizzi un reverse proxy.
