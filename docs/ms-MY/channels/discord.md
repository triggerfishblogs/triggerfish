# Discord

Hubungkan ejen Triggerfish anda ke Discord supaya ia boleh membalas dalam saluran pelayan dan mesej langsung. Penyesuai menggunakan [discord.js](https://discord.js.org/) untuk berhubung ke Discord Gateway.

## Pengkelasan Lalai

Discord lalai kepada pengkelasan `PUBLIC`. Pelayan Discord sering merangkumi campuran ahli yang dipercayai dan pelawat awam, jadi `PUBLIC` adalah lalai yang selamat. Anda boleh menaikkan ini jika pelayan anda adalah peribadi dan dipercayai.

## Persediaan

### Langkah 1: Cipta Aplikasi Discord

1. Pergi ke [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **New Application**
3. Namakan aplikasi anda (contoh, "Triggerfish")
4. Klik **Create**

### Langkah 2: Cipta Pengguna Bot

1. Dalam aplikasi anda, navigasi ke **Bot** dalam bar sisi
2. Klik **Add Bot** (jika belum dicipta)
3. Di bawah nama pengguna bot, klik **Reset Token** untuk menjana token baru
4. Salin **token bot**

::: warning Rahsiakan Token Anda Token bot anda memberi kawalan penuh ke atas bot anda. Jangan pernah komit ke kawalan sumber atau kongsikannya secara umum. :::

### Langkah 3: Konfigurasi Niat Istimewa

Masih di halaman **Bot**, dayakan niat gateway istimewa ini:

- **Message Content Intent** — Diperlukan untuk membaca kandungan mesej
- **Server Members Intent** — Pilihan, untuk carian ahli

### Langkah 4: Dapatkan ID Pengguna Discord Anda

1. Buka Discord
2. Pergi ke **Settings** > **Advanced** dan dayakan **Developer Mode**
3. Klik nama pengguna anda di mana sahaja dalam Discord
4. Klik **Copy User ID**

Ini adalah ID snowflake yang Triggerfish gunakan untuk mengesahkan identiti pemilik.

### Langkah 5: Jana Pautan Jemputan

1. Dalam Portal Pembangun, navigasi ke **OAuth2** > **URL Generator**
2. Di bawah **Scopes**, pilih `bot`
3. Di bawah **Bot Permissions**, pilih:
   - Send Messages
   - Read Message History
   - View Channels
4. Salin URL yang dijana dan buka dalam pelayar anda
5. Pilih pelayan yang anda mahu tambahkan bot dan klik **Authorize**

### Langkah 6: Konfigurasi Triggerfish

Tambahkan saluran Discord ke `triggerfish.yaml` anda:

```yaml
channels:
  discord:
    # botToken disimpan dalam keychain OS
    ownerId: "123456789012345678"
```

| Pilihan          | Jenis  | Diperlukan | Keterangan                                                  |
| ---------------- | ------ | ---------- | ----------------------------------------------------------- |
| `botToken`       | string | Ya         | Token bot Discord                                           |
| `ownerId`        | string | Disyorkan  | ID pengguna Discord anda (snowflake) untuk pengesahan pemilik |
| `classification` | string | Tidak      | Tahap pengkelasan (lalai: `PUBLIC`)                         |

### Langkah 7: Mulakan Triggerfish

```bash
triggerfish stop && triggerfish start
```

Hantar mesej dalam saluran di mana bot hadir, atau DM ia secara langsung, untuk mengesahkan sambungan.

## Identiti Pemilik

Triggerfish menentukan status pemilik dengan membandingkan ID pengguna Discord penghantar terhadap `ownerId` yang dikonfigurasi. Semakan ini berlaku dalam kod sebelum LLM melihat mesej:

- **Sepadan** — Mesej adalah arahan pemilik
- **Tidak sepadan** — Mesej adalah input luaran dengan taint `PUBLIC`

Jika tiada `ownerId` dikonfigurasi, semua mesej dilayan sebagai datang dari pemilik.

::: danger Sentiasa Tetapkan ID Pemilik Jika bot anda berada dalam pelayan dengan ahli lain, sentiasa konfigurasikan `ownerId`. Tanpanya, mana-mana ahli pelayan boleh mengeluarkan arahan kepada ejen anda. :::

## Potongan Mesej

Discord mempunyai had mesej 2,000 aksara. Apabila ejen menjana respons yang lebih panjang daripada ini, Triggerfish secara automatik membelahnya menjadi berbilang mesej. Pemotong membelah pada baris baharu atau ruang untuk mengekalkan kebolehbacaan.

## Tingkah Laku Bot

Penyesuai Discord:

- **Mengabaikan mesejnya sendiri** — Bot tidak akan membalas mesej yang dihantarnya
- **Mendengar dalam semua saluran yang boleh diakses** — Saluran guild, DM kumpulan, dan mesej langsung
- **Memerlukan Message Content Intent** — Tanpa ini, bot menerima peristiwa mesej kosong

## Petunjuk Menaip

Triggerfish menghantar petunjuk menaip ke Discord apabila ejen memproses permintaan. Discord tidak mendedahkan peristiwa menaip dari pengguna kepada bot dengan cara yang boleh dipercayai, jadi ini adalah hantar sahaja.

## Sembang Kumpulan

Bot boleh mengambil bahagian dalam saluran pelayan. Konfigurasi tingkah laku kumpulan:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Tingkah Laku     | Keterangan                                        |
| ---------------- | ------------------------------------------------- |
| `mentioned-only` | Hanya balas apabila bot @disebut                  |
| `always`         | Balas kepada semua mesej dalam saluran            |

## Menukar Pengkelasan

```yaml
channels:
  discord:
    # botToken disimpan dalam keychain OS
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
