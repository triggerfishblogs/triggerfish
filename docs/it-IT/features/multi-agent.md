# Routing Multi-Agent

Triggerfish supporta l'instradamento di canali, account o contatti diversi verso
agent isolati separati, ciascuno con il proprio spazio di lavoro, sessioni,
personalità e limite di classificazione.

## Perché Agent Multipli?

Un singolo agent con una singola personalità non è sempre sufficiente. Si
potrebbe volere:

- Un **assistente personale** su WhatsApp che gestisce calendario, promemoria e
  messaggi familiari.
- Un **assistente di lavoro** su Slack che gestisce ticket Jira, PR GitHub e
  code review.
- Un **agent di supporto** su Discord che risponde alle domande della community
  con un tono diverso e accesso limitato.

Il routing multi-agent consente di eseguire tutti questi simultaneamente da
un'unica installazione di Triggerfish.

## Come Funziona

<img src="/diagrams/multi-agent-routing.svg" alt="Routing multi-agent: i canali in ingresso vengono instradati attraverso AgentRouter verso spazi di lavoro agent isolati" style="max-width: 100%;" />

L'**AgentRouter** esamina ogni messaggio in ingresso e lo mappa a un agent in
base a regole di routing configurabili. Se nessuna regola corrisponde, i
messaggi vanno a un agent predefinito.

## Regole di Routing

I messaggi possono essere instradati per:

| Criterio  | Descrizione                                          | Esempio                                                |
| --------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Canale    | Instradare per piattaforma di messaggistica          | Tutti i messaggi Slack vanno a "Lavoro"                |
| Account   | Instradare per account specifico all'interno di un canale | Email di lavoro vs email personale                 |
| Contatto  | Instradare per identità del mittente/interlocutore   | I messaggi dal proprio manager vanno a "Lavoro"        |
| Predefinito | Fallback quando nessuna regola corrisponde         | Tutto il resto va a "Personale"                        |

## Configurazione

Definire agent e routing in `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Ogni agent specifica:

- **id** -- Identificatore univoco per il routing.
- **name** -- Nome leggibile.
- **channels** -- Quali istanze di canale questo agent gestisce.
- **tools** -- Profilo dei tool e liste allow/deny esplicite.
- **model** -- Quale modello LLM utilizzare (può differire per agent).
- **classification_ceiling** -- Livello massimo di classificazione che questo
  agent può raggiungere.

## Identità dell'Agent

Ogni agent ha il proprio `SPINE.md` che definisce la sua personalità, missione e
confini. I file SPINE.md risiedono nella directory dello spazio di lavoro
dell'agent:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personalità dell'assistente personale
    work/
      SPINE.md          # Personalità dell'assistente di lavoro
    support/
      SPINE.md          # Personalità del bot di supporto
```

## Isolamento

Il routing multi-agent applica un isolamento rigoroso tra agent:

| Aspetto        | Isolamento                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Sessioni       | Ogni agent ha il proprio spazio sessioni indipendente. Le sessioni non vengono mai condivise.      |
| Taint          | Il taint è tracciato per agent, non tra agent. Il taint lavorativo non influenza le sessioni personali. |
| Skill          | Le skill vengono caricate per spazio di lavoro. Una skill lavorativa non è disponibile per l'agent personale. |
| Secret         | Le credenziali sono isolate per agent. L'agent di supporto non può accedere alle chiavi API di lavoro. |
| Spazi di lavoro | Ogni agent ha il proprio spazio di lavoro filesystem per l'esecuzione del codice.                |

::: warning La comunicazione tra agent è possibile tramite `sessions_send` ma è
controllata dal livello delle policy. Un agent non può accedere silenziosamente
ai dati o alle sessioni di un altro agent senza regole di policy esplicite che
lo consentano. :::

::: tip Il routing multi-agent serve per separare le responsabilità tra canali e
personalità. Per agent che devono collaborare su un'attività condivisa,
consultare [Team di Agent](/it-IT/features/agent-teams). :::

## Agent Predefinito

Quando nessuna regola di routing corrisponde a un messaggio in ingresso, questo
va all'agent predefinito. È possibile impostarlo nella configurazione:

```yaml
agents:
  default: personal
```

Se nessun predefinito è configurato, il primo agent nella lista viene utilizzato
come predefinito.
