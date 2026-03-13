# Diagnostiek uitvoeren

Triggerfish heeft twee ingebouwde diagnostische hulpmiddelen: `patrol` (externe gezondheidscontrole) en de `healthcheck`-tool (interne systeemprobe).

## Patrol

Patrol is een CLI-opdracht die controleert of de kernsystemen operationeel zijn:

```bash
triggerfish patrol
```

### Wat het controleert

| Controle | Status | Betekenis |
|----------|--------|-----------|
| Gateway actief | CRITICAL als uitgevallen | Het WebSocket-besturingsvlak reageert niet |
| LLM verbonden | CRITICAL als uitgevallen | Kan de primaire LLM-provider niet bereiken |
| Kanalen actief | WARNING als 0 | Er zijn geen kanaladapters verbonden |
| Beleidsregels geladen | WARNING als 0 | Er zijn geen beleidsregels geladen |
| Skills geïnstalleerd | WARNING als 0 | Er zijn geen skills ontdekt |

### Algehele status

- **HEALTHY** — alle controles geslaagd
- **WARNING** — sommige niet-kritieke controles zijn gemarkeerd (bijv. geen skills geïnstalleerd)
- **CRITICAL** — ten minste één kritieke controle mislukt (gateway of LLM onbereikbaar)

### Wanneer patrol gebruiken

- Na installatie, om te controleren of alles werkt
- Na configuratiewijzigingen, om te bevestigen dat de daemon schoon is herstart
- Wanneer de bot niet meer reageert, om te bepalen welk component is mislukt
- Vóór het indienen van een bugrapport, om de patrol-uitvoer toe te voegen

### Voorbeelduitvoer

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

## Healthcheck-tool

De healthcheck-tool is een interne agenttool die systeemcomponenten probeert vanuit de lopende gateway. De tool is beschikbaar voor de agent tijdens gesprekken.

### Wat het controleert

**Providers:**
- Standaardprovider bestaat en is bereikbaar
- Geeft de providernaam terug

**Opslag:**
- Round-trip test: schrijft een sleutel, leest die terug, verwijdert die
- Verifieert dat de opslaglaag functioneel is

**Skills:**
- Telt ontdekte skills per bron (gebundeld, geïnstalleerd, werkruimte)

**Configuratie:**
- Basisconfiguratievalidatie

### Statusniveaus

Elk component rapporteert een van de volgende:
- `healthy` — volledig operationeel
- `degraded` — gedeeltelijk werkend (sommige functies werken mogelijk niet)
- `error` — component is defect

### Classificatievereiste

De healthcheck-tool vereist minimaal INTERNAL-classificatie omdat die systeeminternals onthult (providernamen, skilltellingen, opslagstatus). Een PUBLIC-sessie kan deze tool niet gebruiken.

### Healthcheck gebruiken

Vraag uw agent:

> Voer een healthcheck uit

Of als u de tool rechtstreeks gebruikt:

```
tool: healthcheck
```

Het antwoord is een gestructureerd rapport:

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

## Diagnostiek combineren

Voor een grondige diagnostische sessie:

1. **Voer patrol uit** vanuit de CLI:
   ```bash
   triggerfish patrol
   ```

2. **Controleer de logboeken** op recente fouten:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Vraag de agent** een healthcheck uit te voeren (als de agent reageert):
   > Voer een systeem-healthcheck uit en vertel mij over eventuele problemen

4. **Verzamel een logboekbundel** als u een issue wilt indienen:
   ```bash
   triggerfish logs bundle
   ```

---

## Opstartdiagnostiek

Als de daemon helemaal niet start, controleer dan de volgende punten in volgorde:

1. **Configuratie bestaat en is geldig:**
   ```bash
   triggerfish config validate
   ```

2. **Geheimen kunnen worden opgelost:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Geen poortconflicten:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Geen andere instantie actief:**
   ```bash
   triggerfish status
   ```

5. **Controleer het systeemjournaal (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Controleer launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Controleer het Windows-gebeurtenislogboek (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
