# KB: Breaking Change

Una lista versione per versione delle modifiche che potrebbero richiedere azione durante l'aggiornamento.

## Notion: `client_secret` Rimosso

**Commit:** 6d876c3

Il campo `client_secret` è stato rimosso dalla configurazione dell'integrazione Notion come misura di hardening della sicurezza. Notion ora utilizza solo il token OAuth memorizzato nel portachiavi del SO.

**Azione richiesta:** Se il `triggerfish.yaml` contiene un campo `notion.client_secret`, rimuoverlo. Verrà ignorato ma potrebbe causare confusione.

**Nuovo flusso di configurazione:**

```bash
triggerfish connect notion
```

Questo memorizza il token dell'integrazione nel portachiavi. Nessun client secret è necessario.

---

## Nomi dei Tool: Punti a Underscore

**Commit:** 505a443

Tutti i nomi dei tool sono stati cambiati dalla notazione con punti (`foo.bar`) alla notazione con underscore (`foo_bar`). Alcuni provider LLM non supportano i punti nei nomi dei tool, il che causava fallimenti nelle chiamate ai tool.

**Azione richiesta:** Se si hanno regole di policy personalizzate o definizioni di skill che fanno riferimento a nomi di tool con punti, aggiornarle per utilizzare underscore:

```yaml
# Prima
- tool: notion.search

# Dopo
- tool: notion_search
```

---

## Installer Windows: Move-Item a Copy-Item

**Commit:** 5e0370f

L'installer PowerShell di Windows è stato cambiato da `Move-Item -Force` a `Copy-Item -Force` per la sostituzione del binario durante gli aggiornamenti. `Move-Item` non sovrascrive in modo affidabile i file su Windows.

**Azione richiesta:** Nessuna se si effettua un'installazione da zero. Se si è su una versione precedente e `triggerfish update` fallisce su Windows, arrestare il servizio manualmente prima dell'aggiornamento:

```powershell
Stop-Service Triggerfish
# Poi rieseguire l'installer o triggerfish update
```

---

## Stampa della Versione: Da Runtime a Build-Time

**Commit:** e8b0c8c, eae3930, 6ce0c25

Le informazioni sulla versione sono state spostate dal rilevamento a runtime (controllo di `deno.json`) alla stampa al momento della compilazione dai tag git. Il banner CLI non mostra più una stringa di versione hardcoded.

**Azione richiesta:** Nessuna. `triggerfish version` continua a funzionare. Le build di sviluppo mostrano `dev` come versione.

---

## Signal: JRE 21 a JRE 25

**Commit:** e5b1047

L'auto-installer del canale Signal è stato aggiornato per scaricare JRE 25 (da Adoptium) invece di JRE 21. La versione di signal-cli è stata anche ancorata alla v0.14.0.

**Azione richiesta:** Se si ha un'installazione signal-cli esistente con un JRE più vecchio, rieseguire la configurazione di Signal:

```bash
triggerfish config add-channel signal
```

Questo scarica il JRE e signal-cli aggiornati.

---

## Secret: Da Testo in Chiaro a Crittografato

Il formato di storage dei secret è cambiato da JSON in testo in chiaro a JSON crittografato AES-256-GCM.

**Azione richiesta:** Nessuna. La migrazione è automatica. Vedere [Migrazione dei Secret](/it-IT/support/kb/secrets-migration) per i dettagli.

Dopo la migrazione, la rotazione dei secret è raccomandata perché le versioni in testo in chiaro erano precedentemente memorizzate su disco.

---

## Tidepool: Da Callback a Protocollo Canvas

L'interfaccia Tidepool (A2UI) è migrata da un'interfaccia `TidepoolTools` basata su callback a un protocollo basato su canvas.

**File interessati:**
- `src/tools/tidepool/tools/tools_legacy.ts` (vecchia interfaccia, mantenuta per compatibilità)
- `src/tools/tidepool/tools/tools_canvas.ts` (nuova interfaccia)

**Azione richiesta:** Se si hanno skill personalizzate che utilizzano la vecchia interfaccia callback di Tidepool, continueranno a funzionare attraverso lo shim legacy. Le nuove skill dovrebbero utilizzare il protocollo canvas.

---

## Configurazione: Formato Stringa Legacy per `primary`

Il campo `models.primary` accettava precedentemente una stringa semplice (`"anthropic/claude-sonnet-4-20250514"`). Ora richiede un oggetto:

```yaml
# Legacy (ancora accettato per retrocompatibilità)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Corrente (preferito)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Azione richiesta:** Aggiornare al formato oggetto. Il formato stringa viene ancora analizzato ma potrebbe essere rimosso in una versione futura.

---

## Logging Console: Rimosso

**Commit:** 9ce1ce5

Tutte le chiamate grezze `console.log`, `console.warn` e `console.error` sono state migrate al logger strutturato (`createLogger()`). Poiché Triggerfish viene eseguito come daemon, l'output su stdout/stderr non è visibile agli utenti. Tutto il logging ora passa attraverso il writer del file.

**Azione richiesta:** Nessuna. Se si dipendeva dall'output della console per il debug (es. reindirizzando stdout), utilizzare `triggerfish logs` invece.

---

## Stima dell'Impatto

Quando si aggiorna attraverso versioni multiple, controllare ogni voce sopra. La maggior parte delle modifiche sono retrocompatibili con migrazione automatica. Le uniche modifiche che richiedono azione manuale sono:

1. **Rimozione del client_secret di Notion** (rimuovere il campo dalla configurazione)
2. **Cambio del formato dei nomi dei tool** (aggiornare le regole di policy personalizzate)
3. **Aggiornamento JRE di Signal** (rieseguire la configurazione di Signal se si utilizza Signal)

Tutto il resto viene gestito automaticamente.
