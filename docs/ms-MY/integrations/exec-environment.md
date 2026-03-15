# Persekitaran Pelaksanaan Ejen

Persekitaran Pelaksanaan Ejen adalah keupayaan pembangunan diri Triggerfish -- ruang kerja kod kelas pertama di mana ejen boleh menulis kod, melaksanakannya, memerhati output dan ralat, membetulkan isu, dan berulang sehingga sesuatu berfungsi. Ini membolehkan ejen membina integrasi, menguji idea, dan mencipta alat baru sendiri.

## Bukan Kotak Pasir Plugin

Persekitaran pelaksanaan adalah berbeza secara asasi dari [Kotak Pasir Plugin](./plugins). Memahami perbezaannya adalah penting:

- **Kotak Pasir Plugin** melindungi sistem **DARI** kod pihak ketiga yang tidak dipercayai
- **Persekitaran Exec** memperkasakan ejen **UNTUK** menulis, menjalankan, dan menyahpepijat kodnya sendiri

Kotak pasir plugin adalah defensif. Persekitaran exec adalah produktif. Mereka memenuhi tujuan yang bertentangan dan mempunyai profil keselamatan yang berbeza.

| Aspek               | Kotak Pasir Plugin                 | Persekitaran Exec Ejen               |
| ------------------- | ---------------------------------- | ------------------------------------- |
| **Tujuan**          | Lindungi sistem DARI kod yang tidak dipercayai | Perkasakan ejen UNTUK membina sesuatu |
| **Sistem fail**     | Tiada (dikotak pasirkan sepenuhnya) | Direktori ruang kerja sahaja         |
| **Rangkaian**       | Titik akhir yang diisytiharkan sahaja | Senarai benarkan/tolak yang dikawal dasar |
| **Pemasangan pakej** | Tidak dibenarkan                  | Dibenarkan (npm, pip, deno add)       |
| **Masa pelaksanaan** | Tamat masa ketat                  | Tamat masa longgar (boleh dikonfigurasi) |
| **Iterasi**         | Jalankan tunggal                   | Gelung tulis/jalankan/betulkan tanpa had |
| **Keterusatan**     | Sementara                          | Ruang kerja berterusan merentasi sesi |

## Gelung Maklum Balas

Pembeza kualiti teras. Ini adalah corak yang sama yang menjadikan alat seperti Claude Code berkesan -- kitaran tulis/jalankan/betulkan yang ketat di mana ejen melihat tepat apa yang dilihat oleh pembangun manusia.

### Langkah 1: Tulis

Ejen mencipta atau mengubah fail dalam ruang kerjanya menggunakan `write_file`. Ruang kerja adalah direktori sistem fail sebenar yang diskopkan ke ejen semasa.

### Langkah 2: Laksanakan

Ejen menjalankan kod melalui `run_command`, menerima stdout, stderr, dan kod keluar yang lengkap. Tiada output yang disembunyikan atau diringkaskan. Ejen melihat tepat apa yang anda lihat dalam terminal.

### Langkah 3: Perhatikan

Ejen membaca output penuh. Jika ralat berlaku, ia melihat jejak tindanan penuh, mesej ralat, dan output diagnostik. Jika ujian gagal, ia melihat ujian mana yang gagal dan mengapa.

### Langkah 4: Betulkan

Ejen mengedit kod berdasarkan apa yang diperhatikan, menggunakan `write_file` atau `edit_file` untuk mengemas kini fail tertentu.

### Langkah 5: Ulangi

Ejen menjalankan semula. Gelung ini berterusan sehingga kod berfungsi -- ujian lulus, menghasilkan output yang betul, atau mencapai matlamat yang dinyatakan.

### Langkah 6: Kekalkan

Sebaik sahaja berfungsi, ejen boleh menyimpan kerjanya sebagai [kemahiran](./skills) (SKILL.md + fail sokongan), mendaftarnya sebagai integrasi, menghubungkannya ke cron job, atau menjadikannya tersedia sebagai alat.

::: tip Langkah kekalkan adalah yang menjadikan persekitaran exec lebih dari sekadar buku nota. Kod yang berfungsi tidak hilang begitu sahaja -- ejen boleh membungkusnya ke dalam kemahiran yang boleh digunakan semula yang berjalan mengikut jadual, bertindak balas kepada trigger, atau dipanggil atas permintaan. :::

## Alat yang Tersedia

| Alat             | Keterangan                                        | Output                                    |
| ---------------- | ------------------------------------------------- | ----------------------------------------- |
| `write_file`     | Tulis atau tindih fail dalam ruang kerja          | Laluan fail, bait yang ditulis            |
| `read_file`      | Baca kandungan fail dari ruang kerja              | Kandungan fail sebagai string             |
| `edit_file`      | Terapkan suntingan bertarget pada fail            | Kandungan fail yang dikemas kini          |
| `run_command`    | Laksanakan arahan shell dalam ruang kerja         | stdout, stderr, kod keluar, tempoh        |
| `list_directory` | Senaraikan fail dalam ruang kerja (rekursif pilihan) | Senarai fail dengan saiz               |
| `search_files`   | Cari kandungan fail (seperti grep)                | Baris yang sepadan dengan rujukan fail:baris |

## Struktur Ruang Kerja

Setiap ejen mendapat direktori ruang kerja yang terpencil yang berterusan merentasi sesi:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Ruang kerja per-ejen
    scratch/                      # Fail kerja sementara
    integrations/                 # Kod integrasi yang sedang dibangunkan
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Kemahiran yang sedang dikarang
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Log pelaksanaan untuk audit
  background/
    <session-id>/                 # Ruang kerja sementara untuk tugas latar belakang
```

Ruang kerja diasingkan antara ejen. Satu ejen tidak boleh mengakses ruang kerja ejen lain. Tugas latar belakang (cron job, trigger) mendapat ruang kerja sementara mereka sendiri yang diskopkan ke sesi.

## Aliran Pembangunan Integrasi

Apabila anda meminta ejen membina integrasi baru (contohnya, "sambungkan ke Notion saya dan selaraskan tugas"), ejen mengikut aliran kerja pembangunan semula jadi:

1. **Teroka** -- Menggunakan `run_command` untuk menguji titik akhir API, memeriksa auth, memahami bentuk respons
2. **Bina rangka** -- Menulis kod integrasi menggunakan `write_file`, mencipta fail ujian bersama
3. **Uji** -- Menjalankan ujian dengan `run_command`, melihat kegagalan, berulang
4. **Pasang kebergantungan** -- Menggunakan `run_command` untuk menambah pakej yang diperlukan (npm, pip, deno add)
5. **Berulang** -- Gelung tulis, jalankan, betulkan sehingga ujian lulus dan integrasi berfungsi dari hujung ke hujung
6. **Kekalkan** -- Simpan sebagai kemahiran (tulis SKILL.md dengan metadata) atau hubungkan ke cron job
7. **Kelulusan** -- Kemahiran yang dikarang sendiri memasuki keadaan `PENDING_APPROVAL`; anda semak dan luluskan

## Sokongan Bahasa dan Runtime

Persekitaran pelaksanaan berjalan pada sistem hos (bukan dalam WASM), dengan akses ke pelbagai runtime:

| Runtime | Tersedia Melalui                 | Kes Penggunaan                         |
| ------- | -------------------------------- | -------------------------------------- |
| Deno    | Pelaksanaan langsung             | TypeScript/JavaScript (kelas pertama)  |
| Node.js | `run_command node`               | Akses ekosistem npm                    |
| Python  | `run_command python`             | Sains data, ML, skrip                  |
| Shell   | `run_command sh` / `run_command bash` | Automasi sistem, skrip penyambung |

Ejen boleh mengesan runtime yang tersedia dan memilih yang terbaik untuk tugasnya. Pemasangan pakej berfungsi melalui rantai alat standard untuk setiap runtime.

## Sempadan Keselamatan

Persekitaran exec lebih permisif dari kotak pasir plugin, tetapi masih dikawal dasar pada setiap langkah.

### Integrasi Dasar

- Setiap panggilan `run_command` mengaktifkan hook `PRE_TOOL_CALL` dengan arahan sebagai konteks
- Senarai benarkan/tolak arahan diperiksa sebelum pelaksanaan
- Output ditangkap dan dihantar melalui hook `POST_TOOL_RESPONSE`
- Titik akhir rangkaian yang diakses semasa pelaksanaan dijejaki melalui keturunan
- Jika kod mengakses data terklasifikasi (contohnya, membaca dari API CRM), taint sesi meningkat
- Sejarah pelaksanaan direkodkan ke `.exec_history` untuk audit

### Sempadan Keras

Sempadan ini tidak pernah dilintasi, tanpa mengira konfigurasi:

- Tidak boleh menulis di luar direktori ruang kerja
- Tidak boleh melaksanakan arahan dalam senarai tolak (`rm -rf /`, `sudo`, dll.)
- Tidak boleh mengakses ruang kerja ejen lain
- Semua panggilan rangkaian dikawal oleh hook dasar
- Semua output diklasifikasikan dan menyumbang kepada taint sesi
- Had sumber dikuatkuasakan: ruang cakera, masa CPU per pelaksanaan, memori

::: warning KESELAMATAN Setiap arahan yang dijalankan oleh ejen melalui hook `PRE_TOOL_CALL`. Enjin dasar memeriksa terhadap senarai benarkan/tolak arahan sebelum pelaksanaan bermula. Arahan berbahaya disekat secara deterministik -- LLM tidak boleh mempengaruhi keputusan ini. :::

### Kawalan Perusahaan

Pentadbir perusahaan mempunyai kawalan tambahan ke atas persekitaran exec:

- **Lumpuhkan exec sepenuhnya** untuk ejen atau peranan tertentu
- **Hadkan runtime yang tersedia** (contohnya, benarkan hanya Deno, sekat Python dan shell)
- **Tetapkan had sumber** per-ejen (kuota cakera, masa CPU, siling memori)
- **Perlukan kelulusan** untuk semua operasi exec di atas ambang pengkelasan
- **Senarai tolak arahan tersuai** di luar senarai arahan berbahaya lalai
