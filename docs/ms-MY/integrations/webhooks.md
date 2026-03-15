# Webhook

Triggerfish boleh menerima peristiwa masuk dari perkhidmatan luaran, membolehkan reaksi masa nyata terhadap e-mel, amaran ralat, peristiwa CI/CD, perubahan kalendar, dan banyak lagi. Webhook mengubah ejen anda dari sistem menjawab soalan yang reaktif kepada peserta proaktif dalam aliran kerja anda.

## Cara Webhook Berfungsi

Perkhidmatan luaran menghantar permintaan HTTP POST ke titik akhir webhook yang didaftarkan pada gateway Triggerfish. Setiap peristiwa masuk disahkan keasliannya, diklasifikasikan, dan dihalakan ke ejen untuk pemprosesan.

<img src="/diagrams/webhook-pipeline.svg" alt="Saluran paip webhook: perkhidmatan luaran menghantar HTTP POST melalui pengesahan HMAC, pengkelasan, pengasingan sesi, dan hook dasar ke pemprosesan ejen" style="max-width: 100%;" />

## Sumber Peristiwa yang Disokong

Triggerfish boleh menerima webhook dari mana-mana perkhidmatan yang menyokong penghantaran webhook HTTP. Integrasi biasa termasuk:

| Sumber   | Mekanisme              | Contoh Peristiwa                             |
| -------- | ---------------------- | -------------------------------------------- |
| Gmail    | Pemberitahuan tolak Pub/Sub | E-mel baru, perubahan label             |
| GitHub   | Webhook                | PR dibuka, komen isu, kegagalan CI           |
| Sentry   | Webhook                | Amaran ralat, regresi dikesan               |
| Stripe   | Webhook                | Pembayaran diterima, perubahan langganan     |
| Calendar | Polling atau tolak     | Peringatan peristiwa, konflik dikesan        |
| Tersuai  | Titik akhir webhook generik | Sebarang muatan JSON                    |

## Konfigurasi

Titik akhir webhook dikonfigurasi dalam `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # rahsia disimpan dalam keychain OS
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # rahsia disimpan dalam keychain OS
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # rahsia disimpan dalam keychain OS
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Medan Konfigurasi

| Medan             | Diperlukan | Keterangan                                                   |
| ----------------- | :--------: | ------------------------------------------------------------ |
| `id`              |    Ya      | Pengecam unik untuk titik akhir webhook ini                  |
| `path`            |    Ya      | Laluan URL di mana titik akhir didaftarkan                   |
| `secret`          |    Ya      | Rahsia dikongsi untuk pengesahan tandatangan HMAC            |
| `classification`  |    Ya      | Tahap pengkelasan yang diberikan kepada peristiwa dari sumber ini |
| `actions`         |    Ya      | Senarai pemetaan peristiwa-ke-tugas                          |
| `actions[].event` |    Ya      | Corak jenis peristiwa untuk dipadankan                       |
| `actions[].task`  |    Ya      | Tugas bahasa semula jadi untuk dilaksanakan oleh ejen        |

::: tip Rahsia webhook disimpan dalam keychain OS. Jalankan `triggerfish dive` atau konfigurasikan webhook secara interaktif untuk memasukkannya dengan selamat. :::

## Pengesahan Tandatangan HMAC

Setiap permintaan webhook masuk disahkan keasliannya menggunakan pengesahan tandatangan HMAC sebelum muatan diproses.

### Cara Pengesahan Berfungsi

1. Perkhidmatan luaran menghantar webhook dengan pengepala tandatangan (contohnya, `X-Hub-Signature-256` untuk GitHub)
2. Triggerfish mengira HMAC badan permintaan menggunakan rahsia dikongsi yang dikonfigurasi
3. Tandatangan yang dikira dibandingkan dengan tandatangan dalam pengepala permintaan
4. Jika tandatangan tidak sepadan, permintaan **ditolak** dengan segera
5. Jika disahkan, muatan diteruskan ke pengkelasan dan pemprosesan

<img src="/diagrams/hmac-verification.svg" alt="Aliran pengesahan HMAC: semak kehadiran tandatangan, kira HMAC, bandingkan tandatangan, tolak atau teruskan" style="max-width: 100%;" />

::: warning KESELAMATAN Permintaan webhook tanpa tandatangan HMAC yang sah ditolak sebelum sebarang pemprosesan berlaku. Ini menghalang peristiwa yang dipalsukan dari mencetuskan tindakan ejen. Jangan sekali-kali melumpuhkan pengesahan tandatangan dalam pengeluaran. :::

## Saluran Paip Pemprosesan Peristiwa

Sebaik sahaja peristiwa webhook lulus pengesahan tandatangan, ia mengalir melalui saluran paip keselamatan standard:

### 1. Pengkelasan

Muatan peristiwa diklasifikasikan pada tahap yang dikonfigurasi untuk titik akhir webhook. Titik akhir webhook yang dikonfigurasi sebagai `CONFIDENTIAL` menghasilkan peristiwa `CONFIDENTIAL`.

### 2. Pengasingan Sesi

Setiap peristiwa webhook menjana sesinya sendiri yang terpencil. Ini bermakna:

- Peristiwa diproses secara bebas dari mana-mana perbualan yang sedang berlangsung
- Taint sesi bermula segar (pada tahap pengkelasan webhook)
- Tiada data bocor antara sesi yang dicetuskan webhook dan sesi pengguna
- Setiap sesi mendapat penjejakan taint dan keturunannya sendiri

### 3. Hook PRE_CONTEXT_INJECTION

Muatan peristiwa melalui hook `PRE_CONTEXT_INJECTION` sebelum memasuki konteks ejen. Hook ini:

- Mengesahkan struktur muatan
- Menggunakan pengkelasan kepada semua medan data
- Mencipta rekod keturunan untuk data masuk
- Mengimbas corak suntikan dalam medan string
- Boleh menyekat peristiwa jika peraturan dasar menentukan

### 4. Pemprosesan Ejen

Ejen menerima peristiwa yang diklasifikasikan dan melaksanakan tugas yang dikonfigurasi. Tugas adalah arahan bahasa semula jadi -- ejen menggunakan keupayaan penuhnya (alat, kemahiran, pelayar, persekitaran exec) untuk menyelesaikannya dalam kekangan dasar.

### 5. Penghantaran Output

Sebarang output dari ejen (mesej, pemberitahuan, tindakan) melalui hook `PRE_OUTPUT`. Peraturan Tanpa Tulis-Bawah terpakai: output dari sesi yang dicetuskan webhook `CONFIDENTIAL` tidak boleh dihantar ke saluran `PUBLIC`.

### 6. Audit

Kitaran hayat peristiwa lengkap direkodkan: penerimaan, pengesahan, pengkelasan, penciptaan sesi, tindakan ejen, dan keputusan output.

## Integrasi dengan Penjadual

Webhook berintegrasi secara semula jadi dengan [sistem cron dan trigger Triggerfish](/ms-MY/features/cron-and-triggers). Peristiwa webhook boleh:

- **Mencetuskan cron job yang sedia ada** lebih awal dari jadual (contohnya, webhook penerapan mencetuskan pemeriksaan kesihatan segera)
- **Mencipta tugas berjadual baru** (contohnya, webhook kalendar menjadualkan peringatan)
- **Mengemas kini keutamaan trigger** (contohnya, amaran Sentry membuat ejen mengutamakan penyiasatan ralat pada kebangkitan trigger seterusnya)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # rahsia disimpan dalam keychain OS
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Ejen mungkin menggunakan cron.create untuk menjadualkan pemeriksaan susulan
```

## Ringkasan Keselamatan

| Kawalan                 | Keterangan                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Pengesahan HMAC         | Semua webhook masuk disahkan sebelum pemprosesan                                   |
| Pengkelasan             | Muatan webhook diklasifikasikan pada tahap yang dikonfigurasi                      |
| Pengasingan sesi        | Setiap peristiwa mendapat sesinya sendiri yang terpencil                           |
| `PRE_CONTEXT_INJECTION` | Muatan diimbas dan diklasifikasikan sebelum memasuki konteks                       |
| Tanpa Tulis-Bawah       | Output dari peristiwa pengkelasan tinggi tidak boleh mencapai saluran pengkelasan rendah |
| Pengelogan audit        | Kitaran hayat peristiwa lengkap direkodkan                                         |
| Tidak didedahkan secara awam | Titik akhir webhook tidak didedahkan ke internet awam secara lalai            |

## Contoh: Gelung Semakan PR GitHub

Contoh dunia nyata webhook dalam tindakan: ejen membuka PR, kemudian peristiwa webhook GitHub mendorong gelung maklum balas semakan kod tanpa sebarang pengundian.

### Cara Ia Berfungsi

1. Ejen mencipta cawangan ciri, mengkomit kod, dan membuka PR melalui `gh pr create`
2. Ejen menulis fail penjejakan ke `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` dengan nama cawangan, nombor PR, dan konteks tugas
3. Ejen berhenti dan menunggu -- tiada pengundian

Apabila penyemak menghantar maklum balas:

4. GitHub menghantar webhook `pull_request_review` ke Triggerfish
5. Triggerfish mengesahkan tandatangan HMAC, mengklasifikasikan peristiwa, dan menjana sesi terpencil
6. Ejen membaca fail penjejakan untuk memulihkan konteks, menyemak keluar cawangan, menangani semakan, mengkomit, menolak, dan mengulas pada PR
7. Langkah 4-6 berulang sehingga semakan diluluskan

Apabila PR digabungkan:

8. GitHub menghantar webhook `pull_request.closed` dengan `merged: true`
9. Ejen membersihkan: memadam cawangan tempatan, mengarkibkan fail penjejakan

### Konfigurasi

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # rahsia disimpan dalam keychain OS
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

Webhook GitHub mesti menghantar: `Pull requests`, `Pull request reviews`, `Pull request review comments`, dan `Issue comments`.

Lihat panduan [Integrasi GitHub](/ms-MY/integrations/github) penuh untuk arahan persediaan dan kemahiran terbundel `git-branch-management` untuk aliran kerja ejen yang lengkap.

### Kawalan Perusahaan

- **Senarai benarkan webhook** yang diurus pentadbir -- hanya sumber luaran yang diluluskan boleh mendaftarkan titik akhir
- **Had kadar** per titik akhir untuk mencegah penyalahgunaan
- **Had saiz muatan** untuk mencegah kehabisan memori
- **Senarai benarkan IP** untuk pengesahan sumber tambahan
- **Dasar pengekalan** untuk log peristiwa webhook

::: info Titik akhir webhook tidak didedahkan ke internet awam secara lalai. Untuk perkhidmatan luaran mencapai contoh Triggerfish anda, anda perlu mengkonfigurasi pemajuan port, proksi songsang, atau terowong. Bahagian [Akses Jauh](/ms-MY/reference/) dokumentasi merangkumi pilihan pendedahan yang selamat. :::
