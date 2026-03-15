# E-mel

Hubungkan ejen Triggerfish anda ke e-mel supaya ia boleh menerima mesej melalui IMAP dan menghantar balasan melalui perkhidmatan relay SMTP. Penyesuai menyokong perkhidmatan seperti SendGrid, Mailgun, dan Amazon SES untuk e-mel keluar, dan mengundi mana-mana pelayan IMAP untuk mesej masuk.

## Pengkelasan Lalai

E-mel lalai kepada pengkelasan `CONFIDENTIAL`. E-mel sering mengandungi kandungan sensitif (kontrak, pemberitahuan akaun, surat-menyurat peribadi), jadi `CONFIDENTIAL` adalah lalai yang selamat.

## Persediaan

### Langkah 1: Pilih Relay SMTP

Triggerfish menghantar e-mel keluar melalui API relay SMTP berasaskan HTTP. Perkhidmatan yang disokong termasuk:

| Perkhidmatan | Titik Akhir API                                                  |
| ------------ | ---------------------------------------------------------------- |
| SendGrid     | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun      | `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`                |
| Amazon SES   | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Daftar untuk salah satu perkhidmatan ini dan dapatkan kunci API.

### Langkah 2: Konfigurasi IMAP untuk Penerimaan

Anda memerlukan kelayakan IMAP untuk menerima e-mel. Kebanyakan pembekal e-mel menyokong IMAP:

| Pembekal | Host IMAP               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Tersuai  | Pelayan mel anda        | 993  |

::: info Kata Laluan Aplikasi Gmail Jika anda menggunakan Gmail dengan pengesahan 2 faktor, anda perlu menjana [Kata Laluan Aplikasi](https://myaccount.google.com/apppasswords) untuk akses IMAP. Kata laluan Gmail biasa anda tidak akan berfungsi. :::

### Langkah 3: Konfigurasi Triggerfish

Tambahkan saluran E-mel ke `triggerfish.yaml` anda:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "triggerfish@yourdomain.com"
    ownerEmail: "you@gmail.com"
```

Rahsia (kunci API SMTP, kata laluan IMAP) dimasukkan semasa `triggerfish config add-channel email` dan disimpan dalam keychain OS.

| Pilihan          | Jenis  | Diperlukan | Keterangan                                                      |
| ---------------- | ------ | ---------- | --------------------------------------------------------------- |
| `smtpApiUrl`     | string | Ya         | URL titik akhir API relay SMTP                                  |
| `imapHost`       | string | Ya         | Nama hos pelayan IMAP                                           |
| `imapPort`       | number | Tidak      | Port pelayan IMAP (lalai: `993`)                                |
| `imapUser`       | string | Ya         | Nama pengguna IMAP (biasanya alamat e-mel anda)                 |
| `fromAddress`    | string | Ya         | Alamat Dari untuk e-mel keluar                                  |
| `pollInterval`   | number | Tidak      | Seberapa kerap untuk memeriksa e-mel baru, dalam ms (lalai: `30000`) |
| `classification` | string | Tidak      | Tahap pengkelasan (lalai: `CONFIDENTIAL`)                       |
| `ownerEmail`     | string | Disyorkan  | Alamat e-mel anda untuk pengesahan pemilik                      |

::: warning Kelayakan Kunci API SMTP dan kata laluan IMAP disimpan dalam keychain OS (Linux: GNOME Keyring, macOS: Keychain Access). Mereka tidak pernah muncul dalam `triggerfish.yaml`. :::

### Langkah 4: Mulakan Triggerfish

```bash
triggerfish stop && triggerfish start
```

Hantar e-mel ke alamat yang dikonfigurasi untuk mengesahkan sambungan.

## Identiti Pemilik

Triggerfish menentukan status pemilik dengan membandingkan alamat e-mel penghantar terhadap `ownerEmail` yang dikonfigurasi:

- **Sepadan** — Mesej adalah arahan pemilik
- **Tidak sepadan** — Mesej adalah input luaran dengan taint `PUBLIC`

Jika tiada `ownerEmail` dikonfigurasi, semua mesej dilayan sebagai datang dari pemilik.

## Pengkelasan Berasaskan Domain

Untuk kawalan yang lebih terperinci, e-mel menyokong pengkelasan penerima berasaskan domain. Ini amat berguna dalam persekitaran enterprise:

- E-mel dari `@yourcompany.com` boleh dikelaskan sebagai `INTERNAL`
- E-mel dari domain yang tidak diketahui atau luaran lalai kepada `EXTERNAL`
- Pentadbir boleh mengkonfigurasi senarai domain dalaman

```yaml
channels:
  email:
    # ... konfigurasi lain
    internalDomains:
      - "yourcompany.com"
      - "subsidiary.com"
```

Ini bermakna enjin dasar menerapkan peraturan yang berbeza berdasarkan asal e-mel:

| Domain Penghantar              | Pengkelasan  |
| ------------------------------ | :----------: |
| Domain dalaman yang dikonfigurasi | `INTERNAL` |
| Domain yang tidak diketahui    |  `EXTERNAL`  |

## Cara Ia Berfungsi

### Mesej Masuk

Penyesuai mengundi pelayan IMAP pada selang yang dikonfigurasi (lalai: setiap 30 saat) untuk mesej baru yang belum dibaca. Apabila e-mel baru tiba:

1. Alamat penghantar diekstrak
2. Status pemilik diperiksa terhadap `ownerEmail`
3. Badan e-mel dimajukan ke pengendali mesej
4. Setiap thread e-mel dipetakan ke ID sesi berdasarkan alamat penghantar (`email-sender@example.com`)

### Mesej Keluar

Apabila ejen membalas, penyesuai menghantar balasan melalui API HTTP relay SMTP yang dikonfigurasi. Balasan merangkumi:

- **Dari** — `fromAddress` yang dikonfigurasi
- **Kepada** — Alamat e-mel penghantar asal
- **Subjek** — "Triggerfish" (lalai)
- **Badan** — Respons ejen sebagai teks biasa

## Selang Undi

Selang undi lalai ialah 30 saat. Anda boleh menyesuaikan ini berdasarkan keperluan anda:

```yaml
channels:
  email:
    # ... konfigurasi lain
    pollInterval: 10000 # Semak setiap 10 saat
```

::: tip Seimbangkan Responsif dan Sumber Selang undi yang lebih pendek bermakna respons yang lebih cepat kepada e-mel masuk, tetapi sambungan IMAP yang lebih kerap. Untuk kebanyakan kes penggunaan peribadi, 30 saat adalah keseimbangan yang baik. :::

## Menukar Pengkelasan

```yaml
channels:
  email:
    # ... konfigurasi lain
    classification: CONFIDENTIAL
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
