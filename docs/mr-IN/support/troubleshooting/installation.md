# Troubleshooting: Installation

## Binary Installer Issues

### Checksum verification failed

Installer binary सोबत `SHA256SUMS.txt` file download करतो आणि installation पूर्वी hash verify करतो. हे fail झाल्यास:

- **Network ने download interrupt केले.** Partial download delete करा आणि पुन्हा try करा.
- **Mirror किंवा CDN ने stale content serve केला.** काही minutes wait करा आणि retry करा. Installer GitHub Releases मधून fetch करतो.
- **SHA256SUMS.txt मध्ये Asset not found.** याचा अर्थ release तुमच्या platform साठी checksum शिवाय published झाला. [GitHub issue](https://github.com/greghavens/triggerfish/issues) file करा.

Installer Linux वर `sha256sum` आणि macOS वर `shasum -a 256` वापरतो. कोणतेही available नसल्यास, download verify करू शकत नाही.

### `/usr/local/bin` ला write करण्याची Permission denied

Installer आधी `/usr/local/bin` try करतो, नंतर `~/.local/bin` ला fallback होतो. कोणतेही काम नाही केल्यास:

```bash
# Option 1: System-wide install साठी sudo सह run करा
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: ~/.local/bin create करा आणि PATH ला add करा
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# नंतर installer पुन्हा run करा
```

### macOS quarantine warning

macOS internet मधून downloaded binaries block करतो. Installer quarantine attribute clear करण्यासाठी `xattr -cr` run करतो, पण binary manually download केले असल्यास:

```bash
xattr -cr /usr/local/bin/triggerfish
```

किंवा Finder मध्ये binary right-click करा, "Open" select करा, आणि security prompt confirm करा.

### Install नंतर PATH updated नाही

Installer shell profile (`.zshrc`, `.bashrc`, किंवा `.bash_profile`) मध्ये install directory add करतो. Installation नंतर `triggerfish` command सापडत नसल्यास:

1. नवीन terminal window उघडा (current shell profile changes pick up करणार नाही)
2. किंवा profile manually source करा: `source ~/.zshrc` (किंवा तुमचा shell वापरत असलेला profile file)

Installer ने PATH update skip केल्यास, install directory आधीच तुमच्या PATH मध्ये होती.

---

## Source मधून Build करणे

### Deno सापडत नाही

From-source installer (`deploy/scripts/install-from-source.sh`) present नसल्यास Deno automatically install करतो. ते fail झाल्यास:

```bash
# Deno manually install करा
curl -fsSL https://deno.land/install.sh | sh

# Verify करा
deno --version   # 2.x असायला हवे
```

### Permission errors सह Compile fails

`deno compile` command ला `--allow-all` आवश्यक आहे कारण compiled binary ला full system access आवश्यक आहे (network, filesystem, FFI for SQLite, subprocess spawning). Compilation दरम्यान permission errors दिसल्यास, install script target directory ला write access असलेल्या user म्हणून run करत असल्याची खात्री करा.

### Specific branch किंवा version

Specific branch clone करण्यासाठी `TRIGGERFISH_BRANCH` set करा:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Binary installer साठी, `TRIGGERFISH_VERSION` set करा:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-Specific Issues

### PowerShell execution policy installer block करतो

PowerShell Administrator म्हणून run करा आणि script execution allow करा:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

नंतर installer पुन्हा run करा.

### Windows Service compilation fails

Windows installer `csc.exe` वापरून C# service wrapper compile करतो .NET Framework 4.x मधून. Compilation fail झाल्यास:

1. **.NET Framework installed आहे verify करा.** Command prompt मध्ये `where csc.exe` run करा. Installer .NET Framework directory खाली `%WINDIR%\Microsoft.NET\Framework64\` मध्ये शोधतो.
2. **Administrator म्हणून run करा.** Service installation ला elevated privileges आवश्यक आहेत.
3. **Fallback.** Service compilation fail झाल्यास, Triggerfish manually run करता येतो: `triggerfish run` (foreground mode). Terminal उघडे ठेवणे आवश्यक आहे.

### Upgrade दरम्यान `Move-Item` fails

Windows installer च्या जुन्या versions ने `Move-Item -Force` वापरले जे target binary in use असताना fail होते. हे version 0.3.4+ मध्ये fixed झाले. जुन्या version वर हे आल्यास, आधी service manually stop करा:

```powershell
Stop-Service Triggerfish
# नंतर installer पुन्हा run करा
```

---

## Docker Issues

### Container लगेच exit होतो

Container logs check करा:

```bash
docker logs triggerfish
```

Common causes:

- **Missing config file.** `triggerfish.yaml` `/data/` मध्ये mount करा:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict.** Port 18789 किंवा 18790 in use असल्यास, gateway start होऊ शकत नाही.
- **Volume वर Permission denied.** Container UID 65534 (nonroot) म्हणून run होतो. Volume त्या user ने writable असल्याची खात्री करा.

### Host मधून Triggerfish access करता येत नाही

Gateway container च्या आत default `127.0.0.1` ला bind करतो. Host मधून access करण्यासाठी, Docker compose file ports `18789` आणि `18790` map करतो. `docker run` directly वापरत असल्यास, add करा:

```bash
-p 18789:18789 -p 18790:18790
```

### Docker ऐवजी Podman

Docker install script container runtime म्हणून `podman` auto-detect करतो. Explicitly देखील set करता येतो:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Docker installer ने installed `triggerfish` wrapper script देखील podman auto-detect करतो.

### Custom image किंवा registry

`TRIGGERFISH_IMAGE` सह image override करा:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-Installation

### Setup wizard start होत नाही

Binary installation नंतर, installer setup wizard launch करण्यासाठी `triggerfish dive --install-daemon` run करतो. Start नाही झाल्यास:

1. Manually run करा: `triggerfish dive`
2. "Terminal requirement not met" दिसल्यास, wizard ला interactive TTY आवश्यक आहे. SSH sessions, CI pipelines, आणि piped input काम करणार नाहीत. त्याऐवजी `triggerfish.yaml` manually configure करा.

### Signal channel auto-install fails

Signal ला `signal-cli` आवश्यक आहे, जे Java application आहे. Auto-installer pre-built `signal-cli` binary आणि JRE 25 runtime download करतो. Failures होऊ शकतात जर:

- **Install directory ला write access नाही.** `~/.triggerfish/signal-cli/` वर permissions check करा.
- **JRE download fails.** Installer Adoptium मधून fetch करतो. Network restrictions किंवा corporate proxies हे block करू शकतात.
- **Architecture supported नाही.** JRE auto-install फक्त x64 आणि aarch64 support करतो.

Auto-install fail झाल्यास, `signal-cli` manually install करा आणि PATH मध्ये असल्याची खात्री करा. Manual setup steps साठी [Signal channel docs](/mr-IN/channels/signal) पहा.
