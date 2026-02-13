# Triggerfish Deployment Guide

## Quick Install

### Linux / macOS (pre-built binary)

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

This downloads the latest release binary, verifies its SHA256 checksum, installs it, and runs the setup wizard.

To install a specific version:

```bash
TRIGGERFISH_VERSION=v0.1.0 curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

### Windows (pre-built binary)

```powershell
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

### From Source

If you prefer to build from source (requires Deno 2.x and git):

```bash
# Linux/macOS
bash deploy/scripts/install-from-source.sh

# Windows
deploy/scripts/install-from-source.ps1
```

---

## Docker

### Quick Start

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

### Interactive Setup

If you don't have a config file yet, run the wizard interactively:

```bash
docker run -it -v triggerfish-data:/data \
  ghcr.io/greghavens/triggerfish:latest dive
```

This creates `triggerfish.yaml` inside the `triggerfish-data` volume. Subsequent runs will use it automatically:

```bash
docker run -v triggerfish-data:/data \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

### Docker Compose

```bash
cd deploy/docker
cp ../../config/triggerfish.example.yaml triggerfish.yaml
# Edit triggerfish.yaml with your settings and API keys
docker compose up -d
```

### Secrets in Docker

Triggerfish does **not** use environment variables for secrets. All API keys and tokens belong in `triggerfish.yaml`, which is mounted into the container.

For additional secrets (OS keychain is unavailable in containers), Triggerfish automatically uses a file-backed secret store at `/data/secrets.json`. You can pre-populate it:

```json
{
  "anthropic_api_key": "sk-ant-...",
  "brave_api_key": "BSA..."
}
```

Mount it alongside your config:

```bash
docker run \
  -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -v ./secrets.json:/data/secrets.json \
  -p 18789:18789 \
  ghcr.io/greghavens/triggerfish:latest
```

### Data Persistence

The container stores all data under `/data`:

| Path | Contents |
|------|----------|
| `/data/triggerfish.yaml` | Configuration |
| `/data/secrets.json` | File-backed secret store |
| `/data/data/triggerfish.db` | SQLite database (sessions, cron, memory) |
| `/data/workspace/` | Agent workspaces |
| `/data/skills/` | Installed skills |
| `/data/logs/` | Log files |
| `/data/SPINE.md` | Agent identity |

Use a named volume (`-v triggerfish-data:/data`) or bind mount to persist across container restarts.

### Building Locally

```bash
make docker
# or
docker build -f deploy/docker/Dockerfile -t triggerfish:local .
```

---

## Binary Builds

### Local Build (current platform)

```bash
make build
# produces: ./triggerfish
```

### Cross-Platform Release Build

```bash
make release
# produces: dist/triggerfish-linux-x64
#           dist/triggerfish-linux-arm64
#           dist/triggerfish-macos-x64
#           dist/triggerfish-macos-arm64
#           dist/triggerfish-windows-x64.exe
#           dist/SHA256SUMS.txt
```

This uses `deno compile --target` to cross-compile all 5 platforms from any host machine. No cross-compilation toolchain required.

---

## Release Process

Releases are automated via GitHub Actions. To create a new release:

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers `.github/workflows/release.yml` which:

1. **Builds binaries** for all 5 platforms (linux x64/arm64, macOS x64/arm64, Windows x64)
2. **Creates a GitHub Release** with binaries and SHA256 checksums attached
3. **Builds and pushes a Docker image** to `ghcr.io/greghavens/triggerfish` (multi-arch: linux/amd64 + linux/arm64)

The install scripts automatically download the latest release, so new users get the newest version immediately after a release is published.

### Version Pinning

Users can install a specific version:

```bash
# Bash
TRIGGERFISH_VERSION=v0.1.0 curl -sSL .../install.sh | bash

# Docker
docker pull ghcr.io/greghavens/triggerfish:v0.1.0
```

---

## Environment Variables

Triggerfish uses only two environment variables, both for runtime detection (never for secrets):

| Variable | Purpose | Default |
|----------|---------|---------|
| `TRIGGERFISH_DOCKER` | Set to `true` in Docker containers. Switches to file-backed secrets and `/data` base dir. | unset |
| `TRIGGERFISH_DATA_DIR` | Override the data directory path. Takes precedence over Docker detection. | `~/.triggerfish` |

**API keys and tokens are never passed as environment variables.** They belong in `triggerfish.yaml` or the OS keychain.

---

## Platform Support

| Platform | Binary | Docker | Install Script |
|----------|--------|--------|----------------|
| Linux x64 | yes | yes | yes |
| Linux arm64 | yes | yes | yes |
| macOS x64 | yes | no | yes |
| macOS arm64 | yes | no | yes |
| Windows x64 | yes | no | yes (PowerShell) |
