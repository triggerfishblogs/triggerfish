---
title: Rujukan Workflow DSL
description: Rujukan lengkap untuk CNCF Serverless Workflow DSL 1.0 seperti yang dilaksanakan dalam Triggerfish.
---

# Rujukan Workflow DSL

Rujukan lengkap untuk CNCF Serverless Workflow DSL 1.0 seperti yang dilaksanakan dalam enjin workflow Triggerfish. Untuk panduan penggunaan dan contoh, lihat [Workflow](/ms-MY/features/workflows).

## Struktur Dokumen

Setiap YAML workflow mesti mempunyai medan `document` peringkat atas dan blok `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # pilihan
  description: "Apa yang ia lakukan"  # pilihan
classification_ceiling: INTERNAL  # pilihan
input:                            # pilihan
  from: "${ . }"
output:                           # pilihan
  from:
    result: "${ .final_step }"
timeout:                          # pilihan
  after: PT5M
do:
  - task_name:
      # definisi tugasan
```

### Metadata Dokumen

| Medan         | Jenis  | Diperlukan | Keterangan                                      |
| ------------- | ------ | ---------- | ----------------------------------------------- |
| `dsl`         | string | ya         | Versi DSL. Mesti `"1.0"`                        |
| `namespace`   | string | ya         | Pengelompokan logik (contoh, `ops`, `reports`)  |
| `name`        | string | ya         | Nama workflow unik dalam ruang nama             |
| `version`     | string | tidak      | String versi semantik                           |
| `description` | string | tidak      | Keterangan yang boleh dibaca manusia            |

### Medan Peringkat Atas

| Medan                     | Jenis        | Diperlukan | Keterangan                                             |
| ------------------------- | ------------ | ---------- | ------------------------------------------------------ |
| `document`                | objek        | ya         | Metadata dokumen (lihat di atas)                       |
| `do`                      | array        | ya         | Senarai entri tugasan tertib                           |
| `classification_ceiling`  | string       | tidak      | Taint sesi maksimum yang dibenarkan semasa pelaksanaan |
| `input`                   | transform    | tidak      | Transform yang digunakan pada input workflow           |
| `output`                  | transform    | tidak      | Transform yang digunakan pada output workflow          |
| `timeout`                 | objek        | tidak      | Tamat masa peringkat workflow (`after: <ISO 8601>`)   |
| `metadata`                | objek        | tidak      | Metadata nilai-kunci sewenang-wenang                   |

---

## Format Entri Tugasan

Setiap entri dalam blok `do` adalah objek kunci-tunggal. Kunci adalah nama tugasan, nilai adalah definisi tugasan.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Nama tugasan mesti unik dalam blok `do` yang sama. Keputusan tugasan disimpan dalam konteks data di bawah nama tugasan.

---

## Medan Tugasan Umum

Semua jenis tugasan berkongsi medan pilihan ini:

| Medan      | Jenis     | Keterangan                                                |
| ---------- | --------- | --------------------------------------------------------- |
| `if`       | string    | Syarat ungkapan. Tugasan dilangkau apabila tidak benar.   |
| `input`    | transform | Transform yang digunakan sebelum pelaksanaan tugasan      |
| `output`   | transform | Transform yang digunakan selepas pelaksanaan tugasan      |
| `timeout`  | objek     | Tamat masa tugasan: `after: <tempoh ISO 8601>`           |
| `then`     | string    | Arahan aliran: `continue`, `end`, atau nama tugasan       |
| `metadata` | objek     | Metadata nilai-kunci sewenang-wenang. Apabila self-healing diaktifkan, memerlukan `description`, `expects`, `produces`. |

---

## Konfigurasi Self-Healing

Blok `metadata.triggerfish.self_healing` mengaktifkan ejen penyembuhan autonomi untuk workflow. Lihat [Self-Healing](/ms-MY/features/workflows#self-healing) untuk panduan penuh.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Medan                   | Jenis   | Diperlukan | Lalai                | Keterangan |
| ----------------------- | ------- | ---------- | -------------------- | ---------- |
| `enabled`               | boolean | ya         | —                    | Aktifkan ejen penyembuhan |
| `retry_budget`          | number  | tidak      | `3`                  | Bilangan percubaan intervensi maks |
| `approval_required`     | boolean | tidak      | `true`               | Memerlukan kelulusan manusia untuk pembetulan |
| `pause_on_intervention` | string  | tidak      | `"blocking_only"`    | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | tidak      | `300`                | Saat sebelum dasar tamat masa berfungsi |
| `pause_timeout_policy`  | string  | tidak      | `"escalate_and_halt"`| `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | tidak      | `[]`                 | `intervention` \| `escalation` \| `approval_required` |

### Metadata Langkah (Diperlukan Apabila Self-Healing Diaktifkan)

Apabila `self_healing.enabled` adalah `true`, setiap tugasan mesti menyertakan medan metadata ini. Penghurai menolak workflow yang hilang mana-mana daripadanya.

| Medan         | Jenis  | Keterangan                                          |
| ------------- | ------ | --------------------------------------------------- |
| `description` | string | Apa yang langkah lakukan dan mengapa                |
| `expects`     | string | Bentuk input atau prasyarat yang diperlukan         |
| `produces`    | string | Bentuk output yang dijana                           |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Ambil invois terbuka dari API pengebilan"
      expects: "API tersedia, mengembalikan array JSON"
      produces: "Array objek {id, amount, status}"
```

---

## Jenis Tugasan

### `call`

Hantar ke titik akhir HTTP atau perkhidmatan Triggerfish.

| Medan  | Jenis  | Diperlukan | Keterangan                                    |
| ------ | ------ | ---------- | --------------------------------------------- |
| `call` | string | ya         | Jenis panggilan (lihat jadual hantar di bawah) |
| `with` | objek  | tidak      | Argumen yang dihantar ke alat sasaran          |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Laksanakan arahan shell, skrip sebaris, atau sub-workflow. Medan `run` mesti mengandungi tepat satu daripada `shell`, `script`, atau `workflow`.

**Shell:**

| Medan                  | Jenis  | Diperlukan | Keterangan               |
| ---------------------- | ------ | ---------- | ------------------------ |
| `run.shell.command`    | string | ya         | Arahan shell untuk dilaksanakan |
| `run.shell.arguments`  | objek  | tidak      | Argumen bernama          |
| `run.shell.environment`| objek  | tidak      | Pemboleh ubah persekitaran |

**Skrip:**

| Medan                  | Jenis  | Diperlukan | Keterangan               |
| ---------------------- | ------ | ---------- | ------------------------ |
| `run.script.language`  | string | ya         | Bahasa skrip             |
| `run.script.code`      | string | ya         | Kod skrip sebaris        |
| `run.script.arguments` | objek  | tidak      | Argumen bernama          |

**Sub-workflow:**

| Medan                | Jenis  | Diperlukan | Keterangan                   |
| -------------------- | ------ | ---------- | ---------------------------- |
| `run.workflow.name`  | string | ya         | Nama workflow yang disimpan  |
| `run.workflow.version` | string | tidak    | Kekangan versi               |
| `run.workflow.input` | objek  | tidak      | Data input untuk sub-workflow |

### `set`

Tetapkan nilai ke konteks data.

| Medan | Jenis  | Diperlukan | Keterangan                                                    |
| ----- | ------ | ---------- | ------------------------------------------------------------- |
| `set` | objek  | ya         | Pasangan nilai-kunci untuk ditetapkan. Nilai boleh berupa ungkapan. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Percabangan bersyarat. Medan `switch` adalah array entri kes. Setiap kes adalah objek kunci-tunggal di mana kunci adalah nama kes.

| Medan kes  | Jenis  | Diperlukan | Keterangan                                             |
| ---------- | ------ | ---------- | ------------------------------------------------------ |
| `when`     | string | tidak      | Syarat ungkapan. Tanpa untuk kes lalai.                |
| `then`     | string | ya         | Arahan aliran: `continue`, `end`, atau nama tugasan    |

Kes dinilai mengikut urutan. Kes pertama dengan `when` yang benar (atau tiada `when`) diambil.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

Lelaran ke atas koleksi.

| Medan      | Jenis  | Diperlukan | Keterangan                                    |
| ---------- | ------ | ---------- | --------------------------------------------- |
| `for.each` | string | ya         | Nama pemboleh ubah untuk item semasa          |
| `for.in`   | string | ya         | Ungkapan yang merujuk koleksi                 |
| `for.at`   | string | tidak      | Nama pemboleh ubah untuk indeks semasa        |
| `do`       | array  | ya         | Senarai tugasan bersarang yang dilaksanakan untuk setiap lelaran |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Proses item ${ .idx }: ${ .item.name }"
```

### `raise`

Hentikan workflow dengan ralat berstruktur.

| Medan                | Jenis  | Diperlukan | Keterangan               |
| -------------------- | ------ | ---------- | ------------------------ |
| `raise.error.status` | number | ya         | Kod status gaya HTTP     |
| `raise.error.type`   | string | ya         | URI/string jenis ralat   |
| `raise.error.title`  | string | ya         | Tajuk yang boleh dibaca manusia |
| `raise.error.detail` | string | tidak      | Mesej ralat terperinci   |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Input tidak sah"
        detail: "Medan 'email' diperlukan"
```

### `emit`

Rekodkan peristiwa workflow. Peristiwa disimpan dalam keputusan pelarian.

| Medan                | Jenis  | Diperlukan | Keterangan               |
| -------------------- | ------ | ---------- | ------------------------ |
| `emit.event.type`    | string | ya         | Pengecam jenis peristiwa |
| `emit.event.source`  | string | tidak      | URI sumber peristiwa     |
| `emit.event.data`    | objek  | tidak      | Muatan peristiwa         |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

Jeda pelaksanaan untuk tempoh masa.

| Medan  | Jenis  | Diperlukan | Keterangan                            |
| ------ | ------ | ---------- | ------------------------------------- |
| `wait` | string | ya         | Tempoh ISO 8601 (contoh, `PT5S`)      |

Tempoh biasa: `PT1S` (1 saat), `PT30S` (30 saat), `PT1M` (1 minit), `PT5M` (5 minit).

---

## Jadual Hantar Panggilan

Memetakan nilai medan `call` kepada alat Triggerfish yang sebenarnya dipanggil.

| Nilai `call`           | Alat yang dipanggil | Medan `with:` yang diperlukan                             |
| ---------------------- | ------------------- | --------------------------------------------------------- |
| `http`                 | `web_fetch`         | `endpoint` atau `url`; pilihan `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`          | `prompt` atau `task`; pilihan `tools`, `max_iterations`   |
| `triggerfish:agent`    | `subagent`          | `prompt` atau `task`; pilihan `tools`, `agent`            |
| `triggerfish:memory`   | `memory_*`          | `operation` (`save`/`search`/`get`/`list`/`delete`) + medan operasi |
| `triggerfish:web_search` | `web_search`      | `query`; pilihan `max_results`                            |
| `triggerfish:web_fetch`  | `web_fetch`       | `url`; pilihan `method`, `headers`, `body`                |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; pilihan `arguments`               |
| `triggerfish:message`  | `send_message`      | `channel`, `text`; pilihan `recipient`                    |

Jenis panggilan CNCF yang tidak disokong (`grpc`, `openapi`, `asyncapi`) mengembalikan ralat.

---

## Sintaks Ungkapan

Ungkapan dibatasi oleh `${ }` dan diselesaikan berbanding konteks data workflow.

### Resolusi Laluan Titik

| Sintaks                 | Keterangan                          | Contoh keputusan       |
| ----------------------- | ----------------------------------- | ---------------------- |
| `${ . }`                | Keseluruhan konteks data            | `{...}`                |
| `${ .key }`             | Kunci peringkat atas                | `"nilai"`              |
| `${ .a.b.c }`           | Kunci bersarang                     | `"nilai mendalam"`     |
| `${ .items[0] }`        | Indeks array                        | `{...item pertama...}` |
| `${ .items[0].name }`   | Indeks array kemudian kunci         | `"pertama"`            |

Titik utama (atau `$.`) menambat laluan di akar konteks. Laluan yang diselesaikan ke `undefined` menghasilkan rentetan kosong apabila diinterpolasi, atau `undefined` apabila digunakan sebagai nilai bersendirian.

### Pengendali

| Jenis      | Pengendali                    | Contoh                         |
| ---------- | ----------------------------- | ------------------------------ |
| Perbandingan | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`           |
| Aritmetik  | `+`, `-`, `*`, `/`, `%`       | `${ .price * .quantity }`      |

Ungkapan perbandingan mengembalikan `true` atau `false`. Ungkapan aritmetik mengembalikan nombor (`undefined` jika salah satu operan bukan numerik atau pembahagian dengan sifar).

### Literal

| Jenis    | Contoh                  |
| -------- | ----------------------- |
| String   | `"hello"`, `'hello'`    |
| Nombor   | `42`, `3.14`, `-1`      |
| Boolean  | `true`, `false`         |
| Null     | `null`                  |

### Mod Interpolasi

**Ungkapan tunggal (nilai mentah):** Apabila keseluruhan rentetan adalah satu ungkapan `${ }`, nilai bertaip mentah dikembalikan (nombor, boolean, objek, array).

```yaml
count: "${ .items.length }"  # mengembalikan nombor, bukan string
```

**Campuran / pelbagai ungkapan (string):** Apabila ungkapan `${ }` dicampurkan dengan teks atau terdapat pelbagai ungkapan, hasilnya sentiasa string.

```yaml
message: "Dijumpai ${ .count } item dalam ${ .category }"  # mengembalikan string
```

### Kebenaran

Untuk syarat `if:` dan ungkapan `when:` suis, nilai dinilai menggunakan kebenaran gaya JavaScript:

| Nilai                                                        | Benar? |
| ------------------------------------------------------------ | ------ |
| `true`                                                       | ya     |
| Nombor bukan sifar                                           | ya     |
| String bukan kosong                                          | ya     |
| Array bukan kosong                                           | ya     |
| Objek                                                        | ya     |
| `false`, `0`, `""`, `null`, `undefined`, array kosong        | tidak  |

---

## Transform Input/Output

Transform membentuk semula data yang mengalir masuk dan keluar dari tugasan.

### `input`

Digunakan sebelum pelaksanaan tugasan. Menggantikan pandangan tugasan terhadap konteks data.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # tugasan hanya melihat objek config
    with:
      endpoint: "${ .api_url }"  # diselesaikan berbanding objek config
```

**`from` sebagai string:** Ungkapan yang menggantikan keseluruhan konteks input.

**`from` sebagai objek:** Memetakan kunci baru kepada ungkapan:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Digunakan selepas pelaksanaan tugasan. Membentuk semula keputusan sebelum menyimpannya dalam konteks di bawah nama tugasan.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Arahan Aliran

Medan `then` pada mana-mana tugasan mengawal aliran pelaksanaan selepas tugasan selesai.

| Nilai        | Tingkah Laku                                                      |
| ------------ | ----------------------------------------------------------------- |
| `continue`   | Teruskan ke tugasan seterusnya dalam urutan (lalai)               |
| `end`        | Hentikan workflow. Status: `completed`.                           |
| `<nama tugasan>` | Lompat ke tugasan bernama. Tugasan mesti wujud dalam blok `do` yang sama. |

Kes suis juga menggunakan arahan aliran dalam medan `then`.

---

## Siling Pengkelasan

Medan pilihan yang mengehadkan taint sesi maksimum semasa pelaksanaan.

```yaml
classification_ceiling: INTERNAL
```

| Nilai          | Maksud                                                |
| -------------- | ----------------------------------------------------- |
| `PUBLIC`       | Workflow berhenti jika sebarang data terklasifikasi diakses |
| `INTERNAL`     | Membenarkan data `PUBLIC` dan `INTERNAL`              |
| `CONFIDENTIAL` | Membenarkan data sehingga `CONFIDENTIAL`              |
| `RESTRICTED`   | Membenarkan semua tahap pengkelasan                   |
| *(ditinggalkan)* | Tiada siling dikuatkuasakan                         |

Siling diperiksa sebelum setiap tugasan. Jika taint sesi telah meningkat melepasi siling (contoh, kerana tugasan sebelumnya mengakses data terklasifikasi), workflow berhenti dengan status `failed` dan ralat `Workflow classification ceiling breached`.

---

## Storan

### Definisi Workflow

Disimpan dengan awalan kunci `workflows:{name}`. Setiap rekod tersimpan mengandungi:

| Medan            | Jenis  | Keterangan                                |
| ---------------- | ------ | ----------------------------------------- |
| `name`           | string | Nama workflow                             |
| `yaml`           | string | Definisi YAML mentah                      |
| `classification` | string | Tahap pengkelasan semasa penyimpanan      |
| `savedAt`        | string | Cap masa ISO 8601                         |
| `description`    | string | Keterangan pilihan                        |

### Sejarah Pelarian

Disimpan dengan awalan kunci `workflow-runs:{runId}`. Setiap rekod pelarian mengandungi:

| Medan            | Jenis  | Keterangan                                      |
| ---------------- | ------ | ----------------------------------------------- |
| `runId`          | string | UUID untuk pelaksanaan ini                      |
| `workflowName`   | string | Nama workflow yang dilaksanakan                 |
| `status`         | string | `completed`, `failed`, atau `cancelled`         |
| `output`         | objek  | Konteks data akhir (kunci dalaman ditapis)       |
| `events`         | array  | Peristiwa yang dipancarkan semasa pelaksanaan   |
| `error`          | string | Mesej ralat (jika status adalah `failed`)       |
| `startedAt`      | string | Cap masa ISO 8601                               |
| `completedAt`    | string | Cap masa ISO 8601                               |
| `taskCount`      | number | Bilangan tugasan dalam workflow                 |
| `classification` | string | Taint sesi semasa penyiapan                     |

---

## Had

| Had                          | Nilai | Keterangan                                     |
| ---------------------------- | ----- | ---------------------------------------------- |
| Had kedalaman sub-workflow   | 5     | Nesting maksimum panggilan `run.workflow`      |
| Had lalai sejarah pelarian   | 10    | `limit` lalai untuk `workflow_history`         |

---

## Status Pelaksanaan

| Status      | Keterangan                                                   |
| ----------- | ------------------------------------------------------------ |
| `pending`   | Workflow telah dicipta tetapi belum dimulakan                |
| `running`   | Workflow sedang dilaksanakan                                 |
| `completed` | Semua tugasan selesai dengan jayanya (atau `then: end`)      |
| `failed`    | Tugasan gagal, `raise` dilaksanakan, atau siling dilanggar   |
| `cancelled` | Pelaksanaan dibatalkan secara luaran                         |
