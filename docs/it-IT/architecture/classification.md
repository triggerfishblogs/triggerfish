# Sistema di Classificazione

Il sistema di classificazione dei dati è il fondamento del modello di sicurezza
di Triggerfish. Ogni dato che entra, si muove attraverso o esce dal sistema porta
un'etichetta di classificazione. Queste etichette determinano dove i dati
possono fluire -- e soprattutto, dove non possono.

## Livelli di Classificazione

Triggerfish utilizza una singola gerarchia ordinata a quattro livelli per tutte
le distribuzioni.

| Livello        | Rango           | Descrizione                                                | Esempi                                                                   |
| -------------- | --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `RESTRICTED`   | 4 (più alto)    | Dati più sensibili che richiedono la massima protezione    | Documenti M&A, materiali del consiglio, PII, conti bancari, cartelle cliniche |
| `CONFIDENTIAL` | 3               | Informazioni sensibili per il business o la persona        | Dati CRM, dati finanziari, record HR, contratti, documenti fiscali       |
| `INTERNAL`     | 2               | Non destinati alla condivisione esterna                    | Wiki interne, documenti di team, appunti personali, contatti             |
| `PUBLIC`       | 1 (più basso)   | Sicuri per chiunque                                        | Materiali di marketing, documentazione pubblica, contenuti web generali  |

## La Regola No Write-Down

L'invariante di sicurezza più importante in Triggerfish:

::: danger I dati possono fluire solo verso canali o destinatari con
classificazione **uguale o superiore**. Questa è una **regola fissa** -- non può
essere configurata, sovrascritta o disabilitata. L'LLM non può influenzare
questa decisione. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Gerarchia di classificazione: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. I dati fluiscono solo verso l'alto." style="max-width: 100%;" />

Questo significa:

- Una risposta contenente dati `CONFIDENTIAL` non può essere inviata a un canale `PUBLIC`
- Una sessione contaminata a `RESTRICTED` non può fare output verso nessun canale sotto `RESTRICTED`
- Non esiste un override amministrativo, nessun escape hatch enterprise, e nessun workaround LLM

## Classificazione Effettiva

Canali e destinatari portano entrambi livelli di classificazione. Quando i dati
stanno per lasciare il sistema, la **classificazione effettiva** della
destinazione determina cosa può essere inviato:

```
CLASSIFICAZIONE_EFFETTIVA = min(classificazione_canale, classificazione_destinatario)
```

La classificazione effettiva è la _più bassa_ delle due. Questo significa che un
canale ad alta classificazione con un destinatario a bassa classificazione viene
comunque trattato come a bassa classificazione.

| Canale         | Destinatario | Effettiva      | Può ricevere dati CONFIDENTIAL? |
| -------------- | ------------ | -------------- | ------------------------------- |
| `INTERNAL`     | `INTERNAL`   | `INTERNAL`     | No (CONFIDENTIAL > INTERNAL)    |
| `INTERNAL`     | `EXTERNAL`   | `PUBLIC`       | No                              |
| `CONFIDENTIAL` | `INTERNAL`   | `INTERNAL`     | No (CONFIDENTIAL > INTERNAL)    |
| `CONFIDENTIAL` | `EXTERNAL`   | `PUBLIC`       | No                              |
| `RESTRICTED`   | `INTERNAL`   | `INTERNAL`     | No (CONFIDENTIAL > INTERNAL)    |

## Regole di Classificazione dei Canali

Ogni tipo di canale ha regole specifiche per determinare il suo livello di
classificazione.

### Email

- **Corrispondenza dominio**: i messaggi `@azienda.com` sono classificati come `INTERNAL`
- L'amministratore configura quali domini sono interni
- Domini sconosciuti o esterni sono predefiniti come `EXTERNAL`
- I destinatari esterni riducono la classificazione effettiva a `PUBLIC`

### Slack / Teams

- **Appartenenza al workspace**: i membri dello stesso workspace/tenant sono `INTERNAL`
- Gli utenti esterni Slack Connect sono classificati come `EXTERNAL`
- Gli utenti ospiti sono classificati come `EXTERNAL`
- La classificazione è derivata dall'API della piattaforma, non dall'interpretazione dell'LLM

### WhatsApp / Telegram / iMessage

- **Enterprise**: i numeri di telefono confrontati con la sincronizzazione della directory HR determinano interno vs. esterno
- **Personale**: tutti i destinatari sono predefiniti come `EXTERNAL`
- Gli utenti possono contrassegnare contatti fidati, ma questo non cambia la matematica della classificazione -- cambia la classificazione del destinatario

### WebChat

- I visitatori WebChat sono sempre classificati come `PUBLIC` (i visitatori non vengono mai verificati come proprietario)
- WebChat è destinato alle interazioni pubbliche

### CLI

- Il canale CLI viene eseguito localmente ed è classificato in base all'utente autenticato
- L'accesso diretto al terminale è tipicamente `INTERNAL` o superiore

## Fonti di Classificazione dei Destinatari

### Enterprise

- **Sincronizzazione directory** (Okta, Azure AD, Google Workspace) popola automaticamente le classificazioni dei destinatari
- Tutti i membri della directory sono classificati come `INTERNAL`
- Ospiti esterni e fornitori sono classificati come `EXTERNAL`
- Gli amministratori possono sovrascrivere per contatto o per dominio

### Personale

- **Predefinito**: tutti i destinatari sono `EXTERNAL`
- Gli utenti riclassificano i contatti fidati attraverso prompt nel flusso o l'app companion
- La riclassificazione è esplicita e registrata

## Stati dei Canali

Ogni canale progredisce attraverso una macchina a stati prima di poter trasportare dati:

<img src="/diagrams/state-machine.svg" alt="Macchina a stati del canale: UNTRUSTED → CLASSIFIED o BLOCKED" style="max-width: 100%;" />

| Stato        | Può ricevere dati?    | Può inviare dati nel contesto agente? | Descrizione                                                  |
| ------------ | :-------------------: | :-----------------------------------: | ------------------------------------------------------------ |
| `UNTRUSTED`  |          No           |                  No                   | Predefinito per canali nuovi/sconosciuti. Completamente isolato. |
| `CLASSIFIED` | Sì (entro le policy)  |       Sì (con classificazione)        | Esaminato e assegnato un livello di classificazione.         |
| `BLOCKED`    |          No           |                  No                   | Esplicitamente proibito dall'amministratore o dall'utente.   |

::: warning SICUREZZA I nuovi canali atterrano sempre nello stato `UNTRUSTED`.
Non possono ricevere dati dall'agente e non possono inviare dati nel contesto
dell'agente. Il canale rimane completamente isolato finché un amministratore
(enterprise) o l'utente (personale) non lo classifica esplicitamente. :::

## Come la Classificazione Interagisce con Altri Sistemi

La classificazione non è una funzionalità autonoma -- guida le decisioni
attraverso l'intera piattaforma:

| Sistema                   | Come viene usata la classificazione                                          |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Taint di sessione**     | L'accesso a dati classificati escala la sessione a quel livello              |
| **Hook di policy**        | PRE_OUTPUT confronta il taint della sessione con la classificazione della destinazione |
| **Gateway MCP**           | Le risposte dei server MCP portano classificazione che contamina la sessione |
| **Lineage dei dati**      | Ogni record di lineage include il livello di classificazione e il motivo     |
| **Notifiche**             | Il contenuto delle notifiche è soggetto alle stesse regole di classificazione |
| **Delega degli agenti**   | Il tetto di classificazione dell'agente chiamato deve soddisfare il taint del chiamante |
| **Sandbox dei plugin**    | Il Plugin SDK classifica automaticamente tutti i dati emessi                  |
