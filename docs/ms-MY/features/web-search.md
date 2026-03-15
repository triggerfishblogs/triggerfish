# Carian Web dan Ambil

Triggerfish memberi ejen anda akses ke internet melalui dua alat: `web_search` untuk mencari maklumat dan `web_fetch` untuk membaca halaman web. Bersama-sama mereka membolehkan ejen menyelidik topik, mencari dokumentasi, memeriksa peristiwa semasa, dan mengambil data dari web — semuanya di bawah penguatkuasaan dasar yang sama seperti setiap alat lain.

## Alat

### `web_search`

Cari web. Mengembalikan tajuk, URL, dan petikan.

| Parameter     | Jenis  | Diperlukan | Keterangan                                                                                          |
| ------------- | ------ | ---------- | --------------------------------------------------------------------------------------------------- |
| `query`       | string | ya         | Pertanyaan carian. Jadilah khusus — sertakan kata kunci, nama, atau tarikh yang berkaitan untuk hasil yang lebih baik. |
| `max_results` | number | tidak      | Hasil maksimum untuk dikembalikan (lalai: 5, maks: 20).                                             |

**Contoh respons:**

```
Hasil carian untuk "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Pengikatan SQLite3 pantas untuk Deno menggunakan FFI...

2. Panduan Deno SQLite
   https://docs.deno.com/examples/sqlite
   Cara menggunakan SQLite dengan Deno...
```

### `web_fetch`

Ambil dan ekstrak kandungan yang boleh dibaca dari URL. Mengembalikan teks artikel secara lalai menggunakan Mozilla Readability.

| Parameter | Jenis  | Diperlukan | Keterangan                                                                       |
| --------- | ------ | ---------- | -------------------------------------------------------------------------------- |
| `url`     | string | ya         | URL untuk diambil. Gunakan URL dari hasil `web_search`.                          |
| `mode`    | string | tidak      | Mod pengekstrakan: `readability` (lalai, teks artikel) atau `raw` (HTML penuh).  |

**Mod pengekstrakan:**

- **`readability`** (lalai) — Mengekstrak kandungan artikel utama, mengelakkan navigasi, iklan, dan boilerplate. Terbaik untuk artikel berita, catatan blog, dan dokumentasi.
- **`raw`** — Mengembalikan HTML penuh. Gunakan apabila pengekstrakan readability mengembalikan terlalu sedikit kandungan (contoh, aplikasi satu halaman, kandungan dinamik).

## Cara Ejen Menggunakannya

Ejen mengikuti corak cari-kemudian-ambil:

1. Gunakan `web_search` untuk mencari URL yang berkaitan
2. Gunakan `web_fetch` untuk membaca halaman yang paling menjanjikan
3. Sintesis maklumat dan petik sumber

Apabila menjawab dengan maklumat web, ejen memetik URL sumber sebaris supaya ia kelihatan merentasi semua saluran (Telegram, Slack, CLI, dll.).

## Konfigurasi

Carian web memerlukan pembekal carian. Konfigurasinya dalam `triggerfish.yaml`:

```yaml
web:
  search:
    provider: brave # Backend carian (brave adalah lalai)
    api_key: your-api-key # Kunci API Brave Search
```

| Kunci                 | Jenis  | Keterangan                                       |
| --------------------- | ------ | ------------------------------------------------ |
| `web.search.provider` | string | Backend carian. Disokong pada masa ini: `brave`. |
| `web.search.api_key`  | string | Kunci API untuk pembekal carian.                 |

::: tip Jika tiada pembekal carian dikonfigurasi, `web_search` mengembalikan mesej ralat yang memberitahu ejen bahawa carian tidak tersedia. `web_fetch` berfungsi secara bebas — ia tidak memerlukan pembekal carian. :::

## Keselamatan

- Semua URL yang diambil melalui pencegahan SSRF: DNS diselesaikan terlebih dahulu dan diperiksa terhadap senarai tolak IP yang dikodkan keras. Julat IP peribadi/terpelihara sentiasa disekat.
- Kandungan yang diambil dikelaskan dan menyumbang kepada taint sesi seperti mana-mana respons alat lain.
- Hook `PRE_TOOL_CALL` diaktifkan sebelum setiap ambilan, dan `POST_TOOL_RESPONSE` diaktifkan selepasnya, jadi peraturan dasar tersuai boleh menyekat domain mana yang diakses oleh ejen.
