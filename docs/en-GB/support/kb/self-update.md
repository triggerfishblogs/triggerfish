# KB: Self-Update Process

How `triggerfish update` works, what can go wrong, and how to recover.

## How It Works

The update command downloads and installs the latest release from GitHub:

1. **Version check.** Fetches the latest release tag from the GitHub API. If you are already on the latest version, exits early:
   ```
   Already up to date (v0.4.2)
   ```
   Development builds (`VERSION=dev`) skip the version check and always proceed.

2. **Platform detection.** Determines the correct binary asset name based on your OS and architecture (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Download.** Fetches the binary and `SHA256SUMS.txt` from the GitHub release.

4. **Checksum verification.** Computes SHA256 of the downloaded binary and compares it against the entry in `SHA256SUMS.txt`. If the checksums do not match, the update is aborted.

5. **Daemon stop.** Stops the running daemon before replacing the binary.

6. **Binary replacement.** Platform-specific:
   - **Linux/macOS:** Renames old binary, moves new one into place
   - **macOS extra step:** Clears quarantine attributes with `xattr -cr`
   - **Windows:** Renames old binary to `.old` (Windows cannot overwrite a running executable), then copies the new binary to the original path

7. **Daemon restart.** Starts the daemon with the new binary.

8. **Changelog.** Fetches and displays release notes for the new version.

## Sudo Escalation

If the binary is installed in a directory that requires root access (e.g., `/usr/local/bin`), the updater prompts for your password to escalate with `sudo`.

## Cross-Filesystem Moves

If the download directory and the install directory are on different filesystems (common with `/tmp` on a separate partition), the atomic rename will fail. The updater falls back to copy-then-remove, which is safe but briefly has both binaries on disc.

## What Can Go Wrong

### "Checksum verification exception"

The downloaded binary does not match the expected hash. This usually means:
- The download was corrupted (network issue)
- The release assets are stale or partially uploaded

**Fix:** Wait a few minutes and try again. If it persists, download the binary manually from the [releases page](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

The release was published without a checksum for your platform. This is a release pipeline issue.

**Fix:** File a [GitHub issue](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

The updater could not replace the old binary with the new one. Common causes:
- File permissions (binary is owned by root but you are running as a normal user)
- File is locked (Windows: another process has the binary open)
- Read-only filesystem

**Fix:**
1. Stop the daemon manually: `triggerfish stop`
2. Kill any stale processes
3. Try the update again with appropriate permissions

### "Checksum file download failed"

Cannot download `SHA256SUMS.txt` from the GitHub release. Check your network connection and try again.

### Windows `.old` file cleanup

After a Windows update, the old binary is renamed to `triggerfish.exe.old`. This file is cleaned up automatically on the next start. If it is not cleaned up (e.g., the new binary crashes on startup), you can delete it manually.

## Version Comparison

The updater uses semantic versioning comparison:
- Strips the leading `v` prefix (both `v0.4.2` and `0.4.2` are accepted)
- Compares major, minor, and patch numerically
- Pre-release versions are handled (e.g., `v0.4.2-rc.1`)

## Manual Update

If the automatic updater does not work:

1. Download the binary for your platform from [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Stop the daemon: `triggerfish stop`
3. Replace the binary:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: clear quarantine
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Start the daemon: `triggerfish start`

## Docker Update

Docker deployments do not use the binary updater. Update the container image:

```bash
# Using the wrapper script
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

The wrapper script pulls the latest image and restarts the container if one is running.

## Changelog

After an update, release notes are displayed automatically. You can also view them manually:

```bash
triggerfish changelog              # Current version
triggerfish changelog --latest 5   # Last 5 releases
```

If changelog fetching fails after an update, it is logged but does not affect the update itself.
