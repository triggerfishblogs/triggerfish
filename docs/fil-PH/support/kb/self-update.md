# KB: Self-Update Process

Paano gumagana ang `triggerfish update`, ano ang maaaring magkamali, at paano maka-recover.

## Paano Gumagana

Dina-download at ini-install ng update command ang pinakabagong release mula sa GitHub:

1. **Version check.** Kinu-kuha ang pinakabagong release tag mula sa GitHub API. Kung nasa pinakabagong version ka na, agad na nag-e-exit:
   ```
   Already up to date (v0.4.2)
   ```
   Ang mga development builds (`VERSION=dev`) ay nagla-laktaw ng version check at palaging nagpapatuloy.

2. **Platform detection.** Dine-determine ang tamang binary asset name batay sa iyong OS at architecture (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Download.** Kinu-kuha ang binary at `SHA256SUMS.txt` mula sa GitHub release.

4. **Checksum verification.** Kino-compute ang SHA256 ng na-download na binary at kino-compare sa entry sa `SHA256SUMS.txt`. Kung hindi magkatugma ang checksums, ina-abort ang update.

5. **Daemon stop.** Tinitigil ang tumatakbong daemon bago palitan ang binary.

6. **Binary replacement.** Platform-specific:
   - **Linux/macOS:** Rini-rename ang lumang binary, inililipat ang bago sa lugar nito
   - **macOS extra step:** Nili-clear ang quarantine attributes gamit ang `xattr -cr`
   - **Windows:** Rini-rename ang lumang binary sa `.old` (hindi maaaring i-overwrite ng Windows ang tumatakbong executable), pagkatapos kino-copy ang bagong binary sa orihinal na path

7. **Daemon restart.** Sinisimulang ang daemon gamit ang bagong binary.

8. **Changelog.** Kinu-kuha at ipinapakita ang release notes para sa bagong version.

## Sudo Escalation

Kung naka-install ang binary sa directory na nangangailangan ng root access (hal., `/usr/local/bin`), magpo-prompt ang updater para sa iyong password para mag-escalate gamit ang `sudo`.

## Cross-Filesystem Moves

Kung magkaibang filesystems ang download directory at install directory (karaniwan sa `/tmp` na nasa hiwalay na partition), mababigo ang atomic rename. Nag-fa-fall back ang updater sa copy-then-remove, na safe pero saglit na may parehong binaries sa disk.

## Ano ang Maaaring Magkamali

### "Checksum verification exception"

Hindi tumutugma ang na-download na binary sa inaasahang hash. Karaniwang ibig sabihin nito:
- Na-corrupt ang download (network issue)
- Stale o partially uploaded ang release assets

**Fix:** Maghintay ng ilang minuto at subukan ulit. Kung nagpapatuloy, manual na i-download ang binary mula sa [releases page](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

Na-publish ang release nang walang checksum para sa iyong platform. Ito ay release pipeline issue.

**Fix:** Mag-file ng [GitHub issue](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

Hindi mapalitan ng updater ang lumang binary ng bago. Mga karaniwang dahilan:
- File permissions (pag-aari ng root ang binary pero normal user ang nagpapatakbo)
- Naka-lock ang file (Windows: may ibang process na naka-bukas sa binary)
- Read-only filesystem

**Fix:**
1. Manual na i-stop ang daemon: `triggerfish stop`
2. I-kill ang anumang stale processes
3. Subukan ulit ang update na may angkop na permissions

### "Checksum file download failed"

Hindi ma-download ang `SHA256SUMS.txt` mula sa GitHub release. Suriin ang iyong network connection at subukan ulit.

### Windows `.old` file cleanup

Pagkatapos ng Windows update, ang lumang binary ay nire-rename sa `triggerfish.exe.old`. Awtomatikong nili-clean up ang file na ito sa susunod na start. Kung hindi na-clean up (hal., nag-crash ang bagong binary sa startup), maaari mo itong manual na i-delete.

## Version Comparison

Gumagamit ang updater ng semantic versioning comparison:
- Tinatanggal ang leading `v` prefix (parehong `v0.4.2` at `0.4.2` ay tinatanggap)
- Kino-compare ang major, minor, at patch nang numerically
- Hina-handle ang pre-release versions (hal., `v0.4.2-rc.1`)

## Manual Update

Kung hindi gumagana ang automatic updater:

1. I-download ang binary para sa iyong platform mula sa [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. I-stop ang daemon: `triggerfish stop`
3. Palitan ang binary:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: i-clear ang quarantine
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Simulan ang daemon: `triggerfish start`

## Docker Update

Hindi gumagamit ng binary updater ang Docker deployments. I-update ang container image:

```bash
# Gamit ang wrapper script
triggerfish update

# Manual
docker compose pull
docker compose up -d
```

Pinu-pull ng wrapper script ang pinakabagong image at nire-restart ang container kung may tumatakbo.

## Changelog

Pagkatapos ng update, awtomatikong ipinapakita ang release notes. Maaari mo ring manual na tingnan ang mga ito:

```bash
triggerfish changelog              # Kasalukuyang version
triggerfish changelog --latest 5   # Huling 5 releases
```

Kung mabigo ang changelog fetching pagkatapos ng update, nilo-log ito pero hindi naaapektuhan ang update mismo.
