# KB: Self-Update Process

`triggerfish update` ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ, ಏನು ತಪ್ಪಾಗಬಹುದು, ಮತ್ತು ಹೇಗೆ recover ಮಾಡಬೇಕು.

## ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

Update command GitHub ನಿಂದ latest release download ಮಾಡಿ install ಮಾಡುತ್ತದೆ:

1. **Version check.** GitHub API ನಿಂದ latest release tag fetch ಮಾಡುತ್ತದೆ. ಈಗಾಗಲೇ latest version ನಲ್ಲಿದ್ದರೆ, early exit:
   ```
   Already up to date (v0.4.2)
   ```
   Development builds (`VERSION=dev`) version check skip ಮಾಡಿ ಯಾವಾಗಲೂ proceed ಮಾಡುತ್ತವೆ.

2. **Platform detection.** ನಿಮ್ಮ OS ಮತ್ತು architecture ಆಧಾರದ ಮೇಲೆ correct binary asset name determine ಮಾಡುತ್ತದೆ (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Download.** GitHub release ನಿಂದ binary ಮತ್ತು `SHA256SUMS.txt` fetch ಮಾಡುತ್ತದೆ.

4. **Checksum verification.** Downloaded binary ನ SHA256 compute ಮಾಡಿ `SHA256SUMS.txt` ನ entry ಜೊತೆ compare ಮಾಡುತ್ತದೆ. Checksums match ಆಗದಿದ್ದರೆ, update abort ಮಾಡಲಾಗುತ್ತದೆ.

5. **Daemon stop.** Binary replace ಮಾಡುವ ಮೊದಲು running daemon stop ಮಾಡುತ್ತದೆ.

6. **Binary replacement.** Platform-specific:
   - **Linux/macOS:** ಹಳೆಯ binary rename ಮಾಡಿ, ಹೊಸದನ್ನು place ನಲ್ಲಿ move ಮಾಡುತ್ತದೆ
   - **macOS extra step:** `xattr -cr` ಜೊತೆ quarantine attributes clear ಮಾಡುತ್ತದೆ
   - **Windows:** ಹಳೆಯ binary ಅನ್ನು `.old` ಗೆ rename ಮಾಡುತ್ತದೆ (Windows running executable overwrite ಮಾಡಲಾಗುವುದಿಲ್ಲ), ನಂತರ ಹೊಸ binary ಅನ್ನು original path ಗೆ copy ಮಾಡುತ್ತದೆ

7. **Daemon restart.** ಹೊಸ binary ಜೊತೆ daemon start ಮಾಡುತ್ತದೆ.

8. **Changelog.** ಹೊಸ version ಗಾಗಿ release notes fetch ಮಾಡಿ display ಮಾಡುತ್ತದೆ.

## Sudo Escalation

Binary root access ಅಗತ್ಯ ಇರುವ directory ನಲ್ಲಿ install ಆಗಿದ್ದರೆ (ಉದಾ., `/usr/local/bin`), updater `sudo` ಜೊತೆ escalate ಮಾಡಲು ನಿಮ್ಮ password ಕೇಳುತ್ತದೆ.

## Cross-Filesystem Moves

Download directory ಮತ್ತು install directory ಬೇರೆ filesystems ನಲ್ಲಿದ್ದರೆ (separate partition ನಲ್ಲಿ `/tmp` ಜೊತೆ common), atomic rename fail ಆಗುತ್ತದೆ. Updater copy-then-remove ಗೆ fallback ಮಾಡುತ್ತದೆ, ಇದು safe ಆದರೆ briefly disk ನಲ್ಲಿ ಎರಡು binaries ಇರುತ್ತವೆ.

## ಏನು ತಪ್ಪಾಗಬಹುದು

### "Checksum verification exception"

Downloaded binary expected hash ಜೊತೆ match ಆಗುತ್ತಿಲ್ಲ. ಇದು ಸಾಮಾನ್ಯವಾಗಿ ಅರ್ಥ:
- Download corrupt ಆಗಿದೆ (network issue)
- Release assets stale ಅಥವಾ partially uploaded ಆಗಿವೆ

**Fix:** ಕೆಲವು ನಿಮಿಷ ಕಾದು ಮತ್ತೆ try ಮಾಡಿ. ಮುಂದುವರಿದರೆ, [releases page](https://github.com/greghavens/triggerfish/releases) ನಿಂದ manually binary download ಮಾಡಿ.

### "Asset not found in SHA256SUMS.txt"

Release ನಿಮ್ಮ platform ಗಾಗಿ checksum ಇಲ್ಲದೆ publish ಆಗಿದೆ. ಇದು release pipeline issue.

**Fix:** [GitHub issue](https://github.com/greghavens/triggerfish/issues) file ಮಾಡಿ.

### "Binary replacement failed"

Updater ಹಳೆಯ binary ಅನ್ನು ಹೊಸದರಿಂದ replace ಮಾಡಲಾಗಲಿಲ್ಲ. ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:
- File permissions (binary root ಗೆ owned ಆದರೆ normal user ಆಗಿ ಚಲಾಯಿಸುತ್ತಿದ್ದೀರಿ)
- File locked (Windows: ಮತ್ತೊಂದು process binary open ಮಾಡಿದೆ)
- Read-only filesystem

**Fix:**
1. Daemon manually stop ಮಾಡಿ: `triggerfish stop`
2. Stale processes kill ಮಾಡಿ
3. Appropriate permissions ಜೊತೆ update ಮತ್ತೆ try ಮಾಡಿ

### "Checksum file download failed"

GitHub release ನಿಂದ `SHA256SUMS.txt` download ಮಾಡಲಾಗಲಿಲ್ಲ. Network connection check ಮಾಡಿ ಮತ್ತೆ try ಮಾಡಿ.

### Windows `.old` file cleanup

Windows update ನಂತರ, ಹಳೆಯ binary `triggerfish.exe.old` ಗೆ rename ಆಗುತ್ತದೆ. ಈ file next start ನಲ್ಲಿ automatically cleanup ಆಗುತ್ತದೆ. Cleanup ಆಗದಿದ್ದರೆ (ಉದಾ., ಹೊಸ binary startup ನಲ್ಲಿ crash ಆದರೆ), manually delete ಮಾಡಬಹುದು.

## Version Comparison

Updater semantic versioning comparison ಬಳಸುತ್ತದೆ:
- Leading `v` prefix strip ಮಾಡುತ್ತದೆ (`v0.4.2` ಮತ್ತು `0.4.2` ಎರಡೂ accept)
- major, minor, ಮತ್ತು patch numerically compare ಮಾಡುತ್ತದೆ
- Pre-release versions handle ಮಾಡುತ್ತದೆ (ಉದಾ., `v0.4.2-rc.1`)

## Manual Update

Automatic updater ಕೆಲಸ ಮಾಡದಿದ್ದರೆ:

1. [GitHub Releases](https://github.com/greghavens/triggerfish/releases) ನಿಂದ ನಿಮ್ಮ platform ಗಾಗಿ binary download ಮಾಡಿ
2. Daemon stop ಮಾಡಿ: `triggerfish stop`
3. Binary replace ಮಾಡಿ:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: quarantine clear ಮಾಡಿ
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Daemon start ಮಾಡಿ: `triggerfish start`

## Docker Update

Docker deployments binary updater ಬಳಸುವುದಿಲ್ಲ. Container image update ಮಾಡಿ:

```bash
# Wrapper script ಬಳಸಿ
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

Wrapper script latest image pull ಮಾಡಿ running container ಇದ್ದರೆ restart ಮಾಡುತ್ತದೆ.

## Changelog

Update ನಂತರ, release notes automatically display ಆಗುತ್ತವೆ. Manually ಕೂಡ ನೋಡಬಹುದು:

```bash
triggerfish changelog              # Current version
triggerfish changelog --latest 5   # Last 5 releases
```

Update ನಂತರ changelog fetching fail ಆದರೆ log ಆಗುತ್ತದೆ ಆದರೆ update ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವುದಿಲ್ಲ.
