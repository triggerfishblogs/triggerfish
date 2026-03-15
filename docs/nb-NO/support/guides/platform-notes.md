# Plattformmerknader

Plattformspesifikk atferd, krav og særegenheter.

## macOS

### Tjenestebehandler: launchd

Triggerfish registrerer seg som en launchd-agent på:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist-filen er konfigurert med `RunAtLoad: true` og `KeepAlive: true`, slik at
daemonen starter ved innlogging og restartes ved krasj.

### PATH-opptak

Launchd-plist-filen tar opp din shell PATH på installasjonstidspunktet. Dette er
avgjørende fordi launchd ikke importerer din shell-profil. Hvis du installerer
MCP-serveravhengigheter (som `npx`, `python`) etter installasjon av daemonen,
vil disse binærene ikke være i daemonens PATH.

**Løsning:** Reinstaller daemonen for å oppdatere den lagrede PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Karantene

macOS legger karanteneflagg på nedlastede binærfiler. Installasjonsprogrammet
fjerner dette med `xattr -cr`, men hvis du lastet ned binærfilen manuelt:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Nøkkelring

Hemmeligheter lagres i macOS-innloggingsnøkkelringen via `security` CLI. Hvis
Nøkkelringtilgang er låst, vil hemmelighetoperasjoner feile inntil du låser den
opp (vanligvis ved å logge inn).

### Homebrew Deno

Hvis du bygger fra kildekode og Deno ble installert via Homebrew, sørg for at
Homebrew bin-mappen er i din PATH før du kjører installasjonsskriptet.

---

## Linux

### Tjenestebehandler: systemd (brukermodus)

Daemonen kjører som en systemd-brukertjeneste:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Som standard stopper systemd-brukertjenester når brukeren logger ut. Triggerfish
aktiverer linger ved installasjon:

```bash
loginctl enable-linger $USER
```

Hvis dette mislykkes (f.eks. fordi systemadministratoren har deaktivert det),
kjører daemonen bare mens du er innlogget. På servere der du vil at daemonen skal
vedvare, be administratoren om å aktivere linger for din konto.

### PATH og miljø

Systemd-enheten tar opp din PATH og setter `DENO_DIR=~/.cache/deno`. Som på
macOS krever endringer i PATH etter installasjon at daemonen reinstalleres.

Enheten setter også `Environment=PATH=...` eksplisitt. Hvis daemonen ikke kan
finne MCP-serverbinærfiler, er dette den mest sannsynlige årsaken.

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic-skrivebord har `/home` symbollenket til `/var/home`. Triggerfish
håndterer dette automatisk ved oppretting av hjemmemappen, ved å følge
symbollenker for å finne den faktiske banen.

Flatpak-installerte nettlesere oppdages og startes via et innpakningsskript som
kaller `flatpak run`.

### Hodeløse servere

På servere uten et skrivebordsmiljø kjører kanskje ikke GNOME Keyring /
Secret Service-daemonen. Se [Hemmeligheter feilsøking](/nb-NO/support/troubleshooting/secrets)
for oppsettpsinstruksjoner.

### SQLite FFI

SQLite-lagringsbackenden bruker `@db/sqlite`, som laster et native bibliotek via
FFI. Dette krever `--allow-ffi` Deno-tillatelse (inkludert i den kompilerte
binærfilen). På noen minimale Linux-distribusjoner kan det hende at det delte
C-biblioteket eller relaterte avhengigheter mangler. Installer base
utviklingsbiblioteker hvis du ser FFI-relaterte feil.

---

## Windows

### Tjenestebehandler: Windows Service

Triggerfish installeres som en Windows-tjeneste kalt "Triggerfish". Tjenesten er
implementert av en C#-innpakning kompilert under installasjon ved hjelp av
`csc.exe` fra .NET Framework 4.x.

**Krav:**
- .NET Framework 4.x (installert på de fleste Windows 10/11-systemer)
- Administratorrettigheter for tjenesteinstallasjon
- `csc.exe` tilgjengelig i .NET Framework-mappen

### Binærfilerstatning under oppdateringer

Windows tillater ikke overskrivning av en kjørende kjørbar fil. Oppdatereren:

1. Gir den kjørende binærfilen nytt navn til `triggerfish.exe.old`
2. Kopierer den nye binærfilen til den opprinnelige banen
3. Restarter tjenesten
4. Rydder opp `.old`-filen ved neste oppstart

Hvis omdøping eller kopiering mislykkes, stopp tjenesten manuelt før oppdatering.

### ANSI-fargstøtte

Triggerfish aktiverer Virtual Terminal Processing for farget konsollutdata. Dette
fungerer i moderne PowerShell og Windows Terminal. Eldre `cmd.exe`-vinduer gjengir
kanskje ikke farger riktig.

### Eksklusiv fillåsing

Windows bruker eksklusive fillåser. Hvis daemonen kjører og du prøver å starte
en ny instans, hindrer loggfillåsen det:

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Denne deteksjonen er spesifikk for Windows og er basert på EBUSY / "os error 32"
når loggfilen åpnes.

### Hemmelighetlagring

Windows bruker den krypterte fillagringen (AES-256-GCM) på
`~/.triggerfish/secrets.json`. Det er ingen Windows Credential Manager-integrasjon.
Behandle `secrets.key`-filen som sensitiv.

### PowerShell-installasjonsmerknaer

PowerShell-installasjonsprogrammet (`install.ps1`):
- Oppdager prosessorarkitektur (x64/arm64)
- Installerer til `%LOCALAPPDATA%\Triggerfish`
- Legger installasjonsmappen til bruker-PATH via registret
- Kompilerer C#-tjenesteinpakningsskriptet
- Registrerer og starter Windows-tjenesten

Hvis installasjonsprogrammet feiler ved tjenestekompilasjonstrinnet, kan du
fortsatt kjøre Triggerfish manuelt:

```powershell
triggerfish run    # Forgrunnsmedodus
```

---

## Docker

### Containerkjøretid

Docker-distribusjonen støtter både Docker og Podman. Deteksjon er automatisk,
eller sett eksplisitt:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Bildedetaljer

- Basis: `gcr.io/distroless/cc-debian12` (minimal, ingen shell)
- Feilsøkingsvariant: `distroless:debug` (inkluderer shell for feilsøking)
- Kjører som UID 65534 (nonroot)
- Init: `true` (PID 1 signalvideresending via `tini`)
- Omstartspolicy: `unless-stopped`

### Datapersistens

Alle vedvarende data er i `/data`-mappen inni containeren, støttet av et Docker
navngitt volum:

```
/data/
  triggerfish.yaml        # Konfigurasjon
  secrets.json            # Krypterte hemmeligheter
  secrets.key             # Krypteringsnøkkel
  SPINE.md                # Agentidentitet
  TRIGGER.md              # Trigger-atferd
  data/triggerfish.db     # SQLite-database
  logs/                   # Loggfiler
  skills/                 # Installerte ferdigheter
  workspace/              # Agentarbeidsområder
  .deno/                  # Deno FFI-pluginbuffer
```

### Miljøvariabler

| Variabel | Standard | Formål |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Basisdatakatalog |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Konfigurasjonsfilbane |
| `TRIGGERFISH_DOCKER` | `true` | Aktiverer Docker-spesifikk atferd |
| `DENO_DIR` | `/data/.deno` | Deno-buffer (FFI-plugins) |
| `HOME` | `/data` | Hjemmekatalog for nonroot-bruker |

### Hemmeligheter i Docker

Docker-containere får ikke tilgang til vert-OS-nøkkelringen. Den krypterte
fillagringen brukes automatisk. Krypteringsnøkkelen (`secrets.key`) og krypterte
data (`secrets.json`) lagres i `/data`-volumet.

**Sikkerhetsnotat:** Alle med tilgang til Docker-volumet kan lese
krypteringsnøkkelen. Sikre volumet på riktig måte. Vurder å bruke Docker secrets
eller en hemmelighetbehandler for å injisere nøkkelen ved kjøretid i produksjon.

### Porter

Compose-filen tilordner:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Ytterligere porter (WebChat på 8765, WhatsApp-webhook på 8443) må legges til i
compose-filen hvis du aktiverer disse kanalene.

### Kjøre oppsettveiviseren i Docker

```bash
# Hvis containeren kjører
docker exec -it triggerfish triggerfish dive

# Hvis containeren ikke kjører (engangskjøring)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Oppdatering

```bash
# Bruker innpakningsskriptet
triggerfish update

# Manuelt
docker compose pull
docker compose up -d
```

### Feilsøking

Bruk feilsøkingsvarianten av bildet for problemsøking:

```yaml
# I docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Dette inkluderer en shell slik at du kan kjøre kommandoer inne i containeren:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (kun nettleser)

Triggerfish selv kjører ikke som en Flatpak, men kan bruke Flatpak-installerte
nettlesere for nettleserautomatisering.

### Oppdagede Flatpak-nettlesere

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Slik fungerer det

Triggerfish oppretter et midlertidig innpakningsskript som kaller `flatpak run`
med hodeløse modusflagg, og starter deretter Chrome via det skriptet.
Innpakningsskriptet skrives til en midlertidig katalog.

### Vanlige problemer

- **Flatpak ikke installert.** Binærfilen må være på `/usr/bin/flatpak` eller
  `/usr/local/bin/flatpak`.
- **Midlertidig katalog ikke skrivbar.** Innpakningsskriptet må skrives til disk
  før kjøring.
- **Flatpak sandbox-konflikter.** Noen Flatpak Chrome-bygg begrenser
  `--remote-debugging-port`. Hvis CDP-tilkoblingen mislykkes, prøv en ikke-Flatpak
  Chrome-installasjon.
