# Köra diagnostik

Triggerfish har två inbyggda diagnostikverktyg: `patrol` (extern hälsokontroll) och verktyget `healthcheck` (intern systemsond).

## Patrol

Patrol är ett CLI-kommando som kontrollerar om kärnsystemen är operativa:

```bash
triggerfish patrol
```

### Vad det kontrollerar

| Kontroll | Status | Betydelse |
| -------- | ------ | --------- |
| Gateway körs | CRITICAL om ned | WebSocket-kontrollplanet svarar inte |
| LLM ansluten | CRITICAL om ned | Kan inte nå den primära LLM-leverantören |
| Kanaler aktiva | WARNING om 0 | Inga kanaladaptrar är anslutna |
| Policyregler laddade | WARNING om 0 | Inga policyregler är laddade |
| Kunskaper installerade | WARNING om 0 | Inga kunskaper är identifierade |

### Övergripande status

- **HEALTHY** — alla kontroller passerar
- **WARNING** — vissa icke-kritiska kontroller är flaggade (t.ex. inga kunskaper installerade)
- **CRITICAL** — minst en kritisk kontroll misslyckades (gateway eller LLM otillgänglig)

### När man ska använda patrol

- Efter installation, för att verifiera att allt fungerar
- Efter konfigurationsändringar, för att bekräfta att daemonen startade om utan problem
- När boten slutar svara, för att avgränsa vilken komponent som misslyckades
- Innan du rapporterar en bugg, för att inkludera patrol-utdata

### Exempelutdata

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

## Healthcheck-verktyget

Healthcheck-verktyget är ett internt agentverktyg som undersöker systemkomponenter inifrån den körande gatewayen. Det är tillgängligt för agenten under konversationer.

### Vad det kontrollerar

**Leverantörer:**
- Standardleverantören finns och är nåbar
- Returnerar leverantörsnamnet

**Lagring:**
- Tur-retur-test: skriver en nyckel, läser tillbaka den, tar bort den
- Verifierar att lagringsnivån är funktionell

**Kunskaper:**
- Räknar identifierade kunskaper per källa (inbyggd, installerad, arbetsyta)

**Konfiguration:**
- Grundläggande konfigurationsvalidering

### Statusnivåer

Varje komponent rapporterar en av:
- `healthy` — fullt operativ
- `degraded` — fungerar delvis (vissa funktioner kanske inte fungerar)
- `error` — komponenten är trasig

### Klassificeringskrav

Healthcheck-verktyget kräver minst INTERNAL-klassificering eftersom det avslöjar systeminternals (leverantörsnamn, kunskapsantal, lagringsstatus). En PUBLIC-session kan inte använda det.

### Använda healthcheck

Fråga din agent:

> Kör en healthcheck

Eller om du använder verktyget direkt:

```
tool: healthcheck
```

Svaret är en strukturerad rapport:

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

## Kombinera diagnostik

För en grundlig diagnostiksession:

1. **Kör patrol** från CLI:
   ```bash
   triggerfish patrol
   ```

2. **Kontrollera loggarna** för senaste fel:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Be agenten** köra en healthcheck (om agenten svarar):
   > Kör en systemhälsokontroll och berätta om eventuella problem

4. **Samla ett loggpaket** om du behöver rapportera ett ärende:
   ```bash
   triggerfish logs bundle
   ```

---

## Uppstartsdiagnostik

Om daemonen inte startar alls, kontrollera dessa i ordning:

1. **Konfigurationen finns och är giltig:**
   ```bash
   triggerfish config validate
   ```

2. **Hemligheter kan lösas upp:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Inga portkonflikter:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Ingen annan instans körs:**
   ```bash
   triggerfish status
   ```

5. **Kontrollera systemjournalen (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Kontrollera launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Kontrollera Windows-händelseloggen (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
