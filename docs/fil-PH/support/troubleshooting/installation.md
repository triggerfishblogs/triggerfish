# Troubleshooting: Installation

## Mga Isyu sa Binary Installer

### Nabigo ang checksum verification

Nagda-download ang installer ng `SHA256SUMS.txt` file kasabay ng binary at vine-verify ang hash bago mag-install. Kung mabigo ito:

- **Na-interrupt ng network ang download.** I-delete ang partial download at subukan ulit.
- **Nag-serve ng stale content ang mirror o CDN.** Maghintay ng ilang minuto at i-retry. Kumukuha ang installer mula sa GitHub Releases.
- **Hindi nahanap ang asset sa SHA256SUMS.txt.** Ibig sabihin nito na na-publish ang release nang walang checksum para sa iyong platform. Mag-file ng [GitHub issue](https://github.com/greghavens/triggerfish/issues).

Gumagamit ang installer ng `sha256sum` sa Linux at `shasum -a 256` sa macOS. Kung wala ang kahit alin, hindi nito ma-verify ang download.

### Permission denied sa pagsulat sa `/usr/local/bin`

Sinusubukan muna ng installer ang `/usr/local/bin`, pagkatapos ay bumabagsak sa `~/.local/bin`. Kung walang gagana sa dalawa:

```bash
# Option 1: Patakbuhin gamit ang sudo para sa system-wide install
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: Gumawa ng ~/.local/bin at idagdag sa PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Pagkatapos ay patakbuhin ulit ang installer
```

### macOS quarantine warning

Bina-block ng macOS ang mga binaries na na-download mula sa internet. Nagpapatakbo ang installer ng `xattr -cr` para alisin ang quarantine attribute, pero kung mano-mano mong na-download ang binary, patakbuhin ang:

```bash
xattr -cr /usr/local/bin/triggerfish
```

O i-right-click ang binary sa Finder, piliin ang "Open", at i-confirm ang security prompt.

### Hindi na-update ang PATH pagkatapos ng install

Idinadagdag ng installer ang install directory sa iyong shell profile (`.zshrc`, `.bashrc`, o `.bash_profile`). Kung hindi mahanap ang `triggerfish` command pagkatapos ng installation:

1. Magbukas ng bagong terminal window (hindi kukunin ng kasalukuyang shell ang mga profile changes)
2. O mano-manong i-source ang iyong profile: `source ~/.zshrc` (o kung alinmang profile file ang ginagamit ng shell mo)

Kung na-skip ng installer ang PATH update, ibig sabihin nasa PATH mo na ang install directory.

---

## Pagbu-build mula sa Source

### Hindi nahanap ang Deno

Awtomatikong ini-install ng from-source installer (`deploy/scripts/install-from-source.sh`) ang Deno kung wala ito. Kung mabigo iyon:

```bash
# Mano-manong i-install ang Deno
curl -fsSL https://deno.land/install.sh | sh

# I-verify
deno --version   # Dapat 2.x
```

### Nabigo ang compile dahil sa permission errors

Ang `deno compile` command ay nangangailangan ng `--allow-all` dahil nangangailangan ang compiled binary ng buong system access (network, filesystem, FFI para sa SQLite, subprocess spawning). Kung makakita ka ng permission errors habang nagco-compile, siguraduhing pinapatakbo mo ang install script bilang user na may write access sa target directory.

### Specific na branch o version

I-set ang `TRIGGERFISH_BRANCH` para mag-clone ng specific branch:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Para sa binary installer, i-set ang `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Mga Isyu na Specific sa Windows

### Bina-block ng PowerShell execution policy ang installer

Patakbuhin ang PowerShell bilang Administrator at payagan ang script execution:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Pagkatapos ay patakbuhin ulit ang installer.

### Nabigo ang Windows Service compilation

Nagco-compile ang Windows installer ng C# service wrapper on the fly gamit ang `csc.exe` mula sa .NET Framework 4.x. Kung mabigo ang compilation:

1. **I-verify na naka-install ang .NET Framework.** Patakbuhin ang `where csc.exe` sa command prompt. Hinahanap ng installer sa .NET Framework directory sa ilalim ng `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Patakbuhin bilang Administrator.** Nangangailangan ng elevated privileges ang service installation.
3. **Fallback.** Kung mabigo ang service compilation, puwede mo pa ring patakbuhin ang Triggerfish nang mano-mano: `triggerfish run` (foreground mode). Kailangan mong panatilihing bukas ang terminal.

### Nabigo ang `Move-Item` habang nag-u-upgrade

Ginamit ng mga lumang versions ng Windows installer ang `Move-Item -Force` na nabibigo kapag ginagamit ang target binary. Na-fix na ito sa version 0.3.4+. Kung natamaan mo ito sa mas lumang version, mano-manong ihinto muna ang service:

```powershell
Stop-Service Triggerfish
# Pagkatapos ay patakbuhin ulit ang installer
```

---

## Mga Isyu sa Docker

### Agad nag-exit ang container

Tingnan ang container logs:

```bash
docker logs triggerfish
```

Mga karaniwang dahilan:

- **Walang config file.** I-mount ang iyong `triggerfish.yaml` sa `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict.** Kung ginagamit na ang port 18789 o 18790, hindi makapag-start ang gateway.
- **Permission denied sa volume.** Tumatakbo ang container bilang UID 65534 (nonroot). Siguraduhing writable ang volume para sa user na iyon.

### Hindi maa-access ang Triggerfish mula sa host

Naka-bind ang gateway sa `127.0.0.1` sa loob ng container bilang default. Para ma-access ito mula sa host, mina-map ng Docker compose file ang ports `18789` at `18790`. Kung gumagamit ka ng `docker run` nang direkta, idagdag ang:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman sa halip na Docker

Awtomatikong nide-detect ng Docker install script ang `podman` bilang container runtime. Puwede mo ring i-set nang explicitly:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Awtomatikong nide-detect din ng `triggerfish` wrapper script (ini-install ng Docker installer) ang podman.

### Custom na image o registry

I-override ang image gamit ang `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Pagkatapos ng Installation

### Hindi nagsta-start ang setup wizard

Pagkatapos ng binary installation, pinapatakbo ng installer ang `triggerfish dive --install-daemon` para i-launch ang setup wizard. Kung hindi ito mag-start:

1. Mano-manong patakbuhin ito: `triggerfish dive`
2. Kung makakita ka ng "Terminal requirement not met", nangangailangan ang wizard ng interactive TTY. Hindi gagana ang SSH sessions, CI pipelines, at piped input. Mano-manong i-configure ang `triggerfish.yaml` sa halip.

### Nabigo ang Signal channel auto-install

Nangangailangan ang Signal ng `signal-cli`, na isang Java application. Nagda-download ang auto-installer ng pre-built na `signal-cli` binary at JRE 25 runtime. Puwedeng mabigo kung:

- **Walang write access sa install directory.** Tingnan ang permissions sa `~/.triggerfish/signal-cli/`.
- **Nabigo ang JRE download.** Kumukuha ang installer mula sa Adoptium. Puwedeng ma-block ito ng network restrictions o corporate proxies.
- **Hindi supported ang architecture.** Ang JRE auto-install ay sumusuporta lamang sa x64 at aarch64.

Kung mabigo ang auto-install, mano-manong i-install ang `signal-cli` at siguraduhing nasa iyong PATH ito. Tingnan ang [Signal channel docs](/channels/signal) para sa mga manual setup steps.
