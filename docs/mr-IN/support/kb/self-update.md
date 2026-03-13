# KB: Self-Update Process

`triggerfish update` कसे काम करते, काय चुकू शकते, आणि recover कसे करायचे.

## हे कसे काम करते

Update command GitHub मधून latest release download आणि install करतो:

1. **Version check.** GitHub API मधून latest release tag fetch करतो. तुम्ही आधीच
   latest version वर असल्यास, early exit होतो:
   ```
   Already up to date (v0.4.2)
   ```
   Development builds (`VERSION=dev`) version check skip करतात आणि नेहमी proceed करतात.

2. **Platform detection.** तुमचे OS आणि architecture (linux-x64, linux-arm64,
   macos-x64, macos-arm64, windows-x64) वर आधारित correct binary asset name determine करतो.

3. **Download.** GitHub release मधून binary आणि `SHA256SUMS.txt` fetch करतो.

4. **Checksum verification.** Downloaded binary चे SHA256 compute करतो आणि
   `SHA256SUMS.txt` मधील entry विरुद्ध compare करतो. Checksums match नसल्यास,
   update abort केला जातो.

5. **Daemon stop.** Binary replace करण्यापूर्वी running daemon stop करतो.

6. **Binary replacement.** Platform-specific:
   - **Linux/macOS:** जुना binary rename करतो, नवीन जागी move करतो
   - **macOS extra step:** `xattr -cr` सह quarantine attributes clear करतो
   - **Windows:** जुना binary `.old` ला rename करतो (Windows running executable
     overwrite करू शकत नाही), नंतर नवीन binary original path ला copy करतो

7. **Daemon restart.** नवीन binary सह daemon start करतो.

8. **Changelog.** नवीन version साठी release notes fetch आणि display करतो.

## Sudo Escalation

Binary root access आवश्यक असलेल्या directory मध्ये installed असल्यास (उदा.
`/usr/local/bin`), updater `sudo` सह escalate करण्यासाठी तुमचा password prompt करतो.

## Cross-Filesystem Moves

Download directory आणि install directory different filesystems वर असल्यास (common
with `/tmp` separate partition वर), atomic rename fail होईल. Updater copy-then-remove ला
fall back होतो, जे safe आहे पण briefly दोन्ही binaries disk वर असतात.

## काय चुकू शकते

### "Checksum verification exception"

Downloaded binary expected hash शी match होत नाही. याचा सहसा अर्थ:
- Download corrupted झाला (network issue)
- Release assets stale किंवा partially uploaded आहेत

**Fix:** काही minutes wait करा आणि पुन्हा try करा. Persist राहिल्यास, [releases page](https://github.com/greghavens/triggerfish/releases)
मधून binary manually download करा.

### "Asset not found in SHA256SUMS.txt"

तुमच्या platform साठी checksum शिवाय release published झाला. हे release pipeline
issue आहे.

**Fix:** [GitHub issue](https://github.com/greghavens/triggerfish/issues) file करा.

### "Binary replacement failed"

Updater जुना binary नवीन सह replace करू शकला नाही. Common causes:
- File permissions (binary root ने owned आहे पण तुम्ही normal user म्हणून running आहात)
- File locked आहे (Windows: दुसरी process ने binary open आहे)
- Read-only filesystem

**Fix:**
1. Daemon manually stop करा: `triggerfish stop`
2. Stale processes kill करा
3. Appropriate permissions सह update पुन्हा try करा

### "Checksum file download failed"

GitHub release मधून `SHA256SUMS.txt` download करता येत नाही. Network connection
check करा आणि पुन्हा try करा.

### Windows `.old` file cleanup

Windows update नंतर, जुना binary `triggerfish.exe.old` ला renamed होतो. हे file
पुढील start वर automatically cleaned up होते. Cleaned up नाही झाल्यास (उदा. नवीन
binary startup वर crash होतो), manually delete करू शकता.

## Version Comparison

Updater semantic versioning comparison वापरतो:
- Leading `v` prefix strip करतो (दोन्ही `v0.4.2` आणि `0.4.2` accepted आहेत)
- Major, minor, आणि patch numerically compare करतो
- Pre-release versions handled (उदा. `v0.4.2-rc.1`)

## Manual Update

Automatic updater काम नाही करत असल्यास:

1. [GitHub Releases](https://github.com/greghavens/triggerfish/releases) मधून
   तुमच्या platform साठी binary download करा
2. Daemon stop करा: `triggerfish stop`
3. Binary replace करा:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: quarantine clear करा
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Daemon start करा: `triggerfish start`

## Docker Update

Docker deployments binary updater वापरत नाहीत. Container image update करा:

```bash
# Wrapper script वापरत असल्यास
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

Wrapper script latest image pull करतो आणि एक running असल्यास container restart करतो.

## Changelog

Update नंतर, release notes automatically displayed होतात. Manually देखील पाहू शकता:

```bash
triggerfish changelog              # Current version
triggerfish changelog --latest 5   # Last 5 releases
```

Update नंतर changelog fetching fail झाल्यास, ते logged आहे पण update ला affect करत नाही.
