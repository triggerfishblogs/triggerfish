# Risoluzione dei Problemi

Iniziare qui quando qualcosa non funziona. Seguire i passaggi in ordine.

## Primi Passi

### 1. Verificare se il daemon è in esecuzione

```bash
triggerfish status
```

Se il daemon non è in esecuzione, avviarlo:

```bash
triggerfish start
```

### 2. Controllare i log

```bash
triggerfish logs
```

Questo mostra il file di log in tempo reale. Utilizzare un filtro di livello per
ridurre il rumore:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Eseguire la diagnostica

```bash
triggerfish patrol
```

Patrol verifica se il gateway è raggiungibile, il provider LLM risponde, i
canali sono connessi, le regole di policy sono caricate e le skill sono
scoperte. Qualsiasi controllo contrassegnato come `CRITICAL` o `WARNING` indica
dove concentrarsi.

### 4. Validare la configurazione

```bash
triggerfish config validate
```

Questo analizza `triggerfish.yaml`, verifica i campi obbligatori, valida i
livelli di classificazione e risolve i riferimenti ai secret.

## Risoluzione dei Problemi per Area

Se i primi passi sopra non hanno indicato il problema, scegliere l'area che
corrisponde ai sintomi:

- [Installazione](/it-IT/support/troubleshooting/installation) - fallimenti dello script di installazione, problemi di compilazione da sorgente, problemi di piattaforma
- [Daemon](/it-IT/support/troubleshooting/daemon) - il servizio non si avvia, conflitti di porte, errori "già in esecuzione"
- [Configurazione](/it-IT/support/troubleshooting/configuration) - errori di parsing YAML, campi mancanti, fallimenti nella risoluzione dei secret
- [Canali](/it-IT/support/troubleshooting/channels) - il bot non risponde, fallimenti di autenticazione, problemi di consegna dei messaggi
- [Provider LLM](/it-IT/support/troubleshooting/providers) - errori API, modello non trovato, fallimenti dello streaming
- [Integrazioni](/it-IT/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, server MCP
- [Automazione del Browser](/it-IT/support/troubleshooting/browser) - Chrome non trovato, fallimenti di avvio, navigazione bloccata
- [Sicurezza e Classificazione](/it-IT/support/troubleshooting/security) - blocchi write-down, problemi di taint, SSRF, negazioni delle policy
- [Secret e Credenziali](/it-IT/support/troubleshooting/secrets) - errori del portachiavi, file store crittografato, problemi di permessi

## Ancora Bloccati?

Se nessuna delle guide sopra ha risolto il problema:

1. Raccogliere un [bundle di log](/it-IT/support/guides/collecting-logs)
2. Leggere la [guida alla segnalazione degli issue](/it-IT/support/guides/filing-issues)
3. Aprire un issue su [GitHub](https://github.com/greghavens/triggerfish/issues/new)
