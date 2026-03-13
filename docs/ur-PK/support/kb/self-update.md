# KB: Self-Update Process

`triggerfish update` کیسے کام کرتا ہے، کیا غلط ہو سکتا ہے، اور کیسے recover کریں۔

## یہ کیسے کام کرتا ہے

Update command GitHub سے latest release download اور install کرتا ہے:

1. **Version check۔** GitHub API سے latest release tag fetch کرتا ہے۔ اگر آپ پہلے سے latest version پر ہوں تو جلد exit ہو جاتا ہے:
   ```
   Already up to date (v0.4.2)
   ```
   Development builds (`VERSION=dev`) version check skip کرتے ہیں اور ہمیشہ proceed کرتے ہیں۔

2. **Platform detection۔** آپ کے OS اور architecture کی بنیاد پر correct binary asset name determine کرتا ہے (linux-x64، linux-arm64، macos-x64، macos-arm64، windows-x64)۔

3. **Download۔** GitHub release سے binary اور `SHA256SUMS.txt` fetch کرتا ہے۔

4. **Checksum verification۔** Downloaded binary کا SHA256 compute کرتا ہے اور `SHA256SUMS.txt` میں entry سے compare کرتا ہے۔ Checksums match نہ ہوں تو update abort ہو جاتا ہے۔

5. **Daemon stop۔** Binary replace کرنے سے پہلے running daemon بند کرتا ہے۔

6. **Binary replacement۔** Platform-specific:
   - **Linux/macOS:** پرانی binary rename کرتا ہے، نئی جگہ پر move کرتا ہے
   - **macOS extra step:** `xattr -cr` سے quarantine attributes clear کرتا ہے
   - **Windows:** پرانی binary کو `.old` rename کرتا ہے (Windows running executable overwrite نہیں کر سکتا)، پھر نئی binary کو original path پر copy کرتا ہے

7. **Daemon restart۔** نئی binary کے ساتھ daemon start کرتا ہے۔

8. **Changelog۔** نئی version کے لیے release notes fetch اور display کرتا ہے۔

## Sudo Escalation

اگر binary کسی directory میں install ہو جس کے لیے root access چاہیے (مثلاً `/usr/local/bin`) تو updater `sudo` سے escalate کرنے کے لیے آپ کا password مانگتا ہے۔

## Cross-Filesystem Moves

اگر download directory اور install directory مختلف filesystems پر ہوں (common جب `/tmp` الگ partition پر ہو) تو atomic rename fail ہوگا۔ Updater copy-then-remove پر fallback کرتا ہے جو safe ہے لیکن briefly دونوں binaries disk پر ہوتی ہیں۔

## کیا غلط ہو سکتا ہے

### "Checksum verification exception"

Downloaded binary expected hash سے match نہیں کرتا۔ یہ عموماً مطلب ہے:
- Download corrupt ہو گیا (network issue)
- Release assets stale یا partially uploaded ہیں

**Fix:** چند منٹ انتظار کریں اور دوبارہ کوشش کریں۔ اگر جاری رہے تو [releases page](https://github.com/greghavens/triggerfish/releases) سے manually binary download کریں۔

### "Asset not found in SHA256SUMS.txt"

Release آپ کے platform کے لیے checksum کے بغیر publish ہوئی۔ یہ release pipeline issue ہے۔

**Fix:** [GitHub issue](https://github.com/greghavens/triggerfish/issues) file کریں۔

### "Binary replacement failed"

Updater پرانی binary کو نئی سے replace نہیں کر سکا۔ عام وجوہات:
- File permissions (binary root کی ملکیت ہے لیکن آپ normal user کے طور پر چل رہے ہیں)
- File locked ہے (Windows: کوئی دوسرا process binary کھولے ہوئے ہے)
- Read-only filesystem

**Fix:**
1. Daemon manually بند کریں: `triggerfish stop`
2. کوئی stale processes kill کریں
3. مناسب permissions کے ساتھ update دوبارہ کریں

### "Checksum file download failed"

GitHub release سے `SHA256SUMS.txt` download نہیں ہو سکا۔ اپنا network connection check کریں اور دوبارہ کوشش کریں۔

### Windows `.old` file cleanup

Windows update کے بعد، پرانی binary `triggerfish.exe.old` rename ہوتی ہے۔ یہ file اگلے start پر خود بخود clean up ہوتی ہے۔ اگر clean up نہ ہو (مثلاً نئی binary startup پر crash کرے) تو آپ اسے manually delete کر سکتے ہیں۔

## Version Comparison

Updater semantic versioning comparison استعمال کرتا ہے:
- Leading `v` prefix strip کرتا ہے (دونوں `v0.4.2` اور `0.4.2` accepted ہیں)
- Major، minor، اور patch numerically compare کرتا ہے
- Pre-release versions handle ہوتی ہیں (مثلاً `v0.4.2-rc.1`)

## Manual Update

اگر automatic updater کام نہ کرے:

1. [GitHub Releases](https://github.com/greghavens/triggerfish/releases) سے اپنے platform کے لیے binary download کریں
2. Daemon بند کریں: `triggerfish stop`
3. Binary replace کریں:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: quarantine clear کریں
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Daemon start کریں: `triggerfish start`

## Docker Update

Docker deployments binary updater استعمال نہیں کرتے۔ Container image update کریں:

```bash
# Wrapper script استعمال کرتے ہوئے
triggerfish update

# Manually
docker compose pull
docker compose up -d
```

Wrapper script latest image pull کرتا ہے اور اگر کوئی چل رہا ہو تو container restart کرتا ہے۔

## Changelog

Update کے بعد، release notes خود بخود display ہوتے ہیں۔ آپ انہیں manually بھی دیکھ سکتے ہیں:

```bash
triggerfish changelog              # موجودہ version
triggerfish changelog --latest 5   # آخری 5 releases
```

اگر update کے بعد changelog fetching fail ہو تو یہ log ہوتا ہے لیکن update پر اثر نہیں پڑتا۔
