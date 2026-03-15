# Signal

Hubungkan ejen Triggerfish anda ke Signal supaya orang boleh menghantar mesej kepadanya dari aplikasi Signal. Penyesuai berkomunikasi dengan daemon [signal-cli](https://github.com/AsamK/signal-cli) melalui JSON-RPC, menggunakan nombor telefon Signal anda yang dipautkan.

## Perbezaan Signal

Penyesuai Signal **adalah** nombor telefon anda. Tidak seperti Telegram atau Slack di mana akaun bot berasingan wujud, mesej Signal datang daripada orang lain ke nombor anda. Ini bermakna:

- Semua mesej masuk mempunyai `isOwner: false` — mereka sentiasa dari orang lain
- Penyesuai membalas sebagai nombor telefon anda
- Tiada semakan pemilik per-mesej seperti saluran lain

Ini menjadikan Signal sesuai untuk menerima mesej dari kenalan yang menghantar mesej ke nombor anda, dengan ejen membalas bagi pihak anda.

## Pengkelasan Lalai

Signal lalai kepada pengkelasan `PUBLIC`. Memandangkan semua mesej masuk datang dari kenalan luaran, `PUBLIC` adalah lalai yang selamat.

## Persediaan

### Langkah 1: Pasang signal-cli

signal-cli adalah klien baris perintah pihak ketiga untuk Signal. Triggerfish berkomunikasi dengannya melalui soket TCP atau Unix.

**Linux (binaan asli — tiada Java diperlukan):**

Muat turun binaan asli terbaru dari halaman [keluaran signal-cli](https://github.com/AsamK/signal-cli/releases), atau biarkan Triggerfish memuat turunnya untuk anda semasa persediaan.

**macOS / platform lain (binaan JVM):**

Memerlukan Java 21+. Triggerfish boleh memuat turun JRE mudah alih secara automatik jika Java tidak dipasang.

Anda juga boleh menjalankan persediaan berpandu:

```bash
triggerfish config add-channel signal
```

Ini memeriksa untuk signal-cli, menawarkan untuk memuat turunnya jika tiada, dan membimbing anda melalui pemautan.

### Langkah 2: Pautkan Peranti Anda

signal-cli mesti dipautkan ke akaun Signal sedia ada anda (seperti memautkan aplikasi desktop):

```bash
signal-cli link -n "Triggerfish"
```

Ini mencetak URI `tsdevice:`. Imbas kod QR dengan aplikasi mudah alih Signal anda (Tetapan > Peranti Dipautkan > Pautkan Peranti Baru).

### Langkah 3: Mulakan Daemon

signal-cli berjalan sebagai daemon latar belakang yang disambungkan oleh Triggerfish:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Gantikan `+14155552671` dengan nombor telefon anda dalam format E.164.

### Langkah 4: Konfigurasi Triggerfish

Tambahkan Signal ke `triggerfish.yaml` anda:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Pilihan              | Jenis   | Diperlukan | Keterangan                                                                           |
| -------------------- | ------- | ---------- | ------------------------------------------------------------------------------------ |
| `endpoint`           | string  | Ya         | Alamat daemon signal-cli (`tcp://host:port` atau `unix:///path/to/socket`)           |
| `account`            | string  | Ya         | Nombor telefon Signal anda (format E.164)                                            |
| `classification`     | string  | Tidak      | Siling pengkelasan (lalai: `PUBLIC`)                                                 |
| `defaultGroupMode`   | string  | Tidak      | Pengendalian mesej kumpulan: `always`, `mentioned-only`, `owner-only` (lalai: `always`) |
| `groups`             | object  | Tidak      | Penggantian konfigurasi per-kumpulan                                                 |
| `ownerPhone`         | string  | Tidak      | Dikhaskan untuk penggunaan masa hadapan                                              |
| `pairing`            | boolean | Tidak      | Dayakan mod padanan semasa persediaan                                                |

### Langkah 5: Mulakan Triggerfish

```bash
triggerfish stop && triggerfish start
```

Hantar mesej ke nombor telefon anda dari pengguna Signal lain untuk mengesahkan sambungan.

## Mesej Kumpulan

Signal menyokong sembang kumpulan. Anda boleh mengawal cara ejen membalas mesej kumpulan:

| Mod              | Tingkah Laku                                                    |
| ---------------- | --------------------------------------------------------------- |
| `always`         | Balas kepada semua mesej kumpulan (lalai)                       |
| `mentioned-only` | Hanya balas apabila disebut melalui nombor telefon atau @sebutan |
| `owner-only`     | Tidak pernah balas dalam kumpulan                               |

Konfigurasi secara global atau per-kumpulan:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

ID kumpulan adalah pengecam berkod base64. Gunakan `triggerfish signal list-groups` atau semak dokumentasi signal-cli untuk mencarinya.

## Potongan Mesej

Signal mempunyai had mesej 4,000 aksara. Respons yang lebih panjang daripada ini secara automatik dipecah menjadi berbilang mesej, membelah pada baris baharu atau ruang untuk kebolehbacaan.

## Petunjuk Menaip

Penyesuai menghantar petunjuk menaip semasa ejen memproses permintaan. Keadaan menaip dikosongkan apabila balasan dihantar.

## Alat Lanjutan

Penyesuai Signal mendedahkan alat tambahan:

- `sendTyping` / `stopTyping` — Kawalan petunjuk menaip manual
- `listGroups` — Senaraikan semua kumpulan Signal yang akaun tersebut menjadi ahli
- `listContacts` — Senaraikan semua kenalan Signal

## Menukar Pengkelasan

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Mulakan semula daemon selepas menukar: `triggerfish stop && triggerfish start`

## Ciri Kebolehpercayaan

Penyesuai Signal merangkumi beberapa mekanisme kebolehpercayaan:

### Sambung Semula Automatik

Jika sambungan ke signal-cli terputus (gangguan rangkaian, permulaan semula daemon), penyesuai secara automatik menyambung semula dengan backoff eksponen. Tiada campur tangan manual diperlukan.

### Pemeriksaan Kesihatan

Semasa permulaan, Triggerfish memeriksa sama ada daemon signal-cli sedia ada sihat menggunakan probe ping JSON-RPC. Jika daemon tidak responsif, ia dimatikan dan dimulakan semula secara automatik.

### Penjejakan Versi

Triggerfish menjejak versi signal-cli yang diketahui baik (pada masa ini 0.13.0) dan memberi amaran semasa permulaan jika versi yang dipasang anda lebih lama. Versi signal-cli direkodkan pada setiap sambungan yang berjaya.

### Sokongan Soket Unix

Sebagai tambahan kepada titik akhir TCP, penyesuai menyokong soket domain Unix:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Penyelesaian Masalah

**Daemon signal-cli tidak boleh dicapai:**

- Sahkan daemon sedang berjalan: semak proses atau cuba `nc -z 127.0.0.1 7583`
- signal-cli mengikat IPv4 sahaja — gunakan `127.0.0.1`, bukan `localhost`
- Port TCP lalai ialah 7583
- Triggerfish akan memulakan semula daemon secara automatik jika mengesan proses yang tidak sihat

**Mesej tidak tiba:**

- Sahkan peranti dipautkan: semak aplikasi mudah alih Signal di bawah Peranti Dipautkan
- signal-cli mesti telah menerima sekurang-kurangnya satu penyegerakan selepas pemautan
- Semak log untuk ralat sambungan: `triggerfish logs --tail`

**Ralat Java (binaan JVM sahaja):**

- Binaan JVM signal-cli memerlukan Java 21+
- Jalankan `java -version` untuk memeriksa
- Triggerfish boleh memuat turun JRE mudah alih semasa persediaan jika diperlukan

**Gelung sambung semula:**

- Jika anda melihat percubaan sambung semula berulang dalam log, daemon signal-cli mungkin ranap
- Semak output stderr signal-cli sendiri untuk ralat
- Cuba mulakan semula dengan daemon segar: hentikan Triggerfish, matikan signal-cli, mulakan semula kedua-duanya
