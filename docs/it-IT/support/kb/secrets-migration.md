# KB: Migrazione dei Secret

Questo articolo copre la migrazione dei secret dallo storage in testo in chiaro al formato crittografato, e dai valori inline nella configurazione ai riferimenti del portachiavi.

## Contesto

Le prime versioni di Triggerfish memorizzavano i secret come JSON in testo in chiaro. La versione corrente utilizza la crittografia AES-256-GCM per i file store dei secret (Windows, Docker) e i portachiavi nativi del SO (macOS Keychain, Linux Secret Service).

## Migrazione Automatica (Testo in Chiaro a Crittografato)

Quando Triggerfish apre un file di secret e rileva il vecchio formato in testo in chiaro (un oggetto JSON piatto senza campo `v`), migra automaticamente:

1. **Rilevamento.** Il file viene controllato per la presenza della struttura `{v: 1, entries: {...}}`. Se è un semplice `Record<string, string>`, è formato legacy.

2. **Migrazione.** Ogni valore in testo in chiaro viene crittografato con AES-256-GCM utilizzando una chiave macchina derivata tramite PBKDF2. Un IV unico viene generato per ogni valore.

3. **Scrittura atomica.** I dati crittografati vengono scritti prima in un file temporaneo, poi rinominati atomicamente per sostituire l'originale. Questo previene la perdita di dati se il processo viene interrotto.

4. **Logging.** Vengono create due voci di log:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Gestione cross-device.** Se la rinomina atomica fallisce (es. file temporaneo e file dei secret sono su filesystem diversi), la migrazione ripiega su copia-poi-rimozione.

### Cosa è necessario fare

Nulla. La migrazione è completamente automatica e avviene al primo accesso. Tuttavia, dopo la migrazione:

- **Ruotare i secret.** Le versioni in testo in chiaro potrebbero essere state copiate nei backup, nella cache o nei log. Generare nuove chiavi API e aggiornarle:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **Eliminare i vecchi backup.** Se si hanno backup del vecchio file di secret in testo in chiaro, eliminarli in modo sicuro.

## Migrazione Manuale (Configurazione Inline a Portachiavi)

Se il `triggerfish.yaml` contiene valori di secret grezzi invece di riferimenti `secret:`:

```yaml
# Prima (non sicuro)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Eseguire il comando di migrazione:

```bash
triggerfish config migrate-secrets
```

Questo comando:

1. Scansiona la configurazione alla ricerca di campi secret noti (chiavi API, token bot, password)
2. Memorizza ogni valore nel portachiavi del SO sotto il nome di chiave standard
3. Sostituisce il valore inline con un riferimento `secret:`

```yaml
# Dopo (sicuro)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Campi secret noti

Il comando di migrazione conosce questi campi:

| Percorso nella configurazione | Chiave del portachiavi |
|-------------------------------|----------------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## Chiave Macchina

Il file store crittografato deriva la sua chiave di crittografia da una chiave macchina memorizzata in `secrets.key`. Questa chiave viene generata automaticamente al primo utilizzo.

### Permessi del file della chiave

Sui sistemi Unix, il file della chiave deve avere permessi `0600` (lettura/scrittura solo proprietario). Triggerfish lo verifica all'avvio e registra un avviso se i permessi sono troppo aperti:

```
Machine key file permissions too open
```

Soluzione:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Perdita del file della chiave

Se il file della chiave macchina viene eliminato o corrotto, tutti i secret crittografati con esso diventano irrecuperabili. Sarà necessario ri-memorizzare ogni secret:

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... ecc
```

Fare il backup del file `secrets.key` in una posizione sicura.

### Percorso personalizzato della chiave

Sovrascrivere la posizione del file della chiave con:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

Questo è utile principalmente per i deployment Docker con layout di volumi non standard.
