# Kjøre diagnostikk

Triggerfish har to innebygde diagnostiske verktøy: `patrol` (ekstern helsesjekk)
og `healthcheck`-verktøyet (intern systemsonde).

## Patrol

Patrol er en CLI-kommando som sjekker om kjerne systemene er operative:

```bash
triggerfish patrol
```

### Hva det sjekker

| Sjekk                 | Status                | Betydning                                        |
|-----------------------|-----------------------|--------------------------------------------------|
| Gateway kjøres        | CRITICAL hvis nede    | WebSocket-kontrollplanet svarer ikke             |
| LLM tilkoblet         | CRITICAL hvis nede    | Kan ikke nå primær LLM-leverandør                |
| Kanaler aktive        | WARNING hvis 0        | Ingen kanaladaptere er tilkoblet                 |
| Policy-regler lastet  | WARNING hvis 0        | Ingen policy-regler er lastet                    |
| Ferdigheter installert| WARNING hvis 0        | Ingen ferdigheter er oppdaget                    |

### Samlet status

- **HEALTHY** - alle sjekker passerer
- **WARNING** - noen ikke-kritiske sjekker er flagget (f.eks. ingen ferdigheter installert)
- **CRITICAL** - minst én kritisk sjekk feilet (gateway eller LLM ikke nåbar)

### Når brukes patrol

- Etter installasjon, for å verifisere at alt fungerer
- Etter konfigurasjonsendringer, for å bekrefte at daemon restartet rent
- Når boten slutter å svare, for å begrense hvilken komponent som feilet
- Før rapportering av feil, for å inkludere patrol-utdata

### Eksempelutdata

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

## Healthcheck-verktøy

Healthcheck-verktøyet er et internt agentverktøy som sonderer systemkomponenter
fra innsiden av den kjørende gateway-en. Det er tilgjengelig for agenten under
samtaler.

### Hva det sjekker

**Leverandører:**
- Standardleverandør eksisterer og er nåbar
- Returnerer leverandørnavnet

**Lagring:**
- Tur-retur-test: skriver en nøkkel, leser den tilbake, sletter den
- Verifiserer at lagringslaget er funksjonelt

**Ferdigheter:**
- Teller oppdagede ferdigheter etter kilde (medfølgende, installerte, arbeidsområde)

**Konfig:**
- Grunnleggende konfigurasjon validering

### Statusnivåer

Hvert komponent rapporterer én av:
- `healthy` - fullt operativ
- `degraded` - delvis fungerende (noen funksjoner fungerer kanskje ikke)
- `error` - komponenten er ødelagt

### Klassifiseringskrav

Healthcheck-verktøyet krever minimum INTERNAL-klassifisering fordi det avslører
systeminterne (leverandørnavn, ferdighetstall, lagringsstatus). En PUBLIC-sesjon
kan ikke bruke det.

### Bruke healthcheck

Spør agenten din:

> Run a healthcheck

Eller hvis du bruker verktøyet direkte:

```
tool: healthcheck
```

Svaret er en strukturert rapport:

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

## Kombinere diagnostikk

For en grundig diagnostikksesjon:

1. **Kjør patrol** fra CLI:
   ```bash
   triggerfish patrol
   ```

2. **Sjekk loggene** for nylige feil:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Spør agenten** om å kjøre en helsesjekk (hvis agenten er responsiv):
   > Run a system healthcheck and tell me about any issues

4. **Samle inn en loggpakke** hvis du trenger å rapportere en sak:
   ```bash
   triggerfish logs bundle
   ```

---

## Oppstartsdiagnostikk

Hvis daemon ikke starter i det hele tatt, sjekk disse i rekkefølge:

1. **Konfig eksisterer og er gyldig:**
   ```bash
   triggerfish config validate
   ```

2. **Hemmeligheter kan løses:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Ingen portkonflikter:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Ingen annen instans kjøres:**
   ```bash
   triggerfish status
   ```

5. **Sjekk systemjournalen (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Sjekk launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Sjekk Windows Event Log (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
