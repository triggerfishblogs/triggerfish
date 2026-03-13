# Felsökning: Daemon

## Daemonen startar inte

### "Triggerfish is already running"

Det här meddelandet visas när loggfilen är låst av en annan process. På Windows identifieras detta via ett `EBUSY` / "os error 32" när filskrivaren försöker öppna loggfilen.

**Åtgärd:**

```bash
triggerfish status    # Kontrollera om det faktiskt körs en instans
triggerfish stop      # Stoppa den befintliga instansen
triggerfish start     # Starta om
```

Om `triggerfish status` rapporterar att daemonen inte körs men du fortfarande får det här felet, håller en annan process loggfilen öppen. Kontrollera efter spökprocesser:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Avsluta eventuella inaktuella processer och försök sedan igen.

### Port 18789 eller 18790 redan i bruk

Gatewayen lyssnar på port 18789 (WebSocket) och Tidepool på 18790 (A2UI). Om ett annat program upptar dessa portar misslyckas daemonen med att starta.

**Ta reda på vad som använder porten:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Ingen LLM-leverantör konfigurerad

Om `triggerfish.yaml` saknar avsnittet `models` eller om den primära leverantören inte har någon API-nyckel loggar gatewayen:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Åtgärd:** Kör installationsguiden eller konfigurera manuellt:

```bash
triggerfish dive                    # Interaktiv inställning
# eller
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Konfigurationsfilen hittades inte

Daemonen avslutas om `triggerfish.yaml` inte finns på den förväntade sökvägen. Felmeddelandet skiljer sig beroende på miljö:

- **Inbyggd installation:** Föreslår att köra `triggerfish dive`
- **Docker:** Föreslår att montera konfigurationsfilen med `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Kontrollera sökvägen:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Inbyggd
docker exec triggerfish ls /data/       # Docker
```

### Hemlighetslösning misslyckades

Om din konfiguration refererar till en hemlighet (`secret:provider:anthropic:apiKey`) som inte finns i nyckelringen avslutas daemonen med ett fel som namnger den saknade hemligheten.

**Åtgärd:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <din-nyckel>
```

---

## Tjänsthantering

### systemd: daemonen stoppar vid utloggning

Som standard stoppar systemd-användartjänster när användaren loggar ut. Triggerfish aktiverar `loginctl enable-linger` vid installation för att förhindra detta. Om linger misslyckades att aktiveras:

```bash
# Kontrollera linger-status
loginctl show-user $USER | grep Linger

# Aktivera det (kan kräva sudo)
sudo loginctl enable-linger $USER
```

Utan linger körs daemonen bara medan du är inloggad.

### systemd: tjänsten startar inte

Kontrollera tjänstestatus och journalen:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Vanliga orsaker:
- **Binären har flyttats eller tagits bort.** Enhetsfilen har en hårdkodad sökväg till binären. Installera om daemonen: `triggerfish dive --install-daemon`
- **PATH-problem.** systemd-enheten fångar din PATH vid installationstillfället. Om du har installerat nya verktyg (som MCP-servrar) efter daemoninstallation, installera om daemonen för att uppdatera PATH.
- **DENO_DIR ej inställd.** systemd-enheten ställer in `DENO_DIR=~/.cache/deno`. Om den katalogen inte är skrivbar misslyckas SQLite FFI-plugins att laddas.

### launchd: daemonen startar inte vid inloggning

Kontrollera plist-status:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Om plist:en inte är laddad:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Vanliga orsaker:
- **Plist borttagen eller skadad.** Installera om: `triggerfish dive --install-daemon`
- **Binären har flyttats.** Plist:en har en hårdkodad sökväg. Installera om efter att ha flyttat binären.
- **PATH vid installationstillfället.** Precis som systemd fångar launchd PATH när plist:en skapas. Installera om om du har lagt till nya verktyg i PATH.

### Windows: tjänsten startar inte

Kontrollera tjänstestatus:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Vanliga orsaker:
- **Tjänsten är inte installerad.** Installera om: kör installationsprogrammet som administratör.
- **Binärsökvägen ändrades.** Tjänsteomskriptet har en hårdkodad sökväg. Installera om.
- **.NET-kompilering misslyckades under installation.** C#-tjänsteomskriptet kräver .NET Framework 4.x `csc.exe`.

### Uppgradering bryter daemonen

Efter att ha kört `triggerfish update` startar daemonen om automatiskt. Om det inte sker:

1. Den gamla binären kan fortfarande köra. Stoppa den manuellt: `triggerfish stop`
2. På Windows döps den gamla binären om till `.old`. Om namnbytet misslyckas uppstår ett fel vid uppdateringen. Stoppa tjänsten först, uppdatera sedan.

---

## Loggfilsproblem

### Loggfilen är tom

Daemonen skriver till `~/.triggerfish/logs/triggerfish.log`. Om filen finns men är tom:

- Daemonen kan ha precis startat. Vänta ett ögonblick.
- Loggnivån är inställd på `quiet`, vilket bara loggar ERROR-nivåmeddelanden. Ställ in den på `normal` eller `verbose`:

```bash
triggerfish config set logging.level normal
```

### Loggarna är för brusiga

Ställ in loggnivån på `quiet` för att bara se fel:

```bash
triggerfish config set logging.level quiet
```

Nivåmappning:

| Konfigurationsvärde | Minsta loggade nivå |
|--------------------|---------------------|
| `quiet` | Bara ERROR |
| `normal` | INFO och uppåt |
| `verbose` | DEBUG och uppåt |
| `debug` | TRACE och uppåt (allt) |

### Loggrotation

Loggar roteras automatiskt när den aktuella filen överstiger 1 MB. Upp till 10 roterade filer behålls:

```
triggerfish.log        # Aktuell
triggerfish.1.log      # Senaste säkerhetskopia
triggerfish.2.log      # Näst senaste
...
triggerfish.10.log     # Äldsta (tas bort när en ny rotation sker)
```

Det finns ingen tidsbaserad rotation, bara storleksbaserad.
