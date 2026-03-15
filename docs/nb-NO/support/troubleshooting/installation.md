# Feilsøking: Installasjon

## Problemer med binærinstallasjon

### Kontrollsumverifisering mislyktes

Installasjonsprogrammet laster ned en `SHA256SUMS.txt`-fil ved siden av binærfilen
og verifiserer hash-verdien før installasjon. Hvis dette mislykkes:

- **Nettverket avbrøt nedlastingen.** Slett den delvise nedlastingen og prøv igjen.
- **Speil eller CDN leverte utdatert innhold.** Vent noen minutter og prøv igjen.
  Installasjonsprogrammet henter fra GitHub Releases.
- **Ressurs ikke funnet i SHA256SUMS.txt.** Dette betyr at utgivelsen ble publisert
  uten kontrollsum for din plattform. Rapporter en
  [GitHub-sak](https://github.com/greghavens/triggerfish/issues).

Installasjonsprogrammet bruker `sha256sum` på Linux og `shasum -a 256` på macOS.
Hvis ingen er tilgjengelig, kan det ikke verifisere nedlastingen.

### Tilgang nektet ved skriving til `/usr/local/bin`

Installasjonsprogrammet prøver `/usr/local/bin` først, deretter faller det tilbake
til `~/.local/bin`. Hvis ingen fungerer:

```bash
# Alternativ 1: Kjør med sudo for systemomfattende installasjon
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Alternativ 2: Opprett ~/.local/bin og legg til PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Kjør deretter installasjonsprogrammet på nytt
```

### macOS karanteneadvarsel

macOS blokkerer binærfiler lastet ned fra internett. Installasjonsprogrammet kjører
`xattr -cr` for å fjerne karanteneattributtet, men hvis du lastet ned binærfilen
manuelt, kjør:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Eller høyreklikk på binærfilen i Finder, velg «Åpne», og bekreft sikkerhetspromtet.

### PATH ikke oppdatert etter installasjon

Installasjonsprogrammet legger installasjonsmappen til shell-profilen din (`.zshrc`,
`.bashrc` eller `.bash_profile`). Hvis `triggerfish`-kommandoen ikke finnes etter
installasjon:

1. Åpne et nytt terminalvindu (den gjeldende shellet vil ikke plukke opp profiendringer)
2. Eller kildekopier profilen manuelt: `source ~/.zshrc` (eller hvilken profilfil
   shellen din bruker)

Hvis installasjonsprogrammet hoppet over PATH-oppdateringen, betyr det at
installasjonsmappen allerede var i din PATH.

---

## Bygging fra kildekode

### Deno ikke funnet

Installasjonsprogrammet fra kildekode (`deploy/scripts/install-from-source.sh`)
installerer Deno automatisk hvis det ikke er til stede. Hvis det mislykkes:

```bash
# Installer Deno manuelt
curl -fsSL https://deno.land/install.sh | sh

# Verifiser
deno --version   # Bør være 2.x
```

### Kompilering mislyktes med tillatelsefeil

`deno compile`-kommandoen trenger `--allow-all` fordi den kompilerte binærfilen
krever full systemtilgang (nettverk, filsystem, FFI for SQLite, underprosessoppretting).
Hvis du ser tillatelsefeil under kompilering, sørg for at du kjører installasjonsskriptet
som en bruker med skrivetilgang til målmappen.

### Spesifikk gren eller versjon

Sett `TRIGGERFISH_BRANCH` for å klone en spesifikk gren:

```bash
TRIGGERFISH_BRANCH=feat/min-funksjon bash deploy/scripts/install-from-source.sh
```

For binærinstallasjonsprogrammet, sett `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-spesifikke problemer

### PowerShell-kjøringspolicy blokkerer installasjonsprogrammet

Kjør PowerShell som Administrator og tillat skriptkjøring:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Kjør deretter installasjonsprogrammet på nytt.

### Windows Service-kompilering mislyktes

Windows-installasjonsprogrammet kompilerer en C#-tjenesteinpakningsfil umiddelbart
ved hjelp av `csc.exe` fra .NET Framework 4.x. Hvis kompileringen mislykkes:

1. **Verifiser at .NET Framework er installert.** Kjør `where csc.exe` i en
   kommandoprompt. Installasjonsprogrammet leter i .NET Framework-mappen under
   `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Kjør som Administrator.** Tjenesteinstallasjon krever forhøyede rettigheter.
3. **Fallback.** Hvis tjenestekompilering mislykkes, kan du fortsatt kjøre
   Triggerfish manuelt: `triggerfish run` (forgrunnsmedodus). Du må holde terminalen
   åpen.

### `Move-Item` mislykkes under oppgradering

Eldre versjoner av Windows-installasjonsprogrammet brukte `Move-Item -Force` som
mislykkes når målbinærfilen er i bruk. Dette ble rettet i versjon 0.3.4+. Hvis
du treffer dette på en eldre versjon, stopp tjenesten manuelt først:

```powershell
Stop-Service Triggerfish
# Kjør deretter installasjonsprogrammet på nytt
```

---

## Docker-problemer

### Containeren avslutter umiddelbart

Sjekk containerloggene:

```bash
docker logs triggerfish
```

Vanlige årsaker:

- **Manglende konfigurasjonsfil.** Monter `triggerfish.yaml` inn i `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Portkonflikt.** Hvis port 18789 eller 18790 er i bruk, kan ikke gatewayen starte.
- **Tilgang nektet på volum.** Containeren kjører som UID 65534 (nonroot). Sørg for
  at volumet er skrivbart av den brukeren.

### Kan ikke få tilgang til Triggerfish fra verten

Gatewayen binder seg til `127.0.0.1` inne i containeren som standard. For å få
tilgang til den fra verten tilordner Docker compose-filen portene `18789` og
`18790`. Hvis du bruker `docker run` direkte, legg til:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman i stedet for Docker

Docker-installasjonsskriptet oppdager automatisk `podman` som containerkjøretid.
Du kan også sette det eksplisitt:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

`triggerfish`-innpakningsskriptet (installert av Docker-installasjonsprogrammet)
oppdager også podman automatisk.

### Egendefinert bilde eller register

Overstyr bildet med `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Etter installasjon

### Oppsettveiviseren starter ikke

Etter binærinstallasjon kjører installasjonsprogrammet `triggerfish dive --install-daemon`
for å starte oppsettveiviseren. Hvis den ikke starter:

1. Kjør den manuelt: `triggerfish dive`
2. Hvis du ser «Terminal requirement not met», krever veiviseren en interaktiv TTY.
   SSH-sesjoner, CI-pipelines og skjøvet inn-inndata fungerer ikke. Konfigurer
   `triggerfish.yaml` manuelt i stedet.

### Signal-kanal auto-installasjon mislyktes

Signal krever `signal-cli`, som er et Java-program. Auto-installasjonsprogrammet
laster ned en forhåndsbygd `signal-cli`-binær og en JRE 25-kjøretid. Feil kan
skje hvis:

- **Ingen skrivetilgang til installasjonsmappen.** Sjekk tillatelsene på
  `~/.triggerfish/signal-cli/`.
- **JRE-nedlasting mislyktes.** Installasjonsprogrammet henter fra Adoptium.
  Nettverksbegrensninger eller bedriftsproxyservere kan blokkere dette.
- **Arkitekturen er ikke støttet.** JRE auto-install støtter kun x64 og aarch64.

Hvis auto-installasjon mislykkes, installer `signal-cli` manuelt og sørg for at
det er i din PATH. Se [Signal-kanaldokumentasjonen](/nb-NO/channels/signal) for
manuelle oppsettrinn.
