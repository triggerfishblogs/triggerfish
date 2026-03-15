# Gambaran Keseluruhan Berbilang Saluran

Triggerfish berhubung ke platform pemesejan sedia ada anda. Anda bercakap dengan ejen anda di mana sahaja anda sudah berkomunikasi — terminal, Telegram, Slack, Discord, WhatsApp, widget web, atau e-mel. Setiap saluran mempunyai tahap pengkelasan, semakan identiti pemilik, dan penguatkuasaan dasar yang tersendiri.

## Cara Saluran Berfungsi

Setiap penyesuai saluran melaksanakan antara muka yang sama: `connect`, `disconnect`, `send`, `onMessage`, dan `status`. **Penghala saluran** berada di atas semua penyesuai dan mengendalikan pengagihan mesej, semakan pengkelasan, dan logik cuba semula.

<img src="/diagrams/channel-router.svg" alt="Penghala saluran: semua penyesuai saluran mengalir melalui pintu pengkelasan pusat ke Pelayan Gateway" style="max-width: 100%;" />

Apabila mesej tiba di mana-mana saluran, penghala:

1. Mengenal pasti penghantar (pemilik atau luaran) menggunakan **semakan identiti peringkat kod** — bukan tafsiran LLM
2. Menanda mesej dengan tahap pengkelasan saluran
3. Memajukannya ke enjin dasar untuk penguatkuasaan
4. Menghalakan respons ejen kembali melalui saluran yang sama

## Pengkelasan Saluran

Setiap saluran mempunyai tahap pengkelasan lalai yang menentukan data apa yang boleh mengalir melaluinya. Enjin dasar menguatkuasakan **peraturan tiada write-down**: data pada tahap pengkelasan tertentu tidak boleh mengalir ke saluran dengan pengkelasan yang lebih rendah.

| Saluran                               | Pengkelasan Lalai | Pengesanan Pemilik                        |
| ------------------------------------- | :---------------: | ----------------------------------------- |
| [CLI](/ms-MY/channels/cli)            |    `INTERNAL`     | Sentiasa pemilik (pengguna terminal)      |
| [Telegram](/ms-MY/channels/telegram)  |    `INTERNAL`     | Padanan ID pengguna Telegram              |
| [Signal](/ms-MY/channels/signal)      |     `PUBLIC`      | Tidak pernah pemilik (penyesuai ADALAH telefon anda) |
| [Slack](/ms-MY/channels/slack)        |     `PUBLIC`      | ID pengguna Slack melalui OAuth           |
| [Discord](/ms-MY/channels/discord)    |     `PUBLIC`      | Padanan ID pengguna Discord               |
| [WhatsApp](/ms-MY/channels/whatsapp)  |     `PUBLIC`      | Padanan nombor telefon                    |
| [WebChat](/ms-MY/channels/webchat)    |     `PUBLIC`      | Tidak pernah pemilik (pelawat)            |
| [E-mel](/ms-MY/channels/email)        |  `CONFIDENTIAL`   | Padanan alamat e-mel                      |

::: tip Boleh Dikonfigurasi Sepenuhnya Semua pengkelasan boleh dikonfigurasi dalam `triggerfish.yaml` anda. Anda boleh menetapkan mana-mana saluran ke mana-mana tahap pengkelasan berdasarkan keperluan keselamatan anda.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Pengkelasan Berkesan

Pengkelasan berkesan untuk mana-mana mesej adalah **minimum** daripada pengkelasan saluran dan pengkelasan penerima:

| Tahap Saluran | Tahap Penerima | Tahap Berkesan |
| ------------- | --------------- | --------------- |
| INTERNAL      | INTERNAL        | INTERNAL        |
| INTERNAL      | EXTERNAL        | PUBLIC          |
| CONFIDENTIAL  | INTERNAL        | INTERNAL        |
| CONFIDENTIAL  | EXTERNAL        | PUBLIC          |

Ini bermakna walaupun jika saluran dikelaskan sebagai `CONFIDENTIAL`, mesej kepada penerima luaran pada saluran tersebut dilayan sebagai `PUBLIC`.

## Keadaan Saluran

Saluran bergerak melalui keadaan yang ditentukan:

- **UNTRUSTED** — Saluran baru atau tidak diketahui bermula di sini. Tiada data mengalir masuk atau keluar. Saluran diasingkan sepenuhnya sehingga anda mengkelaskannya.
- **CLASSIFIED** — Saluran mempunyai tahap pengkelasan yang diberikan dan aktif. Mesej mengalir mengikut peraturan dasar.
- **BLOCKED** — Saluran telah dilumpuhkan secara eksplisit. Tiada mesej diproses.

::: warning Saluran UNTRUSTED Saluran `UNTRUSTED` tidak boleh menerima sebarang data daripada ejen dan tidak boleh menghantar data ke dalam konteks ejen. Ini adalah sempadan keselamatan yang keras, bukan cadangan. :::

## Penghala Saluran

Penghala saluran mengurus semua penyesuai yang berdaftar dan menyediakan:

- **Pendaftaran penyesuai** — Daftar dan nyah daftar penyesuai saluran mengikut ID saluran
- **Pengagihan mesej** — Halakan mesej keluar ke penyesuai yang betul
- **Cuba semula dengan backoff eksponen** — Penghantaran yang gagal dicuba semula sehingga 3 kali dengan kelewatan yang meningkat (1s, 2s, 4s)
- **Operasi pukal** — `connectAll()` dan `disconnectAll()` untuk pengurusan kitaran hayat

```yaml
# Tingkah laku cuba semula penghala boleh dikonfigurasi
router:
  maxRetries: 3
  baseDelay: 1000 # milisaat
```

## Ripple: Menaip dan Kehadiran

Triggerfish menyampaikan petunjuk menaip dan keadaan kehadiran merentasi saluran yang menyokongnya. Ini dipanggil **Ripple**.

| Saluran  | Petunjuk Menaip     | Resit Baca |
| -------- | :-----------------: | :--------: |
| Telegram | Hantar dan terima   |    Ya      |
| Signal   | Hantar dan terima   |    --      |
| Slack    | Hantar sahaja       |    --      |
| Discord  | Hantar sahaja       |    --      |
| WhatsApp | Hantar dan terima   |    Ya      |
| WebChat  | Hantar dan terima   |    Ya      |

Keadaan kehadiran ejen: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Potongan Mesej

Platform mempunyai had panjang mesej. Triggerfish secara automatik memotong respons panjang untuk muat dalam kekangan setiap platform, membelah pada baris baharu atau ruang untuk kebolehbacaan:

| Saluran  | Had Panjang Mesej Maksimum |
| -------- | :------------------------: |
| Telegram |       4,096 aksara         |
| Signal   |       4,000 aksara         |
| Discord  |       2,000 aksara         |
| Slack    |      40,000 aksara         |
| WhatsApp |       4,096 aksara         |
| WebChat  |         Tanpa had          |

## Langkah Seterusnya

Sediakan saluran yang anda gunakan:

- [CLI](/ms-MY/channels/cli) — Sentiasa tersedia, tiada persediaan diperlukan
- [Telegram](/ms-MY/channels/telegram) — Cipta bot melalui @BotFather
- [Signal](/ms-MY/channels/signal) — Pautkan melalui daemon signal-cli
- [Slack](/ms-MY/channels/slack) — Cipta aplikasi Slack dengan Socket Mode
- [Discord](/ms-MY/channels/discord) — Cipta aplikasi bot Discord
- [WhatsApp](/ms-MY/channels/whatsapp) — Berhubung melalui WhatsApp Business Cloud API
- [WebChat](/ms-MY/channels/webchat) — Benamkan widget sembang di tapak anda
- [E-mel](/ms-MY/channels/email) — Berhubung melalui IMAP dan relay SMTP
