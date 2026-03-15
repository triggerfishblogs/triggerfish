# WhatsApp

Hubungkan ejen Triggerfish anda ke WhatsApp supaya anda boleh berinteraksi dengannya dari telefon anda. Penyesuai menggunakan **WhatsApp Business Cloud API** (API HTTP rasmi yang dihoskan Meta), menerima mesej melalui webhook dan menghantar melalui REST.

## Pengkelasan Lalai

WhatsApp lalai kepada pengkelasan `PUBLIC`. Kenalan WhatsApp boleh termasuk sesiapa yang mempunyai nombor telefon anda, jadi `PUBLIC` adalah lalai yang selamat.

## Persediaan

### Langkah 1: Cipta Akaun Perniagaan Meta

1. Pergi ke portal [Meta for Developers](https://developers.facebook.com/)
2. Cipta akaun pembangun jika anda tidak mempunyai satu
3. Cipta aplikasi baru dan pilih **Business** sebagai jenis aplikasi
4. Dalam papan pemuka aplikasi anda, tambahkan produk **WhatsApp**

### Langkah 2: Dapatkan Kelayakan Anda

Dari bahagian WhatsApp papan pemuka aplikasi anda, kumpulkan nilai-nilai ini:

- **Access Token** — Token akses kekal (atau janakan token sementara untuk ujian)
- **Phone Number ID** — ID nombor telefon yang berdaftar dengan WhatsApp Business
- **Verify Token** — Rentetan yang anda pilih, digunakan untuk mengesahkan pendaftaran webhook

### Langkah 3: Konfigurasi Webhooks

1. Dalam tetapan produk WhatsApp, navigasi ke **Webhooks**
2. Tetapkan URL panggil balik ke alamat awam pelayan anda (contoh, `https://your-server.com:8443/webhook`)
3. Tetapkan **Verify Token** ke nilai yang sama yang akan anda gunakan dalam konfigurasi Triggerfish anda
4. Langgan medan webhook `messages`

::: info URL Awam Diperlukan Webhook WhatsApp memerlukan titik akhir HTTPS yang boleh diakses secara awam. Jika anda menjalankan Triggerfish secara tempatan, anda memerlukan perkhidmatan terowong (contoh, ngrok, Cloudflare Tunnel) atau pelayan dengan IP awam. :::

### Langkah 4: Konfigurasi Triggerfish

Tambahkan saluran WhatsApp ke `triggerfish.yaml` anda:

```yaml
channels:
  whatsapp:
    # accessToken disimpan dalam keychain OS
    phoneNumberId: "your-phone-number-id"
    # verifyToken disimpan dalam keychain OS
    ownerPhone: "15551234567"
```

| Pilihan          | Jenis  | Diperlukan     | Keterangan                                                     |
| ---------------- | ------ | -------------- | -------------------------------------------------------------- |
| `accessToken`    | string | Ya             | Token akses WhatsApp Business API                              |
| `phoneNumberId`  | string | Ya             | ID Nombor Telefon dari Meta Business Dashboard                 |
| `verifyToken`    | string | Ya             | Token untuk pengesahan webhook (anda yang memilih ini)         |
| `webhookPort`    | number | Tidak          | Port untuk mendengar webhook (lalai: `8443`)                   |
| `ownerPhone`     | string | Disyorkan      | Nombor telefon anda untuk pengesahan pemilik (contoh, `"15551234567"`) |
| `classification` | string | Tidak          | Tahap pengkelasan (lalai: `PUBLIC`)                            |

::: warning Simpan Rahsia dengan Selamat Jangan pernah komit token akses ke kawalan sumber. Gunakan pemboleh ubah persekitaran atau keychain OS anda. :::

### Langkah 5: Mulakan Triggerfish

```bash
triggerfish stop && triggerfish start
```

Hantar mesej dari telefon anda ke nombor WhatsApp Business untuk mengesahkan sambungan.

## Identiti Pemilik

Triggerfish menentukan status pemilik dengan membandingkan nombor telefon penghantar terhadap `ownerPhone` yang dikonfigurasi. Semakan ini berlaku dalam kod sebelum LLM melihat mesej:

- **Sepadan** — Mesej adalah arahan pemilik
- **Tidak sepadan** — Mesej adalah input luaran dengan taint `PUBLIC`

Jika tiada `ownerPhone` dikonfigurasi, semua mesej dilayan sebagai datang dari pemilik.

::: tip Sentiasa Tetapkan Telefon Pemilik Jika orang lain mungkin menghantar mesej ke nombor WhatsApp Business anda, sentiasa konfigurasikan `ownerPhone` untuk mencegah pelaksanaan arahan tanpa kebenaran. :::

## Cara Webhook Berfungsi

Penyesuai memulakan pelayan HTTP pada port yang dikonfigurasi (lalai `8443`) yang mengendalikan dua jenis permintaan:

1. **GET /webhook** — Meta menghantar ini untuk mengesahkan titik akhir webhook anda. Triggerfish membalas dengan token cabaran jika token pengesahan sepadan.
2. **POST /webhook** — Meta menghantar mesej masuk di sini. Triggerfish menghurai muatan webhook Cloud API, mengekstrak mesej teks, dan memajukannya ke pengendali mesej.

## Had Mesej

WhatsApp menyokong mesej sehingga 4,096 aksara. Mesej yang melebihi had ini dipotong menjadi berbilang mesej sebelum dihantar.

## Petunjuk Menaip

Triggerfish menghantar dan menerima petunjuk menaip di WhatsApp. Apabila ejen anda memproses permintaan, sembang menunjukkan petunjuk menaip. Resit baca juga disokong.

## Menukar Pengkelasan

```yaml
channels:
  whatsapp:
    # accessToken disimpan dalam keychain OS
    phoneNumberId: "your-phone-number-id"
    # verifyToken disimpan dalam keychain OS
    classification: INTERNAL
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
