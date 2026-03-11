# Risoluzione dei Problemi: Secret e Credenziali

## Backend del Portachiavi per Piattaforma

| Piattaforma | Backend | Dettagli |
|-------------|---------|----------|
| macOS | Keychain (nativo) | Utilizza la CLI `security` per accedere ad Accesso Portachiavi |
| Linux | Secret Service (D-Bus) | Utilizza la CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | File store crittografato | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | File store crittografato | `/data/secrets.json` + `/data/secrets.key` |

Il backend viene selezionato automaticamente all'avvio. Non è possibile cambiare quale backend viene utilizzato per la propria piattaforma.

---

## Problemi macOS

### Prompt di accesso al Portachiavi

macOS potrebbe chiedere di consentire a `triggerfish` di accedere al portachiavi. Fare clic su "Consenti Sempre" per evitare prompt ripetuti. Se si è accidentalmente fatto clic su "Nega", aprire Accesso Portachiavi, trovare la voce e rimuoverla. Il prossimo accesso chiederà nuovamente.

### Portachiavi bloccato

Se il portachiavi macOS è bloccato (es. dopo lo sleep), le operazioni sui secret falliranno. Sbloccarlo:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Oppure semplicemente sbloccare il Mac (il portachiavi si sblocca al login).

---

## Problemi Linux

### "secret-tool" non trovato

Il backend del portachiavi Linux utilizza `secret-tool`, che fa parte del pacchetto `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Nessun daemon Secret Service in esecuzione

Su server headless o ambienti desktop minimali, potrebbe non esserci un daemon Secret Service. Sintomi:

- I comandi `secret-tool` si bloccano o falliscono
- Messaggi di errore sulla connessione D-Bus

**Opzioni:**

1. **Installare e avviare GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Utilizzare il fallback del file crittografato:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Attenzione: il fallback in memoria non persiste i secret tra i riavvii. È adatto solo per il testing.

3. **Per i server, considerare Docker.** Il deployment Docker utilizza un file store crittografato che non richiede un daemon del keyring.

### KDE / KWallet

Se si utilizza KDE con KWallet invece di GNOME Keyring, `secret-tool` dovrebbe comunque funzionare attraverso l'API D-Bus del Secret Service che KWallet implementa. Se non funziona, installare `gnome-keyring` insieme a KWallet.

---

## File Store Crittografato Windows / Docker

### Come funziona

Il file store crittografato utilizza la crittografia AES-256-GCM:

1. Una chiave macchina viene derivata utilizzando PBKDF2 e memorizzata in `secrets.key`
2. Ogni valore del secret viene individualmente crittografato con un IV unico
3. I dati crittografati vengono memorizzati in `secrets.json` in un formato con versione (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Sui sistemi basati su Unix (Linux in Docker), il file della chiave deve avere permessi `0600` (lettura/scrittura solo proprietario). Se i permessi sono troppo permissivi:

```
Machine key file permissions too open
```

**Soluzione:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# oppure in Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Il file della chiave esiste ma non può essere analizzato. Potrebbe essere stato troncato o sovrascritto.

**Soluzione:** Eliminare il file della chiave e rigenerare:

```bash
rm ~/.triggerfish/secrets.key
```

Al prossimo avvio, viene generata una nuova chiave. Tuttavia, tutti i secret esistenti crittografati con la vecchia chiave saranno illeggibili. Sarà necessario ri-memorizzare tutti i secret:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Ripetere per tutti i secret
```

### "Secret file permissions too open"

Come il file della chiave, il file dei secret dovrebbe avere permessi restrittivi:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

Il sistema non è riuscito a impostare i permessi del file. Questo può accadere su filesystem che non supportano i permessi Unix (alcuni mount di rete, volumi FAT/exFAT). Verificare che il filesystem supporti la modifica dei permessi.

---

## Migrazione dei Secret Legacy

### Migrazione automatica

Se Triggerfish rileva un file di secret in testo in chiaro (vecchio formato senza crittografia), migra automaticamente al formato crittografato al primo caricamento:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

La migrazione:
1. Legge il file JSON in testo in chiaro
2. Crittografa ogni valore con AES-256-GCM
3. Scrive in un file temporaneo, poi rinomina atomicamente
4. Registra un avviso raccomandando la rotazione dei secret

### Migrazione manuale

Se si hanno secret nel file `triggerfish.yaml` (senza utilizzare riferimenti `secret:`), migrarli al portachiavi:

```bash
triggerfish config migrate-secrets
```

Questo scansiona la configurazione alla ricerca di campi secret noti (chiavi API, token bot, ecc.), li memorizza nel portachiavi e sostituisce i valori nel file di configurazione con riferimenti `secret:`.

### Problemi di spostamento tra dispositivi

Se la migrazione comporta lo spostamento di file attraverso confini di filesystem (punti di mount diversi, NFS), la rinomina atomica potrebbe fallire. La migrazione ripiega su copia-poi-rimozione, che è comunque sicura ma ha brevemente entrambi i file su disco.

---

## Risoluzione dei Secret

### Come funzionano i riferimenti `secret:`

I valori di configurazione con prefisso `secret:` vengono risolti all'avvio:

```yaml
# In triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# All'avvio, risolto in:
apiKey: "sk-ant-api03-actual-key-value..."
```

Il valore risolto vive solo in memoria. Il file di configurazione su disco contiene sempre il riferimento `secret:`.

### "Secret not found"

```
Secret not found: <key>
```

La chiave referenziata non esiste nel portachiavi.

**Soluzione:**

```bash
triggerfish config set-secret <key> <value>
```

### Elencare i secret

```bash
# Elencare tutte le chiavi dei secret memorizzati (i valori non vengono mostrati)
triggerfish config get-secret --list
```

### Eliminare i secret

```bash
triggerfish config set-secret <key> ""
# oppure attraverso l'agent:
# L'agent può richiedere l'eliminazione dei secret tramite il tool dei secret
```

---

## Override della Variabile d'Ambiente

Il percorso del file della chiave può essere sovrascritto con `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

Questo è utile principalmente per i deployment Docker con layout di volumi personalizzati.

---

## Nomi Comuni delle Chiavi dei Secret

Queste sono le chiavi standard del portachiavi utilizzate da Triggerfish:

| Chiave | Utilizzo |
|--------|----------|
| `provider:<name>:apiKey` | Chiave API del provider LLM |
| `telegram:botToken` | Token del bot Telegram |
| `slack:botToken` | Token del bot Slack |
| `slack:appToken` | Token a livello di app Slack |
| `slack:signingSecret` | Signing secret Slack |
| `discord:botToken` | Token del bot Discord |
| `whatsapp:accessToken` | Token di accesso WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | Token di verifica webhook WhatsApp |
| `email:smtpPassword` | Password relay SMTP |
| `email:imapPassword` | Password server IMAP |
| `web:search:apiKey` | Chiave API Brave Search |
| `github-pat` | Personal Access Token GitHub |
| `notion:token` | Token integrazione Notion |
| `caldav:password` | Password server CalDAV |
| `google:clientId` | ID client OAuth Google |
| `google:clientSecret` | Client secret OAuth Google |
| `google:refreshToken` | Refresh token OAuth Google |
