# Mengumpul Log

Apabila melaporkan pepijat, set log memberikan penyelenggara maklumat yang mereka perlukan untuk mendiagnosis isu tanpa perlu berulang meminta perincian.

## Set Pantas

Cara terpantas untuk mencipta set log:

```bash
triggerfish logs bundle
```

Ini mencipta arkib yang mengandungi semua fail log dari `~/.triggerfish/logs/`:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

Jika pengarkiban gagal atas sebarang sebab, ia jatuh balik ke menyalin fail log mentah ke direktori yang boleh anda zip secara manual.

## Apa yang Dikandungi Set

- `triggerfish.log` (fail log semasa)
- `triggerfish.1.log` hingga `triggerfish.10.log` (sandaran yang diputar, jika wujud)

Set **tidak** mengandungi:
- Fail konfigurasi `triggerfish.yaml` anda
- Kunci rahsia atau kelayakan
- Pangkalan data SQLite
- SPINE.md atau TRIGGER.md

## Pengumpulan Log Manual

Jika arahan set tidak tersedia (versi lama, Docker, dsb.):

```bash
# Cari fail log
ls ~/.triggerfish/logs/

# Cipta arkib secara manual
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Meningkatkan Perincian Log

Secara lalai, log berada pada tahap INFO. Untuk menangkap lebih banyak perincian bagi laporan pepijat:

1. Tetapkan tahap log ke verbose atau debug:
   ```bash
   triggerfish config set logging.level verbose
   # atau untuk perincian maksimum:
   triggerfish config set logging.level debug
   ```

2. Hasilkan semula isu tersebut

3. Kumpulkan set:
   ```bash
   triggerfish logs bundle
   ```

4. Tetapkan semula tahap ke normal:
   ```bash
   triggerfish config set logging.level normal
   ```

### Perincian Tahap Log

| Tahap | Apa yang ditangkap |
|-------|-------------------|
| `quiet` | Ralat sahaja |
| `normal` | Ralat, amaran, maklumat (lalai) |
| `verbose` | Menambah mesej debug (panggilan alat, interaksi pembekal, keputusan pengkelasan) |
| `debug` | Segalanya termasuk mesej peringkat-jejak (data protokol mentah, perubahan keadaan dalaman) |

**Amaran:** Tahap `debug` menjana banyak output. Gunakannya sahaja apabila sedang menghasilkan semula isu, kemudian tukar kembali.

## Menapis Log Secara Masa Nyata

Semasa menghasilkan semula isu, anda boleh menapis strim log langsung:

```bash
# Tunjukkan ralat sahaja
triggerfish logs --level ERROR

# Tunjukkan amaran dan ke atas
triggerfish logs --level WARN
```

Pada Linux/macOS, ini menggunakan `tail -f` natif dengan penapis. Pada Windows, ia menggunakan PowerShell `Get-Content -Wait -Tail`.

## Format Log

Setiap baris log mengikut format ini:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Cap masa:** ISO 8601 dalam UTC
- **Tahap:** ERROR, WARN, INFO, DEBUG, atau TRACE
- **Komponen:** Modul mana yang menjana log (contoh, `gateway`, `anthropic`, `telegram`, `policy`)
- **Mesej:** Mesej log dengan konteks berstruktur

## Apa yang Perlu Disertakan dalam Laporan Pepijat

Bersama dengan set log, sertakan:

1. **Langkah untuk menghasilkan semula.** Apa yang anda lakukan ketika isu berlaku?
2. **Tingkah laku yang dijangkakan.** Apa yang sepatutnya berlaku?
3. **Tingkah laku sebenar.** Apa yang berlaku sebaliknya?
4. **Maklumat platform.** OS, seni bina, versi Triggerfish (`triggerfish version`)
5. **Petikan konfigurasi.** Bahagian relevan dari `triggerfish.yaml` anda (sunting rahsia)

Lihat [Melaporkan Isu](/ms-MY/support/guides/filing-issues) untuk senarai semak penuh.

## Maklumat Sensitif dalam Log

Triggerfish menyucikan data luaran dalam log dengan membungkus nilai dalam pembatas `<<` dan `>>`. Kunci API dan token tidak sepatutnya muncul dalam output log. Walau bagaimanapun, sebelum menghantar set log:

1. Imbas untuk apa-apa yang anda tidak mahu dikongsi (alamat e-mel, laluan fail, kandungan mesej)
2. Sunting jika perlu
3. Nyatakan dalam isu anda bahawa set telah disunting

Fail log mengandungi kandungan mesej dari perbualan anda. Jika perbualan anda mengandungi maklumat sensitif, sunting bahagian tersebut sebelum berkongsi.
