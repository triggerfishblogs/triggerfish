# Probleemoplossing: Daemon

## Daemon start niet

### "Triggerfish is already running"

Dit bericht verschijnt wanneer het logboekbestand is vergrendeld door een ander proces. Op Windows wordt dit gedetecteerd via een `EBUSY` / "os error 32" wanneer de bestandsschrijver het logboekbestand probeert te openen.

**Oplossing:**

```bash
triggerfish status    # Controleer of er werkelijk een actieve instantie is
triggerfish stop      # Stop de bestaande instantie
triggerfish start     # Opnieuw starten
```

Als `triggerfish status` meldt dat de daemon niet actief is maar u toch deze fout krijgt, houdt een ander proces het logboekbestand open. Controleer op zombie-processen:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Beëindig eventuele verouderde processen en probeer dan opnieuw.

### Poort 18789 of 18790 al in gebruik

De gateway luistert op poort 18789 (WebSocket) en Tidepool op 18790 (A2UI). Als een andere applicatie deze poorten bezet, zal de daemon niet starten.

**Zoek wat de poort gebruikt:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Geen LLM-provider geconfigureerd

Als `triggerfish.yaml` de sectie `models` mist of de primaire provider geen API-sleutel heeft, logt de gateway:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Oplossing:** Voer de installatiewizard uit of configureer handmatig:

```bash
triggerfish dive                    # Interactieve installatie
# of
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Configuratiebestand niet gevonden

De daemon verlaat als `triggerfish.yaml` niet bestaat op het verwachte pad. De foutmelding verschilt per omgeving:

- **Native installatie:** Suggereert `triggerfish dive` uit te voeren
- **Docker:** Suggereert het configuratiebestand te koppelen met `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Controleer het pad:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Geheimoplossing mislukt

Als uw configuratie verwijst naar een geheim (`secret:provider:anthropic:apiKey`) dat niet bestaat in de sleutelhanger, verlaat de daemon met een fout die het ontbrekende geheim noemt.

**Oplossing:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <uw-sleutel>
```

---

## Servicebeheer

### systemd: daemon stopt na uitloggen

Standaard stoppen systemd-gebruikersservices wanneer de gebruiker uitlogt. Triggerfish schakelt `loginctl enable-linger` in tijdens de installatie om dit te voorkomen. Als linger niet kon worden ingeschakeld:

```bash
# Linger-status controleren
loginctl show-user $USER | grep Linger

# Inschakelen (kan sudo vereisen)
sudo loginctl enable-linger $USER
```

Zonder linger draait de daemon alleen terwijl u bent aangemeld.

### systemd: service start niet

Controleer de servicestatus en het journaal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Veelvoorkomende oorzaken:
- **Binair bestand verplaatst of verwijderd.** Het unitbestand heeft een hardgecodeerd pad naar het binaire bestand. Installeer de daemon opnieuw: `triggerfish dive --install-daemon`
- **PATH-problemen.** De systemd-unit legt uw PATH vast op het moment van installatie. Als u na de daemoninstallatie nieuwe tools (zoals MCP-servers) hebt geïnstalleerd, installeer de daemon opnieuw om het PATH bij te werken.
- **DENO_DIR niet ingesteld.** De systemd-unit stelt `DENO_DIR=~/.cache/deno` in. Als deze directory niet beschrijfbaar is, kunnen SQLite FFI-plugins niet worden geladen.

### launchd: daemon start niet bij aanmelding

Controleer de plist-status:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Als de plist niet is geladen:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Veelvoorkomende oorzaken:
- **Plist verwijderd of beschadigd.** Installeer opnieuw: `triggerfish dive --install-daemon`
- **Binair bestand verplaatst.** De plist heeft een hardgecodeerd pad. Installeer opnieuw na het verplaatsen van het binaire bestand.
- **PATH op installatietijdstip.** Net als systemd legt launchd PATH vast bij het aanmaken van de plist. Installeer opnieuw als u nieuwe tools aan PATH hebt toegevoegd.

### Windows: service start niet

Controleer de servicestatus:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Veelvoorkomende oorzaken:
- **Service niet geïnstalleerd.** Installeer opnieuw: voer het installatieprogramma uit als Beheerder.
- **Binair bestandspad gewijzigd.** De servicewrapper heeft een hardgecodeerd pad. Installeer opnieuw.
- **.NET-compilatie mislukt tijdens installatie.** De C#-servicewrapper vereist .NET Framework 4.x `csc.exe`.

### Upgraden verbreekt de daemon

Na het uitvoeren van `triggerfish update` herstart de daemon automatisch. Als dat niet gebeurt:

1. Het oude binaire bestand kan nog actief zijn. Stop het handmatig: `triggerfish stop`
2. Op Windows wordt het oude binaire bestand hernoemd naar `.old`. Als de hernoeming mislukt, zal de update een fout geven. Stop de service eerst, dan bijwerken.

---

## Logboekbestandsproblemen

### Logboekbestand is leeg

De daemon schrijft naar `~/.triggerfish/logs/triggerfish.log`. Als het bestand bestaat maar leeg is:

- De daemon is mogelijk net gestart. Wacht even.
- Het logniveau is ingesteld op `quiet`, wat alleen ERROR-niveau berichten logt. Stel het in op `normal` of `verbose`:

```bash
triggerfish config set logging.level normal
```

### Logboeken zijn te uitgebreid

Stel het logniveau in op `quiet` om alleen fouten te zien:

```bash
triggerfish config set logging.level quiet
```

Niveauoverzicht:

| Configuratiewaarde | Minimaal gelogd niveau |
|--------------------|----------------------|
| `quiet` | Alleen ERROR |
| `normal` | INFO en hoger |
| `verbose` | DEBUG en hoger |
| `debug` | TRACE en hoger (alles) |

### Logboekrotatie

Logboeken roteren automatisch wanneer het huidige bestand 1 MB overschrijdt. Tot 10 geroteerde bestanden worden bewaard:

```
triggerfish.log        # Huidig
triggerfish.1.log      # Meest recente back-up
triggerfish.2.log      # Op één na meest recente
...
triggerfish.10.log     # Oudste (verwijderd wanneer een nieuwe rotatie plaatsvindt)
```

Er is geen tijdgebaseerde rotatie, alleen groottegebaseerde rotatie.
