# Plattformsanteckningar

Plattformsspecifikt beteende, krav och egenheter.

## macOS

### Tjänsthanterare: launchd

Triggerfish registreras som en launchd-agent på:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist:en är inställd på `RunAtLoad: true` och `KeepAlive: true`, så daemonen startar vid inloggning och startar om om den kraschar.

### PATH-fångst

Launchd plist:en fångar din skal-PATH vid installeringstillfället. Det är kritiskt eftersom launchd inte läser in din skalsprofil. Om du installerar MCP-serverberoenden (som `npx`, `python`) efter att ha installerat daemonen kommer dessa binärer inte att finnas i daemonens PATH.

**Åtgärd:** Ominstallera daemonen för att uppdatera den fångade PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Karantän

macOS tillämpar en karantänflagga på nedladdade binärer. Installationsverktyget rensar detta med `xattr -cr`, men om du laddade ner binären manuellt:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Nyckelring

Hemligheter lagras i macOS-inloggningsnyckelringen via CLI:et `security`. Om Keychain Access är låst kommer hemliga operationer att misslyckas tills du låser upp det (vanligtvis genom att logga in).

### Homebrew Deno

Om du bygger från källkod och Deno installerades via Homebrew, se till att Homebrews bin-katalog finns i din PATH innan du kör installationsskriptet.

---

## Linux

### Tjänsthanterare: systemd (användarläge)

Daemonen körs som en systemd-användartjänst:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Som standard slutar systemd-användartjänster när användaren loggar ut. Triggerfish aktiverar linger vid installeringstillfället:

```bash
loginctl enable-linger $USER
```

Om detta misslyckas (t.ex. din systemadministratör har inaktiverat det) körs daemonen bara medan du är inloggad. På servrar där du vill att daemonen ska kvarstå, be din administratör att aktivera linger för ditt konto.

### PATH och miljö

Systemd-enheten fångar din PATH och anger `DENO_DIR=~/.cache/deno`. Precis som macOS kräver ändringar av PATH efter installation ominstallation av daemonen.

Enheten anger också `Environment=PATH=...` explicit. Om daemonen inte kan hitta MCP-serverbinärer är detta den troligaste orsaken.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic-skrivbord har `/home` symlänkat till `/var/home`. Triggerfish hanterar detta automatiskt när hemkatalogen löses upp, följer symboliska länkar för att hitta den verkliga sökvägen.

Flatpak-installerade webbläsare identifieras och startas via ett omskriptsskript som anropar `flatpak run`.

### Headless-servrar

På servrar utan skrivbordsmiljö kanske GNOME Keyring / Secret Service-daemonen inte körs. Se [Hemligheter-felsökning](/sv-SE/support/troubleshooting/secrets) för installationsinstruktioner.

### SQLite FFI

SQLite-lagringsbakänden använder `@db/sqlite`, som laddar ett inbyggt bibliotek via FFI. Det kräver `--allow-ffi`-Deno-behörigheten (inkluderad i den kompilerade binären). På vissa minimala Linux-distributioner kan det delade C-biblioteket eller relaterade beroenden saknas. Installera basutvecklingsbibliotek om du ser FFI-relaterade fel.

---

## Windows

### Tjänsthanterare: Windows-tjänst

Triggerfish installeras som en Windows-tjänst med namnet "Triggerfish". Tjänsten implementeras av ett C#-omskript kompilerat under installationen med `csc.exe` från .NET Framework 4.x.

**Krav:**
- .NET Framework 4.x (installerat på de flesta Windows 10/11-system)
- Administratörsprivilegier för tjänsteinstallation
- `csc.exe` tillgänglig i .NET Framework-katalogen

### Binärersättning under uppdateringar

Windows tillåter inte att skriva över en körbar fil som körs för närvarande. Uppdateringsverktyget:

1. Byter namn på den körande binären till `triggerfish.exe.old`
2. Kopierar den nya binären till den ursprungliga sökvägen
3. Startar om tjänsten
4. Rensar upp `.old`-filen vid nästa start

Om namnbyte eller kopiering misslyckas, stoppa tjänsten manuellt innan uppdatering.

### ANSI-färgstöd

Triggerfish aktiverar Virtual Terminal Processing för färgad konsoloutput. Det fungerar i modern PowerShell och Windows Terminal. Äldre `cmd.exe`-fönster kanske inte renderar färger korrekt.

### Exklusiv fillåsning

Windows använder exklusiva fillåsningar. Om daemonen körs och du försöker starta en annan instans förhindrar loggfillåsningen det:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Denna identifiering är specifik för Windows och baseras på EBUSY / "os error 32" när loggfilen öppnas.

### Hemlighetlagring

Windows använder det krypterade filarkivet (AES-256-GCM) på `~/.triggerfish/secrets.json`. Det finns ingen Windows Credential Manager-integration. Behandla filen `secrets.key` som känslig.

### PowerShell-installationsanteckningar

PowerShell-installationsskriptet (`install.ps1`):
- Identifierar processorarkitektur (x64/arm64)
- Installerar till `%LOCALAPPDATA%\Triggerfish`
- Lägger till installationskatalogen till användar-PATH via registret
- Kompilerar C#-tjänsteomskriptet
- Registrerar och startar Windows-tjänsten

Om installationsverktyget misslyckas vid tjänstekompileringssteget kan du fortfarande köra Triggerfish manuellt:

```powershell
triggerfish run    # Förgrundsläge
```

---

## Docker

### Containerkörtid

Docker-distributionen stöder både Docker och Podman. Identifiering är automatisk, eller ange explicit:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Avbildningsdetaljer

- Bas: `gcr.io/distroless/cc-debian12` (minimal, inget skal)
- Felsökningsvariant: `distroless:debug` (inkluderar skal för felsökning)
- Körs som UID 65534 (nonroot)
- Init: `true` (PID 1 signalvidarebefordran via `tini`)
- Omstartspolicy: `unless-stopped`

### Datapersistens

All beständig data finns i katalogen `/data` inuti containern, backas upp av en Docker-namngiven volym:

```
/data/
  triggerfish.yaml        # Konfiguration
  secrets.json            # Krypterade hemligheter
  secrets.key             # Krypteringsnyckel
  SPINE.md                # Agentidentitet
  TRIGGER.md              # Triggerbeteende
  data/triggerfish.db     # SQLite-databas
  logs/                   # Loggfiler
  skills/                 # Installerade kunskaper
  workspace/              # Agentarbetsytor
  .deno/                  # Deno FFI-plugincache
```

### Miljövariabler

| Variabel | Standard | Syfte |
| -------- | -------- | ----- |
| `TRIGGERFISH_DATA_DIR` | `/data` | Basdata-katalog |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Konfigurationsfilsökväg |
| `TRIGGERFISH_DOCKER` | `true` | Aktiverar Docker-specifikt beteende |
| `DENO_DIR` | `/data/.deno` | Deno-cache (FFI-plugins) |
| `HOME` | `/data` | Hemkatalog för nonroot-användare |

### Hemligheter i Docker

Docker-containrar kan inte komma åt värdens OS-nyckelring. Det krypterade filarkivet används automatiskt. Krypteringsnyckeln (`secrets.key`) och krypterade data (`secrets.json`) lagras i `/data`-volymen.

**Säkerhetsnotering:** Alla med tillgång till Docker-volymen kan läsa krypteringsnyckeln. Säkra volymen på lämpligt sätt. I produktion, överväg att använda Docker-hemligheter eller en hemlighethanterare för att injicera nyckeln vid körtid.

### Portar

Compose-filen mappar:
- `18789` — Gateway WebSocket
- `18790` — Tidepool A2UI

Ytterligare portar (WebChat på 8765, WhatsApp webhook på 8443) måste läggas till i compose-filen om du aktiverar dessa kanaler.

### Köra installationsguiden i Docker

```bash
# Om containern körs
docker exec -it triggerfish triggerfish dive

# Om containern inte körs (engångskörning)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Uppdatering

```bash
# Använda omskriptsskriptet
triggerfish update

# Manuellt
docker compose pull
docker compose up -d
```

### Felsökning

Använd felsökningsvarianten av avbildningen för felsökning:

```yaml
# I docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Det inkluderar ett skal så att du kan köra exec in i containern:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Enbart webbläsare)

Triggerfish självt körs inte som ett Flatpak, men det kan använda Flatpak-installerade webbläsare för webbläsarautomatisering.

### Identifierade Flatpak-webbläsare

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Hur det fungerar

Triggerfish skapar ett temporärt omskriptsskript som anropar `flatpak run` med headless-lägesflaggor och startar sedan Chrome via det skriptet. Omskriptet skrivs till en temp-katalog.

### Vanliga problem

- **Flatpak inte installerat.** Binären måste finnas på `/usr/bin/flatpak` eller `/usr/local/bin/flatpak`.
- **Temp-katalog inte skrivbar.** Omskriptsskriptet måste skrivas till disk innan körning.
- **Flatpak-sandboxkonflikter.** Vissa Flatpak Chrome-byggen begränsar `--remote-debugging-port`. Om CDP-anslutning misslyckas, prova en icke-Flatpak Chrome-installation.
