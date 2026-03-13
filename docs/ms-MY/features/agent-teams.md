# Pasukan Ejen

Ejen Triggerfish boleh menjana pasukan ejen yang bekerjasama secara berterusan untuk bekerja bersama pada tugas yang kompleks. Setiap ahli pasukan mendapat sesi, peranan, konteks perbualan, dan alat sendiri. Satu ahli ditetapkan sebagai **ketua** dan menyelaras kerja.

Pasukan paling sesuai untuk tugas bersifat terbuka yang mendapat manfaat dari peranan khusus yang bekerja secara selari: penyelidikan + analisis + penulisan, seni bina + pelaksanaan + semakan, atau mana-mana tugas di mana perspektif berbeza perlu berulang pada kerja antara satu sama lain.

::: info Ketersediaan
Pasukan Ejen memerlukan pelan **Power** ($149/bulan) apabila menggunakan Triggerfish Gateway. Pengguna sumber terbuka yang menjalankan kunci API mereka sendiri mempunyai akses penuh ke pasukan ejen — setiap ahli pasukan menggunakan inferens dari pembekal yang dikonfigurasi.
:::

## Alat

### `team_create`

Cipta pasukan ejen berterusan yang bekerjasama pada sesuatu tugas. Takrifkan peranan, alat, dan model ahli. Tepat satu ahli mestilah ketua.

| Parameter                | Jenis  | Diperlukan | Keterangan                                                              |
| ------------------------ | ------ | ---------- | ----------------------------------------------------------------------- |
| `name`                   | string | ya         | Nama pasukan yang boleh dibaca manusia                                  |
| `task`                   | string | ya         | Objektif pasukan (dihantar ke ketua sebagai arahan awal)                |
| `members`                | array  | ya         | Definisi ahli pasukan (lihat di bawah)                                  |
| `idle_timeout_seconds`   | number | tidak      | Tamat masa terbiar per-ahli. Lalai: 300 (5 minit)                      |
| `max_lifetime_seconds`   | number | tidak      | Jangka hayat pasukan maksimum. Lalai: 3600 (1 jam)                     |
| `classification_ceiling` | string | tidak      | Siling pengkelasan seluruh pasukan (contoh `CONFIDENTIAL`)              |

**Definisi ahli:**

| Medan                    | Jenis   | Diperlukan | Keterangan                                               |
| ------------------------ | ------- | ---------- | -------------------------------------------------------- |
| `role`                   | string  | ya         | Pengecam peranan unik (contoh `researcher`, `reviewer`)  |
| `description`            | string  | ya         | Apa yang ahli ini lakukan (disuntik ke gesaan sistem)    |
| `is_lead`                | boolean | ya         | Sama ada ahli ini adalah ketua pasukan                   |
| `model`                  | string  | tidak      | Penggantian model untuk ahli ini                         |
| `classification_ceiling` | string  | tidak      | Siling pengkelasan per-ahli                              |
| `initial_task`           | string  | tidak      | Arahan awal (ketua lalai ke tugas pasukan)               |

**Peraturan pengesahan:**

- Pasukan mesti mempunyai tepat satu ahli dengan `is_lead: true`
- Semua peranan mesti unik dan tidak kosong
- Siling pengkelasan ahli tidak boleh melebihi siling pasukan
- `name` dan `task` mesti tidak kosong

### `team_status`

Semak keadaan semasa pasukan yang aktif.

| Parameter | Jenis  | Diperlukan | Keterangan  |
| --------- | ------ | ---------- | ----------- |
| `team_id` | string | ya         | ID pasukan  |

Mengembalikan status pasukan, tahap taint agregat, dan perincian per-ahli termasuk taint semasa setiap ahli, status, dan cap masa aktiviti terkini.

### `team_message`

Hantar mesej kepada ahli pasukan tertentu. Berguna untuk memberikan konteks tambahan, mengalihkan kerja, atau meminta kemas kini kemajuan.

| Parameter | Jenis  | Diperlukan | Keterangan                                      |
| --------- | ------ | ---------- | ----------------------------------------------- |
| `team_id` | string | ya         | ID pasukan                                      |
| `role`    | string | tidak      | Peranan ahli sasaran (lalai ke ketua)           |
| `message` | string | ya         | Kandungan mesej                                 |

Pasukan mesti dalam status `running` dan ahli sasaran mesti `active` atau `idle`.

### `team_disband`

Matikan pasukan dan tamatkan semua sesi ahli.

| Parameter | Jenis  | Diperlukan | Keterangan                         |
| --------- | ------ | ---------- | ---------------------------------- |
| `team_id` | string | ya         | ID pasukan                         |
| `reason`  | string | tidak      | Mengapa pasukan dibubarkan         |

Hanya sesi yang mencipta pasukan atau ahli ketua boleh membubarkan pasukan.

## Cara Pasukan Berfungsi

### Penciptaan

Apabila ejen memanggil `team_create`, Triggerfish:

1. Mengesahkan definisi pasukan (peranan, kiraan ketua, siling pengkelasan)
2. Menjana sesi ejen terpencil untuk setiap ahli melalui kilang pengorkestra
3. Menyuntik **gesaan senarai pasukan** ke dalam gesaan sistem setiap ahli, menerangkan peranan, rakan sepasukan, dan arahan kerjasama mereka
4. Menghantar tugas awal ke ketua (atau `initial_task` tersuai per ahli)
5. Memulakan monitor kitaran hayat yang memeriksa kesihatan pasukan setiap 30 saat

Setiap sesi ahli adalah terpencil sepenuhnya dengan konteks perbualan, penjejakan taint, dan akses alat sendiri.

### Kerjasama

Ahli pasukan berkomunikasi antara satu sama lain menggunakan `sessions_send`. Ejen yang mencipta tidak perlu menyampaikan mesej antara ahli. Aliran tipikal:

1. Ketua menerima objektif pasukan
2. Ketua menguraikan tugas dan menghantar tugasan kepada ahli melalui `sessions_send`
3. Ahli bekerja secara autonomi, memanggil alat dan berulang
4. Ahli menghantar keputusan kembali ke ketua (atau terus ke ahli lain)
5. Ketua mensintesis keputusan dan memutuskan bila kerja selesai
6. Ketua memanggil `team_disband` untuk mematikan pasukan

Mesej antara ahli pasukan disampaikan terus melalui pengorkestra -- setiap mesej mencetuskan giliran ejen penuh dalam sesi penerima.

### Status

Gunakan `team_status` untuk memeriksa kemajuan pada bila-bila masa. Respons merangkumi:

- **Status pasukan:** `running`, `paused`, `completed`, `disbanded`, atau `timed_out`
- **Taint agregat:** Tahap pengkelasan tertinggi merentasi semua ahli
- **Perincian per-ahli:** Peranan, status (`active`, `idle`, `completed`, `failed`), tahap taint semasa, dan cap masa aktiviti terkini

### Pembubaran

Pasukan boleh dibubarkan oleh:

- Sesi yang mencipta memanggil `team_disband`
- Ahli ketua memanggil `team_disband`
- Monitor kitaran hayat membubarkan secara automatik selepas had jangka hayat tamat
- Monitor kitaran hayat mengesan semua ahli tidak aktif

Apabila pasukan dibubarkan, semua sesi ahli aktif ditamatkan dan sumber dibersihkan.

## Peranan Pasukan

### Ketua

Ahli ketua menyelaras pasukan. Apabila dicipta:

- Menerima `task` pasukan sebagai arahan awal (melainkan diganti oleh `initial_task`)
- Mendapat arahan gesaan sistem untuk menguraikan kerja, menetapkan tugas, dan memutuskan bila objektif tercapai
- Diberi kuasa untuk membubarkan pasukan

Terdapat tepat satu ketua per pasukan.

### Ahli

Ahli bukan-ketua adalah pakar. Apabila dicipta:

- Menerima `initial_task` mereka jika disediakan, jika tidak menunggu sehingga ketua menghantar kerja kepada mereka
- Mendapat arahan gesaan sistem untuk menghantar kerja yang selesai ke ketua atau rakan sepasukan yang sesuai
- Tidak boleh membubarkan pasukan

## Pemantauan Kitaran Hayat

Pasukan mempunyai pemantauan kitaran hayat automatik yang berjalan setiap 30 saat.

### Tamat Masa Terbiar

Setiap ahli mempunyai tamat masa terbiar (lalai: 5 minit). Apabila ahli terbiar:

1. **Ambang pertama (idle_timeout_seconds):** Ahli menerima mesej galakan meminta mereka menghantar keputusan jika kerja mereka selesai
2. **Ambang berganda (2x idle_timeout_seconds):** Ahli ditamatkan dan ketua diberitahu

### Tamat Masa Jangka Hayat

Pasukan mempunyai jangka hayat maksimum (lalai: 1 jam). Apabila had dicapai:

1. Ketua menerima mesej amaran dengan 60 saat untuk menghasilkan output akhir
2. Selepas tempoh tangguh, pasukan dibubarkan secara automatik

### Pemeriksaan Kesihatan

Monitor memeriksa kesihatan sesi setiap 30 saat:

- **Kegagalan ketua:** Jika sesi ketua tidak lagi boleh dicapai, pasukan dijeda dan sesi yang mencipta diberitahu
- **Kegagalan ahli:** Jika sesi ahli hilang, ia ditandakan sebagai `failed` dan ketua diberitahu untuk meneruskan dengan ahli yang tinggal
- **Semua tidak aktif:** Jika semua ahli adalah `completed` atau `failed`, sesi yang mencipta diberitahu untuk sama ada menyuntik arahan baru atau membubarkan

## Pengkelasan dan Taint

Sesi ahli pasukan mengikut peraturan pengkelasan yang sama seperti semua sesi lain:

- Setiap ahli bermula pada taint `PUBLIC` dan meningkat apabila mengakses data terklasifikasi
- **Siling pengkelasan** boleh ditetapkan per-pasukan atau per-ahli untuk menyekat data yang boleh diakses oleh ahli
- **Penguatkuasaan tanpa tulis-bawah** terpakai pada semua komunikasi antara ahli. Ahli yang ditaint pada `CONFIDENTIAL` tidak boleh menghantar data ke ahli pada `PUBLIC`
- **Taint agregat** (taint tertinggi merentasi semua ahli) dilaporkan dalam `team_status` supaya sesi yang mencipta boleh menjejak pendedahan pengkelasan keseluruhan pasukan

::: danger KESELAMATAN Siling pengkelasan ahli tidak boleh melebihi siling pasukan. Jika siling pasukan adalah `INTERNAL`, tiada ahli boleh dikonfigurasi dengan siling `CONFIDENTIAL`. Ini disahkan pada masa penciptaan. :::

## Pasukan vs Sub-Ejen

| Aspek           | Sub-Ejen (`subagent`)                       | Pasukan (`team_create`)                                       |
| --------------- | ------------------------------------------- | ------------------------------------------------------------- |
| **Jangka Hayat** | Tugas tunggal, mengembalikan keputusan dan keluar | Berterusan sehingga dibubarkan atau tamat masa            |
| **Ahli**        | Satu ejen                                   | Berbilang ejen dengan peranan berbeza                         |
| **Interaksi**   | Tembak-dan-lupakan dari induk               | Ahli berkomunikasi bebas melalui `sessions_send`              |
| **Penyelarasan** | Induk menunggu keputusan                   | Ketua menyelaras, induk boleh menyemak melalui `team_status` |
| **Kes penggunaan** | Pendelegasian langkah tunggal berfokus   | Kerjasama berbilang peranan yang kompleks                     |

**Gunakan sub-ejen** apabila anda memerlukan satu ejen melakukan tugas berfokus dan mengembalikan keputusan. **Gunakan pasukan** apabila tugas mendapat manfaat dari pelbagai perspektif khusus yang berulang pada kerja antara satu sama lain.

::: tip Pasukan adalah autonomi sebaik sahaja dicipta. Ejen yang mencipta boleh menyemak status dan menghantar mesej, tetapi tidak perlu mengurus secara terperinci. Ketua mengendalikan penyelarasan. :::
