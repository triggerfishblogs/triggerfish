# KB: Processo di Auto-Aggiornamento

Come funziona `triggerfish update`, cosa può andare storto e come ripristinare.

## Come Funziona

Il comando di aggiornamento scarica e installa l'ultima release da GitHub:

1. **Controllo della versione.** Recupera l'ultimo tag di release dall'API GitHub. Se si è già sull'ultima versione, esce anticipatamente:
   ```
   Already up to date (v0.4.2)
   ```
   Le build di sviluppo (`VERSION=dev`) saltano il controllo della versione e procedono sempre.

2. **Rilevamento della piattaforma.** Determina il nome corretto dell'asset binario in base al SO e all'architettura (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Download.** Scarica il binario e `SHA256SUMS.txt` dalla release GitHub.

4. **Verifica del checksum.** Calcola lo SHA256 del binario scaricato e lo confronta con la voce in `SHA256SUMS.txt`. Se i checksum non corrispondono, l'aggiornamento viene annullato.

5. **Arresto del daemon.** Arresta il daemon in esecuzione prima di sostituire il binario.

6. **Sostituzione del binario.** Specifica per piattaforma:
   - **Linux/macOS:** Rinomina il vecchio binario, sposta il nuovo nella posizione originale
   - **macOS passaggio extra:** Rimuove gli attributi di quarantena con `xattr -cr`
   - **Windows:** Rinomina il vecchio binario in `.old` (Windows non può sovrascrivere un eseguibile in esecuzione), poi copia il nuovo binario nel percorso originale

7. **Riavvio del daemon.** Avvia il daemon con il nuovo binario.

8. **Changelog.** Recupera e visualizza le note di release per la nuova versione.

## Escalation Sudo

Se il binario è installato in una directory che richiede accesso root (es. `/usr/local/bin`), l'aggiornatore chiede la password per l'escalation con `sudo`.

## Spostamenti tra Filesystem

Se la directory di download e la directory di installazione sono su filesystem diversi (comune con `/tmp` su una partizione separata), la rinomina atomica fallirà. L'aggiornatore ripiega su copia-poi-rimozione, che è sicuro ma ha brevemente entrambi i binari su disco.

## Cosa Può Andare Storto

### "Checksum verification exception"

Il binario scaricato non corrisponde all'hash atteso. Questo di solito significa:
- Il download è stato corrotto (problema di rete)
- Gli asset della release sono obsoleti o parzialmente caricati

**Soluzione:** Attendere qualche minuto e riprovare. Se persiste, scaricare il binario manualmente dalla [pagina delle release](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

La release è stata pubblicata senza un checksum per la piattaforma in uso. Questo è un problema della pipeline di release.

**Soluzione:** Segnalare un [issue su GitHub](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

L'aggiornatore non è riuscito a sostituire il vecchio binario con il nuovo. Cause comuni:
- Permessi del file (il binario è di proprietà di root ma si sta eseguendo come utente normale)
- Il file è bloccato (Windows: un altro processo ha il binario aperto)
- Filesystem in sola lettura

**Soluzione:**
1. Arrestare il daemon manualmente: `triggerfish stop`
2. Terminare eventuali processi residui
3. Riprovare l'aggiornamento con i permessi appropriati

### "Checksum file download failed"

Non è possibile scaricare `SHA256SUMS.txt` dalla release GitHub. Verificare la connessione di rete e riprovare.

### Pulizia del file `.old` su Windows

Dopo un aggiornamento su Windows, il vecchio binario viene rinominato in `triggerfish.exe.old`. Questo file viene pulito automaticamente al prossimo avvio. Se non viene pulito (es. il nuovo binario si blocca all'avvio), è possibile eliminarlo manualmente.

## Confronto delle Versioni

L'aggiornatore utilizza il confronto di versionamento semantico:
- Rimuove il prefisso `v` iniziale (sia `v0.4.2` che `0.4.2` sono accettati)
- Confronta major, minor e patch numericamente
- Le versioni pre-release vengono gestite (es. `v0.4.2-rc.1`)

## Aggiornamento Manuale

Se l'aggiornatore automatico non funziona:

1. Scaricare il binario per la propria piattaforma da [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Arrestare il daemon: `triggerfish stop`
3. Sostituire il binario:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: rimuovere quarantena
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Avviare il daemon: `triggerfish start`

## Aggiornamento Docker

I deployment Docker non utilizzano l'aggiornatore binario. Aggiornare l'immagine del container:

```bash
# Utilizzando lo script wrapper
triggerfish update

# Manualmente
docker compose pull
docker compose up -d
```

Lo script wrapper scarica l'ultima immagine e riavvia il container se uno è in esecuzione.

## Changelog

Dopo un aggiornamento, le note di release vengono visualizzate automaticamente. È anche possibile visualizzarle manualmente:

```bash
triggerfish changelog              # Versione corrente
triggerfish changelog --latest 5   # Ultime 5 release
```

Se il recupero del changelog fallisce dopo un aggiornamento, viene registrato ma non influisce sull'aggiornamento stesso.
