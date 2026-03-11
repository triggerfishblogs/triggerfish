# Troubleshooting: Installation

## Binary Installer Issues

### Checksum verification failed

The installer downloads a `SHA256SUMS.txt` file alongside the binary and verifies the hash before installation. If this fails:

- **Network interrupted the download.** Delete the partial download and try again.
- **Mirror or CDN served stale content.** Wait a few minutes and retry. The installer fetches from GitHub Releases.
- **Asset not found in SHA256SUMS.txt.** This means the release was published without a checksum for your platform. File a [GitHub issue](https://github.com/greghavens/triggerfish/issues).

The installer uses `sha256sum` on Linux and `shasum -a 256` on macOS. If neither is available, it cannot verify the download.

### Permission denied writing to `/usr/local/bin`

The installer tries `/usr/local/bin` first, then falls back to `~/.local/bin`. If neither works:

```bash
# Option 1: Run with sudo for system-wide install
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2: Create ~/.local/bin and add to PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Then re-run the installer
```

### macOS quarantine warning

macOS blocks binaries downloaded from the internet. The installer runs `xattr -cr` to clear the quarantine attribute, but if you downloaded the binary manually, run:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Or right-click the binary in Finder, select "Open", and confirm the security prompt.

### PATH not updated after install

The installer adds the install directory to your shell profile (`.zshrc`, `.bashrc`, or `.bash_profile`). If the `triggerfish` command is not found after installation:

1. Open a new terminal window (the current shell will not pick up profile changes)
2. Or source your profile manually: `source ~/.zshrc` (or whichever profile file your shell uses)

If the installer skipped the PATH update, it means the install directory was already in your PATH.

---

## Building from Source

### Deno not found

The from-source installer (`deploy/scripts/install-from-source.sh`) installs Deno automatically if it is not present. If that fails:

```bash
# Install Deno manually
curl -fsSL https://deno.land/install.sh | sh

# Verify
deno --version   # Should be 2.x
```

### Compile fails with permission errors

The `deno compile` command needs `--allow-all` because the compiled binary requires full system access (network, filesystem, FFI for SQLite, subprocess spawning). If you see permission errors during compilation, make sure you are running the install script as a user with write access to the target directory.

### Specific branch or version

Set `TRIGGERFISH_BRANCH` to clone a specific branch:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

For the binary installer, set `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-Specific Issues

### PowerShell execution policy blocks the installer

Run PowerShell as Administrator and allow script execution:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then re-run the installer.

### Windows Service compilation fails

The Windows installer compiles a C# service wrapper on the fly using `csc.exe` from .NET Framework 4.x. If the compilation fails:

1. **Verify .NET Framework is installed.** Run `where csc.exe` in a command prompt. The installer looks in the .NET Framework directory under `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Run as Administrator.** Service installation requires elevated privileges.
3. **Fallback.** If service compilation fails, you can still run Triggerfish manually: `triggerfish run` (foreground mode). You will need to keep the terminal open.

### `Move-Item` fails during upgrade

Older versions of the Windows installer used `Move-Item -Force` which fails when the target binary is in use. This was fixed in version 0.3.4+. If you hit this on an older version, manually stop the service first:

```powershell
Stop-Service Triggerfish
# Then re-run the installer
```

---

## Docker Issues

### Container exits immediately

Check the container logs:

```bash
docker logs triggerfish
```

Common causes:

- **Missing config file.** Mount your `triggerfish.yaml` into `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict.** If port 18789 or 18790 is in use, the gateway cannot start.
- **Permission denied on volume.** The container runs as UID 65534 (nonroot). Make sure the volume is writable by that user.

### Cannot access Triggerfish from the host

The gateway binds to `127.0.0.1` inside the container by default. To access it from the host, the Docker compose file maps ports `18789` and `18790`. If you are using `docker run` directly, add:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman instead of Docker

The Docker install script auto-detects `podman` as the container runtime. You can also set it explicitly:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

The `triggerfish` wrapper script (installed by the Docker installer) also auto-detects podman.

### Custom image or registry

Override the image with `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-Installation

### Setup wizard does not start

After binary installation, the installer runs `triggerfish dive --install-daemon` to launch the setup wizard. If it does not start:

1. Run it manually: `triggerfish dive`
2. If you see "Terminal requirement not met", the wizard requires an interactive TTY. SSH sessions, CI pipelines, and piped input will not work. Configure `triggerfish.yaml` manually instead.

### Signal channel auto-install fails

Signal requires `signal-cli`, which is a Java application. The auto-installer downloads a pre-built `signal-cli` binary and a JRE 25 runtime. Failures can happen if:

- **No write access to the install directory.** Check permissions on `~/.triggerfish/signal-cli/`.
- **JRE download fails.** The installer fetches from Adoptium. Network restrictions or corporate proxies can block this.
- **Architecture not supported.** JRE auto-install supports x64 and aarch64 only.

If auto-install fails, install `signal-cli` manually and ensure it is in your PATH. See the [Signal channel docs](/en-GB/channels/signal) for manual setup steps.
