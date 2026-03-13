# Menjalankan Diagnostik

Triggerfish mempunyai dua alat diagnostik terbina dalam: `patrol` (pemeriksaan kesihatan luaran) dan alat `healthcheck` (prob sistem dalaman).

## Patrol

Patrol adalah arahan CLI yang menyemak sama ada sistem teras beroperasi:

```bash
triggerfish patrol
```

### Apa yang diperiksa

| Semakan | Status | Maksud |
|---------|--------|--------|
| Gateway berjalan | KRITIKAL jika mati | Satah kawalan WebSocket tidak bertindak balas |
| LLM disambungkan | KRITIKAL jika mati | Tidak boleh mencapai pembekal LLM utama |
| Saluran aktif | AMARAN jika 0 | Tiada penyesuai saluran disambungkan |
| Peraturan dasar dimuatkan | AMARAN jika 0 | Tiada peraturan dasar dimuatkan |
| Kemahiran dipasang | AMARAN jika 0 | Tiada kemahiran ditemui |

### Status keseluruhan

- **SIHAT** - semua semakan lulus
- **AMARAN** - beberapa semakan bukan-kritikal ditanda (contoh, tiada kemahiran dipasang)
- **KRITIKAL** - sekurang-kurangnya satu semakan kritikal gagal (gateway atau LLM tidak boleh dicapai)

### Bila menggunakan patrol

- Selepas pemasangan, untuk mengesahkan segalanya berfungsi
- Selepas perubahan konfigurasi, untuk mengesahkan daemon dimulakan semula dengan bersih
- Apabila bot berhenti bertindak balas, untuk mengehadkan komponen mana yang gagal
- Sebelum melaporkan pepijat, untuk menyertakan output patrol

### Contoh output

```
Laporan Patrol Triggerfish
==========================
Keseluruhan: SIHAT

[OK]      Gateway berjalan
[OK]      LLM disambungkan (anthropic)
[OK]      Saluran aktif (3)
[OK]      Peraturan dasar dimuatkan (12)
[AMARAN]  Kemahiran dipasang (0)
```

---

## Alat Healthcheck

Alat healthcheck adalah alat ejen dalaman yang menyongsang komponen sistem dari dalam gateway yang sedang berjalan. Ia tersedia kepada ejen semasa perbualan.

### Apa yang diperiksa

**Pembekal:**
- Pembekal lalai wujud dan boleh dicapai
- Mengembalikan nama pembekal

**Storan:**
- Ujian perjalanan-balik: menulis kunci, membacanya semula, memadam
- Mengesahkan lapisan storan berfungsi

**Kemahiran:**
- Mengira kemahiran yang ditemui mengikut sumber (terbundel, dipasang, ruang kerja)

**Konfigurasi:**
- Pengesahan konfigurasi asas

### Tahap status

Setiap komponen melaporkan salah satu daripada:
- `healthy` - beroperasi sepenuhnya
- `degraded` - berfungsi sebahagian (beberapa ciri mungkin tidak berfungsi)
- `error` - komponen rosak

### Keperluan pengkelasan

Alat healthcheck memerlukan pengkelasan minimum INTERNAL kerana ia mendedahkan dalaman sistem (nama pembekal, kiraan kemahiran, status storan). Sesi PUBLIC tidak boleh menggunakannya.

### Menggunakan healthcheck

Tanya ejen anda:

> Jalankan pemeriksaan kesihatan

Atau jika menggunakan alat terus:

```
tool: healthcheck
```

Responsnya adalah laporan berstruktur:

```
Keseluruhan: sihat

Pembekal: sihat
  Pembekal lalai: anthropic

Storan: sihat
  Ujian perjalanan-balik lulus

Kemahiran: sihat
  12 kemahiran ditemui

Konfigurasi: sihat
```

---

## Menggabungkan Diagnostik

Untuk sesi diagnostik yang menyeluruh:

1. **Jalankan patrol** dari CLI:
   ```bash
   triggerfish patrol
   ```

2. **Semak log** untuk ralat terkini:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Tanya ejen** untuk menjalankan pemeriksaan kesihatan (jika ejen bertindak balas):
   > Jalankan pemeriksaan kesihatan sistem dan beritahu saya tentang sebarang isu

4. **Kumpulkan set log** jika anda perlu melaporkan isu:
   ```bash
   triggerfish logs bundle
   ```

---

## Diagnostik Permulaan

Jika daemon tidak bermula sama sekali, semak ini mengikut urutan:

1. **Konfigurasi wujud dan sah:**
   ```bash
   triggerfish config validate
   ```

2. **Rahsia boleh diselesaikan:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Tiada konflik port:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Tiada tika lain sedang berjalan:**
   ```bash
   triggerfish status
   ```

5. **Semak jurnal sistem (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Semak launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Semak Log Peristiwa Windows (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
