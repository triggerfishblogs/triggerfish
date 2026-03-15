# Troubleshooting: Installation

## Binary Installer Issues

### Checksum verification failed

Installer binary ಜೊತೆ `SHA256SUMS.txt` file download ಮಾಡಿ installation ಮೊದಲು hash verify ಮಾಡುತ್ತದೆ. ಇದು fail ಆದರೆ:

- **Network download interrupt ಮಾಡಿದೆ.** Partial download delete ಮಾಡಿ ಮತ್ತೆ try ಮಾಡಿ.
- **Mirror ಅಥವಾ CDN stale content serve ಮಾಡಿದೆ.** ಕೆಲವು ನಿಮಿಷ ಕಾದು retry ಮಾಡಿ. Installer GitHub Releases ನಿಂದ fetch ಮಾಡುತ್ತದೆ.
- **SHA256SUMS.txt ನಲ್ಲಿ asset ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ.** Release ನಿಮ್ಮ platform ಗಾಗಿ checksum ಇಲ್ಲದೆ publish ಆಗಿದೆ. [GitHub issue](https://github.com/greghavens/triggerfish/issues) file ಮಾಡಿ.

Installer Linux ನಲ್ಲಿ `sha256sum` ಮತ್ತು macOS ನಲ್ಲಿ `shasum -a 256` ಬಳಸುತ್ತದೆ. ಯಾವೂ available ಇಲ್ಲದಿದ್ದರೆ download verify ಮಾಡಲಾಗುವುದಿಲ್ಲ.

### `/usr/local/bin` ಗೆ write ಮಾಡಲು Permission denied

Installer ಮೊದಲು `/usr/local/bin` try ಮಾಡಿ `~/.local/bin` ಗೆ fallback ಮಾಡುತ್ತದೆ. ಯಾವೂ ಕೆಲಸ ಮಾಡದಿದ್ದರೆ:

```bash
# Option 1: System-wide install ಗಾಗಿ sudo ಜೊತೆ ಚಲಾಯಿಸಿ
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: ~/.local/bin create ಮಾಡಿ PATH ಗೆ add ಮಾಡಿ
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# ನಂತರ installer ಮತ್ತೆ ಚಲಾಯಿಸಿ
```

### macOS quarantine warning

macOS internet ನಿಂದ downloaded binaries block ಮಾಡುತ್ತದೆ. Installer quarantine attribute clear ಮಾಡಲು `xattr -cr` ಚಲಾಯಿಸುತ್ತದೆ, ಆದರೆ binary manually download ಮಾಡಿದ್ದರೆ:

```bash
xattr -cr /usr/local/bin/triggerfish
```

ಅಥವಾ Finder ನಲ್ಲಿ binary ಅನ್ನು right-click ಮಾಡಿ "Open" ಆರಿಸಿ, security prompt confirm ಮಾಡಿ.

### Install ನಂತರ PATH update ಆಗಿಲ್ಲ

Installer install directory ಅನ್ನು ನಿಮ್ಮ shell profile (`.zshrc`, `.bashrc`, ಅಥವಾ `.bash_profile`) ಗೆ add ಮಾಡುತ್ತದೆ. Installation ನಂತರ `triggerfish` command ಕಂಡುಹಿಡಿಯಲಾಗದಿದ್ದರೆ:

1. ಹೊಸ terminal window open ಮಾಡಿ (ಪ್ರಸ್ತುತ shell profile changes pick up ಮಾಡುವುದಿಲ್ಲ)
2. ಅಥವಾ profile manually source ಮಾಡಿ: `source ~/.zshrc` (ನಿಮ್ಮ shell ಬಳಸುವ profile file)

Installer PATH update skip ಮಾಡಿದ್ದರೆ, install directory ಈಗಾಗಲೇ PATH ನಲ್ಲಿ ಇದೆ ಎಂದು ಅರ್ಥ.

---

## Source ನಿಂದ Build ಮಾಡುವ ಸಮಸ್ಯೆಗಳು

### Deno ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

From-source installer (`deploy/scripts/install-from-source.sh`) Deno ಇಲ್ಲದಿದ್ದರೆ automatically install ಮಾಡುತ್ತದೆ. ಅದು fail ಆದರೆ:

```bash
# Deno manually install ಮಾಡಿ
curl -fsSL https://deno.land/install.sh | sh

# Verify ಮಾಡಿ
deno --version   # 2.x ಇರಬೇಕು
```

### Compile permission errors ಜೊತೆ fail ಆಗುತ್ತದೆ

`deno compile` command `--allow-all` ಅಗತ್ಯ ಏಕೆಂದರೆ compiled binary ಗೆ full system access (network, filesystem, FFI for SQLite, subprocess spawning) ಬೇಕು. Compilation ಸಮಯದಲ್ಲಿ permission errors ಕಂಡರೆ, target directory ಗೆ write access ಇರುವ user ಆಗಿ install script ಚಲಾಯಿಸುತ್ತಿದ್ದೀರಾ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ.

### Specific branch ಅಥವಾ version

Specific branch clone ಮಾಡಲು `TRIGGERFISH_BRANCH` set ಮಾಡಿ:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Binary installer ಗಾಗಿ `TRIGGERFISH_VERSION` set ಮಾಡಿ:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-Specific Issues

### PowerShell execution policy installer block ಮಾಡುತ್ತದೆ

PowerShell ಅನ್ನು Administrator ಆಗಿ ಚಲಾಯಿಸಿ script execution allow ಮಾಡಿ:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

ನಂತರ installer ಮತ್ತೆ ಚಲಾಯಿಸಿ.

### Windows Service compilation fail ಆಗುತ್ತದೆ

Windows installer .NET Framework 4.x ನ `csc.exe` ಬಳಸಿ fly ನಲ್ಲಿ C# service wrapper compile ಮಾಡುತ್ತದೆ. Compilation fail ಆದರೆ:

1. **.NET Framework install ಆಗಿದೆ ಎಂದು Verify ಮಾಡಿ.** Command prompt ನಲ್ಲಿ `where csc.exe` ಚಲಾಯಿಸಿ. Installer `%WINDIR%\Microsoft.NET\Framework64\` ನಲ್ಲಿ .NET Framework directory ಹುಡುಕುತ್ತದೆ.
2. **Administrator ಆಗಿ ಚಲಾಯಿಸಿ.** Service installation ಗೆ elevated privileges ಅಗತ್ಯ.
3. **Fallback.** Service compilation fail ಆದರೆ Triggerfish ಅನ್ನು manually ಚಲಾಯಿಸಬಹುದು: `triggerfish run` (foreground mode). Terminal open ಇರಬೇಕಾಗುತ್ತದೆ.

### Upgrade ಸಮಯದಲ್ಲಿ `Move-Item` fail ಆಗುತ್ತದೆ

ಹಳೆಯ versions ನ Windows installer `Move-Item -Force` ಬಳಸುತ್ತಿತ್ತು, target binary in use ಆದಾಗ fail ಆಗುತ್ತಿತ್ತು. Version 0.3.4+ ನಲ್ಲಿ fix ಮಾಡಲಾಗಿದೆ. ಹಳೆಯ version ನಲ್ಲಿ ಇದನ್ನು ಎದುರಿಸಿದರೆ, ಮೊದಲು service manually stop ಮಾಡಿ:

```powershell
Stop-Service Triggerfish
# ನಂತರ installer ಮತ್ತೆ ಚಲಾಯಿಸಿ
```

---

## Docker Issues

### Container ತಕ್ಷಣ exit ಮಾಡುತ್ತದೆ

Container logs check ಮಾಡಿ:

```bash
docker logs triggerfish
```

ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:

- **Config file missing.** ನಿಮ್ಮ `triggerfish.yaml` ಅನ್ನು `/data/` ಗೆ mount ಮಾಡಿ:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict.** Port 18789 ಅಥವಾ 18790 in use ಆಗಿದ್ದರೆ, gateway start ಮಾಡಲಾಗುವುದಿಲ್ಲ.
- **Volume ನಲ್ಲಿ Permission denied.** Container UID 65534 (nonroot) ಆಗಿ ಚಲಿಸುತ್ತದೆ. Volume ಅಂಥ user ಮೂಲಕ writable ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ.

### Host ನಿಂದ Triggerfish ಗೆ Access ಮಾಡಲಾಗುತ್ತಿಲ್ಲ

Gateway default ಆಗಿ container ಒಳಗೆ `127.0.0.1` ಗೆ bind ಆಗುತ್ತದೆ. Host ನಿಂದ access ಮಾಡಲು, Docker compose file ports `18789` ಮತ್ತು `18790` map ಮಾಡುತ್ತದೆ. `docker run` directly ಬಳಸುತ್ತಿದ್ದರೆ:

```bash
-p 18789:18789 -p 18790:18790
```

### Docker ಬದಲಾಗಿ Podman

Docker install script container runtime ಆಗಿ `podman` auto-detect ಮಾಡುತ್ತದೆ. Explicitly set ಕೂಡ ಮಾಡಬಹುದು:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Docker installer ಮೂಲಕ install ಮಾಡಿದ `triggerfish` wrapper script ಕೂಡ podman auto-detect ಮಾಡುತ್ತದೆ.

### Custom image ಅಥವಾ registry

`TRIGGERFISH_IMAGE` ಜೊತೆ image override ಮಾಡಿ:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-Installation

### Setup wizard start ಆಗುತ್ತಿಲ್ಲ

Binary installation ನಂತರ, installer setup wizard launch ಮಾಡಲು `triggerfish dive --install-daemon` ಚಲಾಯಿಸುತ್ತದೆ. Start ಆಗದಿದ್ದರೆ:

1. Manually ಚಲಾಯಿಸಿ: `triggerfish dive`
2. "Terminal requirement not met" ಕಂಡರೆ, wizard ಗೆ interactive TTY ಅಗತ್ಯ. SSH sessions, CI pipelines, ಮತ್ತು piped input ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ. ಬದಲಾಗಿ `triggerfish.yaml` manually configure ಮಾಡಿ.

### Signal channel auto-install fail ಆಗುತ್ತದೆ

Signal ಗೆ Java application ಆದ `signal-cli` ಅಗತ್ಯ. Auto-installer pre-built `signal-cli` binary ಮತ್ತು JRE 25 runtime download ಮಾಡುತ್ತದೆ. Failures ಇಲ್ಲಿ ಆಗಬಹುದು:

- **Install directory ಗೆ write access ಇಲ್ಲ.** `~/.triggerfish/signal-cli/` ನ permissions check ಮಾಡಿ.
- **JRE download fail ಆಯಿತು.** Installer Adoptium ನಿಂದ fetch ಮಾಡುತ್ತದೆ. Network restrictions ಅಥವಾ corporate proxies block ಮಾಡಬಹುದು.
- **Architecture support ಇಲ್ಲ.** JRE auto-install x64 ಮತ್ತು aarch64 ಮಾತ್ರ support ಮಾಡುತ್ತದೆ.

Auto-install fail ಆದರೆ, `signal-cli` manually install ಮಾಡಿ PATH ನಲ್ಲಿ ಇದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ. Manual setup steps ಗಾಗಿ [Signal channel docs](/kn-IN/channels/signal) ನೋಡಿ.
