# Troubleshooting: Installation

## Binary Installer Issues

### Checksum verification failed

Installer binary کے ساتھ `SHA256SUMS.txt` file download کرتا ہے اور installation سے پہلے hash verify کرتا ہے۔ اگر یہ fail ہو:

- **Network نے download interrupt کیا۔** Partial download delete کریں اور دوبارہ کوشش کریں۔
- **Mirror یا CDN نے stale content serve کیا۔** چند منٹ انتظار کریں اور retry کریں۔ Installer GitHub Releases سے fetch کرتا ہے۔
- **Asset SHA256SUMS.txt میں نہیں ملا۔** اس کا مطلب ہے release آپ کے platform کے لیے checksum کے بغیر publish ہوئی۔ [GitHub issue](https://github.com/greghavens/triggerfish/issues) file کریں۔

Installer Linux پر `sha256sum` اور macOS پر `shasum -a 256` استعمال کرتا ہے۔ اگر کوئی بھی دستیاب نہ ہو تو download verify نہیں ہو سکتا۔

### `/usr/local/bin` میں write کرتے ہوئے permission denied

Installer پہلے `/usr/local/bin` try کرتا ہے، پھر `~/.local/bin` پر fallback کرتا ہے۔ اگر کوئی بھی کام نہ کرے:

```bash
# Option 1: System-wide install کے لیے sudo سے چلائیں
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: ~/.local/bin بنائیں اور PATH میں add کریں
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# پھر installer دوبارہ چلائیں
```

### macOS quarantine warning

macOS internet سے downloaded binaries block کرتا ہے۔ Installer quarantine attribute clear کرنے کے لیے `xattr -cr` چلاتا ہے، لیکن اگر آپ نے binary manually download کی ہو تو چلائیں:

```bash
xattr -cr /usr/local/bin/triggerfish
```

یا Finder میں binary پر right-click کریں، "Open" select کریں، اور security prompt confirm کریں۔

### Install کے بعد PATH update نہیں ہوا

Installer install directory آپ کے shell profile (`.zshrc`، `.bashrc`، یا `.bash_profile`) میں add کرتا ہے۔ اگر installation کے بعد `triggerfish` command نہ ملے:

1. نئی terminal window کھولیں (موجودہ shell profile changes pick up نہیں کرے گا)
2. یا اپنا profile manually source کریں: `source ~/.zshrc` (یا جو بھی profile file آپ کا shell استعمال کرے)

اگر installer نے PATH update skip کیا تو اس کا مطلب ہے install directory پہلے ہی آپ کے PATH میں تھی۔

---

## Source سے Build کرنا

### Deno نہیں ملا

From-source installer (`deploy/scripts/install-from-source.sh`) Deno present نہ ہونے پر خود بخود install کرتا ہے۔ اگر یہ fail ہو:

```bash
# Deno manually install کریں
curl -fsSL https://deno.land/install.sh | sh

# Verify کریں
deno --version   # 2.x ہونا چاہیے
```

### Permission errors کے ساتھ compile fail

`deno compile` command کو `--allow-all` چاہیے کیونکہ compiled binary کو full system access (network، filesystem، SQLite کے لیے FFI، subprocess spawning) چاہیے۔ اگر compilation کے دوران permission errors آئیں تو یقینی بنائیں کہ آپ target directory میں write access رکھنے والے user کے طور پر install script چلا رہے ہیں۔

### مخصوص branch یا version

کسی مخصوص branch clone کرنے کے لیے `TRIGGERFISH_BRANCH` set کریں:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Binary installer کے لیے `TRIGGERFISH_VERSION` set کریں:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-Specific Issues

### PowerShell execution policy installer block کرتی ہے

PowerShell کو Administrator کے طور پر چلائیں اور script execution allow کریں:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

پھر installer دوبارہ چلائیں۔

### Windows Service compilation fail

Windows installer `csc.exe` from .NET Framework 4.x استعمال کر کے fly پر C# service wrapper compile کرتا ہے۔ اگر compilation fail ہو:

1. **.NET Framework install verify کریں۔** Command prompt میں `where csc.exe` چلائیں۔ Installer `%WINDIR%\Microsoft.NET\Framework64\` کے نیچے .NET Framework directory میں دیکھتا ہے۔
2. **Administrator کے طور پر چلائیں۔** Service installation کے لیے elevated privileges چاہئیں۔
3. **Fallback۔** اگر service compilation fail ہو تو آپ Triggerfish manually چلا سکتے ہیں: `triggerfish run` (foreground mode)۔ Terminal کھلی رکھنی ہوگی۔

### Upgrade کے دوران `Move-Item` fail

Windows installer کے پرانے versions نے `Move-Item -Force` استعمال کیا جو target binary in use ہونے پر fail ہوتا ہے۔ یہ version 0.3.4+ میں fix کیا گیا۔ اگر آپ کو پرانے version پر یہ مسئلہ ہو تو پہلے service manually بند کریں:

```powershell
Stop-Service Triggerfish
# پھر installer دوبارہ چلائیں
```

---

## Docker Issues

### Container فوری exit ہو جاتا ہے

Container logs check کریں:

```bash
docker logs triggerfish
```

عام وجوہات:

- **Config file missing۔** اپنی `triggerfish.yaml` کو `/data/` میں mount کریں:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict۔** اگر port 18789 یا 18790 in use ہو تو gateway start نہیں ہو سکتا۔
- **Volume پر permission denied۔** Container UID 65534 (nonroot) کے طور پر چلتا ہے۔ یقینی بنائیں کہ volume اس user کے لیے writable ہو۔

### Host سے Triggerfish access نہیں ہو سکتا

Gateway بطور ڈیفالٹ container کے اندر `127.0.0.1` سے bind ہوتا ہے۔ Host سے access کے لیے، Docker compose file ports `18789` اور `18790` map کرتی ہے۔ اگر `docker run` directly استعمال کر رہے ہوں تو add کریں:

```bash
-p 18789:18789 -p 18790:18790
```

### Docker کی بجائے Podman

Docker install script `podman` کو container runtime کے طور پر auto-detect کرتا ہے۔ آپ اسے explicitly بھی set کر سکتے ہیں:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

`triggerfish` wrapper script (Docker installer سے install) بھی podman auto-detect کرتا ہے۔

### Custom image یا registry

Image کو `TRIGGERFISH_IMAGE` سے override کریں:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-Installation

### Setup wizard start نہیں ہوتا

Binary installation کے بعد، installer setup wizard launch کرنے کے لیے `triggerfish dive --install-daemon` چلاتا ہے۔ اگر start نہ ہو:

1. اسے manually چلائیں: `triggerfish dive`
2. اگر آپ "Terminal requirement not met" دیکھیں تو wizard کو interactive TTY چاہیے۔ SSH sessions، CI pipelines، اور piped input کام نہیں کریں گے۔ اس کی بجائے `triggerfish.yaml` manually configure کریں۔

### Signal channel auto-install fail

Signal کو `signal-cli` چاہیے جو ایک Java application ہے۔ Auto-installer pre-built `signal-cli` binary اور JRE 25 runtime download کرتا ہے۔ Failures ہو سکتی ہیں اگر:

- **Install directory میں write access نہیں۔** `~/.triggerfish/signal-cli/` پر permissions check کریں۔
- **JRE download fail۔** Installer Adoptium سے fetch کرتا ہے۔ Network restrictions یا corporate proxies اسے block کر سکتے ہیں۔
- **Architecture supported نہیں۔** JRE auto-install صرف x64 اور aarch64 support کرتا ہے۔

اگر auto-install fail ہو تو `signal-cli` manually install کریں اور یقینی بنائیں کہ یہ آپ کے PATH میں ہے۔ Manual setup steps کے لیے [Signal channel docs](/ur-PK/channels/signal) دیکھیں۔
