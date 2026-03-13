# Sub-Ejen dan Tugas LLM

Ejen Triggerfish boleh mewakilkan kerja kepada sub-ejen dan menjalankan gesaan LLM yang terpencil. Ini membolehkan kerja selari, penaakulan berfokus, dan penguraian tugas berbilang ejen.

## Alat

### `subagent`

Jana sub-ejen untuk tugas berbilang langkah yang autonomi. Sub-ejen mendapat konteks perbualan sendiri dan boleh menggunakan alat secara bebas. Mengembalikan keputusan akhir apabila selesai.

| Parameter | Jenis  | Diperlukan | Keterangan                                                        |
| --------- | ------ | ---------- | ----------------------------------------------------------------- |
| `task`    | string | ya         | Apa yang sub-ejen perlu capai                                     |
| `tools`   | string | tidak      | Senarai putih alat yang dipisahkan koma (lalai: alat baca-sahaja) |

**Alat lalai:** Sub-ejen bermula dengan alat baca-sahaja (`read_file`, `list_directory`, `search_files`, `run_command`). Nyatakan alat tambahan secara eksplisit jika sub-ejen memerlukan akses tulis.

**Contoh penggunaan:**

- Selidiki topik sementara ejen utama meneruskan kerja lain
- Terokai pangkalan kod secara selari dari pelbagai sudut (ini yang dilakukan oleh alat `explore` secara dalaman)
- Wakilkan tugas pelaksanaan yang berdiri sendiri

### `llm_task`

Jalankan gesaan LLM sekali-tembak untuk penaakulan terpencil. Gesaan berjalan dalam konteks berasingan dan tidak mencemari sejarah perbualan utama.

| Parameter | Jenis  | Diperlukan | Keterangan                                 |
| --------- | ------ | ---------- | ------------------------------------------ |
| `prompt`  | string | ya         | Gesaan untuk dihantar                      |
| `system`  | string | tidak      | Gesaan sistem pilihan                      |
| `model`   | string | tidak      | Penggantian nama model/pembekal pilihan    |

**Contoh penggunaan:**

- Ringkaskan dokumen panjang tanpa memenuhi konteks utama
- Kelaskan atau ekstrak data dari teks berstruktur
- Dapatkan pendapat kedua tentang pendekatan
- Jalankan gesaan terhadap model yang berbeza dari model utama

### `agents_list`

Senaraikan pembekal LLM dan ejen yang dikonfigurasi. Tidak mengambil parameter.

Mengembalikan maklumat tentang pembekal yang tersedia, model mereka, dan status konfigurasi.

## Cara Sub-Ejen Berfungsi

Apabila ejen memanggil `subagent`, Triggerfish:

1. Mencipta contoh pengorkestra baru dengan konteks perbualan sendiri
2. Menyediakan sub-ejen dengan alat yang ditentukan (lalai ke baca-sahaja)
3. Menghantar tugas sebagai mesej pengguna awal
4. Sub-ejen berjalan secara autonomi -- memanggil alat, memproses keputusan, berulang
5. Apabila sub-ejen menghasilkan respons akhir, ia dikembalikan ke ejen induk

Sub-ejen mewarisi tahap taint sesi induk dan kekangan pengkelasan. Mereka tidak boleh meningkat melebihi siling induk.

## Bila Menggunakan Setiap Alat

| Alat       | Gunakan Apabila                                                  |
| ---------- | ---------------------------------------------------------------- |
| `subagent` | Tugas berbilang langkah yang memerlukan penggunaan alat dan iterasi |
| `llm_task` | Penaakulan sekali-tembak, ringkasan, atau pengkelasan            |
| `explore`  | Pemahaman pangkalan kod (menggunakan sub-ejen secara dalaman)    |

::: tip Alat `explore` dibina di atas `subagent` -- ia menjana 2-6 sub-ejen selari bergantung pada tahap kedalaman. Jika anda memerlukan penerokaan pangkalan kod berstruktur, gunakan `explore` terus berbanding menjana sub-ejen secara manual. :::

## Sub-Ejen vs Pasukan Ejen

Sub-ejen adalah tembak-dan-lupakan: induk menunggu keputusan tunggal. [Pasukan Ejen](/ms-MY/features/agent-teams) adalah kumpulan ejen yang bekerjasama secara berterusan dengan peranan berbeza, penyelaras utama, dan komunikasi antara ahli. Gunakan sub-ejen untuk pendelegasian langkah tunggal yang berfokus. Gunakan pasukan apabila tugas mendapat manfaat dari pelbagai perspektif khusus yang berulang pada kerja antara satu sama lain.
