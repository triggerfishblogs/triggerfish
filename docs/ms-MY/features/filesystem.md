# Alat Sistem Fail dan Shell

Triggerfish menyediakan ejen dengan alat sistem fail dan shell tujuan umum untuk membaca, menulis, mencari, dan melaksanakan arahan. Ini adalah alat asas yang dibina oleh keupayaan lain (persekitaran exec, explore, kemahiran).

## Alat

### `read_file`

Baca kandungan fail pada laluan mutlak.

| Parameter | Jenis  | Diperlukan | Keterangan                     |
| --------- | ------ | ---------- | ------------------------------ |
| `path`    | string | ya         | Laluan fail mutlak untuk dibaca |

Mengembalikan kandungan teks penuh fail.

### `write_file`

Tulis kandungan ke fail pada laluan relatif ruang kerja.

| Parameter | Jenis  | Diperlukan | Keterangan                         |
| --------- | ------ | ---------- | ---------------------------------- |
| `path`    | string | ya         | Laluan relatif dalam ruang kerja   |
| `content` | string | ya         | Kandungan fail untuk ditulis       |

Penulisan diskopkan ke direktori ruang kerja ejen. Ejen tidak boleh menulis ke lokasi sewenang-wenangnya pada sistem fail.

### `edit_file`

Gantikan rentetan unik dalam fail. `old_text` mesti muncul tepat sekali dalam fail.

| Parameter  | Jenis  | Diperlukan | Keterangan                                      |
| ---------- | ------ | ---------- | ----------------------------------------------- |
| `path`     | string | ya         | Laluan fail mutlak untuk diedit                 |
| `old_text` | string | ya         | Teks tepat untuk dicari (mesti unik dalam fail) |
| `new_text` | string | ya         | Teks penggantian                                |

Ini adalah alat edit pembedahan -- ia mencari satu padanan tepat dan menggantinya. Jika teks muncul lebih dari sekali atau tidak langsung, operasi gagal dengan ralat.

### `list_directory`

Senaraikan fail dan direktori pada laluan mutlak yang diberikan.

| Parameter | Jenis  | Diperlukan | Keterangan                         |
| --------- | ------ | ---------- | ---------------------------------- |
| `path`    | string | ya         | Laluan direktori mutlak untuk disenaraikan |

Mengembalikan entri dengan akhiran `/` untuk direktori.

### `search_files`

Cari fail yang sepadan dengan corak glob, atau cari kandungan fail dengan grep.

| Parameter        | Jenis   | Diperlukan | Keterangan                                                              |
| ---------------- | ------- | ---------- | ----------------------------------------------------------------------- |
| `path`           | string  | ya         | Direktori untuk dicari                                                  |
| `pattern`        | string  | ya         | Corak glob untuk nama fail, atau teks/regex untuk dicari dalam fail     |
| `content_search` | boolean | tidak      | Jika `true`, cari kandungan fail berbanding nama fail                   |

### `run_command`

Jalankan arahan shell dalam direktori ruang kerja ejen.

| Parameter | Jenis  | Diperlukan | Keterangan                  |
| --------- | ------ | ---------- | --------------------------- |
| `command` | string | ya         | Arahan shell untuk dilaksanakan |

Mengembalikan stdout, stderr, dan kod keluar. Arahan dilaksanakan dalam direktori ruang kerja ejen. Hook `PRE_TOOL_CALL` memeriksa arahan terhadap senarai tolak sebelum pelaksanaan.

## Hubungan dengan Alat Lain

Alat sistem fail ini bertindih dengan alat [Persekitaran Exec](/ms-MY/integrations/exec-environment) (`exec.write`, `exec.read`, `exec.run`, `exec.ls`). Perbezaannya:

- **Alat sistem fail** beroperasi pada laluan mutlak dan ruang kerja lalai ejen. Ia sentiasa tersedia.
- **Alat exec** beroperasi dalam ruang kerja berstruktur dengan pengasingan eksplisit, pelari ujian, dan pemasangan pakej. Ia adalah sebahagian dari integrasi persekitaran exec.

Ejen menggunakan alat sistem fail untuk operasi fail umum dan alat exec semasa bekerja dalam aliran kerja pembangunan (gelung tulis/jalankan/betulkan).

## Keselamatan

- `write_file` diskopkan ke direktori ruang kerja ejen
- `run_command` melalui hook `PRE_TOOL_CALL` dengan arahan sebagai konteks
- Senarai tolak arahan menyekat operasi berbahaya (`rm -rf /`, `sudo`, dll.)
- Semua respons alat melalui `POST_TOOL_RESPONSE` untuk pengkelasan dan penjejakan taint
- Dalam mod pelan, `write_file` disekat sehingga pelan diluluskan
