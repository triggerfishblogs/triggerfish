# Pengurusan Sesi

Ejen boleh memeriksa, berkomunikasi dengan, dan menjanakan sesi. Alat-alat ini membolehkan aliran kerja merentas sesi, delegasi tugas latar belakang, dan pemesejan merentas saluran — semuanya di bawah penguatkuasaan write-down.

## Alat

### `sessions_list`

Senaraikan semua sesi aktif yang kelihatan kepada sesi semasa.

Tidak mengambil parameter. Keputusan ditapis mengikut tahap taint — sesi `PUBLIC` tidak boleh melihat metadata sesi `CONFIDENTIAL`.

### `sessions_history`

Dapatkan sejarah mesej untuk sesi mengikut ID.

| Parameter    | Jenis  | Diperlukan | Keterangan                                 |
| ------------ | ------ | ---------- | ------------------------------------------ |
| `session_id` | string | ya         | ID sesi untuk mendapatkan sejarah          |

Akses dinafikan jika taint sesi sasaran lebih tinggi daripada taint pemanggil.

### `sessions_send`

Hantar kandungan dari sesi semasa ke sesi lain. Tertakluk kepada penguatkuasaan write-down.

| Parameter    | Jenis  | Diperlukan | Keterangan                  |
| ------------ | ------ | ---------- | --------------------------- |
| `session_id` | string | ya         | ID sesi sasaran             |
| `content`    | string | ya         | Kandungan mesej untuk dihantar |

**Semakan write-down:** Taint pemanggil mesti dapat mengalir ke tahap pengkelasan sesi sasaran. Sesi `CONFIDENTIAL` tidak boleh menghantar data ke sesi `PUBLIC`.

### `sessions_spawn`

Janakan sesi latar belakang baru untuk tugas autonomi.

| Parameter | Jenis  | Diperlukan | Keterangan                                              |
| --------- | ------ | ---------- | ------------------------------------------------------- |
| `task`    | string | ya         | Keterangan tentang apa yang perlu dilakukan oleh sesi latar belakang |

Sesi yang dijanakan bermula dengan taint `PUBLIC` yang bebas dan ruang kerja terpencilnya sendiri. Ia berjalan secara autonomi dan mengembalikan hasil apabila selesai.

### `session_status`

Dapatkan metadata dan status untuk sesi tertentu.

| Parameter    | Jenis  | Diperlukan | Keterangan                  |
| ------------ | ------ | ---------- | --------------------------- |
| `session_id` | string | ya         | ID sesi untuk diperiksa     |

Mengembalikan ID sesi, saluran, pengguna, tahap taint, dan masa penciptaan. Akses bergerbang taint.

### `message`

Hantar mesej ke saluran dan penerima. Tertakluk kepada penguatkuasaan write-down melalui hook dasar.

| Parameter   | Jenis  | Diperlukan | Keterangan                                  |
| ----------- | ------ | ---------- | ------------------------------------------- |
| `channel`   | string | ya         | Saluran sasaran (contoh, `telegram`, `slack`) |
| `recipient` | string | ya         | Pengecam penerima dalam saluran             |
| `text`      | string | ya         | Teks mesej untuk dihantar                   |

### `summarize`

Jana ringkasan ringkas perbualan semasa. Berguna untuk mencipta nota serah terima, memampatkan konteks, atau menghasilkan rekap untuk penghantaran ke saluran lain.

| Parameter | Jenis  | Diperlukan | Keterangan                                                  |
| --------- | ------ | ---------- | ----------------------------------------------------------- |
| `scope`   | string | tidak      | Apa yang perlu diringkaskan: `session` (lalai), `topic`     |

### `simulate_tool_call`

Simulasikan panggilan alat untuk pratonton keputusan enjin dasar tanpa melaksanakan alat. Mengembalikan hasil penilaian hook (ALLOW, BLOCK, atau REDACT) dan peraturan yang dinilai.

| Parameter   | Jenis  | Diperlukan | Keterangan                                  |
| ----------- | ------ | ---------- | ------------------------------------------- |
| `tool_name` | string | ya         | Alat untuk disimulasikan panggilannya       |
| `args`      | object | tidak      | Argumen untuk disertakan dalam simulasi     |

::: tip Gunakan `simulate_tool_call` untuk memeriksa sama ada panggilan alat akan dibenarkan sebelum melaksanakannya. Ini berguna untuk memahami tingkah laku dasar tanpa kesan sampingan. :::

## Kes Penggunaan

### Delegasi Tugas Latar Belakang

Ejen boleh menjanakan sesi latar belakang untuk mengendalikan tugas yang berjalan lama tanpa menyekat perbualan semasa:

```
Pengguna: "Selidiki harga pesaing dan sediakan ringkasan"
Ejen: [memanggil sessions_spawn dengan tugas]
Ejen: "Saya telah memulakan sesi latar belakang untuk menyelidik itu. Saya akan mempunyai keputusan tidak lama lagi."
```

### Komunikasi Merentas Sesi

Sesi boleh menghantar data antara satu sama lain, membolehkan aliran kerja di mana satu sesi menghasilkan data yang digunakan oleh yang lain:

```
Sesi latar belakang selesai penyelidikan → sessions_send ke induk → induk memberitahu pengguna
```

### Pemesejan Merentas Saluran

Alat `message` membolehkan ejen secara proaktif mencapai pada mana-mana saluran yang disambungkan:

```
Ejen mengesan peristiwa mendesak → message({ channel: "telegram", recipient: "owner", text: "Amaran: ..." })
```

## Keselamatan

- Semua operasi sesi bergerbang taint: anda tidak boleh melihat, membaca, atau menghantar ke sesi di atas tahap taint anda
- `sessions_send` menguatkuasakan pencegahan write-down: data tidak boleh mengalir ke pengkelasan yang lebih rendah
- Sesi yang dijanakan bermula pada taint `PUBLIC` dengan penjejakan taint bebas
- Alat `message` melalui hook dasar `PRE_OUTPUT` sebelum penghantaran
- ID sesi disuntik dari konteks masa larian, bukan dari argumen LLM — ejen tidak boleh menyamar sebagai sesi lain

::: warning KESELAMATAN Pencegahan write-down dikuatkuasakan pada semua komunikasi merentas sesi. Sesi yang dicemarkan pada `CONFIDENTIAL` tidak boleh menghantar data ke sesi atau saluran `PUBLIC`. Ini adalah sempadan keras yang dikuatkuasakan oleh lapisan dasar. :::
