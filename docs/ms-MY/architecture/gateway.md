# Gateway

Gateway adalah pusat kawalan Triggerfish — perkhidmatan tempatan yang berjalan lama yang menyelaraskan sesi, saluran, alat, peristiwa, dan proses ejen melalui satu titik akhir WebSocket. Semua yang berlaku dalam Triggerfish mengalir melalui Gateway.

## Seni Bina

<img src="/diagrams/gateway-architecture.svg" alt="Seni bina Gateway: saluran di sebelah kiri menghubungkan melalui Gateway pusat ke perkhidmatan di sebelah kanan" style="max-width: 100%;" />

Gateway mendengar pada port yang boleh dikonfigurasi (lalai `18789`) dan menerima sambungan daripada penyesuai saluran, perintah CLI, aplikasi pendamping, dan perkhidmatan dalaman. Semua komunikasi menggunakan JSON-RPC melalui WebSocket.

## Perkhidmatan Gateway

Gateway menyediakan perkhidmatan ini melalui titik akhir WebSocket dan HTTP-nya:

| Perkhidmatan | Keterangan | Integrasi Keselamatan |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| **Sesi** | Cipta, senaraikan, dapatkan semula sejarah, hantar antara sesi, janakan tugas latar belakang | Taint sesi dijejak per-sesi |
| **Saluran** | Halakan mesej, urus sambungan, cuba semula penghantaran yang gagal, potong mesej besar | Semakan pengkelasan pada semua output |
| **Cron** | Jadualkan tugas berulang dan wakeup trigger daripada `TRIGGER.md` | Tindakan cron melalui hook dasar |
| **Webhooks** | Terima peristiwa masuk daripada perkhidmatan luaran melalui `POST /webhooks/:sourceId` | Data masuk dikelaskan semasa pengambilan |
| **Ripple** | Jejak status dalam talian dan penunjuk menaip merentasi saluran | Tiada data sensitif didedahkan |
| **Config** | Muat semula tetapan tanpa memulakan semula | Pentadbir sahaja dalam enterprise |
| **UI Kawalan** | Papan pemuka web untuk kesihatan dan pengurusan gateway | Disahkan dengan token |
| **Tide Pool** | Hos ruang kerja visual A2UI yang dipacu ejen | Kandungan tertakluk kepada hook output |
| **Pemberitahuan** | Penghantaran pemberitahuan merentasi saluran dengan penghalaan keutamaan | Peraturan pengkelasan terpakai |

## Protokol WebSocket JSON-RPC

Klien menyambung ke Gateway melalui WebSocket dan bertukar mesej JSON-RPC 2.0. Setiap mesej adalah panggilan kaedah dengan parameter bertaip dan respons bertaip.

```typescript
// Klien menghantar:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway bertindak balas:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

## Pengesahan

Sambungan Gateway disahkan dengan token. Token dijana semasa persediaan (`triggerfish dive`) dan disimpan secara tempatan.

::: warning KESELAMATAN Gateway terikat ke `127.0.0.1` secara lalai dan tidak didedahkan ke rangkaian. Akses jauh memerlukan konfigurasi terowong yang eksplisit. Jangan dedahkan WebSocket Gateway ke internet awam tanpa pengesahan. :::

## Pengurusan Sesi

Gateway mengurus kitaran hayat penuh sesi. Sesi adalah unit asas keadaan perbualan, setiap satu dengan penjejakan taint yang bebas.

### Jenis Sesi

| Jenis | Corak Kunci | Keterangan |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------- |
| Utama | `main` | Perbualan langsung utama dengan pemilik. Berterusan merentasi pemulaan semula. |
| Saluran | `channel:<type>:<id>` | Satu per saluran yang disambungkan. Taint terpencil per saluran. |
| Latar Belakang | `bg:<task_id>` | Dilahirkan untuk cron jobs dan tugas yang dicetuskan webhook. Bermula pada taint `PUBLIC`. |
| Ejen | `agent:<agent_id>` | Sesi per-ejen untuk penghalaan berbilang ejen. |
| Kumpulan | `group:<channel>:<group_id>` | Sesi chat kumpulan. |

### Alat Sesi

Ejen berinteraksi dengan sesi melalui alat-alat ini, semua dihalakan melalui Gateway:

| Alat | Keterangan | Implikasi Taint |
| ------------------ | ------------------------------------------ | -------------------------------------- |
| `sessions_list` | Senaraikan sesi aktif dengan penapis pilihan | Tiada perubahan taint |
| `sessions_history` | Dapatkan semula transkrip untuk sesi | Taint diwarisi daripada sesi yang dirujuk |
| `sessions_send` | Hantar mesej ke sesi lain | Tertakluk kepada semakan write-down |
| `sessions_spawn` | Cipta sesi tugas latar belakang | Sesi baru bermula pada taint `PUBLIC` |
| `session_status` | Semak keadaan sesi semasa, model, kos | Tiada perubahan taint |

## Penghalaan Saluran

Gateway menghalakan mesej antara saluran dan sesi melalui penghala saluran. Penghala mengendalikan:

- **Pintu pengkelasan**: Setiap mesej keluar melalui `PRE_OUTPUT` sebelum penghantaran
- **Cuba semula dengan backoff**: Penghantaran yang gagal dicuba semula dengan backoff eksponen melalui `sendWithRetry()`
- **Potongan mesej**: Mesej besar dipecah kepada potongan yang sesuai platform (cth., had 4096 aksara Telegram)
- **Penstriman**: Respons mengalir ke saluran yang menyokongnya
- **Pengurusan sambungan**: `connectAll()` dan `disconnectAll()` untuk pengurusan kitaran hayat

## Perkhidmatan Pemberitahuan

Gateway mengintegrasikan perkhidmatan pemberitahuan kelas pertama yang menggantikan corak "beritahu pemilik" ad-hoc merentasi platform. Semua pemberitahuan mengalir melalui satu `NotificationService`.

### Penghalaan Keutamaan

| Keutamaan | Tingkah Laku |
| ---------- | ----------------------------------------------------------------- |
| `CRITICAL` | Pintas waktu senyap, hantar ke SEMUA saluran yang disambungkan dengan segera |
| `HIGH` | Hantar ke saluran pilihan dengan segera, beratur jika luar talian |
| `NORMAL` | Hantar ke sesi aktif, atau beratur untuk permulaan sesi seterusnya |
| `LOW` | Beratur, hantar dalam kelompok semasa sesi aktif |

### Sumber Pemberitahuan

| Sumber | Kategori | Keutamaan Lalai |
| -------------------------- | ---------- | ---------------- |
| Pelanggaran dasar | `security` | `CRITICAL` |
| Amaran perisikan ancaman | `security` | `CRITICAL` |
| Permintaan kelulusan kemahiran | `approval` | `HIGH` |
| Kegagalan cron job | `system` | `HIGH` |
| Amaran kesihatan sistem | `system` | `HIGH` |
| Pencetus peristiwa webhook | `info` | `NORMAL` |
| Kemas kini The Reef tersedia | `info` | `LOW` |

### Keutamaan Penghantaran

Pengguna mengkonfigurasi keutamaan pemberitahuan per-saluran:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Integrasi Penjadual

Gateway menjadi hos perkhidmatan penjadual, yang mengurus:

- **Gelung tick cron**: Penilaian berkala tugas yang dijadualkan
- **Wakeup trigger**: Wakeup ejen yang ditakrifkan dalam `TRIGGER.md`
- **Titik akhir HTTP webhook**: `POST /webhooks/:sourceId` untuk peristiwa masuk
- **Pengasingan orkestra**: Setiap tugas yang dijadualkan berjalan dalam `OrchestratorFactory` sendiri dengan keadaan sesi yang terpencil

::: tip Tugas yang dicetuskan cron dan webhook menjanakan sesi latar belakang dengan taint `PUBLIC` yang segar. Mereka tidak mewarisi taint mana-mana sesi yang sedia ada, memastikan tugas autonomi bermula dengan keadaan pengkelasan yang bersih. :::

## Kesihatan dan Diagnostik

Perintah `triggerfish patrol` menghubungkan ke Gateway dan menjalankan semakan kesihatan diagnostik, mengesahkan:

- Gateway sedang berjalan dan responsif
- Semua saluran yang dikonfigurasi disambungkan
- Storan boleh diakses
- Tugas yang dijadualkan dilaksanakan tepat pada masanya
- Tiada pemberitahuan kritikal yang tidak dihantar tersekat dalam baris gilir
