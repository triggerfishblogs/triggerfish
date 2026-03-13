# Nota Platform

Tingkah laku, keperluan, dan keistimewaan khusus platform.

## macOS

### Pengurus perkhidmatan: launchd

Triggerfish mendaftar sebagai ejen launchd di:
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist ditetapkan ke `RunAtLoad: true` dan `KeepAlive: true`, jadi daemon bermula semasa log masuk dan dimulakan semula jika ia terhempas.

### Tangkapan PATH

Plist launchd menangkap PATH shell anda semasa pemasangan. Ini kritikal kerana launchd tidak menjanan profil shell anda. Jika anda memasang kebergantungan pelayan MCP (seperti `npx`, `python`) selepas memasang daemon, binari tersebut tidak akan berada dalam PATH daemon.

**Pembetulan:** Pasang semula daemon untuk mengemas kini PATH yang ditangkap:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Kuarantin

macOS menerapkan bendera kuarantin kepada binari yang dimuat turun. Pemasang membersihkan ini dengan `xattr -cr`, tetapi jika anda memuat turun binari secara manual:

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Keychain

Rahsia disimpan dalam keychain log masuk macOS melalui CLI `security`. Jika Keychain Access dikunci, operasi rahsia akan gagal sehingga anda membukanya (biasanya dengan log masuk).

### Homebrew Deno

Jika anda membina dari sumber dan Deno dipasang melalui Homebrew, pastikan direktori bin Homebrew berada dalam PATH anda sebelum menjalankan skrip pemasangan.

---

## Linux

### Pengurus perkhidmatan: systemd (mod pengguna)

Daemon berjalan sebagai perkhidmatan pengguna systemd:
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Secara lalai, perkhidmatan pengguna systemd berhenti apabila pengguna log keluar. Triggerfish mengaktifkan linger semasa pemasangan:

```bash
loginctl enable-linger $USER
```

Jika ini gagal (contoh, pentadbir sistem anda melumpuhkannya), daemon hanya berjalan semasa anda log masuk. Pada pelayan di mana anda mahu daemon berterusan, minta pentadbir anda mengaktifkan linger untuk akaun anda.

### PATH dan persekitaran

Unit systemd menangkap PATH anda dan menetapkan `DENO_DIR=~/.cache/deno`. Seperti macOS, perubahan ke PATH selepas pemasangan memerlukan pemasangan semula daemon.

Unit juga menetapkan `Environment=PATH=...` secara eksplisit. Jika daemon tidak boleh mencari binari pelayan MCP, ini adalah punca paling mungkin.

### Fedora Atomic / Silverblue / Bazzite

Desktop Fedora Atomic mempunyai `/home` yang dihubungkan dengan simbol ke `/var/home`. Triggerfish mengendalikan ini secara automatik apabila menyelesaikan direktori rumah, mengikuti symlink untuk mencari laluan sebenar.

Pelayar yang dipasang Flatpak dikesan dan dilancarkan melalui skrip pembungkus yang memanggil `flatpak run`.

### Pelayan tanpa kepala

Pada pelayan tanpa persekitaran desktop, daemon GNOME Keyring / Secret Service mungkin tidak berjalan. Lihat [Penyelesaian Masalah Rahsia](/ms-MY/support/troubleshooting/secrets) untuk arahan persediaan.

### SQLite FFI

Backend storan SQLite menggunakan `@db/sqlite`, yang memuatkan perpustakaan natif melalui FFI. Ini memerlukan kebenaran Deno `--allow-ffi` (termasuk dalam binari yang dikompil). Pada sesetengah pengedaran Linux minimal, perpustakaan C kongsi atau kebergantungan berkaitan mungkin tiada. Pasang perpustakaan pembangunan asas jika anda melihat ralat berkaitan FFI.

---

## Windows

### Pengurus perkhidmatan: Windows Service

Triggerfish dipasang sebagai Perkhidmatan Windows bernama "Triggerfish". Perkhidmatan ini dilaksanakan oleh pembungkus C# yang dikompil semasa pemasangan menggunakan `csc.exe` dari .NET Framework 4.x.

**Keperluan:**
- .NET Framework 4.x (dipasang pada kebanyakan sistem Windows 10/11)
- Keistimewaan pentadbir untuk pemasangan perkhidmatan
- `csc.exe` boleh diakses dalam direktori .NET Framework

### Penggantian binari semasa kemas kini

Windows tidak membenarkan penimpaan eksekutif yang sedang berjalan. Pengemas kini:

1. Menamakan semula binari yang sedang berjalan ke `triggerfish.exe.old`
2. Menyalin binari baru ke laluan asal
3. Memulakan semula perkhidmatan
4. Membersihkan fail `.old` semasa permulaan seterusnya

Jika penggantian nama atau salinan gagal, hentikan perkhidmatan secara manual sebelum mengemas kini.

### Sokongan warna ANSI

Triggerfish mengaktifkan Pemprosesan Terminal Maya untuk output konsol berwarna. Ini berfungsi dalam PowerShell moden dan Windows Terminal. Tetingkap `cmd.exe` yang lebih lama mungkin tidak memaparkan warna dengan betul.

### Penguncian fail eksklusif

Windows menggunakan kunci fail eksklusif. Jika daemon sedang berjalan dan anda cuba memulakan tika lain, kunci fail log menghalangnya:

```
Triggerfish sedang berjalan. Hentikan tika sedia ada dahulu, atau gunakan 'triggerfish status' untuk menyemak.
```

Pengesanan ini adalah khusus untuk Windows dan berdasarkan EBUSY / "os error 32" apabila membuka fail log.

### Storan rahsia

Windows menggunakan storan fail yang disulitkan (AES-256-GCM) di `~/.triggerfish/secrets.json`. Tiada integrasi Windows Credential Manager. Perlakukan fail `secrets.key` sebagai sensitif.

### Nota pemasang PowerShell

Pemasang PowerShell (`install.ps1`):
- Mengesan seni bina pemproses (x64/arm64)
- Memasang ke `%LOCALAPPDATA%\Triggerfish`
- Menambah direktori pemasangan ke PATH pengguna melalui pendaftaran
- Mengkompil pembungkus perkhidmatan C#
- Mendaftar dan memulakan Perkhidmatan Windows

Jika pemasang gagal pada langkah kompilasi perkhidmatan, anda masih boleh menjalankan Triggerfish secara manual:

```powershell
triggerfish run    # Mod latar depan
```

---

## Docker

### Runtime bekas

Pelancaran Docker menyokong Docker dan Podman. Pengesanan adalah automatik, atau tetapkan secara eksplisit:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Perincian imej

- Asas: `gcr.io/distroless/cc-debian12` (minimal, tanpa shell)
- Varian debug: `distroless:debug` (termasuk shell untuk penyelesaian masalah)
- Berjalan sebagai UID 65534 (nonroot)
- Init: `true` (penerusan isyarat PID 1 melalui `tini`)
- Dasar mulakan semula: `unless-stopped`

### Kegigihan data

Semua data berterusan berada dalam direktori `/data` di dalam bekas, disandarkan oleh volum bernama Docker:

```
/data/
  triggerfish.yaml        # Konfigurasi
  secrets.json            # Rahsia yang disulitkan
  secrets.key             # Kunci enkripsi
  SPINE.md                # Identiti ejen
  TRIGGER.md              # Tingkah laku trigger
  data/triggerfish.db     # Pangkalan data SQLite
  logs/                   # Fail log
  skills/                 # Kemahiran yang dipasang
  workspace/              # Ruang kerja ejen
  .deno/                  # Cache plugin Deno FFI
```

### Pemboleh ubah persekitaran

| Pemboleh ubah | Lalai | Tujuan |
|---------------|-------|--------|
| `TRIGGERFISH_DATA_DIR` | `/data` | Direktori data asas |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | Laluan fail konfigurasi |
| `TRIGGERFISH_DOCKER` | `true` | Mengaktifkan tingkah laku khusus Docker |
| `DENO_DIR` | `/data/.deno` | Cache Deno (plugin FFI) |
| `HOME` | `/data` | Direktori rumah untuk pengguna nonroot |

### Rahsia dalam Docker

Bekas Docker tidak boleh mengakses keychain OS hos. Storan fail yang disulitkan digunakan secara automatik. Kunci enkripsi (`secrets.key`) dan data yang disulitkan (`secrets.json`) disimpan dalam volum `/data`.

**Nota keselamatan:** Sesiapa yang mempunyai akses ke volum Docker boleh membaca kunci enkripsi. Selamatkan volum dengan sewajarnya. Dalam pengeluaran, pertimbangkan menggunakan rahsia Docker atau pengurus rahsia untuk menyuntik kunci semasa runtime.

### Port

Fail compose memetakan:
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Port tambahan (WebChat pada 8765, webhook WhatsApp pada 8443) perlu ditambah ke fail compose jika anda mengaktifkan saluran tersebut.

### Menjalankan wizard persediaan dalam Docker

```bash
# Jika bekas sedang berjalan
docker exec -it triggerfish triggerfish dive

# Jika bekas tidak berjalan (sekali-guna)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Mengemas kini

```bash
# Menggunakan skrip pembungkus
triggerfish update

# Secara manual
docker compose pull
docker compose up -d
```

### Penyahpepijatan

Gunakan varian debug imej untuk penyelesaian masalah:

```yaml
# Dalam docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Ini merangkumi shell supaya anda boleh exec ke dalam bekas:

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (Pelayar Sahaja)

Triggerfish sendiri tidak berjalan sebagai Flatpak, tetapi ia boleh menggunakan pelayar yang dipasang Flatpak untuk automasi pelayar.

### Pelayar Flatpak yang dikesan

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Cara ia berfungsi

Triggerfish mencipta skrip pembungkus sementara yang memanggil `flatpak run` dengan bendera mod tanpa kepala, kemudian melancarkan Chrome melalui skrip tersebut. Pembungkus ditulis ke direktori sementara.

### Isu biasa

- **Flatpak tidak dipasang.** Binari mesti berada di `/usr/bin/flatpak` atau `/usr/local/bin/flatpak`.
- **Direktori sementara tidak boleh ditulis.** Skrip pembungkus perlu ditulis ke cakera sebelum pelaksanaan.
- **Konflik sandbox Flatpak.** Sesetengah binaan Chrome Flatpak menyekat `--remote-debugging-port`. Jika sambungan CDP gagal, cuba pemasangan Chrome bukan-Flatpak.
