# Platformnotities

Platformspecifiek gedrag, vereisten en eigenaardigheden.

## macOS

### Servicebeheer: launchd

Triggerfish registreert zichzelf als een launchd-agent op:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

De plist is ingesteld op `RunAtLoad: true` en `KeepAlive: true`, zodat de daemon bij aanmelding start en herstart als hij crasht.

### PATH vastleggen

De launchd-plist legt uw shell-PATH vast op het moment van installatie. Dit is essentieel omdat launchd uw shellprofiel niet inlaadt. Als u MCP-serverafhankelijkheden (zoals `npx`, `python`) installeert nádat u de daemon hebt geïnstalleerd, zullen die binaire bestanden niet in het PATH van de daemon staan.

**Oplossing:** Installeer de daemon opnieuw om het vastgelegde PATH bij te werken:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantaine

macOS past een quarantainemarkering toe op gedownloade binaire bestanden. Het installatieprogramma verwijdert dit met `xattr -cr`, maar als u het binaire bestand handmatig hebt gedownload:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Sleutelhanger

Geheimen worden opgeslagen in de macOS-aanmeldingssleutelhanger via de `security` CLI. Als Sleutelhangertoegang vergrendeld is, mislukken geheimoperaties totdat u de sleutelhanger ontgrendelt (doorgaans door aan te melden).

### Homebrew Deno

Als u vanuit broncode bouwt en Deno via Homebrew is geïnstalleerd, zorg er dan voor dat de Homebrew-binaire map in uw PATH staat vóór u het installatiescript uitvoert.

---

## Linux

### Servicebeheer: systemd (gebruikersmodus)

De daemon draait als een systemd-gebruikersservice:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Standaard stoppen systemd-gebruikersservices wanneer de gebruiker uitlogt. Triggerfish schakelt linger in tijdens de installatie:

```bash
loginctl enable-linger $USER
```

Als dit mislukt (bijv. omdat uw systeembeheerder het heeft uitgeschakeld), draait de daemon alleen terwijl u bent aangemeld. Op servers waarop u de daemon wilt laten draaien, vraagt u uw beheerder om linger voor uw account in te schakelen.

### PATH en omgeving

De systemd-unit legt uw PATH vast en stelt `DENO_DIR=~/.cache/deno` in. Net als bij macOS vereisen PATH-wijzigingen na de installatie een herinstallatie van de daemon.

De unit stelt ook expliciet `Environment=PATH=...` in. Als de daemon geen MCP-serverbinaire bestanden kan vinden, is dit hoogstwaarschijnlijk de oorzaak.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic-desktops hebben `/home` gesymlinkt naar `/var/home`. Triggerfish handelt dit automatisch af bij het omzetten van de homedirectory door symlinks te volgen naar het werkelijke pad.

Flatpak-geïnstalleerde browsers worden gedetecteerd en gestart via een wrapperscript dat `flatpak run` aanroept.

### Serverloze omgevingen

Op servers zonder desktopomgeving is de GNOME Keyring / Secret Service-daemon mogelijk niet actief. Zie [Problemen met geheimen oplossen](/nl-NL/support/troubleshooting/secrets) voor installatie-instructies.

### SQLite FFI

De SQLite-opslagbackend gebruikt `@db/sqlite`, die een native bibliotheek laadt via FFI. Dit vereist de `--allow-ffi` Deno-machtiging (opgenomen in het gecompileerde binaire bestand). Op sommige minimale Linux-distributies ontbreken de gedeelde C-bibliotheek of gerelateerde afhankelijkheden. Installeer de basisbibliotheken voor ontwikkeling als u FFI-gerelateerde fouten ziet.

---

## Windows

### Servicebeheer: Windows Service

Triggerfish installeert zichzelf als een Windows Service met de naam "Triggerfish". De service wordt geïmplementeerd door een C#-wrapper die tijdens de installatie wordt gecompileerd met `csc.exe` van .NET Framework 4.x.

**Vereisten:**
- .NET Framework 4.x (geïnstalleerd op de meeste Windows 10/11-systemen)
- Beheerdersrechten voor serviceinstallatie
- `csc.exe` toegankelijk in de .NET Framework-directory

### Binair bestand vervangen tijdens updates

Windows staat niet toe dat een actief uitvoerbaar bestand wordt overschreven. Het updateprogramma:

1. Hernoemt het actieve binaire bestand naar `triggerfish.exe.old`
2. Kopieert het nieuwe binaire bestand naar het oorspronkelijke pad
3. Herstart de service
4. Verwijdert het `.old`-bestand bij de volgende start

Als de hernoem- of kopieerstap mislukt, stop de service dan handmatig vóór het bijwerken.

### ANSI-kleurondersteuning

Triggerfish schakelt Virtual Terminal Processing in voor gekleurde console-uitvoer. Dit werkt in moderne PowerShell en Windows Terminal. Oudere `cmd.exe`-vensters renderen kleuren mogelijk niet correct.

### Exclusieve bestandsvergrendeling

Windows gebruikt exclusieve bestandsvergrendelingen. Als de daemon actief is en u probeert een andere instantie te starten, voorkomt de logboekbestandsvergrendeling dit:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Deze detectie is Windows-specifiek en is gebaseerd op de EBUSY / "os error 32" bij het openen van het logboekbestand.

### Geheimensopslag

Windows gebruikt de versleutelde bestandsopslag (AES-256-GCM) op `~/.triggerfish/secrets.json`. Er is geen Windows Credential Manager-integratie. Behandel het `secrets.key`-bestand als gevoelig.

### PowerShell-installatieprogrammanotities

Het PowerShell-installatieprogramma (`install.ps1`):
- Detecteert processorarchitectuur (x64/arm64)
- Installeert naar `%LOCALAPPDATA%\Triggerfish`
- Voegt de installatiedirectory toe aan de gebruikers-PATH via het register
- Compileert de C#-servicewrapper
- Registreert en start de Windows Service

Als het installatieprogramma mislukt bij de servicecompilatiestap, kunt u Triggerfish toch handmatig uitvoeren:

```powershell
triggerfish run    # Voorgrondmodus
```

---

## Docker

### Container runtime

De Docker-implementatie ondersteunt zowel Docker als Podman. Detectie is automatisch, of stel dit expliciet in:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Imagedetails

- Basis: `gcr.io/distroless/cc-debian12` (minimaal, geen shell)
- Debug-variant: `distroless:debug` (inclusief shell voor probleemoplossing)
- Draait als UID 65534 (nonroot)
- Init: `true` (PID 1-signaaldoorschakeling via `tini`)
- Herstartbeleid: `unless-stopped`

### Gegevenspersistentie

Alle persistente gegevens bevinden zich in de `/data`-directory binnenin de container, ondersteund door een Docker named volume:

```
/data/
  triggerfish.yaml        # Configuratie
  secrets.json            # Versleutelde geheimen
  secrets.key             # Versleutelingssleutel
  SPINE.md                # Agentidentiteit
  TRIGGER.md              # Triggergedrag
  data/triggerfish.db     # SQLite-database
  logs/                   # Logboekbestanden
  skills/                 # Geïnstalleerde skills
  workspace/              # Agentwerkruimten
  .deno/                  # Deno FFI-plugincache
```

### Omgevingsvariabelen

| Variabele | Standaard | Doel |
|-----------|-----------|------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Basisdatadirectory |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Pad naar configuratiebestand |
| `TRIGGERFISH_DOCKER` | `true` | Schakelt Docker-specifiek gedrag in |
| `DENO_DIR` | `/data/.deno` | Deno-cache (FFI-plugins) |
| `HOME` | `/data` | Homedirectory voor nonroot-gebruiker |

### Geheimen in Docker

Docker-containers hebben geen toegang tot de OS-sleutelhanger van de host. De versleutelde bestandsopslag wordt automatisch gebruikt. De versleutelingssleutel (`secrets.key`) en versleutelde gegevens (`secrets.json`) worden opgeslagen in het `/data`-volume.

**Beveiligingsopmerking:** Iedereen met toegang tot het Docker-volume kan de versleutelingssleutel lezen. Beveilig het volume op de juiste manier. Overweeg in productie Docker secrets of een secrets manager te gebruiken om de sleutel bij uitvoering in te voeren.

### Poorten

Het compose-bestand koppelt:
- `18789` — Gateway WebSocket
- `18790` — Tidepool A2UI

Extra poorten (WebChat op 8765, WhatsApp-webhook op 8443) moeten worden toegevoegd aan het compose-bestand als u die kanalen inschakelt.

### De installatiewizard uitvoeren in Docker

```bash
# Als de container actief is
docker exec -it triggerfish triggerfish dive

# Als de container niet actief is (eenmalig)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Bijwerken

```bash
# Via het wrapperscript
triggerfish update

# Handmatig
docker compose pull
docker compose up -d
```

### Foutopsporing

Gebruik de debug-variant van de image voor probleemoplossing:

```yaml
# In docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Dit bevat een shell zodat u in de container kunt uitvoeren:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (alleen browser)

Triggerfish zelf draait niet als een Flatpak, maar kan wel Flatpak-geïnstalleerde browsers gebruiken voor browserautomatisering.

### Gedetecteerde Flatpak-browsers

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Hoe het werkt

Triggerfish maakt een tijdelijk wrapperscript dat `flatpak run` aanroept met headless-modusmarkeringen en start Chrome vervolgens via dat script. De wrapper wordt geschreven naar een tijdelijke directory.

### Veelvoorkomende problemen

- **Flatpak niet geïnstalleerd.** Het binaire bestand moet aanwezig zijn op `/usr/bin/flatpak` of `/usr/local/bin/flatpak`.
- **Tijdelijke directory niet beschrijfbaar.** Het wrapperscript moet naar schijf worden geschreven vóór uitvoering.
- **Flatpak sandbox-conflicten.** Sommige Flatpak Chrome-builds beperken `--remote-debugging-port`. Als de CDP-verbinding mislukt, probeer dan een niet-Flatpak Chrome-installatie.
