# Memori Berterusan

Ejen Triggerfish mempunyai memori merentas sesi yang berterusan. Ejen boleh menyimpan fakta, keutamaan, dan konteks yang bertahan merentasi perbualan, pemulaan semula, dan bahkan wakeup trigger. Memori bergerbang pengkelasan — ejen tidak boleh membaca di atas taint sesinya atau menulis di bawahnya.

## Alat

### `memory_save`

Simpan fakta atau maklumat ke memori berterusan.

| Parameter | Jenis  | Diperlukan | Keterangan                                                          |
| --------- | ------ | ---------- | ------------------------------------------------------------------- |
| `key`     | string | ya         | Pengecam unik (contoh, `user-name`, `project-deadline`)             |
| `content` | string | ya         | Kandungan untuk diingati                                            |
| `tags`    | array  | tidak      | Tag untuk pengkategorian (contoh, `["personal", "preference"]`)     |

Pengkelasan **ditetapkan secara automatik** ke tahap taint sesi semasa. Ejen tidak boleh memilih tahap mana memori disimpan.

### `memory_get`

Dapatkan semula memori tertentu mengikut kuncinya.

| Parameter | Jenis  | Diperlukan | Keterangan                          |
| --------- | ------ | ---------- | ----------------------------------- |
| `key`     | string | ya         | Kunci memori untuk didapatkan semula |

Mengembalikan kandungan memori jika ia wujud dan boleh diakses pada tahap keselamatan semasa. Versi yang lebih tinggi diklasifikasikan menaungi yang lebih rendah.

### `memory_search`

Cari merentasi semua memori yang boleh diakses menggunakan bahasa semula jadi.

| Parameter     | Jenis  | Diperlukan | Keterangan                            |
| ------------- | ------ | ---------- | ------------------------------------- |
| `query`       | string | ya         | Pertanyaan carian bahasa semula jadi  |
| `max_results` | number | tidak      | Hasil maksimum (lalai: 10)            |

Menggunakan carian teks penuh SQLite FTS5 dengan stemming. Keputusan ditapis mengikut tahap keselamatan sesi semasa.

### `memory_list`

Senaraikan semua memori yang boleh diakses, secara pilihan ditapis mengikut tag.

| Parameter | Jenis  | Diperlukan | Keterangan              |
| --------- | ------ | ---------- | ----------------------- |
| `tag`     | string | tidak      | Tag untuk ditapis dengan |

### `memory_delete`

Padamkan memori mengikut kunci. Rekod dihapus secara lembut (disembunyikan tetapi dikekalkan untuk audit).

| Parameter | Jenis  | Diperlukan | Keterangan                       |
| --------- | ------ | ---------- | -------------------------------- |
| `key`     | string | ya         | Kunci memori untuk dipadamkan    |

Hanya boleh memadamkan memori pada tahap keselamatan sesi semasa.

## Cara Memori Berfungsi

### Pengekstrakan Automatik

Ejen secara proaktif menyimpan fakta penting yang dikongsi pengguna — butiran peribadi, konteks projek, keutamaan — menggunakan kunci yang deskriptif. Ini adalah tingkah laku peringkat prompt yang dipandu oleh SPINE.md. LLM memilih **apa** yang perlu disimpan; lapisan dasar memaksa **pada tahap mana**.

### Penghadangan Pengkelasan

Setiap rekod memori membawa tahap pengkelasan yang sama dengan taint sesi pada masa ia disimpan:

- Memori yang disimpan semasa sesi `CONFIDENTIAL` dikelaskan `CONFIDENTIAL`
- Sesi `PUBLIC` tidak boleh membaca memori `CONFIDENTIAL`
- Sesi `CONFIDENTIAL` boleh membaca memori `CONFIDENTIAL` dan `PUBLIC`

Ini dikuatkuasakan oleh semakan `canFlowTo` pada setiap operasi baca. LLM tidak boleh memintas ini.

### Naungan Memori

Apabila kunci yang sama wujud pada pelbagai tahap pengkelasan, hanya versi yang diklasifikasikan paling tinggi yang kelihatan kepada sesi semasa yang dikembalikan. Ini mencegah kebocoran maklumat merentasi sempadan pengkelasan.

**Contoh:** Jika `user-name` wujud pada kedua-dua `PUBLIC` (ditetapkan semasa sembang awam) dan `INTERNAL` (dikemas kini semasa sesi peribadi), sesi `INTERNAL` melihat versi `INTERNAL`, manakala sesi `PUBLIC` hanya melihat versi `PUBLIC`.

### Storan

Memori disimpan melalui antara muka `StorageProvider` (abstraksi yang sama digunakan untuk sesi, cron job, dan todos). Carian teks penuh menggunakan SQLite FTS5 untuk pertanyaan bahasa semula jadi yang cepat dengan stemming.

## Keselamatan

- Pengkelasan sentiasa dipaksa ke `session.taint` dalam hook `PRE_TOOL_CALL` — LLM tidak boleh memilih pengkelasan yang lebih rendah
- Semua bacaan ditapis oleh `canFlowTo` — tiada memori di atas taint sesi yang dikembalikan
- Pemadaman adalah pemadaman lembut — rekod disembunyikan tetapi dikekalkan untuk audit
- Ejen tidak boleh meningkatkan pengkelasan memori dengan membaca data bertaraf tinggi dan menyimpannya semula pada tahap yang lebih rendah (pencegahan write-down terpakai)

::: warning KESELAMATAN LLM tidak pernah memilih pengkelasan memori. Ia sentiasa dipaksa ke tahap taint sesi semasa oleh lapisan dasar. Ini adalah sempadan keras yang tidak boleh dikonfigurasi. :::
