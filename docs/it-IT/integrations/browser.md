# Automazione del Browser

Triggerfish fornisce un controllo approfondito del browser attraverso un'istanza
Chromium gestita dedicata che utilizza CDP (Chrome DevTools Protocol). L'agent
può navigare il web, interagire con le pagine, compilare moduli, catturare
screenshot e automatizzare flussi di lavoro web -- il tutto sotto l'applicazione
delle policy.

## Architettura

L'automazione del browser è costruita su `puppeteer-core`, connettendosi a
un'istanza Chromium gestita via CDP. Ogni azione del browser passa attraverso il
livello delle policy prima di raggiungere il browser.

Triggerfish rileva automaticamente i browser basati su Chromium inclusi
**Google Chrome**, **Chromium** e **Brave**. Il rilevamento copre i percorsi di
installazione standard su Linux, macOS, Windows e ambienti Flatpak.

::: info Il tool `browser_navigate` richiede URL `http://` o `https://`. Gli
schemi interni del browser (come `chrome://`, `brave://`, `about:`) non sono
supportati e restituiranno un errore con indicazioni di utilizzare un URL web. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Flusso di automazione del browser: Agent → Tool Browser → Livello delle Policy → CDP → Chromium Gestito" style="max-width: 100%;" />

Il profilo del browser è isolato per agent. L'istanza Chromium gestita non
condivide cookie, sessioni o storage locale con il browser personale. Il
completamento automatico delle credenziali è disabilitato per impostazione
predefinita.

## Azioni Disponibili

| Azione     | Descrizione                                          | Esempio d'Uso                                           |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `navigate` | Andare a un URL (soggetto a policy del dominio)      | Aprire una pagina web per la ricerca                    |
| `snapshot` | Catturare uno screenshot della pagina                | Documentare uno stato dell'UI, estrarre informazioni visive |
| `click`    | Cliccare un elemento sulla pagina                    | Inviare un modulo, attivare un pulsante                 |
| `type`     | Digitare testo in un campo di input                  | Compilare una barra di ricerca, completare un modulo    |
| `select`   | Selezionare un'opzione da un menu a tendina          | Scegliere da un menu                                    |
| `upload`   | Caricare un file in un modulo                        | Allegare un documento                                   |
| `evaluate` | Eseguire JavaScript nel contesto della pagina (sandbox) | Estrarre dati, manipolare il DOM                     |
| `wait`     | Attendere un elemento o una condizione               | Assicurarsi che una pagina sia caricata prima di interagire |

## Applicazione delle Policy sui Domini

Ogni URL a cui l'agent naviga viene verificato rispetto a una allowlist e
denylist di domini prima che il browser agisca.

### Configurazione

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Come Funzionano le Policy sui Domini

1. L'agent chiama `browser.navigate("https://github.com/org/repo")`
2. L'hook `PRE_TOOL_CALL` si attiva con l'URL come contesto
3. Il motore delle policy verifica il dominio rispetto alle liste allow/deny
4. Se negato o non nella allowlist, la navigazione viene **bloccata**
5. Se consentito, viene cercata la classificazione del dominio
6. Il taint della sessione aumenta per corrispondere alla classificazione del
   dominio
7. La navigazione procede

::: warning SICUREZZA Se un dominio non è nella allowlist, la navigazione è
bloccata per impostazione predefinita. Il LLM non può sovrascrivere le policy
sui domini. Questo impedisce all'agent di visitare siti web arbitrari che
potrebbero esporre dati sensibili o attivare azioni indesiderate. :::

## Screenshot e Classificazione

Gli screenshot catturati tramite `browser.snapshot` ereditano il livello di taint
corrente della sessione. Se la sessione è contaminata a `CONFIDENTIAL`, tutti gli
screenshot di quella sessione sono classificati come `CONFIDENTIAL`.

Questo è importante per le policy di output. Uno screenshot classificato come
`CONFIDENTIAL` non può essere inviato a un canale `PUBLIC`. L'hook `PRE_OUTPUT`
lo applica al confine.

## Contenuti Estratti e Lineage

Quando l'agent estrae contenuto da una pagina web (tramite `evaluate`, leggendo
testo o analizzando elementi), i dati estratti:

- Vengono classificati in base al livello di classificazione assegnato al dominio
- Creano un record di lineage che traccia l'URL sorgente, l'orario di estrazione
  e la classificazione
- Contribuiscono al taint della sessione (il taint aumenta per corrispondere alla
  classificazione del contenuto)

Questo tracciamento di lineage significa che è sempre possibile tracciare da dove
provengono i dati, anche se sono stati estratti da una pagina web settimane fa.

## Controlli di Sicurezza

### Isolamento del Browser per Agent

Ogni agent ha il proprio profilo browser. Questo significa:

- Nessun cookie condiviso tra agent
- Nessuno storage locale o di sessione condiviso
- Nessun accesso ai cookie o sessioni del browser dell'host
- Completamento automatico delle credenziali disabilitato per impostazione
  predefinita
- Le estensioni del browser non vengono caricate

### Integrazione con gli Hook di Policy

Tutte le azioni del browser passano attraverso gli hook di policy standard:

| Hook                 | Quando Si Attiva                             | Cosa Verifica                                                    |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Prima di ogni azione del browser             | Allowlist domini, policy URL, permessi delle azioni              |
| `POST_TOOL_RESPONSE` | Dopo che il browser restituisce dati         | Classifica la risposta, aggiorna il taint della sessione, crea lineage |
| `PRE_OUTPUT`         | Quando il contenuto del browser lascia il sistema | Controllo classificazione rispetto alla destinazione          |

### Limiti di Risorse

- Il timeout di navigazione impedisce al browser di bloccarsi indefinitamente
- I limiti di dimensione del caricamento delle pagine prevengono il consumo
  eccessivo di memoria
- I limiti di tab concorrenti sono applicati per agent

## Controlli Enterprise

Le distribuzioni enterprise hanno controlli aggiuntivi per l'automazione del
browser:

| Controllo                          | Descrizione                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Classificazione a livello di dominio | Domini intranet automaticamente classificati come `INTERNAL`              |
| Lista domini bloccati              | Lista gestita dall'amministratore di domini proibiti                        |
| Policy di conservazione screenshot | Per quanto tempo vengono conservati gli screenshot catturati               |
| Audit logging delle sessioni browser | Registrazione completa di tutte le azioni browser per la conformità      |
| Disabilitazione automazione browser | L'amministratore può disabilitare il tool browser per agent o ruoli specifici |

## Esempio: Flusso di Lavoro di Ricerca Web

Un tipico flusso di lavoro dell'agent che utilizza l'automazione del browser:

```
1. Utente: "Cerca i prezzi della concorrenza su example-competitor.com"

2. Agent:  browser.navigate("https://example-competitor.com/pricing")
           -> PRE_TOOL_CALL: dominio "example-competitor.com" verificato rispetto alla allowlist
           -> Consentito, classificato come PUBLIC
           -> La navigazione procede

3. Agent:  browser.snapshot()
           -> Screenshot catturato, classificato al livello di taint della sessione (PUBLIC)

4. Agent:  browser.evaluate("document.querySelector('.pricing-table').innerText")
           -> Testo estratto, classificato come PUBLIC
           -> Record di lineage creato: source=example-competitor.com/pricing

5. Agent:  Riassume le informazioni sui prezzi e le restituisce all'utente
           -> PRE_OUTPUT: dati PUBLIC verso il canale dell'utente -- CONSENTITO
```

Ogni passaggio viene registrato, classificato e soggetto ad audit.
