# KB: Self-Update Process

`triggerfish update` எவ்வாறு வேலை செய்கிறது, என்ன தவறாகலாம், மற்றும் எவ்வாறு recover செய்வது.

## எவ்வாறு வேலை செய்கிறது

Update command GitHub இலிருந்து latest release download செய்து install செய்கிறது:

1. **Version check.** GitHub API இலிருந்து latest release tag fetch செய்கிறது. Already latest version இல் இருந்தால், early exit:
   ```
   Already up to date (v0.4.2)
   ```
   Development builds (`VERSION=dev`) version check skip செய்கின்றன மற்றும் எப்போதும் proceed செய்கின்றன.

2. **Platform detection.** உங்கள் OS மற்றும் architecture அடிப்படையில் correct binary asset name determine செய்கிறது (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Download.** GitHub release இலிருந்து binary மற்றும் `SHA256SUMS.txt` fetch செய்கிறது.

4. **Checksum verification.** Downloaded binary இன் SHA256 compute செய்கிறது மற்றும் `SHA256SUMS.txt` இல் உள்ள entry உடன் compare செய்கிறது. Checksums match ஆகவில்லையென்றால், update abort ஆகிறது.

5. **Daemon stop.** Binary replace செய்வதற்கு முன்பு running daemon stop செய்கிறது.

6. **Binary replacement.** Platform-specific:
   - **Linux/macOS:** பழைய binary rename செய்கிறது, புதியதை place இல் move செய்கிறது
   - **macOS extra step:** `xattr -cr` உடன் quarantine attributes clear செய்கிறது
   - **Windows:** பழைய binary ஐ `.old` என்று rename செய்கிறது (Windows running executable overwrite செய்ய அனுமதிக்கவில்லை), பின்னர் புதிய binary ஐ original path க்கு copy செய்கிறது

7. **Daemon restart.** புதிய binary உடன் daemon start செய்கிறது.

8. **Changelog.** புதிய version இன் release notes fetch செய்து display செய்கிறது.

## Sudo Escalation

Binary root access தேவைப்படும் directory இல் installed ஆனால் (உதா., `/usr/local/bin`), updater `sudo` உடன் escalate செய்ய உங்கள் password கேட்கிறது.

## Cross-Filesystem Moves

Download directory மற்றும் install directory different filesystems இல் இருந்தால் (common with `/tmp` on a separate partition), atomic rename fail ஆகும். Updater copy-then-remove க்கு fallback ஆகிறது, இது safe ஆனால் briefly disk இல் இரண்டு binaries இருக்கும்.

## என்ன தவறாகலாம்

### "Checksum verification exception"

Downloaded binary expected hash உடன் match ஆகவில்லை. பொதுவான காரணங்கள்:
- Download corrupted ஆனது (network issue)
- Release assets stale அல்லது partially uploaded

**Fix:** சில நிமிடங்கள் காத்திருந்து மீண்டும் try செய்யவும். தொடர்ந்தால், [releases page](https://github.com/greghavens/triggerfish/releases) இலிருந்து manually binary download செய்யவும்.

### "Asset not found in SHA256SUMS.txt"

Release உங்கள் platform க்கான checksum இல்லாமல் published ஆனது. இது release pipeline issue.

**Fix:** [GitHub issue](https://github.com/greghavens/triggerfish/issues) file செய்யவும்.

### "Binary replacement failed"

Updater பழைய binary ஐ புதியதுடன் replace செய்ய முடியவில்லை. பொதுவான காரணங்கள்:
- File permissions (binary root owned, ஆனால் normal user ஆக இயங்குகிறீர்கள்)
- File locked (Windows: மற்றொரு process binary திறந்திருக்கிறது)
- Read-only filesystem

**Fix:**
1. Daemon manually stop செய்யவும்: `triggerfish stop`
2. Stale processes kill செய்யவும்
3. Appropriate permissions உடன் update மீண்டும் try செய்யவும்

### "Checksum file download failed"

GitHub release இலிருந்து `SHA256SUMS.txt` download செய்ய முடியவில்லை. Network connection சரிபார்த்து மீண்டும் try செய்யவும்.

### Windows `.old` file cleanup

Windows update க்கு பிறகு, பழைய binary `triggerfish.exe.old` என்று rename ஆகிறது. இந்த file next start இல் automatically cleanup ஆகிறது. Cleanup ஆகவில்லையென்றால் (உதா., புதிய binary startup இல் crash ஆனால்), manually delete செய்யலாம்.

## Version Comparison

Updater semantic versioning comparison பயன்படுத்துகிறது:
- Leading `v` prefix strip செய்கிறது (both `v0.4.2` மற்றும் `0.4.2` accept செய்யப்படுகின்றன)
- Major, minor, மற்றும் patch numerically compare செய்கிறது
- Pre-release versions handle செய்யப்படுகின்றன (உதா., `v0.4.2-rc.1`)

## Manual Update

Automatic updater வேலை செய்யாவிட்டால்:

1. உங்கள் platform க்கான binary [GitHub Releases](https://github.com/greghavens/triggerfish/releases) இலிருந்து download செய்யவும்
2. Daemon stop செய்யவும்: `triggerfish stop`
3. Binary replace செய்யவும்:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: quarantine clear செய்யவும்
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Daemon start செய்யவும்: `triggerfish start`

## Docker Update

Docker deployments binary updater பயன்படுத்துவதில்லை. Container image update செய்யவும்:

```bash
# Wrapper script பயன்படுத்தினால்
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

Wrapper script latest image pull செய்கிறது மற்றும் ஒன்று இயங்கும்போது container restart செய்கிறது.

## Changelog

Update க்கு பிறகு, release notes automatically display ஆகும். Manually பார்க்கவும்:

```bash
triggerfish changelog              # Current version
triggerfish changelog --latest 5   # Last 5 releases
```

Update க்கு பிறகு changelog fetching fail ஆனால், logged ஆகிறது ஆனால் update ஐ பாதிக்கவில்லை.
