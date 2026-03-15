# Sesi & Taint

Sesi adalah unit asas keadaan perbualan dalam Triggerfish. Setiap sesi menjejak **tahap taint** secara bebas — tera air pengkelasan yang merekodkan kepekaan tertinggi data yang diakses semasa sesi. Taint memacu keputusan output enjin dasar: jika sesi dicemarkan pada `CONFIDENTIAL`, tiada data daripada sesi tersebut boleh mengalir ke saluran yang dikelaskan di bawah `CONFIDENTIAL`.

## Model Taint Sesi

### Cara Taint Berfungsi

Apabila sesi mengakses data pada tahap pengkelasan, keseluruhan sesi **dicemarkan** pada tahap tersebut. Taint mengikut tiga peraturan:

1. **Per-perbualan**: Setiap sesi mempunyai tahap taint sendiri yang bebas
2. **Eskalasi sahaja**: Taint boleh meningkat, tidak pernah berkurang dalam sesi
3. **Reset penuh mengosongkan semua**: Taint DAN sejarah perbualan dikosongkan bersama

<img src="/diagrams/taint-escalation.svg" alt="Eskalasi taint: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint hanya boleh meningkat, tidak pernah berkurang." style="max-width: 100%;" />

::: warning KESELAMATAN Taint tidak pernah boleh dikurangkan secara selektif. Tiada mekanisme untuk "menyahcemarkan" sesi tanpa mengosongkan keseluruhan sejarah perbualan. Ini mencegah kebocoran konteks — jika sesi mengingati melihat data sulit, taint mesti mencerminkan itu. :::

### Mengapa Taint Tidak Boleh Berkurang

Walaupun data yang dikelaskan tidak lagi dipaparkan, tetingkap konteks LLM masih mengandunginya. Model mungkin merujuk, meringkaskan, atau bergema maklumat yang dikelaskan dalam respons masa depan. Satu-satunya cara yang selamat untuk menurunkan taint adalah menghapuskan konteks sepenuhnya — itulah yang dilakukan oleh reset penuh.

## Jenis Sesi

Triggerfish mengurus beberapa jenis sesi, setiap satu dengan penjejakan taint yang bebas:

| Jenis Sesi | Keterangan | Taint Awal | Berterusan Merentasi Pemulaan Semula |
| -------------- | ------------------------------------------------- | ------------- | ------------------------ |
| **Utama** | Perbualan langsung utama dengan pemilik | `PUBLIC` | Ya |
| **Saluran** | Satu per saluran yang disambungkan (Telegram, Slack, dll.) | `PUBLIC` | Ya |
| **Latar Belakang** | Dilahirkan untuk tugas autonomi (cron, webhooks) | `PUBLIC` | Tempoh tugas |
| **Ejen** | Sesi per-ejen untuk penghalaan berbilang ejen | `PUBLIC` | Ya |
| **Kumpulan** | Sesi chat kumpulan | `PUBLIC` | Ya |

::: info Sesi latar belakang sentiasa bermula dengan taint `PUBLIC`, tanpa mengira tahap taint sesi induk. Ini adalah reka bentuk yang disengajakan — cron jobs dan tugas yang dicetuskan webhook tidak seharusnya mewarisi taint sesi yang berlaku menjanakan mereka. :::

## Mekanisme Reset Penuh

Reset sesi adalah satu-satunya cara untuk menurunkan taint. Ia adalah operasi yang disengajakan dan merosakkan:

1. **Arkibkan rekod keturunan** — Semua data keturunan daripada sesi dipelihara dalam storan audit
2. **Kosongkan sejarah perbualan** — Keseluruhan tetingkap konteks dihapuskan
3. **Tetapkan semula taint kepada PUBLIC** — Sesi bermula segar
4. **Perlukan pengesahan pengguna** — Hook `SESSION_RESET` memerlukan pengesahan eksplisit sebelum melaksanakan

Selepas reset, sesi tidak dapat dibezakan daripada sesi baharu. Ejen tidak mempunyai memori tentang perbualan sebelumnya. Ini adalah satu-satunya cara untuk menjamin bahawa data yang dikelaskan tidak boleh bocor melalui konteks LLM.

## Komunikasi Antara-Sesi

Apabila ejen menghantar data antara sesi menggunakan `sessions_send`, peraturan write-down yang sama terpakai:

| Taint Sesi Sumber | Saluran Sesi Sasaran | Keputusan |
| -------------------- | ---------------------- | -------- |
| `PUBLIC` | Saluran `PUBLIC` | ALLOW |
| `CONFIDENTIAL` | Saluran `CONFIDENTIAL` | ALLOW |
| `CONFIDENTIAL` | Saluran `PUBLIC` | BLOCK |
| `RESTRICTED` | Saluran `CONFIDENTIAL` | BLOCK |

Alat sesi yang tersedia kepada ejen:

| Alat | Keterangan | Impak Taint |
| ------------------ | ---------------------------------------- | -------------------------------------- |
| `sessions_list` | Senaraikan sesi aktif dengan penapis | Tiada perubahan taint |
| `sessions_history` | Dapatkan semula transkrip untuk sesi | Taint diwarisi daripada sesi yang dirujuk |
| `sessions_send` | Hantar mesej ke sesi lain | Tertakluk kepada semakan write-down |
| `sessions_spawn` | Cipta sesi tugas latar belakang | Sesi baru bermula pada `PUBLIC` |
| `session_status` | Semak keadaan dan metadata sesi semasa | Tiada perubahan taint |

## Keturunan Data

Setiap elemen data yang diproses oleh Triggerfish membawa **metadata provenance** — rekod lengkap asal usul data, cara ia diubah suai, dan ke mana ia pergi. Keturunan adalah jejak audit yang menjadikan keputusan pengkelasan boleh disahkan.

### Struktur Rekod Keturunan

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
      "description": "Medan yang dipilih: nama, jumlah, peringkat",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    }
  ]
}
```

### Peraturan Penjejakan Keturunan

| Peristiwa | Tindakan Keturunan |
| ------------------------------------- | --------------------------------------------- |
| Data dibaca daripada integrasi | Cipta rekod keturunan dengan asal usul |
| Data diubah suai oleh LLM | Tambah pengubahan, hubungkan keturunan input |
| Data diagregat daripada pelbagai sumber | Gabungkan keturunan, pengkelasan = `max(input)` |
| Data dihantar ke saluran | Rekod destinasi, sahkan pengkelasan |
| Reset sesi | Arkibkan rekod keturunan, kosongkan daripada konteks |

### Pengkelasan Agregasi

Apabila data daripada pelbagai sumber digabungkan (cth., ringkasan LLM rekod daripada integrasi yang berbeza), hasil agregat mewarisi **pengkelasan maksimum** semua input:

```
Input 1: INTERNAL    (wiki dalaman)
Input 2: CONFIDENTIAL (rekod Salesforce)
Input 3: PUBLIC      (API cuaca)

Pengkelasan output agregat: CONFIDENTIAL (max input)
```

## Kegigihan Taint

Taint sesi dikekalkan melalui `StorageProvider` di bawah namespace `taint:`. Ini bermakna taint bertahan merentasi pemulaan semula daemon — sesi yang `CONFIDENTIAL` sebelum pemulaan semula masih `CONFIDENTIAL` selepasnya.

Rekod keturunan dikekalkan di bawah namespace `lineage:` dengan pengekalan yang dipacu pematuhan (lalai 90 hari).
