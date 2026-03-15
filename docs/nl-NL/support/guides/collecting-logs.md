# Logboeken verzamelen

Bij het indienen van een bugrapport geeft een logboekbundel de beheerders de informatie die zij nodig hebben om het probleem te diagnosticeren, zonder dat zij heen en weer hoeven te vragen om details.

## Snelle bundel

De snelste manier om een logboekbundel te maken:

```bash
triggerfish logs bundle
```

Dit maakt een archief aan van alle logboekbestanden in `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Als archiveren om welke reden dan ook mislukt, wordt teruggevallen op het kopiëren van onbewerkte logboekbestanden naar een map die u handmatig kunt inpakken.

## Wat de bundel bevat

- `triggerfish.log` (huidig logboekbestand)
- `triggerfish.1.log` tot en met `triggerfish.10.log` (geroteerde back-ups, als ze bestaan)

De bundel bevat **niet**:
- Uw `triggerfish.yaml`-configuratiebestand
- Geheime sleutels of inloggegevens
- De SQLite-database
- SPINE.md of TRIGGER.md

## Handmatige logboekverzameling

Als de bundelopdracht niet beschikbaar is (oudere versie, Docker, enz.):

```bash
# Logboekbestanden zoeken
ls ~/.triggerfish/logs/

# Handmatig een archief maken
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Logboekdetail verhogen

Logboeken zijn standaard op INFO-niveau. Om meer detail te verzamelen voor een bugrapport:

1. Stel het logniveau in op verbose of debug:
   ```bash
   triggerfish config set logging.level verbose
   # of voor maximale detailering:
   triggerfish config set logging.level debug
   ```

2. Reproduceer het probleem

3. Verzamel de bundel:
   ```bash
   triggerfish logs bundle
   ```

4. Zet het niveau terug naar normaal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Logboekniveaus

| Niveau | Wat het vastlegt |
|--------|-----------------|
| `quiet` | Alleen fouten |
| `normal` | Fouten, waarschuwingen, info (standaard) |
| `verbose` | Voegt foutopsporingsberichten toe (toolaanroepen, providerinteracties, classificatiebeslissingen) |
| `debug` | Alles inclusief trace-niveau berichten (onbewerkte protocolgegevens, interne statuswijzigingen) |

**Waarschuwing:** Het `debug`-niveau genereert veel uitvoer. Gebruik het alleen actief bij het reproduceren van een probleem en schakel daarna terug.

## Logboeken realtime filteren

Tijdens het reproduceren van een probleem kunt u de live logboekstroom filteren:

```bash
# Alleen fouten tonen
triggerfish logs --level ERROR

# Waarschuwingen en hoger tonen
triggerfish logs --level WARN
```

Op Linux/macOS gebruikt dit native `tail -f` met filtering. Op Windows wordt PowerShell `Get-Content -Wait -Tail` gebruikt.

## Logboekindeling

Elke logboekrege! volgt dit formaat:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Tijdstempel:** ISO 8601 in UTC
- **Niveau:** ERROR, WARN, INFO, DEBUG, of TRACE
- **Component:** Welke module de logboekinvoer heeft gegenereerd (bijv. `gateway`, `anthropic`, `telegram`, `policy`)
- **Bericht:** Het logboekbericht met gestructureerde context

## Wat u in een bugrapport moet opnemen

Voeg naast de logboekbundel toe:

1. **Reproductiestappen.** Wat deed u toen het probleem optrad?
2. **Verwacht gedrag.** Wat had er moeten gebeuren?
3. **Werkelijk gedrag.** Wat gebeurde er in plaats daarvan?
4. **Platforminformatie.** Besturingssysteem, architectuur, Triggerfish-versie (`triggerfish version`)
5. **Configuratie-excerpt.** Het relevante gedeelte van uw `triggerfish.yaml` (verwijder geheimen)

Zie [Issues indienen](/nl-NL/support/guides/filing-issues) voor de volledige controlelijst.

## Gevoelige informatie in logboeken

Triggerfish desinfecteert externe gegevens in logboeken door waarden te omhullen met `<<`- en `>>`-begrenzers. API-sleutels en tokens mogen nooit in logboekuitvoer verschijnen. Controleer echter vóór het indienen van een logboekbundel:

1. Scan op alles wat u niet wilt delen (e-mailadressen, bestandspaden, berichtinhoud)
2. Verwijder indien nodig
3. Noteer in uw issue dat de bundel is geredigeerd

Logboekbestanden bevatten berichtinhoud uit uw gesprekken. Als uw gesprekken gevoelige informatie bevatten, redigeer die gedeelten dan voordat u ze deelt.
