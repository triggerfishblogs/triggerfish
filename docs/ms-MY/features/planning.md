# Mod Pelan dan Penjejakan Tugas

Triggerfish menyediakan dua alat yang saling melengkapi untuk kerja berstruktur: **mod pelan** untuk perancangan pelaksanaan yang kompleks, dan **penjejakan todo** untuk pengurusan tugas merentasi sesi.

## Mod Pelan

Mod pelan menyekat ejen kepada penerokaan baca-sahaja dan perancangan berstruktur sebelum membuat perubahan. Ini menghalang ejen dari melompat ke pelaksanaan sebelum memahami masalah.

### Alat

#### `plan_enter`

Masuki mod pelan. Menyekat operasi penulisan (`write_file`, `cron_create`, `cron_delete`) sehingga pelan diluluskan.

| Parameter | Jenis  | Diperlukan | Keterangan                                              |
| --------- | ------ | ---------- | ------------------------------------------------------- |
| `goal`    | string | ya         | Apa yang ejen merancang untuk dibina/diubah             |
| `scope`   | string | tidak      | Hadkan penerokaan ke direktori atau modul tertentu      |

#### `plan_exit`

Keluar dari mod pelan dan bentangkan pelan pelaksanaan untuk kelulusan pengguna. **Tidak** memulakan pelaksanaan secara automatik.

| Parameter | Jenis  | Diperlukan | Keterangan                                                                      |
| --------- | ------ | ---------- | ------------------------------------------------------------------------------- |
| `plan`    | object | ya         | Pelan pelaksanaan (ringkasan, pendekatan, langkah, risiko, fail, ujian)         |

Objek pelan merangkumi:

- `summary` -- Apa yang pelan capai
- `approach` -- Bagaimana ia akan dilaksanakan
- `alternatives_considered` -- Pendekatan lain yang dinilai
- `steps` -- Senarai langkah pelaksanaan tersusun, masing-masing dengan fail, kebergantungan, dan pengesahan
- `risks` -- Risiko yang diketahui dan langkah mitigasi
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Mengembalikan keadaan mod pelan semasa: mod aktif, matlamat, dan kemajuan pelan.

#### `plan_approve`

Luluskan pelan yang sedang menunggu dan mulakan pelaksanaan. Dipanggil apabila pengguna meluluskan.

#### `plan_reject`

Tolak pelan yang sedang menunggu dan kembali ke mod normal.

#### `plan_step_complete`

Tandakan langkah pelan sebagai selesai semasa pelaksanaan.

| Parameter             | Jenis  | Diperlukan | Keterangan                              |
| --------------------- | ------ | ---------- | --------------------------------------- |
| `step_id`             | number | ya         | ID langkah untuk ditandakan selesai     |
| `verification_result` | string | ya         | Output dari arahan pengesahan           |

#### `plan_complete`

Tandakan keseluruhan pelan sebagai selesai.

| Parameter    | Jenis  | Diperlukan | Keterangan                           |
| ------------ | ------ | ---------- | ------------------------------------ |
| `summary`    | string | ya         | Apa yang dicapai                     |
| `deviations` | array  | tidak      | Sebarang perubahan dari pelan asal   |

#### `plan_modify`

Minta pengubahsuaian pada langkah pelan yang diluluskan. Memerlukan kelulusan pengguna.

| Parameter          | Jenis  | Diperlukan | Keterangan                        |
| ------------------ | ------ | ---------- | --------------------------------- |
| `step_id`          | number | ya         | Langkah mana yang perlu diubah    |
| `reason`           | string | ya         | Mengapa perubahan diperlukan      |
| `new_description`  | string | ya         | Penerangan langkah yang dikemas kini |
| `new_files`        | array  | tidak      | Senarai fail yang dikemas kini    |
| `new_verification` | string | tidak      | Arahan pengesahan yang dikemas kini |

### Aliran Kerja

```
1. Pengguna meminta sesuatu yang kompleks
2. Ejen memanggil plan_enter({ goal: "..." })
3. Ejen meneroka pangkalan kod (alat baca-sahaja sahaja)
4. Ejen memanggil plan_exit({ plan: { ... } })
5. Pengguna menyemak pelan
6. Pengguna meluluskan → ejen memanggil plan_approve
   (atau menolak → ejen memanggil plan_reject)
7. Ejen melaksanakan langkah demi langkah, memanggil plan_step_complete selepas setiap langkah
8. Ejen memanggil plan_complete apabila selesai
```

### Bila Menggunakan Mod Pelan

Ejen memasuki mod pelan untuk tugas kompleks: membina ciri, menyusun semula sistem, melaksanakan perubahan pelbagai fail. Untuk tugas mudah (betulkan taip, namakan semula pemboleh ubah), ia melangkau mod pelan dan bertindak secara langsung.

## Penjejakan Todo

Ejen mempunyai senarai todo berterusan untuk menjejak kerja berbilang langkah merentasi sesi.

### Alat

#### `todo_read`

Baca senarai todo semasa. Mengembalikan semua item dengan ID, kandungan, status, keutamaan, dan cap masa mereka.

#### `todo_write`

Gantikan keseluruhan senarai todo. Ini adalah penggantian lengkap, bukan kemas kini separa.

| Parameter | Jenis | Diperlukan | Keterangan                      |
| --------- | ----- | ---------- | ------------------------------- |
| `todos`   | array | ya         | Senarai lengkap item todo       |

Setiap item todo mempunyai:

| Medan        | Jenis  | Nilai                                   |
| ------------ | ------ | --------------------------------------- |
| `id`         | string | Pengecam unik                           |
| `content`    | string | Penerangan tugas                        |
| `status`     | string | `pending`, `in_progress`, `completed`   |
| `priority`   | string | `high`, `medium`, `low`                 |
| `created_at` | string | Cap masa ISO                            |
| `updated_at` | string | Cap masa ISO                            |

### Tingkah Laku

- Todo diskopkan per-ejen (bukan per-sesi) -- ia berterusan merentasi sesi, kebangkitan trigger, dan mulakan semula
- Ejen hanya menggunakan todo untuk tugas yang benar-benar kompleks (3+ langkah berbeza)
- Satu tugas adalah `in_progress` pada satu masa; item yang selesai ditandakan dengan segera
- Apabila ejen menulis senarai baru yang menghilangkan item yang disimpan sebelumnya, item tersebut secara automatik dikekalkan sebagai `completed`
- Apabila semua item adalah `completed`, item lama tidak dikekalkan (slate bersih)

### Paparan

Todo dipapar dalam CLI dan Tidepool:

- **CLI** -- Kotak ANSI bergaya dengan ikon status: `✓` (selesai, coretan), `▶` (sedang berjalan, tebal), `○` (menunggu)
- **Tidepool** -- Senarai HTML dengan kelas CSS untuk setiap status
