# KB: Proses Kemas Kini Sendiri

Cara `triggerfish update` berfungsi, apa yang boleh salah, dan cara memulihkan.

## Cara Ia Berfungsi

Arahan kemas kini memuat turun dan memasang keluaran terkini dari GitHub:

1. **Semakan versi.** Mengambil tag keluaran terkini dari API GitHub. Jika anda sudah menggunakan versi terkini, keluar awal:
   ```
   Sudah terkini (v0.4.2)
   ```
   Binaan pembangunan (`VERSION=dev`) melangkau semakan versi dan sentiasa meneruskan.

2. **Pengesanan platform.** Menentukan nama aset binari yang betul berdasarkan OS dan seni bina anda (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Muat turun.** Mengambil binari dan `SHA256SUMS.txt` dari keluaran GitHub.

4. **Pengesahan checksum.** Mengira SHA256 binari yang dimuat turun dan membandingkannya dengan entri dalam `SHA256SUMS.txt`. Jika checksum tidak sepadan, kemas kini dibatalkan.

5. **Hentikan daemon.** Menghentikan daemon yang sedang berjalan sebelum menggantikan binari.

6. **Penggantian binari.** Khusus platform:
   - **Linux/macOS:** Menamakan semula binari lama, memindahkan yang baru ke tempat
   - **Langkah tambahan macOS:** Membersihkan atribut kuarantin dengan `xattr -cr`
   - **Windows:** Menamakan semula binari lama ke `.old` (Windows tidak boleh menimpa eksekutif yang sedang berjalan), kemudian menyalin binari baru ke laluan asal

7. **Mulakan semula daemon.** Memulakan daemon dengan binari baru.

8. **Catatan perubahan.** Mengambil dan memaparkan nota keluaran untuk versi baru.

## Peningkatan Sudo

Jika binari dipasang dalam direktori yang memerlukan akses root (contoh, `/usr/local/bin`), pengemas kini meminta kata laluan anda untuk meningkat dengan `sudo`.

## Pemindahan Merentasi Sistem Fail

Jika direktori muat turun dan direktori pemasangan berada pada sistem fail berbeza (biasa dengan `/tmp` pada partition berasingan), penggantian nama atomik akan gagal. Pengemas kini jatuh balik ke salin-kemudian-buang, yang selamat tetapi sebentar mempunyai kedua-dua binari pada cakera.

## Apa yang Boleh Salah

### "Checksum verification exception"

Binari yang dimuat turun tidak sepadan dengan hash yang dijangkakan. Ini biasanya bermakna:
- Muat turun rosak (isu rangkaian)
- Aset keluaran lapuk atau dimuat naik sebahagian

**Pembetulan:** Tunggu beberapa minit dan cuba lagi. Jika berterusan, muat turun binari secara manual dari [halaman keluaran](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

Keluaran diterbitkan tanpa checksum untuk platform anda. Ini adalah isu saluran paip keluaran.

**Pembetulan:** Laporkan [isu GitHub](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

Pengemas kini tidak dapat menggantikan binari lama dengan yang baru. Punca biasa:
- Kebenaran fail (binari dimiliki root tetapi anda menjalankan sebagai pengguna biasa)
- Fail dikunci (Windows: proses lain mempunyai binari terbuka)
- Sistem fail baca-sahaja

**Pembetulan:**
1. Hentikan daemon secara manual: `triggerfish stop`
2. Bunuh sebarang proses lapuk
3. Cuba kemas kini semula dengan kebenaran yang sesuai

### "Checksum file download failed"

Tidak dapat memuat turun `SHA256SUMS.txt` dari keluaran GitHub. Semak sambungan rangkaian anda dan cuba lagi.

### Pembersihan fail `.old` Windows

Selepas kemas kini Windows, binari lama dinamakan semula ke `triggerfish.exe.old`. Fail ini dibersihkan secara automatik semasa permulaan seterusnya. Jika tidak dibersihkan (contoh, binari baru terhempas semasa permulaan), anda boleh memadamnya secara manual.

## Perbandingan Versi

Pengemas kini menggunakan perbandingan versioning semantik:
- Mengalihkan awalan `v` terdepan (kedua-dua `v0.4.2` dan `0.4.2` diterima)
- Membandingkan major, minor, dan patch secara numerik
- Versi pra-keluaran dikendalikan (contoh, `v0.4.2-rc.1`)

## Kemas Kini Manual

Jika pengemas kini automatik tidak berfungsi:

1. Muat turun binari untuk platform anda dari [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Hentikan daemon: `triggerfish stop`
3. Gantikan binari:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: bersihkan kuarantin
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Mulakan daemon: `triggerfish start`

## Kemas Kini Docker

Pelancaran Docker tidak menggunakan pengemas kini binari. Kemas kini imej bekas:

```bash
# Menggunakan skrip pembungkus
triggerfish update

# Secara manual
docker compose pull
docker compose up -d
```

Skrip pembungkus menarik imej terkini dan memulakan semula bekas jika ada yang sedang berjalan.

## Catatan Perubahan

Selepas kemas kini, nota keluaran dipaparkan secara automatik. Anda juga boleh melihatnya secara manual:

```bash
triggerfish changelog              # Versi semasa
triggerfish changelog --latest 5   # 5 keluaran terakhir
```

Jika pengambilan catatan perubahan gagal selepas kemas kini, ia dilog tetapi tidak menjejaskan kemas kini itu sendiri.
