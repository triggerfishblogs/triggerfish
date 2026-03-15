# Audit & Pematuhan

Setiap keputusan dasar dalam Triggerfish dilog dengan konteks penuh. Tiada pengecualian, tiada "mod debug" yang melumpuhkan pengelogan, dan tiada cara bagi LLM untuk menyekat rekod audit. Ini memberikan rekod lengkap, tahan-gangguan setiap keputusan keselamatan yang telah dibuat oleh sistem.

## Apa yang Direkodkan

Log audit adalah **peraturan tetap** -- ia sentiasa aktif dan tidak boleh dilumpuhkan. Setiap pelaksanaan hook penguatkuasaan menghasilkan rekod audit yang mengandungi:

| Medan             | Keterangan                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Bila keputusan dibuat (ISO 8601, UTC)                                                                                                                                               |
| `hook_type`       | Hook penguatkuasaan mana yang berjalan (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | Sesi di mana tindakan berlaku                                                                                                                                                       |
| `decision`        | `ALLOW`, `BLOCK`, atau `REDACT`                                                                                                                                                     |
| `reason`          | Penjelasan keputusan yang boleh dibaca manusia                                                                                                                                      |
| `input`           | Data atau tindakan yang mencetuskan hook                                                                                                                                            |
| `rules_evaluated` | Peraturan dasar mana yang diperiksa untuk mencapai keputusan                                                                                                                        |
| `taint_before`    | Tahap taint sesi sebelum tindakan                                                                                                                                                   |
| `taint_after`     | Tahap taint sesi selepas tindakan (jika berubah)                                                                                                                                    |
| `metadata`        | Konteks tambahan khusus untuk jenis hook                                                                                                                                            |

## Contoh Rekod Audit

### Output Dibenarkan

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Semakan pengkelasan lulus",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### Tulis-Bawah Disekat

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Taint sesi (CONFIDENTIAL) melebihi pengkelasan berkesan (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### Panggilan Alat dengan Peningkatan Taint

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Respons alat dikelaskan dan taint dikemas kini",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### Delegasi Ejen Disekat

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Siling ejen (INTERNAL) di bawah taint sesi (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Jana ringkasan awam"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## Keupayaan Jejak Audit

<img src="/diagrams/audit-trace-flow.svg" alt="Aliran jejak audit: jejak ke hadapan, jejak ke belakang, dan justifikasi pengkelasan membekalkan eksport pematuhan" style="max-width: 100%;" />

Rekod audit boleh ditanya dalam empat cara, setiap satu melayani keperluan pematuhan dan forensik yang berbeza.

### Jejak ke Hadapan

**Soalan:** "Apa yang berlaku kepada data dari rekod Salesforce `opp_00123ABC`?"

Jejak ke hadapan mengikuti elemen data dari titik asalnya melalui setiap transformasi, sesi, dan output. Ia menjawab: ke mana data ini pergi, siapa yang melihatnya, dan adakah ia pernah dihantar keluar dari organisasi?

```
Asal: salesforce.query_opportunities
  --> lineage_id: lin_789xyz
  --> pengkelasan: CONFIDENTIAL
  --> sesi: sess_456

Transformasi:
  --> Medan yang diekstrak: name, amount, stage
  --> LLM meringkaskan 3 rekod menjadi gambaran keseluruhan saluran paip

Output:
  --> Dihantar kepada pemilik melalui Telegram (DIBENARKAN)
  --> Disekat dari kenalan luaran WhatsApp (DISEKAT)
```

### Jejak ke Belakang

**Soalan:** "Sumber apa yang menyumbang kepada mesej yang dihantar pada 10:24 UTC?"

Jejak ke belakang bermula dari output dan berjalan kembali melalui rantaian keturunan untuk mengenal pasti setiap sumber data yang mempengaruhi output. Ini penting untuk memahami sama ada data terklasifikasi disertakan dalam respons.

```
Output: Mesej dihantar ke Telegram pada 10:24:00Z
  --> sesi: sess_456
  --> sumber keturunan:
      --> lin_789xyz: Peluang Salesforce (CONFIDENTIAL)
      --> lin_790xyz: Peluang Salesforce (CONFIDENTIAL)
      --> lin_791xyz: Peluang Salesforce (CONFIDENTIAL)
      --> lin_792xyz: API Cuaca (PUBLIC)
```

### Justifikasi Pengkelasan

**Soalan:** "Mengapa data ini ditandakan CONFIDENTIAL?"

Justifikasi pengkelasan menjejaki kembali ke peraturan atau dasar yang menetapkan tahap pengkelasan:

```
Data: Ringkasan saluran paip (lin_789xyz)
Pengkelasan: CONFIDENTIAL
Sebab: source_system_default
  --> Pengkelasan lalai integrasi Salesforce: CONFIDENTIAL
  --> Dikonfigurasi oleh: admin_001 pada 2025-01-10T08:00:00Z
  --> Peraturan dasar: "Semua data Salesforce dikelaskan sebagai CONFIDENTIAL"
```

### Eksport Pematuhan

Untuk semakan undang-undang, kawal selia, atau dalaman, Triggerfish boleh mengeksport rantaian penjagaan penuh untuk mana-mana elemen data atau julat masa:

```
Permintaan eksport:
  --> Julat masa: 2025-01-29T00:00:00Z hingga 2025-01-29T23:59:59Z
  --> Skop: Semua sesi untuk user_456
  --> Format: JSON

Eksport merangkumi:
  --> Semua rekod audit dalam julat masa
  --> Semua rekod keturunan yang dirujuk oleh rekod audit
  --> Semua peralihan keadaan sesi
  --> Semua keputusan dasar (ALLOW, BLOCK, REDACT)
  --> Semua perubahan taint
  --> Semua rekod rantaian delegasi
```

::: tip Eksport pematuhan adalah fail JSON berstruktur yang boleh dimasukkan oleh sistem SIEM, papan pemuka pematuhan, atau alat semakan undang-undang. Format eksport adalah stabil dan berversi. :::

## Keturunan Data

Log audit berfungsi seiring dengan sistem keturunan data Triggerfish. Setiap elemen data yang diproses oleh Triggerfish membawa metadata provenance:

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Medan dipilih: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM meringkaskan 3 rekod menjadi gambaran keseluruhan saluran paip",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

Rekod keturunan dicipta pada `POST_TOOL_RESPONSE` (apabila data memasuki sistem) dan dikemas kini apabila data ditransformasikan. Data yang diagregatkan mewarisi `max(pengkelasan input)` -- jika mana-mana input adalah CONFIDENTIAL, output adalah sekurang-kurangnya CONFIDENTIAL.

| Peristiwa                                  | Tindakan Keturunan                                        |
| ------------------------------------------ | --------------------------------------------------------- |
| Data dibaca dari integrasi                 | Cipta rekod keturunan dengan asal                         |
| Data ditransformasikan oleh LLM            | Tambah transformasi, hubungkan keturunan input            |
| Data diagregatkan dari pelbagai sumber     | Gabung keturunan, pengkelasan = max(input)                |
| Data dihantar ke saluran                   | Rekodkan destinasi, sahkan pengkelasan                    |
| Tetapan semula sesi                        | Arkibkan rekod keturunan, kosongkan dari konteks          |

## Storan dan Pengekalan

Log audit diteruskan melalui abstraksi `StorageProvider` di bawah ruang nama `audit:`. Rekod keturunan disimpan di bawah ruang nama `lineage:`.

| Jenis Data       | Ruang Nama  | Pengekalan Lalai          |
| ---------------- | ----------- | ------------------------- |
| Log audit        | `audit:`    | 1 tahun                   |
| Rekod keturunan  | `lineage:`  | 90 hari                   |
| Keadaan sesi     | `sessions:` | 30 hari                   |
| Sejarah taint    | `taint:`    | Sepadan dengan pengekalan sesi |

::: warning KESELAMATAN Tempoh pengekalan boleh dikonfigurasi, tetapi log audit lalai ke 1 tahun untuk menyokong keperluan pematuhan (SOC 2, GDPR, HIPAA). Mengurangkan tempoh pengekalan di bawah keperluan kawal selia organisasi anda adalah tanggungjawab pentadbir. :::

### Backend Storan

| Peringkat      | Backend    | Perincian                                                                                                                                                                        |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peribadi**   | SQLite     | Pangkalan data mod WAL di `~/.triggerfish/data/triggerfish.db`. Rekod audit disimpan sebagai JSON berstruktur dalam pangkalan data yang sama dengan semua keadaan Triggerfish lain. |
| **Perusahaan** | Boleh pasang | Backend perusahaan (Postgres, S3, dsb.) boleh digunakan melalui antara muka `StorageProvider`. Ini membolehkan integrasi dengan infrastruktur pengagregatan log sedia ada.        |

## Kebolehubahan dan Integriti

Rekod audit adalah hanya-tambah. Setelah ditulis, ia tidak boleh diubah suai atau dipadam oleh mana-mana komponen sistem -- termasuk LLM, ejen, atau plugin. Pemadaman berlaku hanya melalui tamat tempoh dasar pengekalan.

Setiap rekod audit merangkumi cincangan kandungan yang boleh digunakan untuk mengesahkan integriti. Jika rekod dieksport untuk semakan pematuhan, cincangan boleh disahkan berbanding rekod tersimpan untuk mengesan gangguan.

## Ciri Pematuhan Perusahaan

Pelancaran perusahaan boleh melanjutkan log audit dengan:

| Ciri                        | Keterangan                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Pegangan undang-undang**  | Gantung pemadaman berasaskan pengekalan untuk pengguna, sesi, atau julat masa yang dinyatakan          |
| **Integrasi SIEM**          | Strim peristiwa audit ke Splunk, Datadog, atau sistem SIEM lain secara masa nyata                     |
| **Papan pemuka pematuhan**  | Gambaran keseluruhan visual keputusan dasar, tindakan yang disekat, dan corak taint                   |
| **Eksport berjadual**       | Eksport berkala automatik untuk semakan kawal selia                                                   |
| **Peraturan amaran**        | Cetuskan pemberitahuan apabila corak audit tertentu berlaku (contoh, tulis-bawah yang disekat berulang) |

## Halaman Berkaitan

- [Reka Bentuk Keselamatan-Dahulu](./) -- gambaran keseluruhan seni bina keselamatan
- [Peraturan Tanpa Tulis-Bawah](./no-write-down) -- peraturan aliran pengkelasan yang penguatkuasaannya dilog
- [Identiti & Auth](./identity) -- cara keputusan identiti direkodkan
- [Delegasi Ejen](./agent-delegation) -- cara rantaian delegasi muncul dalam rekod audit
- [Pengurusan Rahsia](./secrets) -- cara akses kelayakan dilog
