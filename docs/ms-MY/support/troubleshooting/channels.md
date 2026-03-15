# Penyelesaian Masalah: Saluran

## Isu Saluran Umum

### Saluran kelihatan disambungkan tetapi tiada mesej tiba

1. **Semak ID pemilik.** Jika `ownerId` tidak ditetapkan atau salah, mesej dari anda mungkin dihalakan sebagai mesej luaran (bukan pemilik) dengan kebenaran yang terhad.
2. **Semak klasifikasi.** Jika klasifikasi saluran lebih rendah dari taint sesi, respons disekat oleh peraturan no-write-down.
3. **Semak log daemon.** Jalankan `triggerfish logs --level WARN` dan cari ralat penghantaran.

### Mesej tidak dihantar

Penghala mencatat kegagalan penghantaran. Semak `triggerfish logs` untuk:

```
Channel send failed
```

Ini bermakna penghala mencuba penghantaran tetapi penyesuai saluran mengembalikan ralat. Ralat khusus akan dicatat bersama-sama.

### Tingkah laku cuba semula

Penghala saluran menggunakan backoff eksponen untuk penghantaran yang gagal. Jika mesej gagal, ia dicuba semula dengan kelewatan yang semakin meningkat. Selepas semua cubaan semula habis, mesej digugurkan dan ralat dicatat.

---

## Telegram

### Bot tidak memberi respons

1. **Sahkan token.** Pergi ke @BotFather di Telegram, semak bahawa token anda sah dan sepadan dengan yang disimpan dalam keychain.
2. **Hantar mesej ke bot secara langsung.** Mesej kumpulan memerlukan bot mempunyai kebenaran mesej kumpulan.
3. **Semak ralat pengundian.** Telegram menggunakan long polling. Jika sambungan terputus, penyesuai disambungkan semula secara automatik, tetapi isu rangkaian yang berterusan akan menghalang penerimaan mesej.

### Mesej dibahagikan kepada beberapa bahagian

Telegram mempunyai had 4,096 aksara per mesej. Respons panjang dipotong secara automatik. Ini adalah tingkah laku biasa.

### Arahan bot tidak muncul dalam menu

Penyesuai mendaftarkan arahan garis miring semasa permulaan. Jika pendaftaran gagal, ia mencatat amaran tetapi terus berjalan. Ini tidak memberi kesan kepada fungsi. Bot masih berfungsi; menu arahan sahaja tidak akan menunjukkan cadangan autolengkap.

### Tidak dapat memadam mesej lama

Telegram tidak membenarkan bot memadam mesej yang lebih lama dari 48 jam. Percubaan untuk memadam mesej lama gagal secara senyap. Ini adalah had API Telegram.

---

## Slack

### Bot tidak disambungkan

Slack memerlukan tiga kelayakan:

| Kelayakan | Format | Tempat mencarinya |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | Halaman OAuth & Permissions dalam tetapan aplikasi Slack |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Rentetan hex | Basic Information > App Credentials |

Jika mana-mana tiga hilang atau tidak sah, sambungan gagal. Kesilapan paling biasa ialah terlupa App Token, yang berasingan dari Bot Token.

### Isu Socket Mode

Triggerfish menggunakan Socket Mode Slack, bukan langganan acara HTTP. Dalam tetapan aplikasi Slack anda:

1. Pergi ke "Socket Mode" dan pastikan ia diaktifkan
2. Cipta token peringkat aplikasi dengan skop `connections:write`
3. Token ini ialah `appToken` (`xapp-...`)

Jika Socket Mode tidak diaktifkan, token bot sahaja tidak mencukupi untuk pemesejan masa nyata.

### Mesej dipotong

Slack mempunyai had 40,000 aksara. Tidak seperti Telegram dan Discord, Triggerfish memotong mesej Slack dan bukannya membahagikannya. Jika anda kerap mencapai had ini, pertimbangkan untuk meminta ejen menghasilkan output yang lebih ringkas.

### Kebocoran sumber SDK dalam ujian

SDK Slack membocorkan operasi async semasa import. Ini adalah isu hulu yang diketahui. Ujian yang menggunakan penyesuai Slack memerlukan `sanitizeResources: false` dan `sanitizeOps: false`. Ini tidak menjejaskan penggunaan pengeluaran.

---

## Discord

### Bot tidak boleh membaca mesej dalam pelayan

Discord memerlukan **niat Message Content** yang ditetapkan. Tanpanya, bot menerima acara mesej tetapi kandungan mesej kosong.

**Pembetulan:** Dalam [Portal Pembangun Discord](https://discord.com/developers/applications):
1. Pilih aplikasi anda
2. Pergi ke tetapan "Bot"
3. Aktifkan "Message Content Intent" di bawah Privileged Gateway Intents
4. Simpan perubahan

### Niat bot yang diperlukan

Penyesuai memerlukan niat-niat ini diaktifkan:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (istimewa)

### Mesej dipotong

Discord mempunyai had 2,000 aksara. Mesej panjang dibahagikan secara automatik kepada beberapa mesej.

### Penunjuk menaip gagal

Penyesuai menghantar penunjuk menaip sebelum respons. Jika bot tidak mempunyai kebenaran untuk menghantar mesej dalam saluran, penunjuk menaip gagal secara senyap (dicatat pada tahap DEBUG). Ini adalah kosmetik sahaja.

### Kebocoran sumber SDK

Seperti Slack, SDK discord.js membocorkan operasi async semasa import. Ujian memerlukan `sanitizeOps: false`. Ini tidak menjejaskan pengeluaran.

---

## WhatsApp

### Tiada mesej diterima

WhatsApp menggunakan model webhook. Bot mendengar permintaan HTTP POST masuk dari pelayan Meta. Untuk mesej tiba:

1. **Daftarkan URL webhook** dalam [Meta Business Dashboard](https://developers.facebook.com/)
2. **Konfigurasikan token pengesahan.** Penyesuai menjalankan jabat tangan pengesahan apabila Meta mula-mula disambungkan
3. **Mulakan pendengar webhook.** Penyesuai mendengar pada port 8443 secara lalai. Pastikan port ini boleh dicapai dari internet (gunakan proksi terbalik atau terowong)

### Amaran "ownerPhone not configured"

Jika `ownerPhone` tidak ditetapkan dalam konfigurasi saluran WhatsApp, semua penghantar dilayan sebagai pemilik. Ini bermakna setiap pengguna mendapat akses penuh ke semua alat. Ini adalah isu keselamatan.

**Pembetulan:** Tetapkan nombor telefon pemilik dalam konfigurasi anda:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Token akses tamat tempoh

Token akses WhatsApp Cloud API boleh tamat tempoh. Jika penghantaran mula gagal dengan ralat 401, jana semula token dalam dashboard Meta dan kemas kininya:

```bash
triggerfish config set-secret whatsapp:accessToken <token-baru>
```

---

## Signal

### signal-cli tidak ditemui

Saluran Signal memerlukan `signal-cli`, aplikasi Java pihak ketiga. Triggerfish cuba memasangnya secara automatik semasa persediaan, tetapi ini boleh gagal jika:

- Java (JRE 21+) tidak tersedia dan pemasangan automatik JRE 25 gagal
- Muat turun disekat oleh sekatan rangkaian
- Direktori sasaran tidak boleh ditulis

**Pemasangan manual:**

```bash
# Pasang signal-cli secara manual
# Lihat https://github.com/AsamK/signal-cli untuk arahan
```

### Daemon signal-cli tidak boleh dicapai

Selepas memulakan signal-cli, Triggerfish menunggu sehingga 60 saat untuk ia boleh dicapai. Jika ini tamat masa:

```
signal-cli daemon (tcp) not reachable within 60s
```

Semak:
1. Adakah signal-cli benar-benar berjalan? Semak `ps aux | grep signal-cli`
2. Adakah ia mendengar pada titik akhir yang dijangka (soket TCP atau soket Unix)?
3. Adakah akaun Signal perlu dipautkan? Jalankan `triggerfish config add-channel signal` untuk menjalani proses penautan sekali lagi.

### Penautan peranti gagal

Signal memerlukan penautan peranti ke akaun Signal anda melalui kod QR. Jika proses penautan gagal:

1. Pastikan Signal dipasang pada telefon anda
2. Buka Signal > Settings > Linked Devices > Link New Device
3. Imbas kod QR yang dipaparkan oleh wizard persediaan
4. Jika kod QR tamat tempoh, mulakan semula proses penautan

### Ketidakpadanan versi signal-cli

Triggerfish menetapkan ke versi signal-cli yang diketahui baik. Jika anda memasang versi berbeza, anda mungkin melihat amaran:

```
Signal CLI version older than known-good
```

Ini tidak memberi kesan tetapi boleh menyebabkan isu keserasian.

---

## E-mel

### Sambungan IMAP gagal

Penyesuai e-mel menyambung ke pelayan IMAP anda untuk mel masuk. Isu biasa:

- **Kelayakan salah.** Sahkan nama pengguna dan kata laluan IMAP.
- **Port 993 disekat.** Penyesuai menggunakan IMAP over TLS (port 993). Sesetengah rangkaian menyekat ini.
- **Kata laluan khusus aplikasi diperlukan.** Gmail dan pembekal lain memerlukan kata laluan khusus aplikasi apabila 2FA diaktifkan.

Mesej ralat yang mungkin anda lihat:
- `IMAP LOGIN failed` - nama pengguna atau kata laluan salah
- `IMAP connection not established` - tidak dapat mencapai pelayan
- `IMAP connection closed unexpectedly` - pelayan memutuskan sambungan

### Kegagalan penghantaran SMTP

Penyesuai e-mel menghantar melalui geganti API SMTP (bukan SMTP langsung). Jika penghantaran gagal dengan ralat HTTP:

- 401/403: Kunci API tidak sah
- 429: Had kadar dicapai
- 5xx: Perkhidmatan geganti tidak berfungsi

### Pengundian IMAP berhenti

Penyesuai mengundi e-mel baru setiap 30 saat. Jika pengundian gagal, ralat dicatat tetapi tiada sambungan semula automatik. Mulakan semula daemon untuk mewujudkan semula sambungan IMAP.

Ini adalah had yang diketahui. Lihat [Isu Diketahui](/ms-MY/support/kb/known-issues).

---

## WebChat

### Naik taraf WebSocket ditolak

Penyesuai WebChat mengesahkan sambungan masuk:

- **Header terlalu besar (431).** Saiz header gabungan melebihi 8,192 bait. Ini boleh berlaku dengan kuki yang terlalu besar atau header tersuai.
- **Penolakan CORS.** Jika `allowedOrigins` dikonfigurasi, header Origin mesti sepadan. Lalai ialah `["*"]` (benarkan semua).
- **Bingkai tidak betul.** JSON tidak sah dalam bingkai WebSocket dicatat pada tahap WARN dan bingkai digugurkan.

### Klasifikasi

WebChat lalai kepada klasifikasi PUBLIC. Pelawat tidak pernah dilayan sebagai pemilik. Jika anda memerlukan klasifikasi yang lebih tinggi untuk WebChat, tetapkannya secara eksplisit:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### Kegagalan pengundian PubSub

Google Chat menggunakan Pub/Sub untuk penghantaran mesej. Jika pengundian gagal:

```
Google Chat PubSub poll failed
```

Semak:
- Kelayakan Google Cloud adalah sah (semak `credentials_ref` dalam konfigurasi)
- Langganan Pub/Sub wujud dan belum dipadam
- Akaun perkhidmatan mempunyai peranan `pubsub.subscriber`

### Mesej kumpulan ditolak

Jika mod kumpulan tidak dikonfigurasi, mesej kumpulan mungkin digugurkan secara senyap:

```
Google Chat group message denied by group mode
```

Konfigurasikan `defaultGroupMode` dalam konfigurasi saluran Google Chat.

### ownerEmail tidak dikonfigurasi

Tanpa `ownerEmail`, semua pengguna dilayan sebagai bukan pemilik:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Tetapkannya dalam konfigurasi anda untuk mendapat akses alat penuh.
