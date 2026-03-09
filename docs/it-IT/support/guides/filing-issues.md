# Come Segnalare un Buon Issue

Un issue ben strutturato viene risolto più velocemente. Un issue vago senza log e senza passaggi di riproduzione spesso rimane fermo per settimane perché nessuno può agire su di esso. Ecco cosa includere.

## Prima di Segnalare

1. **Cercare gli issue esistenti.** Qualcuno potrebbe aver già segnalato lo stesso problema. Controllare gli [issue aperti](https://github.com/greghavens/triggerfish/issues) e gli [issue chiusi](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Consultare le guide alla risoluzione dei problemi.** La [sezione Risoluzione dei Problemi](/it-IT/support/troubleshooting/) copre la maggior parte dei problemi comuni.

3. **Controllare i problemi noti.** La pagina [Problemi Noti](/it-IT/support/kb/known-issues) elenca i problemi di cui siamo già a conoscenza.

4. **Provare l'ultima versione.** Se non si è sull'ultima release, aggiornare prima:
   ```bash
   triggerfish update
   ```

## Cosa Includere

### 1. Ambiente

```
Versione Triggerfish: (eseguire `triggerfish version`)
SO: (es. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architettura: (x64 o arm64)
Metodo di installazione: (installer binario, da sorgente, Docker)
```

### 2. Passaggi per Riprodurre

Scrivere la sequenza esatta di azioni che porta al problema. Essere specifici:

**Sbagliato:**
> Il bot ha smesso di funzionare.

**Corretto:**
> 1. Avviato Triggerfish con canale Telegram configurato
> 2. Inviato il messaggio "controlla il mio calendario per domani" in un DM al bot
> 3. Il bot ha risposto con i risultati del calendario
> 4. Inviato "ora invia quei risultati via email ad alice@example.com"
> 5. Atteso: il bot invia l'email
> 6. Effettivo: il bot risponde con "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Comportamento Atteso vs. Effettivo

Indicare cosa ci si aspettava che succedesse e cosa è successo effettivamente. Includere il messaggio di errore esatto se ce n'è uno. Il copia-incolla è meglio della parafrasi.

### 4. Output dei Log

Allegare un [bundle di log](/it-IT/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Se il problema è sensibile dal punto di vista della sicurezza, è possibile oscurare alcune porzioni, ma annotare nell'issue cosa è stato oscurato.

Come minimo, incollare le righe di log pertinenti. Includere i timestamp per poter correlare gli eventi.

### 5. Configurazione (Oscurata)

Incollare la sezione pertinente del `triggerfish.yaml`. **Oscurare sempre i secret.** Sostituire i valori effettivi con segnaposto:

```yaml
# Corretto - secret oscurati
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # memorizzato nel portachiavi
channels:
  telegram:
    ownerId: "OSCURATO"
    classification: INTERNAL
```

### 6. Output di Patrol

```bash
triggerfish patrol
```

Incollare l'output. Questo fornisce una rapida istantanea dello stato di salute del sistema.

## Tipi di Issue

### Segnalazione di Bug

Utilizzare questo template per le cose che non funzionano:

```markdown
## Segnalazione di Bug

**Ambiente:**
- Versione:
- SO:
- Metodo di installazione:

**Passaggi per riprodurre:**
1.
2.
3.

**Comportamento atteso:**

**Comportamento effettivo:**

**Messaggio di errore (se presente):**

**Output di patrol:**

**Configurazione pertinente (oscurata):**

**Bundle di log:** (allegare file)
```

### Richiesta di Funzionalità

```markdown
## Richiesta di Funzionalità

**Problema:** Cosa si sta cercando di fare che non è possibile fare oggi?

**Soluzione proposta:** Come si pensa che dovrebbe funzionare?

**Alternative considerate:** Cos'altro si è provato?
```

### Domanda / Richiesta di Supporto

Se non si è sicuri se qualcosa sia un bug o se si è semplicemente bloccati, utilizzare [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) invece degli Issue. Le Discussions sono migliori per domande che potrebbero non avere una singola risposta corretta.

## Cosa NON Includere

- **Chiavi API o password grezze.** Oscurare sempre.
- **Dati personali dalle conversazioni.** Oscurare nomi, email, numeri di telefono.
- **Interi file di log inline.** Allegare il bundle di log come file invece di incollare migliaia di righe.

## Dopo la Segnalazione

- **Controllare le domande di follow-up.** I manutentori potrebbero necessitare di più informazioni.
- **Testare le correzioni.** Se viene pubblicata una correzione, potrebbe essere richiesto di verificarla.
- **Chiudere l'issue** se si trova la soluzione da soli. Pubblicare la soluzione affinché anche altri possano beneficiarne.
