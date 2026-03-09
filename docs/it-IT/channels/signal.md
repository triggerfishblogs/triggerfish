# Signal

Connetta il Suo agente Triggerfish a Signal affinché le persone possano
scrivergli dall'app Signal. L'adattatore comunica con un daemon
[signal-cli](https://github.com/AsamK/signal-cli) tramite JSON-RPC, utilizzando
il Suo numero di telefono Signal collegato.

## Come Signal è Diverso

L'adattatore Signal **è** il Suo numero di telefono. A differenza di Telegram o
Slack dove esiste un account bot separato, i messaggi Signal provengono da altre
persone al Suo numero. Questo significa:

- Tutti i messaggi in entrata hanno `isOwner: false` -- provengono sempre da
  qualcun altro
- L'adattatore risponde come il Suo numero di telefono
- Non c'è un controllo proprietario per-messaggio come negli altri canali

Questo rende Signal ideale per ricevere messaggi dai contatti che scrivono al Suo
numero, con l'agente che risponde per conto Suo.

## Classificazione Predefinita

Signal è predefinito a classificazione `PUBLIC`. Poiché tutti i messaggi in
entrata provengono da contatti esterni, `PUBLIC` è il valore predefinito sicuro.

## Configurazione

### Passaggio 1: Installi signal-cli

signal-cli è un client a riga di comando di terze parti per Signal. Triggerfish
comunica con esso tramite un socket TCP o Unix.

**Linux (build nativo -- Java non necessario):**

Scarichi l'ultimo build nativo dalla pagina delle
[release di signal-cli](https://github.com/AsamK/signal-cli/releases), oppure
lasci che Triggerfish lo scarichi per Lei durante la configurazione.

**macOS / altre piattaforme (build JVM):**

Richiede Java 21+. Triggerfish può scaricare automaticamente un JRE portatile se
Java non è installato.

Può anche eseguire la configurazione guidata:

```bash
triggerfish config add-channel signal
```

Questo verifica signal-cli, offre di scaricarlo se mancante, e La guida
attraverso il collegamento.

### Passaggio 2: Colleghi il Suo Dispositivo

signal-cli deve essere collegato al Suo account Signal esistente (come collegare
un'app desktop):

```bash
signal-cli link -n "Triggerfish"
```

Questo stampa un URI `tsdevice:`. Scansioni il codice QR con la Sua app Signal
mobile (Impostazioni > Dispositivi collegati > Collega nuovo dispositivo).

### Passaggio 3: Avvii il Daemon

signal-cli viene eseguito come daemon in background a cui Triggerfish si connette:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Sostituisca `+14155552671` con il Suo numero di telefono in formato E.164.

### Passaggio 4: Configuri Triggerfish

Aggiunga Signal al Suo `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Opzione            | Tipo    | Obbligatorio | Descrizione                                                                          |
| ------------------ | ------- | ------------ | ------------------------------------------------------------------------------------ |
| `endpoint`         | string  | Sì           | Indirizzo daemon signal-cli (`tcp://host:porta` o `unix:///percorso/al/socket`)      |
| `account`          | string  | Sì           | Il Suo numero di telefono Signal (formato E.164)                                     |
| `classification`   | string  | No           | Tetto di classificazione (default: `PUBLIC`)                                         |
| `defaultGroupMode` | string  | No           | Gestione messaggi di gruppo: `always`, `mentioned-only`, `owner-only` (default: `always`) |
| `groups`           | object  | No           | Override di configurazione per-gruppo                                                |
| `ownerPhone`       | string  | No           | Riservato per uso futuro                                                             |
| `pairing`          | boolean | No           | Abilita la modalità di accoppiamento durante la configurazione                       |

### Passaggio 5: Avvii Triggerfish

```bash
triggerfish stop && triggerfish start
```

Invii un messaggio al Suo numero di telefono da un altro utente Signal per
confermare la connessione.

## Messaggi di Gruppo

Signal supporta le chat di gruppo. Può controllare come l'agente risponde ai
messaggi di gruppo:

| Modalità         | Comportamento                                                     |
| ---------------- | ----------------------------------------------------------------- |
| `always`         | Risponde a tutti i messaggi di gruppo (default)                   |
| `mentioned-only` | Risponde solo quando menzionato per numero di telefono o @menzione |
| `owner-only`     | Non risponde mai nei gruppi                                       |

Configuri globalmente o per-gruppo:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

Gli ID di gruppo sono identificatori codificati in base64. Utilizzi
`triggerfish signal list-groups` o consulti la documentazione di signal-cli per
trovarli.

## Suddivisione Messaggi

Signal ha un limite di 4.000 caratteri per messaggio. Le risposte più lunghe
vengono automaticamente divise in più messaggi, spezzando su newline o spazi per
la leggibilità.

## Indicatori di Digitazione

L'adattatore invia indicatori di digitazione mentre l'agente sta elaborando una
richiesta. Lo stato di digitazione si cancella quando la risposta viene inviata.

## Strumenti Estesi

L'adattatore Signal espone strumenti aggiuntivi:

- `sendTyping` / `stopTyping` -- Controllo manuale dell'indicatore di digitazione
- `listGroups` -- Elenca tutti i gruppi Signal di cui l'account è membro
- `listContacts` -- Elenca tutti i contatti Signal

## Cambiare la Classificazione

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Riavvii il daemon dopo la modifica: `triggerfish stop && triggerfish start`

## Funzionalità di Affidabilità

L'adattatore Signal include diversi meccanismi di affidabilità:

### Auto-Riconnessione

Se la connessione a signal-cli cade (interruzione di rete, riavvio del daemon),
l'adattatore si riconnette automaticamente con backoff esponenziale. Nessun
intervento manuale necessario.

### Controllo di Salute

All'avvio, Triggerfish verifica se un daemon signal-cli esistente è sano usando
un probe ping JSON-RPC. Se il daemon non risponde, viene terminato e riavviato
automaticamente.

### Tracciamento della Versione

Triggerfish traccia la versione nota e funzionante di signal-cli (attualmente
0.13.0) e avvisa all'avvio se la versione installata è più vecchia. La versione
di signal-cli viene registrata ad ogni connessione riuscita.

### Supporto Socket Unix

Oltre agli endpoint TCP, l'adattatore supporta socket di dominio Unix:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Risoluzione dei Problemi

**Daemon signal-cli non raggiungibile:**

- Verifichi che il daemon sia in esecuzione: controlli il processo o provi
  `nc -z 127.0.0.1 7583`
- signal-cli si vincola solo a IPv4 — usi `127.0.0.1`, non `localhost`
- La porta TCP predefinita è 7583
- Triggerfish riavvierà automaticamente il daemon se rileva un processo non sano

**Messaggi non in arrivo:**

- Confermi che il dispositivo sia collegato: verifichi nell'app Signal mobile
  sotto Dispositivi collegati
- signal-cli deve aver ricevuto almeno una sincronizzazione dopo il collegamento
- Verifichi i log per errori di connessione: `triggerfish logs --tail`

**Errori Java (solo build JVM):**

- Il build JVM di signal-cli richiede Java 21+
- Esegua `java -version` per verificare
- Triggerfish può scaricare un JRE portatile durante la configurazione se
  necessario

**Cicli di riconnessione:**

- Se vede ripetuti tentativi di riconnessione nei log, il daemon signal-cli
  potrebbe andare in crash
- Verifichi lo stderr proprio di signal-cli per errori
- Provi a riavviare con un daemon fresco: fermi Triggerfish, termini signal-cli,
  riavvii entrambi
