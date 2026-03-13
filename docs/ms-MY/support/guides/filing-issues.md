# Cara Melaporkan Isu yang Baik

Isu yang terstruktur dengan baik diselesaikan lebih cepat. Isu yang samar-samar tanpa log dan tanpa langkah penghasilan semula sering kekal berminggu-minggu kerana tiada yang boleh bertindak ke atasnya. Berikut adalah apa yang perlu disertakan.

## Sebelum Melaporkan

1. **Cari isu sedia ada.** Seseorang mungkin telah melaporkan masalah yang sama. Semak [isu terbuka](https://github.com/greghavens/triggerfish/issues) dan [isu tertutup](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Semak panduan penyelesaian masalah.** [Bahagian Penyelesaian Masalah](/ms-MY/support/troubleshooting/) merangkumi kebanyakan masalah biasa.

3. **Semak isu diketahui.** Halaman [Isu Diketahui](/ms-MY/support/kb/known-issues) menyenaraikan masalah yang sudah kami ketahui.

4. **Cuba versi terkini.** Jika anda tidak menggunakan keluaran terkini, kemas kini dahulu:
   ```bash
   triggerfish update
   ```

## Apa yang Perlu Disertakan

### 1. Persekitaran

```
Versi Triggerfish: (jalankan `triggerfish version`)
OS: (contoh, macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Seni bina: (x64 atau arm64)
Kaedah pemasangan: (pemasang binari, dari sumber, Docker)
```

### 2. Langkah untuk Menghasilkan Semula

Tulis urutan tindakan yang tepat yang membawa kepada masalah. Jadilah spesifik:

**Buruk:**
> Bot berhenti berfungsi.

**Baik:**
> 1. Mulakan Triggerfish dengan saluran Telegram yang dikonfigurasi
> 2. Hantar mesej "semak kalendar saya untuk esok" dalam DM kepada bot
> 3. Bot bertindak balas dengan keputusan kalendar
> 4. Hantar "kini e-melkan keputusan tersebut ke alice@example.com"
> 5. Dijangka: bot menghantar e-mel
> 6. Sebenar: bot bertindak balas dengan "Tulis-bawah disekat: CONFIDENTIAL tidak boleh mengalir ke INTERNAL"

### 3. Tingkah Laku Yang Dijangkakan vs. Sebenar

Nyatakan apa yang anda jangkakan berlaku dan apa yang sebenarnya berlaku. Sertakan mesej ralat yang tepat jika ada. Salin-tampal adalah lebih baik daripada meringkaskan.

### 4. Output Log

Lampirkan [set log](/ms-MY/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Jika isu adalah sensitif dari segi keselamatan, anda boleh menyunting bahagian tertentu, tetapi nyatakan dalam isu apa yang anda sunting.

Sekurang-kurangnya, tampal baris log yang relevan. Sertakan cap masa supaya kami boleh menghubungkaitkan peristiwa.

### 5. Konfigurasi (Disunting)

Tampal bahagian relevan dari `triggerfish.yaml` anda. **Sentiasa sunting rahsia.** Gantikan nilai sebenar dengan pemegang tempat:

```yaml
# Baik - rahsia disunting
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # disimpan dalam keychain
channels:
  telegram:
    ownerId: "DISUNTING"
    classification: INTERNAL
```

### 6. Output Patrol

```bash
triggerfish patrol
```

Tampal output. Ini memberikan kami gambaran pantas tentang kesihatan sistem.

## Jenis Isu

### Laporan Pepijat

Gunakan templat ini untuk perkara yang rosak:

```markdown
## Laporan Pepijat

**Persekitaran:**
- Versi:
- OS:
- Kaedah pemasangan:

**Langkah untuk menghasilkan semula:**
1.
2.
3.

**Tingkah laku yang dijangkakan:**

**Tingkah laku sebenar:**

**Mesej ralat (jika ada):**

**Output patrol:**

**Konfigurasi relevan (disunting):**

**Set log:** (lampirkan fail)
```

### Permintaan Ciri

```markdown
## Permintaan Ciri

**Masalah:** Apa yang anda cuba lakukan yang tidak boleh anda lakukan hari ini?

**Penyelesaian yang dicadangkan:** Bagaimana anda fikir ia harus berfungsi?

**Alternatif yang dipertimbangkan:** Apa lagi yang anda cuba?
```

### Soalan / Permintaan Sokongan

Jika anda tidak pasti sama ada sesuatu adalah pepijat atau anda hanya tersekat, gunakan [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) dan bukannya Issues. Perbincangan lebih sesuai untuk soalan yang mungkin tidak mempunyai satu jawapan yang betul.

## Apa yang TIDAK Perlu Disertakan

- **Kunci API atau kata laluan mentah.** Sentiasa sunting.
- **Data peribadi dari perbualan.** Sunting nama, e-mel, nombor telefon.
- **Keseluruhan fail log sebaris.** Lampirkan set log sebagai fail dan bukannya menampal ribuan baris.

## Selepas Melaporkan

- **Pantau soalan susulan.** Penyelenggara mungkin memerlukan maklumat tambahan.
- **Uji pembetulan.** Jika pembetulan ditolak, anda mungkin diminta untuk mengesahkannya.
- **Tutup isu** jika anda menemui penyelesaian sendiri. Siarkan penyelesaian supaya orang lain boleh mendapat manfaat.
