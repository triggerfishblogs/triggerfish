# Scegliere i Livelli di Classificazione

Ogni canale, server MCP, integrazione e plugin in Triggerfish deve avere un
livello di classificazione. Questa pagina La aiuta a scegliere quello giusto.

## I Quattro Livelli

| Livello          | Cosa significa                                               | I dati fluiscono verso...              |
| ---------------- | ------------------------------------------------------------ | -------------------------------------- |
| **PUBLIC**       | Sicuro per chiunque                                          | Ovunque                                |
| **INTERNAL**     | Solo per i Suoi occhi — nulla di sensibile, ma non pubblico  | INTERNAL, CONFIDENTIAL, RESTRICTED     |
| **CONFIDENTIAL** | Contiene dati sensibili che non vorrebbe mai fossero esposti | CONFIDENTIAL, RESTRICTED               |
| **RESTRICTED**   | Più sensibile — legale, medico, finanziario, PII             | Solo RESTRICTED                        |

I dati possono fluire solo **verso l'alto o lateralmente**, mai verso il basso.
Questa è la [regola no write-down](/it-IT/security/no-write-down) e non può
essere sovrascritta.

## Due Domande da Porsi

Per qualsiasi integrazione che sta configurando, si chieda:

**1. Qual è il dato più sensibile che questa fonte potrebbe restituire?**

Questo determina il livello di classificazione **minimo**. Se un server MCP
potrebbe restituire dati finanziari, deve essere almeno CONFIDENTIAL — anche se
la maggior parte dei suoi strumenti restituisce metadati innocui.

**2. Sarebbe a Suo agio se i dati della sessione fluissero _verso_ questa destinazione?**

Questo determina il livello di classificazione **massimo** che vorrebbe
assegnare. Una classificazione più alta significa che il taint della sessione si
escala quando lo utilizza, il che limita dove i dati possono fluire
successivamente.

## Classificazione per Tipo di Dato

| Tipo di dato                                    | Livello consigliato | Perché                                           |
| ----------------------------------------------- | ------------------- | ------------------------------------------------ |
| Meteo, pagine web pubbliche, fusi orari         | **PUBLIC**          | Liberamente disponibile per chiunque             |
| Appunti personali, segnalibri, liste attività   | **INTERNAL**        | Privati ma non dannosi se esposti               |
| Wiki interne, documenti di team, bacheche progetto | **INTERNAL**     | Informazioni interne all'organizzazione         |
| Email, eventi calendario, contatti              | **CONFIDENTIAL**    | Contiene nomi, orari, relazioni                  |
| Dati CRM, pipeline vendite, record clienti      | **CONFIDENTIAL**    | Sensibili per il business, dati clienti          |
| Record finanziari, conti bancari, fatture        | **CONFIDENTIAL**    | Informazioni monetarie                           |
| Repository di codice sorgente (privati)         | **CONFIDENTIAL**    | Proprietà intellettuale                          |
| Cartelle mediche o sanitarie                    | **RESTRICTED**      | Protette legalmente (HIPAA, ecc.)                |
| Numeri di identificazione governativa, SSN, passaporti | **RESTRICTED** | Rischio di furto d'identità                     |
| Documenti legali, contratti sotto NDA           | **RESTRICTED**      | Esposizione legale                               |
| Chiavi di crittografia, credenziali, secret     | **RESTRICTED**      | Rischio di compromissione del sistema            |

## Server MCP

Quando aggiunge un server MCP a `triggerfish.yaml`, la classificazione determina
due cose:

1. **Taint di sessione** — chiamare qualsiasi strumento su questo server escala
   la sessione a questo livello
2. **Prevenzione write-down** — una sessione già contaminata sopra questo livello
   non può inviare dati _a_ questo server

```yaml
mcp_servers:
  # PUBLIC — dati aperti, nessuna sensibilità
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — il proprio filesystem, privato ma non secret
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — accede a repository privati, issue dei clienti
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — database con PII, cartelle cliniche, documenti legali
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DEFAULT DENY Se omette `classification`, il server viene registrato
come **UNTRUSTED** e il gateway rifiuta tutte le chiamate strumenti. Deve
scegliere esplicitamente un livello. :::

### Classificazioni Comuni dei Server MCP

| Server MCP                              | Livello suggerito | Motivazione                                        |
| --------------------------------------- | ----------------- | -------------------------------------------------- |
| Filesystem (documenti pubblici)         | PUBLIC            | Espone solo file disponibili pubblicamente         |
| Filesystem (directory home)             | INTERNAL          | File personali, nulla di segreto                   |
| Filesystem (progetti di lavoro)         | CONFIDENTIAL      | Potrebbe contenere codice o dati proprietari        |
| GitHub (solo repository pubblici)       | INTERNAL          | Il codice è pubblico ma i pattern di utilizzo sono privati |
| GitHub (repository privati)             | CONFIDENTIAL      | Codice sorgente proprietario                       |
| Slack                                   | CONFIDENTIAL      | Conversazioni di lavoro, potenzialmente sensibili  |
| Database (analytics/reportistica)       | CONFIDENTIAL      | Dati aziendali aggregati                           |
| Database (produzione con PII)           | RESTRICTED        | Contiene informazioni personali identificabili     |
| Meteo / ora / calcolatrice             | PUBLIC            | Nessun dato sensibile                              |
| Ricerca web                             | PUBLIC            | Restituisce informazioni disponibili pubblicamente |
| Email                                   | CONFIDENTIAL      | Nomi, conversazioni, allegati                      |
| Google Drive                            | CONFIDENTIAL      | I documenti possono contenere dati aziendali sensibili |

## Canali

La classificazione del canale determina il **tetto** — la sensibilità massima
dei dati che possono essere consegnati a quel canale.

```yaml
channels:
  cli:
    classification: INTERNAL # Il Suo terminale locale — sicuro per dati interni
  telegram:
    classification: INTERNAL # Il Suo bot privato — uguale alla CLI per il proprietario
  webchat:
    classification: PUBLIC # Visitatori anonimi — solo dati pubblici
  email:
    classification: CONFIDENTIAL # L'email è privata ma potrebbe essere inoltrata
```

::: tip PROPRIETARIO vs. NON-PROPRIETARIO Per il **proprietario**, tutti i
canali hanno lo stesso livello di fiducia — Lei è Lei, indipendentemente
dall'app che usa. La classificazione del canale conta di più per gli **utenti
non proprietari** (visitatori su webchat, membri in un canale Slack, ecc.) dove
controlla quali dati possono fluire verso di loro. :::

### Scegliere la Classificazione del Canale

| Domanda                                                                       | Se sì...                | Se no...                |
| ----------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Un estraneo potrebbe vedere i messaggi su questo canale?                      | **PUBLIC**              | Continui a leggere      |
| Questo canale è solo per Lei personalmente?                                   | **INTERNAL** o superiore | Continui a leggere     |
| I messaggi potrebbero essere inoltrati, catturati o registrati da terzi?      | Limite a **CONFIDENTIAL** | Potrebbe essere **RESTRICTED** |
| Il canale è crittografato end-to-end e sotto il Suo pieno controllo?          | Potrebbe essere **RESTRICTED** | Limite a **CONFIDENTIAL** |

## Cosa Succede Quando Si Sbaglia

**Troppo basso (es. server CONFIDENTIAL contrassegnato come PUBLIC):**

- I dati da questo server non escalano il taint della sessione
- La sessione potrebbe far fluire dati classificati verso canali pubblici — **rischio di fuga dati**
- Questa è la direzione pericolosa

**Troppo alto (es. server PUBLIC contrassegnato come CONFIDENTIAL):**

- Il taint della sessione si escala inutilmente quando usa questo server
- Verrà bloccato dall'invio verso canali con classificazione inferiore
- Fastidioso ma **sicuro** — si cauteli classificando troppo in alto

::: danger In caso di dubbio, **classifichi più in alto**. Può sempre abbassare
successivamente dopo aver verificato quali dati il server restituisce
effettivamente. Sotto-classificare è un rischio per la sicurezza;
sovra-classificare è solo un inconveniente. :::

## La Cascata del Taint

Comprendere l'impatto pratico La aiuta a scegliere saggiamente. Ecco cosa
succede in una sessione:

```
1. La sessione inizia a PUBLIC
2. Chiede il meteo (server PUBLIC)                → il taint resta PUBLIC
3. Controlla i suoi appunti (filesystem INTERNAL)  → il taint escala a INTERNAL
4. Interroga le issue GitHub (CONFIDENTIAL)        → il taint escala a CONFIDENTIAL
5. Prova a pubblicare su webchat (canale PUBLIC)   → BLOCCATO (violazione write-down)
6. Resetta la sessione                             → il taint torna a PUBLIC
7. Pubblica su webchat                             → consentito
```

Se utilizza frequentemente uno strumento CONFIDENTIAL seguito da un canale
PUBLIC, dovrà resettare spesso. Consideri se lo strumento necessita davvero di
CONFIDENTIAL, o se il canale potrebbe essere riclassificato.

## Percorsi Filesystem

Può anche classificare singoli percorsi del filesystem, utile quando il Suo
agente ha accesso a directory con sensibilità mista:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Checklist di Revisione

Prima di mettere in produzione una nuova integrazione:

- [ ] Qual è il dato peggiore che questa fonte potrebbe restituire? Classifichi a quel livello.
- [ ] La classificazione è almeno alta quanto suggerito dalla tabella dei tipi di dato?
- [ ] Se si tratta di un canale, la classificazione è appropriata per tutti i possibili destinatari?
- [ ] Ha testato che la cascata del taint funziona per il Suo workflow tipico?
- [ ] In caso di dubbio, ha classificato più in alto piuttosto che più in basso?

## Pagine Correlate

- [Regola No Write-Down](/it-IT/security/no-write-down) — la regola fissa sul flusso dei dati
- [Configurazione](/it-IT/guide/configuration) — riferimento YAML completo
- [Gateway MCP](/it-IT/integrations/mcp-gateway) — modello di sicurezza dei server MCP
