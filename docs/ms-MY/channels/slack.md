# Slack

Hubungkan ejen Triggerfish anda ke Slack supaya ejen anda boleh mengambil bahagian dalam perbualan ruang kerja. Penyesuai menggunakan kerangka kerja [Bolt](https://slack.dev/bolt-js/) dengan Socket Mode, yang bermakna tiada URL awam atau titik akhir webhook diperlukan.

## Pengkelasan Lalai

Slack lalai kepada pengkelasan `PUBLIC`. Ini mencerminkan realiti bahawa ruang kerja Slack sering merangkumi tetamu luaran, pengguna Slack Connect, dan saluran bersama. Anda boleh menaikkan ini kepada `INTERNAL` atau lebih tinggi jika ruang kerja anda adalah dalaman semata-mata.

## Persediaan

### Langkah 1: Cipta Aplikasi Slack

1. Pergi ke [api.slack.com/apps](https://api.slack.com/apps)
2. Klik **Create New App**
3. Pilih **From scratch**
4. Namakan aplikasi anda (contoh, "Triggerfish") dan pilih ruang kerja anda
5. Klik **Create App**

### Langkah 2: Konfigurasi Skop Token Bot

Navigasi ke **OAuth & Permissions** dalam bar sisi dan tambahkan **Bot Token Scopes** berikut:

| Skop               | Tujuan                                    |
| ------------------ | ----------------------------------------- |
| `chat:write`       | Menghantar mesej                          |
| `channels:history` | Membaca mesej dalam saluran awam          |
| `groups:history`   | Membaca mesej dalam saluran peribadi      |
| `im:history`       | Membaca mesej langsung                    |
| `mpim:history`     | Membaca mesej langsung kumpulan           |
| `channels:read`    | Menyenaraikan saluran awam                |
| `groups:read`      | Menyenaraikan saluran peribadi            |
| `im:read`          | Menyenaraikan perbualan mesej langsung    |
| `users:read`       | Mencari maklumat pengguna                 |

### Langkah 3: Dayakan Socket Mode

1. Navigasi ke **Socket Mode** dalam bar sisi
2. Togol **Enable Socket Mode** ke aktif
3. Anda akan diminta untuk mencipta **App-Level Token** — namakannya (contoh, "triggerfish-socket") dan tambahkan skop `connections:write`
4. Salin **App Token** yang dijana (bermula dengan `xapp-`)

### Langkah 4: Dayakan Peristiwa

1. Navigasi ke **Event Subscriptions** dalam bar sisi
2. Togol **Enable Events** ke aktif
3. Di bawah **Subscribe to bot events**, tambahkan:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Langkah 5: Dapatkan Kelayakan Anda

Anda memerlukan tiga nilai:

- **Bot Token** — Pergi ke **OAuth & Permissions**, klik **Install to Workspace**, kemudian salin **Bot User OAuth Token** (bermula dengan `xoxb-`)
- **App Token** — Token yang anda cipta dalam Langkah 3 (bermula dengan `xapp-`)
- **Signing Secret** — Pergi ke **Basic Information**, tatal ke **App Credentials**, dan salin **Signing Secret**

### Langkah 6: Dapatkan ID Pengguna Slack Anda

Untuk mengkonfigurasi identiti pemilik:

1. Buka Slack
2. Klik gambar profil anda di bahagian kanan atas
3. Klik **Profile**
4. Klik menu tiga titik dan pilih **Copy member ID**

### Langkah 7: Konfigurasi Triggerfish

Tambahkan saluran Slack ke `triggerfish.yaml` anda:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret disimpan dalam keychain OS
    ownerId: "U01234ABC"
```

Rahsia (token bot, token aplikasi, rahsia penandatanganan) dimasukkan semasa `triggerfish config add-channel slack` dan disimpan dalam keychain OS.

| Pilihan          | Jenis  | Diperlukan | Keterangan                                    |
| ---------------- | ------ | ---------- | --------------------------------------------- |
| `ownerId`        | string | Disyorkan  | ID ahli Slack anda untuk pengesahan pemilik   |
| `classification` | string | Tidak      | Tahap pengkelasan (lalai: `PUBLIC`)           |

::: warning Simpan Rahsia dengan Selamat Jangan pernah komit token atau rahsia ke kawalan sumber. Gunakan pemboleh ubah persekitaran atau keychain OS anda. Lihat [Pengurusan Rahsia](/ms-MY/security/secrets) untuk butiran. :::

### Langkah 8: Jemput Bot

Sebelum bot boleh membaca atau menghantar mesej dalam saluran, anda perlu menjemputnya:

1. Buka saluran Slack yang anda ingin botnya ada
2. Taip `/invite @Triggerfish` (atau nama yang anda berikan kepada aplikasi anda)

Bot juga boleh menerima mesej langsung tanpa dijemput ke saluran.

### Langkah 9: Mulakan Triggerfish

```bash
triggerfish stop && triggerfish start
```

Hantar mesej dalam saluran di mana bot hadir, atau DM ia secara langsung, untuk mengesahkan sambungan.

## Identiti Pemilik

Triggerfish menggunakan aliran OAuth Slack untuk pengesahan pemilik. Apabila mesej tiba, penyesuai membandingkan ID pengguna Slack penghantar terhadap `ownerId` yang dikonfigurasi:

- **Sepadan** — Arahan pemilik
- **Tidak sepadan** — Input luaran dengan taint `PUBLIC`

### Keahlian Ruang Kerja

Untuk pengkelasan penerima, keahlian ruang kerja Slack menentukan sama ada pengguna adalah `INTERNAL` atau `EXTERNAL`:

- Ahli ruang kerja biasa adalah `INTERNAL`
- Pengguna luaran Slack Connect adalah `EXTERNAL`
- Pengguna tetamu adalah `EXTERNAL`

## Had Mesej

Slack menyokong mesej sehingga 40,000 aksara. Mesej yang melebihi had ini dipotong. Untuk kebanyakan respons ejen, had ini tidak pernah dicapai.

## Petunjuk Menaip

Triggerfish menghantar petunjuk menaip ke Slack apabila ejen memproses permintaan. Slack tidak mendedahkan peristiwa menaip masuk kepada bot, jadi ini adalah hantar sahaja.

## Sembang Kumpulan

Bot boleh mengambil bahagian dalam saluran kumpulan. Konfigurasi tingkah laku kumpulan dalam `triggerfish.yaml` anda:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Tingkah Laku     | Keterangan                                        |
| ---------------- | ------------------------------------------------- |
| `mentioned-only` | Hanya balas apabila bot @disebut                  |
| `always`         | Balas kepada semua mesej dalam saluran            |

## Menukar Pengkelasan

```yaml
channels:
  slack:
    classification: INTERNAL
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
