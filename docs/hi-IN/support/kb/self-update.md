# KB: Self-Update प्रक्रिया

`triggerfish update` कैसे काम करता है, क्या गलत हो सकता है, और कैसे recover करें।

## यह कैसे काम करता है

Update command GitHub से नवीनतम release डाउनलोड और स्थापित करता है:

1. **Version जाँच।** GitHub API से नवीनतम release tag fetch करता है। यदि आप पहले से नवीनतम version पर हैं, तो जल्दी बाहर निकलता है:
   ```
   Already up to date (v0.4.2)
   ```
   Development builds (`VERSION=dev`) version जाँच skip करते हैं और हमेशा आगे बढ़ते हैं।

2. **Platform detection।** आपके OS और architecture (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64) के आधार पर सही binary asset name निर्धारित करता है।

3. **Download।** GitHub release से binary और `SHA256SUMS.txt` fetch करता है।

4. **Checksum verification।** Downloaded binary का SHA256 compute करता है और `SHA256SUMS.txt` में entry से तुलना करता है। यदि checksums मेल नहीं खाते, तो update abort हो जाता है।

5. **Daemon stop।** Binary replace करने से पहले चल रहे daemon को रोकता है।

6. **Binary replacement।** Platform-विशिष्ट:
   - **Linux/macOS:** पुरानी binary rename, नई को स्थान पर move
   - **macOS अतिरिक्त चरण:** `xattr -cr` से quarantine attributes साफ़ करता है
   - **Windows:** पुरानी binary को `.old` rename (Windows चल रहे executable को overwrite नहीं कर सकता), फिर नई binary को original path पर copy

7. **Daemon restart।** नई binary के साथ daemon शुरू करता है।

8. **Changelog।** नए version के release notes fetch और प्रदर्शित करता है।

## Sudo Escalation

यदि binary ऐसी directory में स्थापित है जिसके लिए root access आवश्यक है (जैसे `/usr/local/bin`), तो updater `sudo` से escalate करने के लिए आपका password माँगता है।

## Cross-Filesystem Moves

यदि download directory और install directory अलग filesystems पर हैं (`/tmp` अलग partition पर होना सामान्य है), तो atomic rename विफल होगा। Updater copy-then-remove पर fallback करता है, जो safe है लेकिन briefly disk पर दोनों binaries होती हैं।

## क्या गलत हो सकता है

### "Checksum verification exception"

Downloaded binary अपेक्षित hash से मेल नहीं खाती। इसका आमतौर पर अर्थ है:
- Download corrupt हुआ (network समस्या)
- Release assets stale या आंशिक रूप से uploaded हैं

**समाधान:** कुछ मिनट प्रतीक्षा करें और पुनः प्रयास करें। यदि समस्या बनी रहती है, तो [releases page](https://github.com/greghavens/triggerfish/releases) से binary मैन्युअल रूप से download करें।

### "Asset not found in SHA256SUMS.txt"

Release आपके platform के लिए checksum के बिना प्रकाशित हुई। यह release pipeline समस्या है।

**समाधान:** एक [GitHub issue](https://github.com/greghavens/triggerfish/issues) दर्ज करें।

### "Binary replacement failed"

Updater पुरानी binary को नई से replace नहीं कर सका। सामान्य कारण:
- File permissions (binary root की है लेकिन आप सामान्य user के रूप में चला रहे हैं)
- File locked है (Windows: किसी अन्य process ने binary खोली है)
- Read-only filesystem

**समाधान:**
1. Daemon मैन्युअल रूप से रोकें: `triggerfish stop`
2. किसी भी stale process को kill करें
3. उचित permissions के साथ update फिर से आज़माएँ

### "Checksum file download failed"

GitHub release से `SHA256SUMS.txt` download नहीं हो सकती। अपना network connection जाँचें और पुनः प्रयास करें।

### Windows `.old` file cleanup

Windows update के बाद, पुरानी binary `triggerfish.exe.old` rename हो जाती है। यह file अगले start पर स्वचालित रूप से clean up होती है। यदि clean up नहीं होती (जैसे नई binary startup पर crash होती है), तो आप इसे मैन्युअल रूप से हटा सकते हैं।

## Version Comparison

Updater semantic versioning comparison उपयोग करता है:
- Leading `v` prefix strip करता है (`v0.4.2` और `0.4.2` दोनों स्वीकार)
- Major, minor, और patch को numerically compare करता है
- Pre-release versions handle होते हैं (जैसे `v0.4.2-rc.1`)

## Manual Update

यदि automatic updater काम नहीं करता:

1. [GitHub Releases](https://github.com/greghavens/triggerfish/releases) से अपने platform के लिए binary download करें
2. Daemon रोकें: `triggerfish stop`
3. Binary replace करें:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: quarantine साफ़ करें
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Daemon शुरू करें: `triggerfish start`

## Docker Update

Docker deployments binary updater उपयोग नहीं करते। Container image अपडेट करें:

```bash
# Wrapper script उपयोग करके
triggerfish update

# मैन्युअल रूप से
docker compose pull
docker compose up -d
```

Wrapper script नवीनतम image pull करता है और यदि कोई चल रहा है तो container restart करता है।

## Changelog

Update के बाद, release notes स्वचालित रूप से प्रदर्शित होते हैं। आप इन्हें मैन्युअल रूप से भी देख सकते हैं:

```bash
triggerfish changelog              # वर्तमान version
triggerfish changelog --latest 5   # अंतिम 5 releases
```

यदि update के बाद changelog fetching विफल होती है, तो यह log होती है लेकिन update को प्रभावित नहीं करती।
