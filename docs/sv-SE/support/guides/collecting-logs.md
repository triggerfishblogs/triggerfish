# Samla loggar

När du rapporterar en bugg ger ett loggpaket underhållare den information de behöver för att diagnosticera problemet utan att behöva gå fram och tillbaka med frågor.

## Snabbpaket

Det snabbaste sättet att skapa ett loggpaket:

```bash
triggerfish logs bundle
```

Det skapar ett arkiv med alla loggfiler från `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Om arkivering misslyckas av någon anledning faller det tillbaka till att kopiera råa loggfiler till en katalog du kan zippa manuellt.

## Vad paketet innehåller

- `triggerfish.log` (aktuell loggfil)
- `triggerfish.1.log` till `triggerfish.10.log` (roterade säkerhetskopior, om de finns)

Paketet innehåller **inte**:
- Din `triggerfish.yaml`-konfigurationsfil
- Hemliga nycklar eller uppgifter
- SQLite-databasen
- SPINE.md eller TRIGGER.md

## Manuell logginsamling

Om paketkommandot inte är tillgängligt (äldre version, Docker osv.):

```bash
# Hitta loggfiler
ls ~/.triggerfish/logs/

# Skapa ett arkiv manuellt
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Öka loggdetaljnivån

Som standard är loggar på INFO-nivå. För att fånga mer detaljer för en buggrapport:

1. Ange loggnivå till verbose eller debug:
   ```bash
   triggerfish config set logging.level verbose
   # eller för maximal detalj:
   triggerfish config set logging.level debug
   ```

2. Reproducera problemet

3. Samla paketet:
   ```bash
   triggerfish logs bundle
   ```

4. Återställ nivån till normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Loggnivådetalj

| Nivå      | Vad den fångar |
| --------- | --------------- |
| `quiet`   | Enbart fel |
| `normal`  | Fel, varningar, info (standard) |
| `verbose` | Lägger till felsökningsmeddelanden (verktygsanrop, leverantörsinteraktioner, klassificeringsbeslut) |
| `debug`   | Allt inklusive spårningsnivåmeddelanden (råprotokolldata, interna tillståndsändringar) |

**Varning:** `debug`-nivå genererar mycket utdata. Använd den bara när du aktivt reproducerar ett problem och byt sedan tillbaka.

## Filtrera loggar i realtid

Medan du reproducerar ett problem kan du filtrera den levande loggströmmen:

```bash
# Visa enbart fel
triggerfish logs --level ERROR

# Visa varningar och uppåt
triggerfish logs --level WARN
```

På Linux/macOS använder det inbyggd `tail -f` med filtrering. På Windows använder det PowerShell `Get-Content -Wait -Tail`.

## Loggformat

Varje loggrad följer detta format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Tidsstämpel:** ISO 8601 i UTC
- **Nivå:** ERROR, WARN, INFO, DEBUG eller TRACE
- **Komponent:** Vilken modul som genererade loggen (t.ex. `gateway`, `anthropic`, `telegram`, `policy`)
- **Meddelande:** Loggmeddelandet med strukturerad kontext

## Vad man ska inkludera i en buggrapport

Tillsammans med loggpaketet, inkludera:

1. **Reproduktionssteg.** Vad höll du på med när problemet inträffade?
2. **Förväntat beteende.** Vad borde ha hänt?
3. **Faktiskt beteende.** Vad hände istället?
4. **Plattformsinformation.** OS, arkitektur, Triggerfish-version (`triggerfish version`)
5. **Konfigurationsutdrag.** Det relevanta avsnittet av din `triggerfish.yaml` (redigera hemligheter)

Se [Rapportera ärenden](/sv-SE/support/guides/filing-issues) för den fullständiga checklistan.

## Känslig information i loggar

Triggerfish sanerar externa data i loggar genom att omge värden med `<<`- och `>>`-avgränsare. API-nycklar och tokens bör aldrig visas i loggutdata. Men innan du skickar ett loggpaket:

1. Skanna efter allt du inte vill dela (e-postadresser, filsökvägar, meddelandeinnehåll)
2. Redigera vid behov
3. Notera i ditt ärende att paketet har redigerats

Loggfiler innehåller meddelandeinnehåll från dina konversationer. Om dina konversationer innehåller känslig information, redigera dessa delar innan du delar.
