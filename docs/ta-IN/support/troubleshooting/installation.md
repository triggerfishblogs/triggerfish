# Troubleshooting: Installation

## Binary Installer Issues

### Checksum verification failed

Installer binary யுடன் `SHA256SUMS.txt` file download செய்து installation க்கு முன்பு hash verify செய்கிறது. இது fail ஆனால்:

- **Network download interrupt செய்தது.** Partial download delete செய்து மீண்டும் try செய்யவும்.
- **Mirror அல்லது CDN stale content serve செய்தது.** சில நிமிடங்கள் காத்திருந்து retry செய்யவும். Installer GitHub Releases இலிருந்து fetch செய்கிறது.
- **SHA256SUMS.txt இல் asset கண்டுபிடிக்கப்படவில்லை.** Release உங்கள் platform க்கான checksum இல்லாமல் published ஆனது. [GitHub issue](https://github.com/greghavens/triggerfish/issues) file செய்யவும்.

Installer Linux இல் `sha256sum` மற்றும் macOS இல் `shasum -a 256` பயன்படுத்துகிறது. எதுவும் available இல்லையென்றால், download verify செய்ய முடியாது.

### `/usr/local/bin` க்கு write செய்ய Permission denied

Installer முதலில் `/usr/local/bin` try செய்கிறது, பின்னர் `~/.local/bin` க்கு fallback ஆகிறது. எதுவும் வேலை செய்யாவிட்டால்:

```bash
# Option 1: System-wide install க்கு sudo உடன் இயக்கவும்
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: ~/.local/bin உருவாக்கி PATH க்கு சேர்க்கவும்
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# பின்னர் installer மீண்டும் இயக்கவும்
```

### macOS quarantine warning

macOS internet இலிருந்து downloaded binaries block செய்கிறது. Installer `xattr -cr` இயக்கி quarantine attribute clear செய்கிறது, ஆனால் binary manually download செய்தால்:

```bash
xattr -cr /usr/local/bin/triggerfish
```

அல்லது Finder இல் binary right-click செய்து, "Open" select செய்து, security prompt confirm செய்யவும்.

### Install க்கு பிறகு PATH update ஆகவில்லை

Installer install directory ஐ உங்கள் shell profile (`.zshrc`, `.bashrc`, அல்லது `.bash_profile`) க்கு சேர்க்கிறது. Installation க்கு பிறகு `triggerfish` command கண்டுபிடிக்கப்படவில்லையென்றால்:

1. புதிய terminal window திறக்கவும் (current shell profile changes pick up செய்யாது)
2. அல்லது profile manually source செய்யவும்: `source ~/.zshrc` (உங்கள் shell பயன்படுத்தும் profile file எதுவாக இருந்தாலும்)

Installer PATH update skip செய்தால், install directory already PATH இல் இருக்கும்.

---

## Source இலிருந்து Build செய்வது

### Deno கண்டுபிடிக்கப்படவில்லை

From-source installer (`deploy/scripts/install-from-source.sh`) Deno present இல்லையென்றால் automatically install செய்கிறது. அது fail ஆனால்:

```bash
# Manually Deno install செய்யவும்
curl -fsSL https://deno.land/install.sh | sh

# Verify செய்யவும்
deno --version   # 2.x ஆக இருக்க வேண்டும்
```

### Permission errors உடன் Compile fail ஆகிறது

`deno compile` command க்கு `--allow-all` தேவை, ஏனென்றால் compiled binary க்கு full system access தேவை (network, filesystem, SQLite க்கு FFI, subprocess spawning). Compilation போது permission errors பார்த்தால், target directory க்கு write access உள்ள user ஆக install script இயக்குகிறீர்கள் என்று உறுதிப்படுத்தவும்.

### Specific branch அல்லது version

Specific branch clone செய்ய `TRIGGERFISH_BRANCH` set செய்யவும்:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Binary installer க்கு, `TRIGGERFISH_VERSION` set செய்யவும்:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-Specific Issues

### PowerShell execution policy installer ஐ block செய்கிறது

PowerShell ஐ Administrator ஆக இயக்கி script execution allow செய்யவும்:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

பின்னர் installer மீண்டும் இயக்கவும்.

### Windows Service compilation fail ஆகிறது

Windows installer .NET Framework 4.x இலிருந்து `csc.exe` பயன்படுத்தி C# service wrapper fly இல் compile செய்கிறது. Compilation fail ஆனால்:

1. **.NET Framework installed என்று verify செய்யவும்.** Command prompt இல் `where csc.exe` இயக்கவும். Installer `%WINDIR%\Microsoft.NET\Framework64\` இல் .NET Framework directory தேடுகிறது.
2. **Administrator ஆக இயக்கவும்.** Service installation க்கு elevated privileges தேவை.
3. **Fallback.** Service compilation fail ஆனால், Triggerfish manually இயக்கலாம்: `triggerfish run` (foreground mode). Terminal திறந்திருக்க வேண்டும்.

### Upgrade போது `Move-Item` fail ஆகிறது

Windows installer இன் older versions `Move-Item -Force` பயன்படுத்தியது, target binary in use ஆனால் fail ஆகும். Version 0.3.4+ இல் fix ஆனது. Older version இல் இதை hit ஆனால், முதலில் manually service stop செய்யவும்:

```powershell
Stop-Service Triggerfish
# பின்னர் installer மீண்டும் இயக்கவும்
```

---

## Docker Issues

### Container உடனே exit ஆகிறது

Container logs சரிபார்க்கவும்:

```bash
docker logs triggerfish
```

பொதுவான காரணங்கள்:

- **Config file missing.** `triggerfish.yaml` ஐ `/data/` இல் mount செய்யவும்:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict.** Port 18789 அல்லது 18790 in use ஆனால், gateway start ஆக முடியாது.
- **Volume இல் Permission denied.** Container UID 65534 (nonroot) ஆக இயங்குகிறது. Volume அந்த user write செய்யக்கூடியதாக இருக்கும்படி உறுதிப்படுத்தவும்.

### Host இலிருந்து Triggerfish access செய்ய முடியவில்லை

Container இல் gateway default ஆக `127.0.0.1` க்கு bind ஆகிறது. Host இலிருந்து access செய்ய, Docker compose file ports `18789` மற்றும் `18790` map செய்கிறது. `docker run` directly பயன்படுத்தினால்:

```bash
-p 18789:18789 -p 18790:18790
```

### Docker க்கு பதிலாக Podman

Docker install script container runtime ஆக `podman` ஐ auto-detect செய்கிறது. Explicitly set செய்யலாம்:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Docker installer install செய்யும் `triggerfish` wrapper script உம் podman auto-detect செய்கிறது.

### Custom image அல்லது registry

`TRIGGERFISH_IMAGE` உடன் image override செய்யவும்:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-Installation

### Setup wizard start ஆவதில்லை

Binary installation க்கு பிறகு, installer setup wizard launch செய்ய `triggerfish dive --install-daemon` இயக்குகிறது. Start ஆகாவிட்டால்:

1. Manually இயக்கவும்: `triggerfish dive`
2. "Terminal requirement not met" பார்த்தால், wizard க்கு interactive TTY தேவை. SSH sessions, CI pipelines, மற்றும் piped input வேலை செய்யாது. பதிலாக `triggerfish.yaml` manually configure செய்யவும்.

### Signal channel auto-install fail ஆகிறது

Signal `signal-cli` தேவைப்படுகிறது, இது Java application. Auto-installer pre-built `signal-cli` binary மற்றும் JRE 25 runtime download செய்கிறது. Failures ஏற்படலாம்:

- **Install directory க்கு write access இல்லை.** `~/.triggerfish/signal-cli/` இல் permissions சரிபார்க்கவும்.
- **JRE download fail ஆகிறது.** Installer Adoptium இலிருந்து fetch செய்கிறது. Network restrictions அல்லது corporate proxies இதை block செய்யலாம்.
- **Architecture supported இல்லை.** JRE auto-install x64 மற்றும் aarch64 மட்டும் support செய்கிறது.

Auto-install fail ஆனால், `signal-cli` manually install செய்து PATH இல் இருப்பதை உறுதிப்படுத்தவும். Manual setup steps க்கு [Signal channel docs](/ta-IN/channels/signal) பாருங்கள்.
