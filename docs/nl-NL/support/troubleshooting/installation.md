# Probleemoplossing: Installatie

## Problemen met het binaire installatieprogramma

### Checksumverificatie mislukt

Het installatieprogramma downloadt een `SHA256SUMS.txt`-bestand naast het binaire bestand en verifieert de hash vóór de installatie. Als dit mislukt:

- **Netwerk heeft de download onderbroken.** Verwijder de gedeeltelijke download en probeer opnieuw.
- **Mirror of CDN heeft verouderde inhoud geleverd.** Wacht een paar minuten en probeer opnieuw. Het installatieprogramma haalt op van GitHub Releases.
- **Asset niet gevonden in SHA256SUMS.txt.** Dit betekent dat de release is gepubliceerd zonder een checksum voor uw platform. Dien een [GitHub issue](https://github.com/greghavens/triggerfish/issues) in.

Het installatieprogramma gebruikt `sha256sum` op Linux en `shasum -a 256` op macOS. Als geen van beide beschikbaar is, kan de download niet worden geverifieerd.

### Toestemming geweigerd bij schrijven naar `/usr/local/bin`

Het installatieprogramma probeert eerst `/usr/local/bin`, dan terugvallen op `~/.local/bin`. Als geen van beide werkt:

```bash
# Optie 1: Uitvoeren met sudo voor systeembrede installatie
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Optie 2: ~/.local/bin aanmaken en aan PATH toevoegen
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Voer daarna het installatieprogramma opnieuw uit
```

### macOS-quarantainewaarschuwing

macOS blokkeert binaire bestanden die van internet zijn gedownload. Het installatieprogramma voert `xattr -cr` uit om het quarantaine-attribuut te verwijderen, maar als u het binaire bestand handmatig hebt gedownload:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Of klik met de rechtermuisknop op het binaire bestand in Finder, selecteer "Open" en bevestig de beveiligingsprompt.

### PATH niet bijgewerkt na installatie

Het installatieprogramma voegt de installatiedirectory toe aan uw shellprofiel (`.zshrc`, `.bashrc` of `.bash_profile`). Als het `triggerfish`-commando na installatie niet wordt gevonden:

1. Open een nieuw terminalvenster (de huidige shell neemt profielwijzigingen niet op)
2. Of laad uw profiel handmatig: `source ~/.zshrc` (of welk profielbestand uw shell gebruikt)

Als het installatieprogramma de PATH-update heeft overgeslagen, betekent dit dat de installatiedirectory al in uw PATH stond.

---

## Bouwen vanuit broncode

### Deno niet gevonden

Het installatieprogramma vanuit broncode (`deploy/scripts/install-from-source.sh`) installeert Deno automatisch als het niet aanwezig is. Als dat mislukt:

```bash
# Deno handmatig installeren
curl -fsSL https://deno.land/install.sh | sh

# Verifiëren
deno --version   # Moet 2.x zijn
```

### Compilatie mislukt met machtigingsfouten

De opdracht `deno compile` heeft `--allow-all` nodig omdat het gecompileerde binaire bestand volledige systeemtoegang vereist (netwerk, bestandssysteem, FFI voor SQLite, subproces spawning). Als u machtigingsfouten ziet tijdens de compilatie, zorg er dan voor dat u het installatiescript uitvoert als een gebruiker met schrijftoegang tot de doeldirectory.

### Specifieke branch of versie

Stel `TRIGGERFISH_BRANCH` in om een specifieke branch te klonen:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Voor het binaire installatieprogramma, stel `TRIGGERFISH_VERSION` in:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-specifieke problemen

### PowerShell-uitvoeringsbeleid blokkeert het installatieprogramma

Voer PowerShell uit als Beheerder en sta het uitvoeren van scripts toe:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Voer daarna het installatieprogramma opnieuw uit.

### Windows Service-compilatie mislukt

Het Windows-installatieprogramma compileert een C#-servicewrapper direct met `csc.exe` van .NET Framework 4.x. Als de compilatie mislukt:

1. **Controleer of .NET Framework is geïnstalleerd.** Voer `where csc.exe` uit in een opdrachtprompt. Het installatieprogramma zoekt in de .NET Framework-directory onder `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Uitvoeren als Beheerder.** Serviceinstallatie vereist verhoogde rechten.
3. **Fallback.** Als de servicecompilatie mislukt, kunt u Triggerfish toch handmatig uitvoeren: `triggerfish run` (voorgrondmodus). U moet het terminalvenster open laten.

### `Move-Item` mislukt tijdens upgrade

Oudere versies van het Windows-installatieprogramma gebruikten `Move-Item -Force`, wat mislukt als het doelbinaire bestand in gebruik is. Dit is opgelost in versie 0.3.4+. Als u dit ervaart op een oudere versie, stop de service dan eerst handmatig:

```powershell
Stop-Service Triggerfish
# Voer daarna het installatieprogramma opnieuw uit
```

---

## Docker-problemen

### Container verlaat direct

Controleer de containerlogboeken:

```bash
docker logs triggerfish
```

Veelvoorkomende oorzaken:

- **Configuratiebestand ontbreekt.** Koppel uw `triggerfish.yaml` in `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Poortconflict.** Als poort 18789 of 18790 in gebruik is, kan de gateway niet starten.
- **Toegang geweigerd op volume.** De container draait als UID 65534 (nonroot). Zorg ervoor dat het volume beschrijfbaar is door die gebruiker.

### Kan Triggerfish niet bereiken van de host

De gateway bindt standaard aan `127.0.0.1` binnenin de container. Om er toegang toe te krijgen van de host, koppelt het Docker compose-bestand poorten `18789` en `18790`. Als u `docker run` rechtstreeks gebruikt, voeg dan toe:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman in plaats van Docker

Het Docker-installatiescript detecteert `podman` automatisch als containerruntime. U kunt dit ook expliciet instellen:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Het `triggerfish`-wrapperscript (geïnstalleerd door het Docker-installatieprogramma) detecteert podman ook automatisch.

### Aangepaste image of register

Overschrijf de image met `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Na de installatie

### Installatiewizard start niet

Na de binaire installatie voert het installatieprogramma `triggerfish dive --install-daemon` uit om de installatiewizard te starten. Als die niet start:

1. Voer hem handmatig uit: `triggerfish dive`
2. Als u "Terminal requirement not met" ziet, vereist de wizard een interactieve TTY. SSH-sessies, CI-pipelines en doorgesluisde invoer werken niet. Configureer `triggerfish.yaml` dan handmatig.

### Automatische Signal-kanaalsinstallatie mislukt

Signal vereist `signal-cli`, een Java-applicatie. Het auto-installatieprogramma downloadt een voorgebouwd `signal-cli`-binair bestand en een JRE 25-runtime. Mislukkingen kunnen optreden als:

- **Geen schrijftoegang tot de installatiedirectory.** Controleer machtigingen op `~/.triggerfish/signal-cli/`.
- **JRE-download mislukt.** Het installatieprogramma haalt op van Adoptium. Netwerkbeperkingen of bedrijfsproxy's kunnen dit blokkeren.
- **Architectuur niet ondersteund.** JRE-auto-installatie ondersteunt alleen x64 en aarch64.

Als de auto-installatie mislukt, installeer `signal-cli` dan handmatig en zorg ervoor dat het in uw PATH staat. Zie de [Signal-kanaaldocumentatie](/nl-NL/channels/signal) voor handmatige installatiestappen.
