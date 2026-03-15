---
title: Aliran Kerja
description: Automatikkan tugas berbilang langkah dengan enjin CNCF Serverless Workflow DSL yang dibina dalam Triggerfish.
---

# Aliran Kerja

Triggerfish merangkumi enjin pelaksanaan terbina dalam untuk [CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification). Aliran kerja membolehkan anda mentakrifkan automasi deterministik berbilang langkah dalam YAML yang berjalan **tanpa LLM dalam gelung** semasa pelaksanaan. Ejen mencipta dan mencetuskan aliran kerja, tetapi enjin mengendalikan pengiriman tugas, percabangan, gelung, dan aliran data sebenar.

## Bila Menggunakan Aliran Kerja

**Gunakan aliran kerja** untuk urutan deterministik yang boleh diulang di mana anda tahu langkah-langkahnya terlebih dahulu: ambil data dari API, transformasikan, simpan ke memori, hantar pemberitahuan. Input yang sama sentiasa menghasilkan output yang sama.

**Gunakan ejen secara langsung** untuk penaakulan terbuka, penerokaan, atau tugas di mana langkah seterusnya bergantung pada pertimbangan: menyelidiki topik, menulis kod, menyelesaikan masalah.

Panduan yang baik: jika anda mendapati diri anda meminta ejen melakukan urutan berbilang langkah yang sama berulang kali, jadikannya aliran kerja.

::: info Ketersediaan
Aliran kerja tersedia pada semua pelan. Pengguna sumber terbuka yang menjalankan kunci API mereka sendiri mempunyai akses penuh ke enjin aliran kerja -- setiap panggilan `triggerfish:llm` atau `triggerfish:agent` dalam aliran kerja menggunakan inferens dari pembekal yang dikonfigurasi.
:::

## Alat

### `workflow_save`

Urai, sahkan, dan simpan definisi aliran kerja. Aliran kerja disimpan pada tahap pengkelasan sesi semasa.

| Parameter     | Jenis  | Diperlukan | Keterangan                              |
| ------------- | ------ | ---------- | --------------------------------------- |
| `name`        | string | ya         | Nama untuk aliran kerja                 |
| `yaml`        | string | ya         | Definisi aliran kerja YAML              |
| `description` | string | tidak      | Apa yang aliran kerja lakukan           |

### `workflow_run`

Laksanakan aliran kerja mengikut nama atau dari YAML sebaris. Mengembalikan output pelaksanaan dan status.

| Parameter | Jenis  | Diperlukan | Keterangan                                                      |
| --------- | ------ | ---------- | --------------------------------------------------------------- |
| `name`    | string | tidak      | Nama aliran kerja yang disimpan untuk dilaksanakan              |
| `yaml`    | string | tidak      | Definisi YAML sebaris (apabila tidak menggunakan yang disimpan) |
| `input`   | string | tidak      | Rentetan JSON data input untuk aliran kerja                     |

Salah satu dari `name` atau `yaml` diperlukan.

### `workflow_list`

Senaraikan semua aliran kerja yang disimpan yang boleh diakses pada tahap pengkelasan semasa. Tidak mengambil parameter.

### `workflow_get`

Dapatkan semula definisi aliran kerja yang disimpan mengikut nama.

| Parameter | Jenis  | Diperlukan | Keterangan                           |
| --------- | ------ | ---------- | ------------------------------------ |
| `name`    | string | ya         | Nama aliran kerja untuk diambil semula |

### `workflow_delete`

Padam aliran kerja yang disimpan mengikut nama. Aliran kerja mesti boleh diakses pada tahap pengkelasan sesi semasa.

| Parameter | Jenis  | Diperlukan | Keterangan                       |
| --------- | ------ | ---------- | -------------------------------- |
| `name`    | string | ya         | Nama aliran kerja untuk dipadam  |

### `workflow_history`

Lihat keputusan pelaksanaan aliran kerja yang lalu, ditapis secara pilihan mengikut nama aliran kerja.

| Parameter       | Jenis  | Diperlukan | Keterangan                                     |
| --------------- | ------ | ---------- | ---------------------------------------------- |
| `workflow_name` | string | tidak      | Tapis keputusan mengikut nama aliran kerja     |
| `limit`         | string | tidak      | Bilangan keputusan maksimum (lalai 10)         |

## Jenis Tugas

Aliran kerja terdiri daripada tugas dalam blok `do:`. Setiap tugas adalah entri bernama dengan badan khusus-jenis. Triggerfish menyokong 8 jenis tugas.

### `call` — Panggilan Luaran

Hantar ke titik akhir HTTP atau perkhidmatan Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Medan `call` menentukan sasaran pengiriman. Lihat [Pengiriman Panggilan](#pengiriman-panggilan) untuk pemetaan penuh.

### `run` — Shell, Skrip, atau Sub-Aliran Kerja

Laksanakan arahan shell, skrip sebaris, atau aliran kerja lain yang disimpan.

**Arahan shell:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-aliran kerja:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Pelaksanaan shell dan skrip memerlukan bendera `allowShellExecution` diaktifkan dalam konteks alat aliran kerja. Jika dilumpuhkan, tugas run dengan sasaran `shell` atau `script` akan gagal.
:::

### `set` — Mutasi Konteks Data

Tetapkan nilai ke konteks data aliran kerja. Menyokong ungkapan.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Percabangan Bersyarat

Percabang berdasarkan syarat. Setiap kes mempunyai ungkapan `when` dan arahan aliran `then`. Kes tanpa `when` bertindak sebagai lalai.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iterasi

Gelung ke atas koleksi, melaksanakan blok `do:` bersarang untuk setiap item.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

Medan `each` menamakan pemboleh ubah gelung, `in` merujuk koleksi, dan medan pilihan `at` menyediakan indeks semasa.

### `raise` — Henti dengan Ralat

Hentikan pelaksanaan dengan ralat berstruktur.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — Rekod Peristiwa

Rekod peristiwa aliran kerja. Peristiwa ditangkap dalam keputusan jalankan dan boleh disemak melalui `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — Tidur

Jeda pelaksanaan untuk tempoh ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Pengiriman Panggilan

Medan `call` dalam tugas panggilan menentukan alat Triggerfish mana yang dipanggil.

| Jenis panggilan          | Alat Triggerfish           | Medan `with:` yang diperlukan                  |
| ------------------------ | -------------------------- | ---------------------------------------------- |
| `http`                   | `web_fetch`                | `endpoint` (atau `url`), `method`              |
| `triggerfish:llm`        | `llm_task`                 | `prompt` (atau `task`)                         |
| `triggerfish:agent`      | `subagent`                 | `prompt` (atau `task`)                         |
| `triggerfish:memory`     | `memory_*`                 | `operation` + medan khusus-operasi             |
| `triggerfish:web_search` | `web_search`               | `query`                                        |
| `triggerfish:web_fetch`  | `web_fetch`                | `url`                                          |
| `triggerfish:mcp`        | `mcp__<server>__<tool>`    | `server`, `tool`, `arguments`                  |
| `triggerfish:message`    | `send_message`             | `channel`, `text`                              |

**Operasi memori:** Jenis panggilan `triggerfish:memory` memerlukan medan `operation` yang ditetapkan ke salah satu dari `save`, `search`, `get`, `list`, atau `delete`. Medan `with:` yang tinggal dihantar terus ke alat memori yang sepadan.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**Panggilan MCP:** Jenis panggilan `triggerfish:mcp` menghalakan ke mana-mana alat pelayan MCP yang disambungkan. Nyatakan nama `server`, nama `tool`, dan objek `arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Ungkapan

Ungkapan aliran kerja menggunakan sintaks `${ }` dengan resolusi laluan titik terhadap konteks data aliran kerja.

```yaml
# Rujukan nilai mudah
url: "${ .config.api_url }"

# Pengindeksan tatasusunan
first_item: "${ .results[0].name }"

# Interpolasi rentetan (pelbagai ungkapan dalam satu rentetan)
message: "Found ${ .count } issues in ${ .repo }"

# Perbandingan (mengembalikan boolean)
if: "${ .status == 'open' }"

# Aritmetik
total: "${ .price * .quantity }"
```

**Pengendali yang disokong:**

- Perbandingan: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Aritmetik: `+`, `-`, `*`, `/`, `%`

**Literal:** Rentetan (`"nilai"` atau `'nilai'`), nombor (`42`, `3.14`), boolean (`true`, `false`), null (`null`).

Apabila ungkapan `${ }` adalah keseluruhan nilai, jenis mentah dikekalkan (nombor, boolean, objek). Apabila bercampur dengan teks, hasilnya sentiasa rentetan.

## Contoh Lengkap

Aliran kerja ini mengambil isu GitHub, meringkaskannya dengan LLM, menyimpan ringkasan ke memori, dan menghantar pemberitahuan.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Jalankannya:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Transformasi Input dan Output

Tugas boleh mentransformasi input mereka sebelum pelaksanaan dan output mereka sebelum menyimpan keputusan.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — Ungkapan atau pemetaan objek yang menggantikan konteks input tugas sebelum pelaksanaan.
- **`output.from`** — Ungkapan atau pemetaan objek yang membentuk semula keputusan tugas sebelum menyimpannya dalam konteks data.

## Kawalan Aliran

Setiap tugas boleh merangkumi arahan `then` yang mengawal apa yang berlaku seterusnya:

- **`continue`** (lalai) — teruskan ke tugas seterusnya secara berurutan
- **`end`** — hentikan aliran kerja dengan segera (status: selesai)
- **Tugas bernama** — lompat ke tugas tertentu mengikut nama

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Pelaksanaan Bersyarat

Mana-mana tugas boleh merangkumi medan `if`. Tugas dilangkau apabila syarat dinilai sebagai palsu.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-Aliran Kerja

Tugas `run` dengan sasaran `workflow` melaksanakan aliran kerja lain yang disimpan. Sub-aliran kerja berjalan dengan konteks sendiri dan mengembalikan outputnya ke induk.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Sub-aliran kerja boleh bersarang hingga **5 tahap dalam**. Melebihi had ini menghasilkan ralat dan menghentikan pelaksanaan.

## Pengkelasan dan Keselamatan

Aliran kerja mengambil bahagian dalam sistem pengkelasan yang sama seperti semua data Triggerfish lain.

**Pengkelasan penyimpanan.** Apabila anda menyimpan aliran kerja dengan `workflow_save`, ia disimpan pada tahap taint sesi semasa. Aliran kerja yang disimpan semasa sesi `CONFIDENTIAL` hanya boleh dimuatkan oleh sesi pada `CONFIDENTIAL` atau lebih tinggi.

**Siling pengkelasan.** Aliran kerja boleh mengisytiharkan `classification_ceiling` dalam YAML mereka. Sebelum setiap tugas dilaksanakan, enjin memeriksa bahawa taint sesi semasa tidak melebihi siling. Jika taint sesi meningkat melepasi siling semasa pelaksanaan (contoh, dengan mengakses data terklasifikasi melalui panggilan alat), aliran kerja berhenti dengan ralat pelanggaran siling.

```yaml
classification_ceiling: INTERNAL
```

Nilai yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Sejarah jalankan.** Keputusan pelaksanaan disimpan dengan pengkelasan sesi pada masa penyiapan. `workflow_history` menapis keputusan mengikut `canFlowTo`, jadi anda hanya melihat jalankan yang berada pada atau di bawah taint sesi semasa anda.

::: danger KESELAMATAN
Pemadaman aliran kerja memerlukan aliran kerja boleh diakses pada tahap pengkelasan sesi semasa anda. Anda tidak boleh memadam aliran kerja yang disimpan pada `CONFIDENTIAL` dari sesi `PUBLIC`. Alat `workflow_delete` memuatkan aliran kerja terlebih dahulu dan mengembalikan "not found" jika semakan pengkelasan gagal.
:::

## Penyembuhan Kendiri

Aliran kerja secara pilihan boleh mempunyai ejen penyembuhan autonomi yang memantau pelaksanaan secara masa nyata, mendiagnosis kegagalan, dan mencadangkan pembetulan. Apabila penyembuhan kendiri diaktifkan, ejen utama dijana bersama jalankan aliran kerja. Ia memerhati setiap peristiwa langkah, mengklasifikasi kegagalan, dan menyelaras pasukan pakar untuk menyelesaikan isu.

### Mengaktifkan Penyembuhan Kendiri

Tambah blok `self_healing` ke bahagian `metadata.triggerfish` aliran kerja:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

Apabila `enabled: true`, setiap langkah **mesti** merangkumi tiga medan metadata:

| Medan         | Keterangan                                               |
| ------------- | -------------------------------------------------------- |
| `description` | Apa yang langkah lakukan dan mengapa ia wujud            |
| `expects`     | Bentuk input atau prasyarat yang diperlukan langkah      |
| `produces`    | Bentuk output yang dihasilkan langkah                    |

Parser menolak aliran kerja di mana mana-mana langkah tidak mempunyai medan ini.

### Pilihan Konfigurasi

| Pilihan                   | Jenis   | Lalai                | Keterangan |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | Diperlukan. Mengaktifkan ejen penyembuhan. |
| `retry_budget`            | number  | `3`                  | Percubaan intervensi maksimum sebelum meningkat sebagai tidak dapat diselesaikan. |
| `approval_required`       | boolean | `true`               | Sama ada pembetulan aliran kerja yang dicadangkan memerlukan kelulusan manusia. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | Bila untuk menjeda tugas hilir: `always`, `never`, atau `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | Saat untuk menunggu semasa jeda sebelum dasar tamat masa dicetuskan. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| Apa yang berlaku pada tamat masa: `escalate_and_halt`, `escalate_and_skip`, atau `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | Peristiwa yang mencetuskan pemberitahuan: `intervention`, `escalation`, `approval_required`. |

### Cara Ia Berfungsi

1. **Pemerhatian.** Ejen ketua penyembuhan menerima aliran peristiwa langkah masa nyata (dimulakan, selesai, gagal, dilangkau) semasa aliran kerja dilaksanakan.

2. **Triaj.** Apabila langkah gagal, ketua mengklasifikasikan kegagalan ke dalam salah satu dari lima kategori:

   | Kategori              | Makna                                                         |
   | --------------------- | ------------------------------------------------------------- |
   | `transient_retry`     | Isu sementara (ralat rangkaian, had kadar, 503)               |
   | `runtime_workaround`  | Ralat tidak diketahui kali pertama, mungkin boleh diatasi     |
   | `structural_fix`      | Kegagalan berulang yang memerlukan perubahan definisi aliran kerja |
   | `plugin_gap`          | Isu auth/kelayakan yang memerlukan integrasi baru             |
   | `unresolvable`        | Belanjawan ulang cuba habis atau rosak secara asasi           |

3. **Pasukan pakar.** Berdasarkan kategori triaj, ketua menjana pasukan ejen pakar (ahli diagnostik, penyelaras ulang cuba, pengurus definisi, penulis plugin, dll.) untuk menyiasat dan menyelesaikan isu.

4. **Cadangan versi.** Apabila pembetulan struktur diperlukan, pasukan mencadangkan versi aliran kerja baru. Jika `approval_required` adalah benar, cadangan menunggu semakan manusia melalui `workflow_version_approve` atau `workflow_version_reject`.

5. **Jeda terskop.** Apabila `pause_on_intervention` diaktifkan, hanya tugas hilir dijeda -- cawangan bebas terus dilaksanakan.

### Alat Penyembuhan

Empat alat tambahan tersedia untuk menguruskan keadaan penyembuhan:

| Alat                       | Keterangan                                       |
| -------------------------- | ------------------------------------------------ |
| `workflow_version_list`    | Senaraikan versi yang dicadangkan/diluluskan/ditolak |
| `workflow_version_approve` | Luluskan versi yang dicadangkan                  |
| `workflow_version_reject`  | Tolak versi yang dicadangkan dengan sebab        |
| `workflow_healing_status`  | Status penyembuhan semasa untuk jalankan aliran kerja |

### Keselamatan

- Ejen penyembuhan **tidak boleh mengubah konfigurasi `self_healing`nya sendiri**. Versi yang dicadangkan yang mengubah blok konfigurasi ditolak.
- Ejen ketua dan semua ahli pasukan mewarisi tahap taint aliran kerja dan meningkat secara serentak.
- Semua tindakan ejen melalui rantaian hook dasar standard -- tiada pintasan.
- Versi yang dicadangkan disimpan pada tahap pengkelasan aliran kerja.
