# Centro di Supporto

Ottenere aiuto con l'installazione, la configurazione e le operazioni quotidiane
di Triggerfish.

## Link Rapidi

- **Qualcosa non funziona adesso?** Iniziare con la [Guida alla Risoluzione dei Problemi](/it-IT/support/troubleshooting/)
- **Necessità di cercare un errore?** Vedere il [Riferimento degli Errori](/it-IT/support/troubleshooting/error-reference)
- **Si vuole segnalare un bug?** Leggere prima [Come Segnalare un Buon Issue](/it-IT/support/guides/filing-issues)
- **Aggiornamento o migrazione?** Consultare la [Knowledge Base](#knowledge-base)

## Risorse Self-Service

### Risoluzione dei Problemi

Guide passo-passo per diagnosticare e risolvere problemi comuni, organizzate per area:

| Area | Contenuto |
|------|-----------|
| [Installazione](/it-IT/support/troubleshooting/installation) | Fallimenti dell'installazione, errori di permessi, configurazione specifica per piattaforma |
| [Daemon](/it-IT/support/troubleshooting/daemon) | Problemi di avvio/arresto, gestione del servizio, conflitti di porte |
| [Configurazione](/it-IT/support/troubleshooting/configuration) | Parsing YAML, errori di validazione, riferimenti ai secret |
| [Canali](/it-IT/support/troubleshooting/channels) | Telegram, Slack, Discord, WhatsApp, Signal, Email, WebChat |
| [Provider LLM](/it-IT/support/troubleshooting/providers) | Errori delle chiavi API, modello non trovato, fallimenti dello streaming, failover |
| [Integrazioni](/it-IT/support/troubleshooting/integrations) | Google, GitHub, Notion, CalDAV, server MCP |
| [Automazione del Browser](/it-IT/support/troubleshooting/browser) | Rilevamento di Chrome, fallimenti di avvio, Flatpak, navigazione |
| [Sicurezza e Classificazione](/it-IT/support/troubleshooting/security) | Escalation del taint, blocchi write-down, SSRF, negazioni delle policy |
| [Secret e Credenziali](/it-IT/support/troubleshooting/secrets) | Backend del portachiavi, errori di permessi, file store crittografato |
| [Riferimento degli Errori](/it-IT/support/troubleshooting/error-reference) | Indice ricercabile di ogni messaggio di errore |

### Guide Pratiche

| Guida | Descrizione |
|-------|-------------|
| [Raccolta dei Log](/it-IT/support/guides/collecting-logs) | Come raccogliere bundle di log per le segnalazioni di bug |
| [Esecuzione della Diagnostica](/it-IT/support/guides/diagnostics) | Utilizzo di `triggerfish patrol` e del tool di healthcheck |
| [Segnalazione degli Issue](/it-IT/support/guides/filing-issues) | Cosa includere affinché il problema venga risolto rapidamente |
| [Note sulle Piattaforme](/it-IT/support/guides/platform-notes) | Specifiche per macOS, Linux, Windows, Docker e Flatpak |

### Knowledge Base

| Articolo | Descrizione |
|----------|-------------|
| [Migrazione dei Secret](/it-IT/support/kb/secrets-migration) | Migrazione da storage dei secret in testo in chiaro a crittografato |
| [Processo di Auto-Aggiornamento](/it-IT/support/kb/self-update) | Come funziona `triggerfish update` e cosa può andare storto |
| [Breaking Change](/it-IT/support/kb/breaking-changes) | Lista versione per versione delle modifiche incompatibili |
| [Problemi Noti](/it-IT/support/kb/known-issues) | Problemi noti attuali e le loro soluzioni alternative |

## Ancora Bloccati?

Se la documentazione sopra non ha risolto il problema:

1. **Cercare gli issue esistenti** su [GitHub Issues](https://github.com/greghavens/triggerfish/issues) per vedere se qualcuno l'ha già segnalato
2. **Chiedere alla comunità** in [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions)
3. **Segnalare un nuovo issue** seguendo la [guida alla segnalazione degli issue](/it-IT/support/guides/filing-issues)
