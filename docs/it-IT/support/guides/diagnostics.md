# Esecuzione della Diagnostica

Triggerfish ha due tool diagnostici integrati: `patrol` (controllo di salute esterno) e il tool `healthcheck` (sonda interna del sistema).

## Patrol

Patrol è un comando CLI che verifica se i sistemi principali sono operativi:

```bash
triggerfish patrol
```

### Cosa verifica

| Controllo | Stato | Significato |
|-----------|-------|-------------|
| Gateway in esecuzione | CRITICAL se inattivo | Il piano di controllo WebSocket non risponde |
| LLM connesso | CRITICAL se inattivo | Non è possibile raggiungere il provider LLM primario |
| Canali attivi | WARNING se 0 | Nessun adattatore di canale è connesso |
| Regole di policy caricate | WARNING se 0 | Nessuna regola di policy è caricata |
| Skill installate | WARNING se 0 | Nessuna skill è stata scoperta |

### Stato complessivo

- **HEALTHY** - tutti i controlli superati
- **WARNING** - alcuni controlli non critici sono segnalati (es. nessuna skill installata)
- **CRITICAL** - almeno un controllo critico è fallito (gateway o LLM irraggiungibile)

### Quando utilizzare patrol

- Dopo l'installazione, per verificare che tutto funzioni
- Dopo le modifiche alla configurazione, per confermare che il daemon si sia riavviato correttamente
- Quando il bot smette di rispondere, per restringere quale componente ha fallito
- Prima di segnalare un bug, per includere l'output di patrol

### Esempio di output

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Tool Healthcheck

Il tool healthcheck è un tool interno dell'agent che sonda i componenti del sistema dall'interno del gateway in esecuzione. È disponibile all'agent durante le conversazioni.

### Cosa verifica

**Provider:**
- Il provider predefinito esiste ed è raggiungibile
- Restituisce il nome del provider

**Storage:**
- Test di andata e ritorno: scrive una chiave, la rilegge, la elimina
- Verifica che il livello di storage sia funzionale

**Skill:**
- Conta le skill scoperte per sorgente (incluse, installate, spazio di lavoro)

**Configurazione:**
- Validazione di base della configurazione

### Livelli di stato

Ogni componente riporta uno dei seguenti:
- `healthy` - pienamente operativo
- `degraded` - parzialmente funzionante (alcune funzionalità potrebbero non funzionare)
- `error` - componente non funzionante

### Requisito di classificazione

Il tool healthcheck richiede una classificazione minima INTERNAL perché rivela dettagli interni del sistema (nomi dei provider, conteggio delle skill, stato dello storage). Una sessione PUBLIC non può utilizzarlo.

### Utilizzo dell'healthcheck

Chiedere all'agent:

> Esegui un healthcheck

Oppure se si utilizza il tool direttamente:

```
tool: healthcheck
```

La risposta è un report strutturato:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## Combinare la Diagnostica

Per una sessione diagnostica approfondita:

1. **Eseguire patrol** dalla CLI:
   ```bash
   triggerfish patrol
   ```

2. **Controllare i log** per errori recenti:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Chiedere all'agent** di eseguire un healthcheck (se l'agent è reattivo):
   > Esegui un healthcheck di sistema e dimmi se ci sono problemi

4. **Raccogliere un bundle di log** se è necessario segnalare un issue:
   ```bash
   triggerfish logs bundle
   ```

---

## Diagnostica all'Avvio

Se il daemon non si avvia affatto, controllare questi elementi in ordine:

1. **La configurazione esiste ed è valida:**
   ```bash
   triggerfish config validate
   ```

2. **I secret possono essere risolti:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Nessun conflitto di porte:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Nessun'altra istanza in esecuzione:**
   ```bash
   triggerfish status
   ```

5. **Controllare il journal di sistema (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Controllare launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Controllare il Log degli Eventi Windows (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
