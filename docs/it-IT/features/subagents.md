# Sub-Agent e Attività LLM

Gli agent Triggerfish possono delegare lavoro a sub-agent ed eseguire prompt LLM
isolati. Questo abilita lavoro parallelo, ragionamento focalizzato e
decomposizione di attività multi-agent.

## Tool

### `subagent`

Generare un sub-agent per un'attività autonoma multi-step. Il sub-agent ottiene
il proprio contesto di conversazione e può utilizzare tool indipendentemente.
Restituisce il risultato finale al completamento.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                      |
| --------- | ------ | ------------ | ---------------------------------------------------------------- |
| `task`    | string | sì           | Cosa il sub-agent dovrebbe realizzare                            |
| `tools`   | string | no           | Whitelist di tool separati da virgola (predefinito: tool in sola lettura) |

**Tool predefiniti:** I sub-agent iniziano con tool in sola lettura (`read_file`,
`list_directory`, `search_files`, `run_command`). Specificare tool aggiuntivi
esplicitamente se il sub-agent necessita di accesso in scrittura.

**Esempi di utilizzo:**

- Ricercare un argomento mentre l'agent principale continua con altro lavoro
- Esplorare un codebase in parallelo da angolazioni multiple (questo è ciò che
  il tool `explore` fa internamente)
- Delegare un'attività di implementazione autocontenuta

### `llm_task`

Eseguire un prompt LLM one-shot per ragionamento isolato. Il prompt viene
eseguito in un contesto separato e non inquina la cronologia della conversazione
principale.

| Parametro | Tipo   | Obbligatorio | Descrizione                                           |
| --------- | ------ | ------------ | ----------------------------------------------------- |
| `prompt`  | string | sì           | Il prompt da inviare                                  |
| `system`  | string | no           | System prompt opzionale                               |
| `model`   | string | no           | Override opzionale del nome modello/provider           |

**Esempi di utilizzo:**

- Riassumere un documento lungo senza riempire il contesto principale
- Classificare o estrarre dati da testo strutturato
- Ottenere una seconda opinione su un approccio
- Eseguire un prompt su un modello diverso da quello primario

### `agents_list`

Elencare i provider LLM e gli agent configurati. Non richiede parametri.

Restituisce informazioni sui provider disponibili, i loro modelli e lo stato
della configurazione.

## Come Funzionano i Sub-Agent

Quando l'agent chiama `subagent`, Triggerfish:

1. Crea una nuova istanza dell'orchestratore con il proprio contesto di
   conversazione
2. Fornisce al sub-agent i tool specificati (predefiniti quelli in sola lettura)
3. Invia l'attività come messaggio utente iniziale
4. Il sub-agent viene eseguito autonomamente -- chiamando tool, elaborando
   risultati, iterando
5. Quando il sub-agent produce una risposta finale, questa viene restituita
   all'agent genitore

I sub-agent ereditano il livello di taint e i vincoli di classificazione della
sessione genitore. Non possono superare il limite del genitore.

## Quando Utilizzare Ciascuno

| Tool       | Utilizzare Quando                                              |
| ---------- | -------------------------------------------------------------- |
| `subagent` | Attività multi-step che richiede uso di tool e iterazione      |
| `llm_task` | Ragionamento one-shot, riassunto o classificazione             |
| `explore`  | Comprensione del codebase (usa sub-agent internamente)         |

::: tip Il tool `explore` è costruito sopra `subagent` -- genera 2-6 sub-agent
paralleli a seconda del livello di profondità. Se si necessita di esplorazione
strutturata del codebase, utilizzare `explore` direttamente anziché generare
manualmente sub-agent. :::

## Sub-Agent vs Team di Agent

I sub-agent sono del tipo fire-and-forget: il genitore attende un singolo
risultato. I [Team di Agent](./agent-teams) sono gruppi persistenti di agent
collaboranti con ruoli distinti, un coordinatore lead e comunicazione tra i
membri. Utilizzare i sub-agent per delega focalizzata su un singolo passo.
Utilizzare i team quando l'attività beneficia di prospettive specializzate
multiple che iterano sul lavoro degli altri.
