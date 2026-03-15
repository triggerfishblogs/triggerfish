# Samle inn logger

Når du rapporterer en feil, gir en loggpakke vedlikeholderne informasjonen de
trenger for å diagnostisere problemet uten å måtte gå frem og tilbake og be om
detaljer.

## Rask pakke

Den raskeste måten å opprette en loggpakke på:

```bash
triggerfish logs bundle
```

Dette oppretter et arkiv som inneholder alle loggfiler fra `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Hvis arkivering mislykkes av en grunn, faller den tilbake til å kopiere rå
loggfiler til en katalog du kan zippe manuelt.

## Hva pakken inneholder

- `triggerfish.log` (gjeldende loggfil)
- `triggerfish.1.log` til `triggerfish.10.log` (roterte sikkerhetskopier, hvis de finnes)

Pakken inneholder **ikke**:
- `triggerfish.yaml`-konfigurasjonsfilen din
- Hemmelige nøkler eller legitimasjon
- SQLite-databasen
- SPINE.md eller TRIGGER.md

## Manuell logginnsamling

Hvis pakkekommandoen ikke er tilgjengelig (eldre versjon, Docker, osv.):

```bash
# Finn loggfiler
ls ~/.triggerfish/logs/

# Opprett et arkiv manuelt
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Øke loggnivådetaljer

Som standard er logger på INFO-nivå. For å fange mer detalj for en feilrapport:

1. Sett loggnivå til verbose eller debug:
   ```bash
   triggerfish config set logging.level verbose
   # eller for maksimal detalj:
   triggerfish config set logging.level debug
   ```

2. Reproduser problemet

3. Samle inn pakken:
   ```bash
   triggerfish logs bundle
   ```

4. Sett nivået tilbake til normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Loggnivådetalj

| Nivå      | Hva det fanger                                                                              |
|-----------|----------------------------------------------------------------------------------------------|
| `quiet`   | Bare feil                                                                                    |
| `normal`  | Feil, advarsler, info (standard)                                                             |
| `verbose` | Legger til feilsøkingsmeldinger (verktøykall, leverandørinteraksjoner, klassifiseringsbeslutninger) |
| `debug`   | Alt inkludert trace-nivå meldinger (rå protokolldata, interne tilstandsendringer)            |

**Advarsel:** `debug`-nivå genererer mye utdata. Bruk det bare når du aktivt
reproduserer et problem, og bytt deretter tilbake.

## Filtrere logger i sanntid

Mens du reproduserer et problem, kan du filtrere den live loggstrømmen:

```bash
# Vis bare feil
triggerfish logs --level ERROR

# Vis advarsler og over
triggerfish logs --level WARN
```

På Linux/macOS bruker dette native `tail -f` med filtrering. På Windows bruker
det PowerShell `Get-Content -Wait -Tail`.

## Loggformat

Hver logglinje følger dette formatet:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Tidsstempel:** ISO 8601 i UTC
- **Nivå:** ERROR, WARN, INFO, DEBUG eller TRACE
- **Komponent:** Hvilken modul som genererte loggen (f.eks. `gateway`, `anthropic`, `telegram`, `policy`)
- **Melding:** Loggmeldingen med strukturert kontekst

## Hva du bør inkludere i en feilrapport

Sammen med loggpakken, inkluder:

1. **Reproduksjonstrinn.** Hva gjorde du da problemet skjedde?
2. **Forventet atferd.** Hva burde ha skjedd?
3. **Faktisk atferd.** Hva skjedde i stedet?
4. **Plattforminformasjon.** OS, arkitektur, Triggerfish-versjon (`triggerfish version`)
5. **Konfigurasjonsutdrag.** Den relevante seksjonen av `triggerfish.yaml` (rediger ut hemmeligheter)

Se [Rapportere saker](/nb-NO/support/guides/filing-issues) for den fullstendige sjekklisten.

## Sensitiv informasjon i logger

Triggerfish sanitiserer eksterne data i logger ved å pakke verdier inn i `<<`-
og `>>`-avgrensere. API-nøkler og tokens bør aldri vises i loggutdata. Men før
du sender inn en loggpakke:

1. Skann etter noe du ikke vil dele (e-postadresser, filstier, meldingsinnhold)
2. Redigér om nødvendig
3. Merk i saken at pakken er redigert

Loggfiler inneholder meldingsinnhold fra samtalene dine. Hvis samtalene dine
inneholder sensitiv informasjon, rediger de delene før deling.
