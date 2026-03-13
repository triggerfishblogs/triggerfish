# Felsökning: Installation

## Problem med binärinstallation

### Kontrollsummaverifiering misslyckades

Installationsprogrammet laddar ner en `SHA256SUMS.txt` vid sidan av binären och verifierar hashen innan installation. Om det misslyckas:

- **Nedladdningen avbröts.** Ta bort den partiella nedladdningen och försök igen.
- **Spegling eller CDN levererade inaktuellt innehåll.** Vänta några minuter och försök igen. Installationsprogrammet hämtar från GitHub Releases.
- **Tillgången hittades ej i SHA256SUMS.txt.** Det innebär att utgåvan publicerades utan kontrollsumma för din plattform. Rapportera ett [GitHub-ärende](https://github.com/greghavens/triggerfish/issues).

Installationsprogrammet använder `sha256sum` på Linux och `shasum -a 256` på macOS. Om inget av dem är tillgängligt kan det inte verifiera nedladdningen.

### Åtkomst nekad vid skrivning till `/usr/local/bin`

Installationsprogrammet försöker `/usr/local/bin` först och faller sedan tillbaka till `~/.local/bin`. Om inget av dem fungerar:

```bash
# Alternativ 1: Kör med sudo för systeminstallation
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Alternativ 2: Skapa ~/.local/bin och lägg till i PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Kör sedan om installationsprogrammet
```

### macOS karantänvarning

macOS blockerar binärer som laddats ner från internet. Installationsprogrammet kör `xattr -cr` för att rensa karantänattributet, men om du laddade ner binären manuellt, kör:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Eller högerklicka på binären i Finder, välj "Öppna" och bekräfta säkerhetsprompten.

### PATH uppdaterades inte efter installation

Installationsprogrammet lägger till installationskatalogen i din skalsprofil (`.zshrc`, `.bashrc` eller `.bash_profile`). Om kommandot `triggerfish` inte hittas efter installation:

1. Öppna ett nytt terminalfönster (det nuvarande skalet plockar inte upp profiländringar)
2. Eller källhänvisa till din profil manuellt: `source ~/.zshrc` (eller vilken profilfil ditt skal använder)

Om installationsprogrammet hoppade över PATH-uppdateringen innebär det att installationskatalogen redan fanns i din PATH.

---

## Att bygga från källkod

### Deno hittades ej

Installationsprogrammet för källkod (`deploy/scripts/install-from-source.sh`) installerar Deno automatiskt om det saknas. Om det misslyckas:

```bash
# Installera Deno manuellt
curl -fsSL https://deno.land/install.sh | sh

# Verifiera
deno --version   # Ska vara 2.x
```

### Kompilering misslyckas med behörighetsfel

Kommandot `deno compile` kräver `--allow-all` eftersom den kompilerade binären behöver fullständig systemåtkomst (nätverk, filsystem, FFI för SQLite, subprocesser). Om du ser behörighetsfel under kompilering, se till att du kör installationsskriptet som en användare med skrivåtkomst till målkatalogen.

### Specifik gren eller version

Ange `TRIGGERFISH_BRANCH` för att klona en specifik gren:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

För binärinstallationsprogrammet, ange `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-specifika problem

### PowerShell-körningspolicy blockerar installationsprogrammet

Kör PowerShell som administratör och tillåt skriptkörning:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Kör sedan om installationsprogrammet.

### Windows-tjänstkompilering misslyckas

Windows-installationsprogrammet kompilerar ett C#-tjänsteomskript med `csc.exe` från .NET Framework 4.x. Om kompileringen misslyckas:

1. **Verifiera att .NET Framework är installerat.** Kör `where csc.exe` i en kommandoprompt. Installationsprogrammet söker i .NET Framework-katalogen under `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Kör som administratör.** Tjänsteinstallation kräver utökade behörigheter.
3. **Reservalternativ.** Om tjänstkompileringen misslyckas kan du fortfarande köra Triggerfish manuellt: `triggerfish run` (förgrundsläge). Du måste hålla terminalen öppen.

### `Move-Item` misslyckas vid uppgradering

Äldre versioner av Windows-installationsprogrammet använde `Move-Item -Force` som misslyckas när målbinären är i bruk. Det här åtgärdades i version 0.3.4+. Om du drabbas av det på en äldre version, stoppa tjänsten manuellt först:

```powershell
Stop-Service Triggerfish
# Kör sedan om installationsprogrammet
```

---

## Docker-problem

### Container avslutas omedelbart

Kontrollera containerloggarna:

```bash
docker logs triggerfish
```

Vanliga orsaker:

- **Konfigurationsfil saknas.** Montera din `triggerfish.yaml` i `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Portkonflikt.** Om port 18789 eller 18790 är i bruk kan gatewayen inte starta.
- **Åtkomst nekad på volym.** Containern körs som UID 65534 (nonroot). Se till att volymen kan skrivas av den användaren.

### Kan inte komma åt Triggerfish från värden

Gatewayen binder till `127.0.0.1` inuti containern som standard. För att komma åt den från värden mappar Docker compose-filen portarna `18789` och `18790`. Om du använder `docker run` direkt, lägg till:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman istället för Docker

Docker-installationsskriptet identifierar automatiskt `podman` som containerkörtid. Du kan också ange det explicit:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Omskriptsskriptet `triggerfish` (installerat av Docker-installationsprogrammet) identifierar också automatiskt podman.

### Anpassad avbildning eller register

Åsidosätt avbildningen med `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Efter installation

### Installationsguiden startar inte

Efter binärinstallation kör installationsprogrammet `triggerfish dive --install-daemon` för att starta installationsguiden. Om den inte startar:

1. Kör den manuellt: `triggerfish dive`
2. Om du ser "Terminal requirement not met" kräver guiden en interaktiv TTY. SSH-sessioner, CI-pipelines och pipead inmatning fungerar inte. Konfigurera `triggerfish.yaml` manuellt istället.

### Signal-kanalens autoinstallation misslyckas

Signal kräver `signal-cli`, som är en Java-applikation. Autoinstallationsprogrammet laddar ner en förbyggd `signal-cli`-binär och en JRE 25-körtid. Fel kan uppstå om:

- **Ingen skrivåtkomst till installationskatalogen.** Kontrollera behörigheter på `~/.triggerfish/signal-cli/`.
- **JRE-nedladdning misslyckas.** Installationsprogrammet hämtar från Adoptium. Nätverksbegränsningar eller företagsproxies kan blockera det.
- **Arkitektur stöds inte.** JRE-autoinstallation stöder enbart x64 och aarch64.

Om autoinstallationen misslyckas, installera `signal-cli` manuellt och se till att det finns i din PATH. Se [Signal-kanaldokumentationen](/sv-SE/channels/signal) för manuella installationssteg.
