# Risoluzione dei Problemi: Installazione

## Problemi dell'Installer Binario

### Verifica del checksum fallita

L'installer scarica un file `SHA256SUMS.txt` insieme al binario e verifica l'hash prima dell'installazione. Se questo fallisce:

- **Il download è stato interrotto dalla rete.** Eliminare il download parziale e riprovare.
- **Il mirror o CDN ha servito contenuto obsoleto.** Attendere qualche minuto e riprovare. L'installer scarica da GitHub Releases.
- **Asset non trovato in SHA256SUMS.txt.** Questo significa che la release è stata pubblicata senza un checksum per la piattaforma in uso. Segnalare un [issue su GitHub](https://github.com/greghavens/triggerfish/issues).

L'installer utilizza `sha256sum` su Linux e `shasum -a 256` su macOS. Se nessuno dei due è disponibile, non può verificare il download.

### Permesso negato per la scrittura in `/usr/local/bin`

L'installer prova prima `/usr/local/bin`, poi ripiega su `~/.local/bin`. Se nessuno dei due funziona:

```bash
# Opzione 1: Eseguire con sudo per installazione a livello di sistema
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Opzione 2: Creare ~/.local/bin e aggiungerlo al PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Poi rieseguire l'installer
```

### Avviso di quarantena macOS

macOS blocca i binari scaricati da internet. L'installer esegue `xattr -cr` per rimuovere l'attributo di quarantena, ma se si è scaricato il binario manualmente, eseguire:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Oppure fare clic destro sul binario nel Finder, selezionare "Apri" e confermare il prompt di sicurezza.

### PATH non aggiornato dopo l'installazione

L'installer aggiunge la directory di installazione al profilo della shell (`.zshrc`, `.bashrc`, o `.bash_profile`). Se il comando `triggerfish` non viene trovato dopo l'installazione:

1. Aprire una nuova finestra del terminale (la shell corrente non recepirà le modifiche al profilo)
2. Oppure caricare manualmente il profilo: `source ~/.zshrc` (o qualsiasi file di profilo utilizzato dalla shell)

Se l'installer ha saltato l'aggiornamento del PATH, significa che la directory di installazione era già nel PATH.

---

## Compilazione da Sorgente

### Deno non trovato

L'installer da sorgente (`deploy/scripts/install-from-source.sh`) installa Deno automaticamente se non è presente. Se questo fallisce:

```bash
# Installare Deno manualmente
curl -fsSL https://deno.land/install.sh | sh

# Verificare
deno --version   # Dovrebbe essere 2.x
```

### La compilazione fallisce con errori di permessi

Il comando `deno compile` necessita di `--allow-all` perché il binario compilato richiede accesso completo al sistema (rete, filesystem, FFI per SQLite, generazione di sottoprocessi). Se si vedono errori di permessi durante la compilazione, assicurarsi di eseguire lo script di installazione come un utente con accesso in scrittura alla directory di destinazione.

### Branch o versione specifici

Impostare `TRIGGERFISH_BRANCH` per clonare un branch specifico:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Per l'installer binario, impostare `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Problemi Specifici di Windows

### La policy di esecuzione PowerShell blocca l'installer

Eseguire PowerShell come Amministratore e consentire l'esecuzione degli script:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Poi rieseguire l'installer.

### La compilazione del Servizio Windows fallisce

L'installer Windows compila un wrapper di servizio C# al volo utilizzando `csc.exe` da .NET Framework 4.x. Se la compilazione fallisce:

1. **Verificare che .NET Framework sia installato.** Eseguire `where csc.exe` in un prompt dei comandi. L'installer cerca nella directory .NET Framework sotto `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Eseguire come Amministratore.** L'installazione del servizio richiede privilegi elevati.
3. **Fallback.** Se la compilazione del servizio fallisce, è comunque possibile eseguire Triggerfish manualmente: `triggerfish run` (modalità in primo piano). Sarà necessario mantenere il terminale aperto.

### `Move-Item` fallisce durante l'aggiornamento

Le versioni precedenti dell'installer Windows utilizzavano `Move-Item -Force` che fallisce quando il binario di destinazione è in uso. Questo è stato corretto nella versione 0.3.4+. Se si incontra questo problema su una versione precedente, arrestare manualmente il servizio prima:

```powershell
Stop-Service Triggerfish
# Poi rieseguire l'installer
```

---

## Problemi Docker

### Il container esce immediatamente

Controllare i log del container:

```bash
docker logs triggerfish
```

Cause comuni:

- **File di configurazione mancante.** Montare il proprio `triggerfish.yaml` in `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Conflitto di porte.** Se la porta 18789 o 18790 è in uso, il gateway non può avviarsi.
- **Permesso negato sul volume.** Il container viene eseguito come UID 65534 (nonroot). Assicurarsi che il volume sia scrivibile da quell'utente.

### Non è possibile accedere a Triggerfish dall'host

Il gateway si associa a `127.0.0.1` all'interno del container per impostazione predefinita. Per accedervi dall'host, il file Docker compose mappa le porte `18789` e `18790`. Se si utilizza `docker run` direttamente, aggiungere:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman invece di Docker

Lo script di installazione Docker auto-rileva `podman` come runtime del container. È anche possibile impostarlo esplicitamente:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Lo script wrapper `triggerfish` (installato dall'installer Docker) auto-rileva anch'esso podman.

### Immagine o registro personalizzati

Sovrascrivere l'immagine con `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-Installazione

### La procedura guidata di configurazione non si avvia

Dopo l'installazione binaria, l'installer esegue `triggerfish dive --install-daemon` per avviare la procedura guidata di configurazione. Se non si avvia:

1. Eseguirla manualmente: `triggerfish dive`
2. Se si vede "Terminal requirement not met", la procedura guidata richiede un TTY interattivo. Le sessioni SSH, le pipeline CI e l'input reindirizzato non funzioneranno. Configurare `triggerfish.yaml` manualmente.

### L'auto-installazione del canale Signal fallisce

Signal richiede `signal-cli`, che è un'applicazione Java. L'auto-installer scarica un binario `signal-cli` pre-compilato e un runtime JRE 25. I fallimenti possono verificarsi se:

- **Nessun accesso in scrittura alla directory di installazione.** Verificare i permessi su `~/.triggerfish/signal-cli/`.
- **Il download del JRE fallisce.** L'installer scarica da Adoptium. Restrizioni di rete o proxy aziendali possono bloccarlo.
- **Architettura non supportata.** L'auto-installazione del JRE supporta solo x64 e aarch64.

Se l'auto-installazione fallisce, installare `signal-cli` manualmente e assicurarsi che sia nel PATH. Vedere la [documentazione del canale Signal](/it-IT/channels/signal) per i passaggi di configurazione manuale.
