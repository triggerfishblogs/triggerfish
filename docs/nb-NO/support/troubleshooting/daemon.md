# Feilsøking: Daemon

## Daemonen vil ikke starte

### «Triggerfish is already running»

Denne meldingen vises når loggfilen er låst av en annen prosess. På Windows
oppdages dette via en `EBUSY` / «os error 32» når filskriveren prøver å åpne
loggfilen.

**Løsning:**

```bash
triggerfish status    # Sjekk om det faktisk kjører en instans
triggerfish stop      # Stopp den eksisterende instansen
triggerfish start     # Start på nytt
```

Hvis `triggerfish status` rapporterer at daemonen ikke kjører, men du fortsatt får
denne feilen, holder en annen prosess loggfilen åpen. Sjekk etter zombie-prosesser:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Avslutt eventuelle utdaterte prosesser, og prøv igjen.

### Port 18789 eller 18790 allerede i bruk

Gatewayen lytter på port 18789 (WebSocket) og Tidepool på 18790 (A2UI). Hvis en
annen applikasjon opptar disse portene, vil daemonen feile å starte.

**Finn ut hva som bruker porten:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Ingen LLM-leverandør konfigurert

Hvis `triggerfish.yaml` mangler `models`-seksjonen eller den primære leverandøren
ikke har noen API-nøkkel, logger gatewayen:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Løsning:** Kjør oppsettveiviseren eller konfigurer manuelt:

```bash
triggerfish dive                    # Interaktivt oppsett
# eller
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Konfigurasjonsfil ikke funnet

Daemonen avsluttes hvis `triggerfish.yaml` ikke eksisterer på den forventede banen.
Feilmeldingen varierer etter miljø:

- **Native installasjon:** Foreslår å kjøre `triggerfish dive`
- **Docker:** Foreslår å montere konfigurasjonsfilen med `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Sjekk banen:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Hemmelighetløsing mislyktes

Hvis konfigurasjonen din refererer til en hemmelighet (`secret:provider:anthropic:apiKey`)
som ikke eksisterer i nøkkelringen, avsluttes daemonen med en feil som navngir
den manglende hemmeligheten.

**Løsning:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <din-nøkkel>
```

---

## Tjenestebehandling

### systemd: daemonen stopper etter utlogging

Som standard stopper systemd-brukertjenester når brukeren logger ut. Triggerfish
aktiverer `loginctl enable-linger` under installasjon for å forhindre dette. Hvis
linger mislyktes å aktiveres:

```bash
# Sjekk linger-status
loginctl show-user $USER | grep Linger

# Aktiver det (kan kreve sudo)
sudo loginctl enable-linger $USER
```

Uten linger kjører daemonen bare mens du er innlogget.

### systemd: tjenesten feiler å starte

Sjekk tjenestestatus og journal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Vanlige årsaker:
- **Binærfilen er flyttet eller slettet.** Enhetsfilen har en hardkodet bane til
  binærfilen. Reinstaller daemonen: `triggerfish dive --install-daemon`
- **PATH-problemer.** Systemd-enheten tar opp din PATH ved installasjonstidspunktet.
  Hvis du installerte nye verktøy (som MCP-servere) etter daemoninstallasjon,
  reinstaller daemonen for å oppdatere PATH.
- **DENO_DIR ikke satt.** Systemd-enheten setter `DENO_DIR=~/.cache/deno`. Hvis
  denne mappen ikke er skrivbar, vil SQLite FFI-plugins feile å laste.

### launchd: daemonen starter ikke ved innlogging

Sjekk plist-status:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Hvis plist ikke er lastet:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Vanlige årsaker:
- **Plist fjernet eller korruptert.** Reinstaller: `triggerfish dive --install-daemon`
- **Binærfilen er flyttet.** Plist har en hardkodet bane. Reinstaller etter å ha
  flyttet binærfilen.
- **PATH på installasjonstidspunktet.** Som systemd, tar launchd opp PATH når
  plist opprettes. Reinstaller hvis du la til nye verktøy i PATH.

### Windows: tjenesten starter ikke

Sjekk tjenestestatus:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Vanlige årsaker:
- **Tjenesten er ikke installert.** Reinstaller: kjør installasjonsprogrammet som
  Administrator.
- **Binærfilbanen er endret.** Tjenesteinpakningsskriptet har en hardkodet bane.
  Reinstaller.
- **.NET-kompilering mislyktes under installasjon.** C#-tjenesteinpakningsskriptet
  krever .NET Framework 4.x `csc.exe`.

### Oppgradering ødelegger daemonen

Etter å ha kjørt `triggerfish update`, restarter daemonen automatisk. Hvis den
ikke gjør det:

1. Den gamle binærfilen kan fortsatt kjøre. Stopp den manuelt: `triggerfish stop`
2. På Windows gis den gamle binærfilen nytt navn til `.old`. Hvis omdøpingen
   mislykkes, vil oppdateringen feile. Stopp tjenesten først, deretter oppdater.

---

## Loggfilproblemer

### Loggfilen er tom

Daemonen skriver til `~/.triggerfish/logs/triggerfish.log`. Hvis filen eksisterer,
men er tom:

- Daemonen kan nettopp ha startet. Vent et øyeblikk.
- Loggnivået er satt til `quiet`, som bare logger ERROR-meldinger. Sett det til
  `normal` eller `verbose`:

```bash
triggerfish config set logging.level normal
```

### Loggene er for støyende

Sett loggnivået til `quiet` for å se kun feil:

```bash
triggerfish config set logging.level quiet
```

Nivåtilordning:

| Konfigurasjonsverdi | Minimum nivå logget |
|-------------|---------------------|
| `quiet` | KUN ERROR |
| `normal` | INFO og over |
| `verbose` | DEBUG og over |
| `debug` | TRACE og over (alt) |

### Loggrotasjon

Logger roteres automatisk når den gjeldende filen overskrider 1 MB. Opptil 10
roterte filer beholdes:

```
triggerfish.log        # Gjeldende
triggerfish.1.log      # Nyeste sikkerhetskopi
triggerfish.2.log      # Nest nyeste
...
triggerfish.10.log     # Eldste (slettes ved ny rotasjon)
```

Det er ingen tidsbasert rotasjon, kun størrelsesbasert.
