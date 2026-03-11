# Team di Agenti

Gli agenti Triggerfish possono generare team persistenti di agenti collaborativi
che lavorano insieme su attività complesse. Ogni membro del team ottiene la
propria sessione, ruolo, contesto di conversazione e strumenti. Un membro viene
designato come **lead** e coordina il lavoro.

I team sono ideali per attività aperte che beneficiano di ruoli specializzati che
lavorano in parallelo: ricerca + analisi + scrittura, architettura +
implementazione + revisione, o qualsiasi attività in cui prospettive diverse
devono iterare sul lavoro reciproco.

::: info Disponibilità
I Team di Agenti richiedono il piano **Power** ($149/mese) quando si utilizza
Triggerfish Gateway. Gli utenti open source che utilizzano le proprie chiavi API
hanno pieno accesso ai team di agenti -- ogni membro del team consuma inferenza
dal Suo provider configurato.
:::

## Strumenti

### `team_create`

Crei un team persistente di agenti che collaborano su un'attività. Definisca i
ruoli, gli strumenti e i modelli dei membri. Esattamente un membro deve essere
il lead.

| Parametro                | Tipo   | Obbligatorio | Descrizione                                                              |
| ------------------------ | ------ | ------------ | ------------------------------------------------------------------------ |
| `name`                   | string | sì           | Nome del team leggibile                                                  |
| `task`                   | string | sì           | L'obiettivo del team (inviato al lead come istruzioni iniziali)          |
| `members`                | array  | sì           | Definizioni dei membri del team (vedi sotto)                             |
| `idle_timeout_seconds`   | number | no           | Timeout di inattività per membro. Default: 300 (5 minuti)               |
| `max_lifetime_seconds`   | number | no           | Durata massima del team. Default: 3600 (1 ora)                           |
| `classification_ceiling` | string | no           | Tetto di classificazione del team (es. `CONFIDENTIAL`)                   |

**Definizione del membro:**

| Campo                    | Tipo    | Obbligatorio | Descrizione                                                    |
| ------------------------ | ------- | ------------ | -------------------------------------------------------------- |
| `role`                   | string  | sì           | Identificatore di ruolo univoco (es. `researcher`, `reviewer`) |
| `description`            | string  | sì           | Cosa fa questo membro (iniettato nel system prompt)            |
| `is_lead`                | boolean | sì           | Se questo membro è il lead del team                            |
| `model`                  | string  | no           | Override del modello per questo membro                         |
| `classification_ceiling` | string  | no           | Tetto di classificazione per membro                            |
| `initial_task`           | string  | no           | Istruzioni iniziali (il lead usa di default l'attività del team) |

**Regole di validazione:**

- Il team deve avere esattamente un membro con `is_lead: true`
- Tutti i ruoli devono essere univoci e non vuoti
- I tetti di classificazione dei membri non possono superare il tetto del team
- `name` e `task` devono essere non vuoti

### `team_status`

Verifichi lo stato corrente di un team attivo.

| Parametro | Tipo   | Obbligatorio | Descrizione |
| --------- | ------ | ------------ | ----------- |
| `team_id` | string | sì           | ID del team |

Restituisce lo stato del team, il livello di taint aggregato e i dettagli per
membro inclusi il taint corrente, lo stato e il timestamp dell'ultima attività
di ciascun membro.

### `team_message`

Invii un messaggio a un membro specifico del team. Utile per fornire contesto
aggiuntivo, reindirizzare il lavoro o chiedere aggiornamenti sui progressi.

| Parametro | Tipo   | Obbligatorio | Descrizione                                       |
| --------- | ------ | ------------ | ------------------------------------------------- |
| `team_id` | string | sì           | ID del team                                       |
| `role`    | string | no           | Ruolo del membro target (default: lead)           |
| `message` | string | sì           | Contenuto del messaggio                           |

Il team deve essere nello stato `running` e il membro target deve essere
`active` o `idle`.

### `team_disband`

Chiuda un team e termini tutte le sessioni dei membri.

| Parametro | Tipo   | Obbligatorio | Descrizione                           |
| --------- | ------ | ------------ | ------------------------------------- |
| `team_id` | string | sì           | ID del team                           |
| `reason`  | string | no           | Motivo dello scioglimento del team    |

Solo la sessione che ha creato il team o il membro lead può sciogliere il team.

## Come Funzionano i Team

### Creazione

Quando l'agente chiama `team_create`, Triggerfish:

1. Valida la definizione del team (ruoli, conteggio lead, tetti di classificazione)
2. Genera una sessione agente isolata per ogni membro tramite l'orchestrator factory
3. Inietta un **team roster prompt** nel system prompt di ogni membro, descrivendo
   il suo ruolo, i compagni di team e le istruzioni di collaborazione
4. Invia l'attività iniziale al lead (o l'`initial_task` personalizzato per membro)
5. Avvia un monitor del ciclo di vita che controlla la salute del team ogni 30 secondi

Ogni sessione membro è completamente isolata con il proprio contesto di
conversazione, tracciamento del taint e accesso agli strumenti.

### Collaborazione

I membri del team comunicano tra loro usando `sessions_send`. L'agente creatore
non ha bisogno di inoltrare messaggi tra i membri. Il flusso tipico:

1. Il lead riceve l'obiettivo del team
2. Il lead decompone l'attività e invia gli incarichi ai membri tramite
   `sessions_send`
3. I membri lavorano autonomamente, chiamando strumenti e iterando
4. I membri inviano i risultati al lead (o direttamente a un altro membro)
5. Il lead sintetizza i risultati e decide quando il lavoro è completo
6. Il lead chiama `team_disband` per chiudere il team

I messaggi tra i membri del team vengono consegnati direttamente tramite
l'orchestrator -- ogni messaggio attiva un turno completo dell'agente nella
sessione del destinatario.

### Stato

Utilizzi `team_status` per verificare i progressi in qualsiasi momento. La
risposta include:

- **Stato del team:** `running`, `paused`, `completed`, `disbanded` o `timed_out`
- **Taint aggregato:** Il livello di classificazione più alto tra tutti i membri
- **Dettagli per membro:** Ruolo, stato (`active`, `idle`, `completed`, `failed`),
  livello di taint corrente e timestamp dell'ultima attività

### Scioglimento

I team possono essere sciolti da:

- La sessione creatrice che chiama `team_disband`
- Il membro lead che chiama `team_disband`
- Il monitor del ciclo di vita che scioglie automaticamente dopo la scadenza del
  limite di durata
- Il monitor del ciclo di vita che rileva che tutti i membri sono inattivi

Quando un team viene sciolto, tutte le sessioni dei membri attivi vengono
terminate e le risorse vengono liberate.

## Ruoli del Team

### Lead

Il membro lead coordina il team. Alla creazione:

- Riceve il `task` del team come istruzioni iniziali (a meno che non sia
  sovrascritto da `initial_task`)
- Ottiene istruzioni nel system prompt per decomporre il lavoro, assegnare
  attività e decidere quando l'obiettivo è raggiunto
- È autorizzato a sciogliere il team

C'è esattamente un lead per team.

### Membri

I membri non-lead sono specialisti. Alla creazione:

- Ricevono il loro `initial_task` se fornito, altrimenti restano inattivi fino a
  quando il lead invia loro del lavoro
- Ottengono istruzioni nel system prompt per inviare il lavoro completato al lead
  o al compagno di team più appropriato
- Non possono sciogliere il team

## Monitoraggio del Ciclo di Vita

I team hanno un monitoraggio automatico del ciclo di vita che viene eseguito ogni
30 secondi.

### Timeout di Inattività

Ogni membro ha un timeout di inattività (default: 5 minuti). Quando un membro è
inattivo:

1. **Prima soglia (idle_timeout_seconds):** Il membro riceve un messaggio di
   sollecito che chiede di inviare i risultati se il lavoro è completo
2. **Doppia soglia (2x idle_timeout_seconds):** Il membro viene terminato e il
   lead viene notificato

### Timeout di Durata

I team hanno una durata massima (default: 1 ora). Quando il limite viene
raggiunto:

1. Il lead riceve un messaggio di avviso con 60 secondi per produrre l'output
   finale
2. Dopo il periodo di grazia, il team viene automaticamente sciolto

### Controlli di Salute

Il monitor controlla la salute delle sessioni ogni 30 secondi:

- **Fallimento del lead:** Se la sessione del lead non è più raggiungibile, il
  team viene messo in pausa e la sessione creatrice viene notificata
- **Fallimento di un membro:** Se la sessione di un membro non esiste più, viene
  contrassegnato come `failed` e il lead viene notificato per continuare con i
  membri rimanenti
- **Tutti inattivi:** Se tutti i membri sono `completed` o `failed`, la sessione
  creatrice viene notificata per iniettare nuove istruzioni o sciogliere il team

## Classificazione e Taint

Le sessioni dei membri del team seguono le stesse regole di classificazione di
tutte le altre sessioni:

- Ogni membro inizia con taint `PUBLIC` e lo aumenta man mano che accede a dati
  classificati
- I **tetti di classificazione** possono essere impostati per team o per membro
  per limitare a quali dati i membri possono accedere
- L'**applicazione del write-down** si applica a tutte le comunicazioni tra
  membri. Un membro contaminato a `CONFIDENTIAL` non può inviare dati a un
  membro a `PUBLIC`
- Il **taint aggregato** (il taint più alto tra tutti i membri) viene riportato
  in `team_status` affinché la sessione creatrice possa tracciare l'esposizione
  complessiva di classificazione del team

::: danger SICUREZZA I tetti di classificazione dei membri non possono superare
il tetto del team. Se il tetto del team è `INTERNAL`, nessun membro può essere
configurato con un tetto `CONFIDENTIAL`. Questo viene validato al momento della
creazione. :::

## Team vs Sub-Agenti

| Aspetto           | Sub-Agente (`subagent`)                         | Team (`team_create`)                                            |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| **Durata**        | Singola attività, restituisce risultato ed esce  | Persistente fino allo scioglimento o al timeout                 |
| **Membri**        | Un agente                                        | Più agenti con ruoli distinti                                   |
| **Interazione**   | Fire-and-forget dal genitore                     | I membri comunicano liberamente tramite `sessions_send`         |
| **Coordinamento** | Il genitore attende il risultato                 | Il lead coordina, il genitore può controllare tramite `team_status` |
| **Caso d'uso**    | Delega focalizzata a singolo passaggio           | Collaborazione complessa multi-ruolo                            |

**Utilizzi i sub-agenti** quando necessita di un singolo agente per svolgere
un'attività focalizzata e restituire un risultato. **Utilizzi i team** quando
l'attività beneficia di prospettive multiple specializzate che iterano sul lavoro
reciproco.

::: tip I team sono autonomi una volta creati. L'agente creatore può controllare
lo stato e inviare messaggi, ma non ha bisogno di gestire ogni dettaglio. Il
lead gestisce il coordinamento. :::
