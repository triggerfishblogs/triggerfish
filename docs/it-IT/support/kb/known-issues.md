# KB: Problemi Noti

Problemi noti attuali e le loro soluzioni alternative. Questa pagina viene aggiornata man mano che i problemi vengono scoperti e risolti.

---

## Email: Nessuna Riconnessione IMAP

**Stato:** Aperto

L'adattatore del canale email controlla nuovi messaggi ogni 30 secondi tramite IMAP. Se la connessione IMAP cade (interruzione di rete, riavvio del server, timeout per inattività), il ciclo di polling fallisce silenziosamente e non tenta di riconnettersi.

**Sintomi:**
- Il canale email smette di ricevere nuovi messaggi
- `IMAP unseen email poll failed` appare nei log
- Nessun recupero automatico

**Soluzione alternativa:** Riavviare il daemon:

```bash
triggerfish stop && triggerfish start
```

**Causa principale:** Il ciclo di polling IMAP non ha logica di riconnessione. Il `setInterval` continua a scattare ma ogni poll fallisce perché la connessione è morta.

---

## SDK Slack/Discord: Leak di Operazioni Asincrone

**Stato:** Problema noto upstream

Gli SDK Slack (`@slack/bolt`) e Discord (`discord.js`) causano leak di operazioni asincrone all'importazione. Questo influisce sui test (richiede `sanitizeOps: false`) ma non influisce sull'uso in produzione.

**Sintomi:**
- Fallimenti dei test con "leaking async ops" quando si testano gli adattatori dei canali
- Nessun impatto in produzione

**Soluzione alternativa:** I file di test che importano gli adattatori Slack o Discord devono impostare:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Troncamento dei Messaggi Invece di Suddivisione

**Stato:** Per design

I messaggi Slack vengono troncati a 40.000 caratteri invece di essere divisi in messaggi multipli (come fanno Telegram e Discord). Le risposte molto lunghe dell'agent perdono contenuto alla fine.

**Soluzione alternativa:** Chiedere all'agent di produrre risposte più brevi, o utilizzare un canale diverso per le attività che generano output di grandi dimensioni.

---

## WhatsApp: Tutti gli Utenti Trattati Come Proprietario Quando ownerPhone È Mancante

**Stato:** Per design (con avviso)

Se il campo `ownerPhone` non è configurato per il canale WhatsApp, tutti i mittenti di messaggi vengono trattati come proprietario, concedendo loro accesso completo ai tool.

**Sintomi:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (l'avviso nel log è in realtà fuorviante; il comportamento concede accesso da proprietario)
- Qualsiasi utente WhatsApp può accedere a tutti i tool

**Soluzione alternativa:** Impostare sempre `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH Non Aggiornato Dopo l'Installazione dei Tool

**Stato:** Per design

Il file unit systemd cattura il PATH della shell al momento dell'installazione del daemon. Se si installano nuovi tool (binari di server MCP, `npx`, ecc.) dopo l'installazione del daemon, il daemon non li troverà.

**Sintomi:**
- I server MCP non riescono a generarsi
- I binari dei tool "non trovati" anche se funzionano nel terminale

**Soluzione alternativa:** Reinstallare il daemon per aggiornare il PATH catturato:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Questo si applica anche a launchd (macOS).

---

## Browser: Restrizioni CDP di Chrome Flatpak

**Stato:** Limitazione della piattaforma

Alcune build Flatpak di Chrome o Chromium limitano il flag `--remote-debugging-port`, che impedisce a Triggerfish di connettersi tramite il Chrome DevTools Protocol.

**Sintomi:**
- `CDP endpoint on port X not ready after Yms`
- Il browser si avvia ma Triggerfish non riesce a controllarlo

**Soluzione alternativa:** Installare Chrome o Chromium come pacchetto nativo invece di Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Permessi del Volume con Podman

**Stato:** Specifico per piattaforma

Quando si utilizza Podman con container rootless, il mapping degli UID potrebbe impedire al container (eseguito come UID 65534) di scrivere nel volume dati.

**Sintomi:**
- Errori `Permission denied` all'avvio
- Non è possibile creare file di configurazione, database o log

**Soluzione alternativa:** Utilizzare il flag di mount `:Z` per il relabeling SELinux e assicurarsi che la directory del volume sia scrivibile:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Oppure creare il volume con la proprietà corretta. Prima trovare il percorso di mount del volume, poi impostare il proprietario:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Annotare il percorso "Mountpoint"
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows: csc.exe di .NET Framework Non Trovato

**Stato:** Specifico per piattaforma

L'installer Windows compila un wrapper di servizio C# al momento dell'installazione. Se `csc.exe` non viene trovato (.NET Framework mancante, o percorso di installazione non standard), l'installazione del servizio fallisce.

**Sintomi:**
- L'installer completa ma il servizio non è registrato
- `triggerfish status` mostra che il servizio non esiste

**Soluzione alternativa:** Installare .NET Framework 4.x, oppure eseguire Triggerfish in modalità primo piano:

```powershell
triggerfish run
```

Mantenere il terminale aperto. Il daemon funziona fino alla chiusura.

---

## CalDAV: Conflitti ETag con Client Concorrenti

**Stato:** Per design (specifica CalDAV)

Quando si aggiornano o eliminano eventi del calendario, CalDAV utilizza gli ETag per il controllo della concorrenza ottimistica. Se un altro client (app del telefono, interfaccia web) ha modificato l'evento tra la lettura e la scrittura, l'operazione fallisce:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Soluzione alternativa:** L'agent dovrebbe automaticamente ritentare recuperando l'ultima versione dell'evento. Se non lo fa, chiedere di "ottenere l'ultima versione dell'evento e riprovare."

---

## Fallback in Memoria: Secret Persi al Riavvio

**Stato:** Per design

Quando si utilizza `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, i secret sono memorizzati solo in memoria e vengono persi quando il daemon si riavvia. Questa modalità è intesa solo per il testing.

**Sintomi:**
- I secret funzionano fino al riavvio del daemon
- Dopo il riavvio: errori `Secret not found`

**Soluzione alternativa:** Configurare un backend dei secret appropriato. Su Linux headless, installare `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Refresh Token Non Emesso alla Ri-Autorizzazione

**Stato:** Comportamento dell'API Google

Google emette un refresh token solo alla prima autorizzazione. Se si è precedentemente autorizzata l'app e si riesegue `triggerfish connect google`, si ottiene un access token ma nessun refresh token.

**Sintomi:**
- L'API Google funziona inizialmente ma fallisce dopo la scadenza dell'access token (1 ora)
- Errore `No refresh token`

**Soluzione alternativa:** Revocare prima l'accesso dell'app, poi ri-autorizzare:

1. Andare su [Permessi dell'Account Google](https://myaccount.google.com/permissions)
2. Trovare Triggerfish e fare clic su "Rimuovi Accesso"
3. Eseguire di nuovo `triggerfish connect google`
4. Google ora emetterà un nuovo refresh token

---

## Segnalare Nuovi Problemi

Se si incontra un problema non elencato qui, controllare la pagina [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Se non è già stato segnalato, segnalare un nuovo issue seguendo la [guida alla segnalazione](/it-IT/support/guides/filing-issues).
