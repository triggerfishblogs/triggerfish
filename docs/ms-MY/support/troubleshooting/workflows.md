---
title: Penyelesaian Masalah Aliran Kerja
description: Isu biasa dan penyelesaian ketika bekerja dengan aliran kerja Triggerfish.
---

# Penyelesaian Masalah: Aliran Kerja

## "Workflow not found or not accessible"

Aliran kerja wujud tetapi disimpan pada tahap klasifikasi yang lebih tinggi dari taint sesi semasa anda.

Aliran kerja yang disimpan semasa sesi `CONFIDENTIAL` tidak kelihatan kepada sesi `PUBLIC` atau `INTERNAL`. Stor menggunakan semakan `canFlowTo` pada setiap pemuatan, dan mengembalikan `null` (dipaparkan sebagai "not found") apabila klasifikasi aliran kerja melebihi taint sesi.

**Pembetulan:** Tingkatkan taint sesi anda dengan mengakses data terklasifikasi terlebih dahulu, atau simpan semula aliran kerja dari sesi klasifikasi yang lebih rendah jika kandungan membenarkannya.

**Sahkan:** Jalankan `workflow_list` untuk melihat aliran kerja yang kelihatan pada tahap klasifikasi semasa anda. Jika aliran kerja yang anda jangkakan tiada, ia telah disimpan pada tahap yang lebih tinggi.

---

## "Workflow classification ceiling breached"

Tahap taint sesi melebihi `classification_ceiling` aliran kerja. Semakan ini berjalan sebelum setiap tugas, jadi ia boleh mencetuskan pertengahan pelaksanaan jika tugas terdahulu meningkatkan taint sesi.

Sebagai contoh, aliran kerja dengan `classification_ceiling: INTERNAL` akan berhenti jika panggilan `triggerfish:memory` mendapatkan semula data `CONFIDENTIAL` yang meningkatkan taint sesi.

**Pembetulan:**

- Naikkan `classification_ceiling` aliran kerja untuk sepadan dengan sensitiviti data yang dijangka.
- Atau susun semula aliran kerja supaya data terklasifikasi tidak diakses. Gunakan parameter input dan bukannya membaca memori terklasifikasi.

---

## Ralat Hurai YAML

### "YAML parse error: ..."

Kesilapan sintaks YAML yang biasa:

**Indentasi.** YAML sensitif terhadap ruang kosong. Gunakan ruang, bukan tab. Setiap tahap sarang sepatutnya tepat 2 ruang.

```yaml
# Salah — tab atau indentasi tidak konsisten
do:
- fetch:
      call: http

# Betul
do:
  - fetch:
      call: http
```

**Kuota hilang sekitar ungkapan.** Rentetan ungkapan dengan `${ }` mesti dikuotakan, jika tidak YAML mentafsirkan `{` sebagai pemetaan sebaris.

```yaml
# Salah — ralat hurai YAML
endpoint: ${ .config.url }

# Betul
endpoint: "${ .config.url }"
```

**Blok `document` hilang.** Setiap aliran kerja mesti mempunyai medan `document` dengan `dsl`, `namespace`, dan `name`:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

YAML berjaya dihurai tetapi hasilnya adalah skalar atau tatasusunan, bukan objek. Semak bahawa YAML anda mempunyai kunci peringkat atas (`document`, `do`).

### "Task has no recognized type"

Setiap entri tugas mesti mengandungi tepat satu kunci jenis: `call`, `run`, `set`, `switch`, `for`, `raise`, `emit`, atau `wait`. Jika penghurai tidak menemui mana-mana kunci ini, ia melaporkan jenis yang tidak diketahui.

Punca biasa: salah taip dalam nama jenis tugas (contoh, `calls` dan bukannya `call`).

---

## Kegagalan Penilaian Ungkapan

### Nilai salah atau kosong

Ungkapan menggunakan sintaks `${ .laluan.ke.nilai }`. Titik terdepan adalah wajib — ia mengangkuhkan laluan ke akar konteks data aliran kerja.

```yaml
# Salah — titik terdepan hilang
value: "${ result.name }"

# Betul
value: "${ .result.name }"
```

### "undefined" dalam output

Laluan titik diselesaikan kepada tiada apa-apa. Punca biasa:

- **Nama tugas salah.** Setiap tugas menyimpan hasilnya di bawah namanya sendiri. Jika tugas anda dinamakan `fetch_data`, rujuk hasilnya sebagai `${ .fetch_data }`, bukan `${ .data }` atau `${ .result }`.
- **Sarang salah.** Jika panggilan HTTP mengembalikan `{"data": {"items": [...]}}`, item berada di `${ .fetch_data.data.items }`.
- **Pengindeksan tatasusunan.** Gunakan sintaks kurungan: `${ .items[0].name }`. Laluan titik sahaja tidak menyokong indeks numerik.

### Syarat boolean tidak berfungsi

Perbandingan ungkapan adalah ketat (`===`). Pastikan jenis sepadan:

```yaml
# Ini gagal jika .count adalah rentetan "0"
if: "${ .count == 0 }"

# Berfungsi apabila .count adalah nombor
if: "${ .count == 0 }"
```

Semak sama ada tugas hulu mengembalikan rentetan atau nombor. Respons HTTP sering mengembalikan nilai rentetan yang tidak memerlukan penukaran untuk perbandingan — hanya bandingkan terhadap bentuk rentetan.

---

## Kegagalan Panggilan HTTP

### Tamat masa

Panggilan HTTP melalui alat `web_fetch`. Jika pelayan sasaran lambat, permintaan mungkin tamat masa. Tiada gantian tamat masa per-tugas untuk panggilan HTTP dalam DSL aliran kerja — tamat masa lalai alat `web_fetch` digunakan.

### Blok SSRF

Semua HTTP keluar dalam Triggerfish menyelesaikan DNS terlebih dahulu dan menyemak IP yang diselesaikan terhadap senarai penolakan yang dikodkan keras. Julat IP peribadi dan dikhaskan sentiasa disekat.

Jika aliran kerja anda memanggil perkhidmatan dalaman pada IP peribadi (contoh, `http://192.168.1.100/api`), ia akan disekat oleh pencegahan SSRF. Ini adalah dengan reka bentuk dan tidak boleh dikonfigurasi.

**Pembetulan:** Gunakan nama hos awam yang diselesaikan ke IP awam, atau gunakan `triggerfish:mcp` untuk menghalakan melalui pelayan MCP yang mempunyai akses langsung.

### Header hilang

Jenis panggilan `http` memetakan `with.headers` terus ke header permintaan. Jika API anda memerlukan pengesahan, sertakan header:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Pastikan nilai token disediakan dalam input aliran kerja atau ditetapkan oleh tugas sebelumnya.

---

## Had Rekursi Sub-Aliran Kerja

### "Workflow recursion depth exceeded maximum of 5"

Sub-aliran kerja boleh bersarang sehingga 5 tahap. Had ini mencegah rekursi tidak terbatas apabila aliran kerja A memanggil aliran kerja B yang memanggil aliran kerja A.

**Pembetulan:**

- Ratakan rantai aliran kerja. Gabungkan langkah-langkah ke dalam lebih sedikit aliran kerja.
- Semak rujukan bulatan di mana dua aliran kerja memanggil satu sama lain.

---

## Pelaksanaan Shell Dilumpuhkan

### "Shell execution failed" atau hasil kosong dari tugas run

Bendera `allowShellExecution` dalam konteks alat aliran kerja mengawal sama ada tugas `run` dengan sasaran `shell` atau `script` dibenarkan. Apabila dilumpuhkan, tugas-tugas ini gagal.

**Pembetulan:** Semak sama ada pelaksanaan shell diaktifkan dalam konfigurasi Triggerfish anda. Dalam persekitaran pengeluaran, pelaksanaan shell mungkin dilumpuhkan secara sengaja atas sebab keselamatan.

---

## Aliran Kerja Berjalan Tetapi Menghasilkan Output Salah

### Nyahpepijat dengan `workflow_history`

Gunakan `workflow_history` untuk memeriksa jalan terdahulu:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Setiap entri sejarah menyertakan:

- **status** — `completed` atau `failed`
- **error** — mesej ralat jika gagal
- **taskCount** — bilangan tugas dalam aliran kerja
- **startedAt / completedAt** — maklumat masa

### Menyemak aliran konteks

Setiap tugas menyimpan hasilnya dalam konteks data di bawah nama tugas. Jika aliran kerja anda mempunyai tugas bernama `fetch`, `transform`, dan `save`, konteks data selepas ketiga-tiga tugas kelihatan seperti:

```json
{
  "fetch": { "...respons http..." },
  "transform": { "...data yang ditukar..." },
  "save": { "...hasil simpan..." }
}
```

Kesilapan biasa:

- **Menimpa konteks.** Tugas `set` yang menetapkan kepada kunci yang sudah wujud akan menggantikan nilai sebelumnya.
- **Rujukan tugas salah.** Merujuk `${ .step1 }` apabila tugas dinamakan `step_1`.
- **Transform input menggantikan konteks.** Arahan `input.from` menggantikan konteks input tugas sepenuhnya. Jika anda menggunakan `input.from: "${ .config }"`, tugas hanya melihat objek `config`, bukan konteks penuh.

### Output hilang

Jika aliran kerja selesai tetapi mengembalikan output kosong, semak sama ada hasil tugas terakhir adalah seperti yang anda jangkakan. Output aliran kerja adalah konteks data penuh semasa selesai, dengan kunci dalaman ditapis keluar.

---

## "Permission denied" pada workflow_delete

Alat `workflow_delete` memuatkan aliran kerja terlebih dahulu menggunakan tahap taint sesi semasa. Jika aliran kerja disimpan pada tahap klasifikasi yang melebihi taint sesi anda, pemuatan mengembalikan null dan `workflow_delete` melaporkan "not found" dan bukannya "permission denied."

Ini adalah disengajakan — kewujudan aliran kerja terklasifikasi tidak didedahkan kepada sesi klasifikasi yang lebih rendah.

**Pembetulan:** Tingkatkan taint sesi anda untuk sepadan atau melebihi tahap klasifikasi aliran kerja sebelum memadamnya. Atau padamkannya dari jenis sesi yang sama di mana ia pada asalnya disimpan.

---

## Penyembuhan Sendiri

### "Step metadata missing on task 'X': self-healing requires description, expects, produces"

Apabila `self_healing.enabled` adalah `true`, setiap tugas mesti mempunyai ketiga-tiga medan metadata. Penghurai menolak aliran kerja semasa menyimpan jika mana-mana hilang.

**Pembetulan:** Tambah `description`, `expects`, dan `produces` ke setiap blok `metadata` tugas:

```yaml
- my-task:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "Apa yang langkah ini lakukan dan mengapa"
      expects: "Apa yang langkah ini perlukan sebagai input"
      produces: "Apa yang langkah ini hasilkan"
```

---

### "Self-healing config mutation rejected in version proposal"

Ejen penyembuhan mencadangkan versi aliran kerja baru yang mengubah suai blok konfigurasi `self_healing`. Ini dilarang — ejen tidak boleh menukar konfigurasi penyembuhan sendiri.

Ini berfungsi seperti yang direka bentuk. Hanya manusia boleh mengubah suai konfigurasi `self_healing` dengan menyimpan versi baru aliran kerja secara langsung melalui `workflow_save`.

---

### Ejen penyembuhan tidak dijanakan

Aliran kerja berjalan tetapi tiada ejen penyembuhan muncul. Semak:

1. **`enabled` adalah `true`** dalam `metadata.triggerfish.self_healing`.
2. **Konfigurasi berada di lokasi yang betul** — mesti bersarang di bawah `metadata.triggerfish.self_healing`, bukan di peringkat atas.
3. **Semua langkah mempunyai metadata** — jika pengesahan gagal semasa menyimpan, aliran kerja disimpan tanpa penyembuhan sendiri diaktifkan.

---

### Pembetulan yang dicadangkan tersekat dalam keadaan tertangguh

Jika `approval_required` adalah `true` (lalai), versi yang dicadangkan menunggu semakan manusia. Gunakan `workflow_version_list` untuk melihat cadangan tertangguh dan `workflow_version_approve` atau `workflow_version_reject` untuk bertindak ke atasnya.

---

### "Retry budget exhausted" / Peningkatan tidak dapat diselesaikan

Ejen penyembuhan telah menggunakan semua percubaan campur tangannya (lalai 3) tanpa menyelesaikan isu. Ia ditingkatkan sebagai `unresolvable` dan berhenti mencuba pembetulan.

**Pembetulan:**

- Semak `workflow_healing_status` untuk melihat campur tangan mana yang telah dicuba.
- Semak dan betulkan isu yang mendasar secara manual.
- Untuk membenarkan lebih banyak percubaan, naikkan `retry_budget` dalam konfigurasi penyembuhan sendiri dan simpan semula aliran kerja.
