# Telegram

Hubungkan ejen Triggerfish anda ke Telegram supaya anda boleh berinteraksi dengannya dari mana-mana peranti yang anda gunakan Telegram. Penyesuai menggunakan kerangka kerja [grammY](https://grammy.dev/) untuk berkomunikasi dengan Telegram Bot API.

## Persediaan

### Langkah 1: Cipta Bot

1. Buka Telegram dan cari [@BotFather](https://t.me/BotFather)
2. Hantar `/newbot`
3. Pilih nama paparan untuk bot anda (contoh, "My Triggerfish")
4. Pilih nama pengguna untuk bot anda (mesti berakhir dengan `bot`, contoh, `my_triggerfish_bot`)
5. BotFather akan membalas dengan **token bot** anda — salinnya

::: warning Rahsiakan Token Anda Token bot anda memberi kawalan penuh ke atas bot anda. Jangan pernah komit ke kawalan sumber atau kongsikannya secara umum. Triggerfish menyimpannya dalam keychain OS anda. :::

### Langkah 2: Dapatkan ID Pengguna Telegram Anda

Triggerfish memerlukan ID pengguna berangka anda untuk mengesahkan bahawa mesej adalah daripada anda. Nama pengguna Telegram boleh diubah dan tidak boleh dipercayai untuk identiti — ID berangka adalah kekal dan diberikan oleh pelayan Telegram, jadi ia tidak boleh dipalsukan.

1. Cari [@getmyid_bot](https://t.me/getmyid_bot) di Telegram
2. Hantar sebarang mesej
3. Ia membalas dengan ID pengguna anda (nombor seperti `8019881968`)

### Langkah 3: Tambah Saluran

Jalankan persediaan interaktif:

```bash
triggerfish config add-channel telegram
```

Ini menanya untuk token bot, ID pengguna, dan tahap pengkelasan anda, kemudian menulis konfigurasi ke `triggerfish.yaml` dan menawarkan untuk memulakan semula daemon.

Anda juga boleh menambahnya secara manual:

```yaml
channels:
  telegram:
    # botToken disimpan dalam keychain OS
    ownerId: 8019881968
    classification: INTERNAL
```

| Pilihan          | Jenis  | Diperlukan | Keterangan                                      |
| ---------------- | ------ | ---------- | ----------------------------------------------- |
| `botToken`       | string | Ya         | Token Bot API dari @BotFather                   |
| `ownerId`        | number | Ya         | ID pengguna Telegram berangka anda              |
| `classification` | string | Tidak      | Siling pengkelasan (lalai: `INTERNAL`)          |

### Langkah 4: Mula Berbual

Selepas daemon dimulakan semula, buka bot anda di Telegram dan hantar `/start`. Bot akan menyambut anda untuk mengesahkan sambungan adalah langsung. Anda kemudiannya boleh berbual dengan ejen anda secara langsung.

## Tingkah Laku Pengkelasan

Tetapan `classification` adalah **siling** — ia mengawal kepekaan maksimum data yang boleh mengalir melalui saluran ini untuk perbualan **pemilik**. Ia tidak terpakai secara seragam kepada semua pengguna.

**Cara ia berfungsi per mesej:**

- **Anda menghantar mesej ke bot** (ID pengguna anda sepadan dengan `ownerId`): Sesi menggunakan siling saluran. Dengan `INTERNAL` lalai, ejen anda boleh berkongsi data peringkat dalaman dengan anda.
- **Orang lain menghantar mesej ke bot**: Sesi mereka secara automatik dicemarkan sebagai `PUBLIC` tanpa mengira pengkelasan saluran. Peraturan tiada write-down menghalang sebarang data dalaman daripada mencapai sesi mereka.

Ini bermakna satu bot Telegram dengan selamat mengendalikan perbualan pemilik dan bukan pemilik. Semakan identiti berlaku dalam kod sebelum LLM melihat mesej — LLM tidak dapat mempengaruhinya.

| Pengkelasan Saluran  | Mesej Pemilik      | Mesej Bukan Pemilik |
| -------------------- | :----------------: | :-----------------: |
| `PUBLIC`             |       PUBLIC       |        PUBLIC       |
| `INTERNAL` (lalai)   |  Sehingga INTERNAL |        PUBLIC       |
| `CONFIDENTIAL`       | Sehingga CONFIDENTIAL |     PUBLIC       |
| `RESTRICTED`         | Sehingga RESTRICTED |       PUBLIC       |

Lihat [Sistem Pengkelasan](/ms-MY/architecture/classification) untuk model penuh dan [Sesi & Taint](/ms-MY/architecture/taint-and-sessions) untuk cara peningkatan taint berfungsi.

## Identiti Pemilik

Triggerfish menentukan status pemilik dengan membandingkan ID pengguna Telegram berangka penghantar terhadap `ownerId` yang dikonfigurasi. Semakan ini berlaku dalam kod **sebelum** LLM melihat mesej:

- **Sepadan** — Mesej ditanda sebagai pemilik dan boleh mengakses data sehingga siling pengkelasan saluran
- **Tidak sepadan** — Mesej ditanda dengan taint `PUBLIC`, dan peraturan tiada write-down menghalang sebarang data terklasifikasi daripada mengalir ke sesi tersebut

::: danger Sentiasa Tetapkan ID Pemilik Anda Tanpa `ownerId`, Triggerfish melayan **semua** penghantar sebagai pemilik. Sesiapa yang menemui bot anda boleh mengakses data anda sehingga tahap pengkelasan saluran. Medan ini diperlukan semasa persediaan atas sebab ini. :::

## Potongan Mesej

Telegram mempunyai had mesej 4,096 aksara. Apabila ejen anda menjana respons yang lebih panjang daripada ini, Triggerfish secara automatik membelahnya menjadi berbilang mesej. Pemotong membelah pada baris baharu atau ruang untuk kebolehbacaan — ia mengelakkan memotong perkataan atau ayat di tengah.

## Jenis Mesej yang Disokong

Penyesuai Telegram pada masa ini mengendalikan:

- **Mesej teks** — Sokongan hantar dan terima penuh
- **Respons panjang** — Dipotong secara automatik untuk muat dalam had Telegram

## Petunjuk Menaip

Apabila ejen anda memproses permintaan, bot menunjukkan "menaip..." dalam sembang Telegram. Petunjuk berjalan semasa LLM menjana respons dan dikosongkan apabila balasan dihantar.

## Menukar Pengkelasan

Untuk menaikkan atau menurunkan siling pengkelasan:

```bash
triggerfish config add-channel telegram
# Pilih untuk menimpa konfigurasi sedia ada apabila diminta
```

Atau sunting `triggerfish.yaml` secara langsung:

```yaml
channels:
  telegram:
    # botToken disimpan dalam keychain OS
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Mulakan semula daemon selepas menukar: `triggerfish stop && triggerfish start`
