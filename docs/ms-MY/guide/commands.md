# Perintah CLI

Triggerfish menyediakan CLI untuk mengurus ejen, daemon, saluran, dan sesi anda. Halaman ini merangkumi setiap perintah yang tersedia dan pintasan dalam-chat.

## Perintah Teras

### `triggerfish dive`

Jalankan wizard persediaan interaktif. Ini adalah perintah pertama yang anda jalankan selepas pemasangan dan boleh dijalankan semula pada bila-bila masa untuk mengkonfigurasi semula.

```bash
triggerfish dive
```

Wizard melalui 8 langkah: pembekal LLM, nama/personaliti ejen, persediaan saluran, plugin pilihan, sambungan Google Workspace, sambungan GitHub, pembekal carian, dan pemasangan daemon. Lihat [Permulaan Cepat](./quickstart) untuk panduan penuh.

### `triggerfish chat`

Mulakan sesi chat interaktif dalam terminal anda. Ini adalah perintah lalai apabila anda menjalankan `triggerfish` tanpa argumen.

```bash
triggerfish chat
```

Antara muka chat mempunyai ciri:

- Bar input lebar penuh di bahagian bawah terminal
- Respons penstriman dengan paparan token masa nyata
- Paparan panggilan alat padat (togol dengan Ctrl+O)
- Sejarah input (berterusan merentasi sesi)
- ESC untuk menghentikan respons yang sedang berjalan
- Pemadatan perbualan untuk mengurus sesi yang panjang

### `triggerfish run`

Mulakan pelayan gateway di latar depan. Berguna untuk pembangunan dan penyahpepijatan.

```bash
triggerfish run
```

Gateway mengurus sambungan WebSocket, penyesuai saluran, enjin dasar, dan keadaan sesi. Dalam pengeluaran, gunakan `triggerfish start` untuk berjalan sebagai daemon.

### `triggerfish start`

Pasang dan mulakan Triggerfish sebagai daemon latar belakang menggunakan pengurus perkhidmatan OS anda.

```bash
triggerfish start
```

| Platform | Pengurus Perkhidmatan |
| -------- | -------------------------------- |
| macOS | launchd |
| Linux | systemd |
| Windows | Windows Service / Task Scheduler |

Daemon bermula secara automatik semasa log masuk dan memastikan ejen anda berjalan di latar belakang.

### `triggerfish stop`

Hentikan daemon yang sedang berjalan.

```bash
triggerfish stop
```

### `triggerfish status`

Semak sama ada daemon sedang berjalan dan paparkan maklumat status asas.

```bash
triggerfish status
```

Contoh output:

```
Daemon Triggerfish sedang berjalan
  PID: 12345
  Masa jalan: 3h 2j 15m
  Saluran: 3 aktif (CLI, Telegram, Slack)
  Sesi: 2 aktif
```

### `triggerfish logs`

Lihat output log daemon.

```bash
# Tunjukkan log terbaru
triggerfish logs

# Strim log secara masa nyata
triggerfish logs --tail
```

### `triggerfish patrol`

Jalankan semakan kesihatan pemasangan Triggerfish anda.

```bash
triggerfish patrol
```

Contoh output:

```
Semakan Kesihatan Triggerfish

  Gateway berjalan (PID 12345, masa jalan 3h 2j)
  Pembekal LLM disambungkan (Anthropic, Claude Sonnet 4.5)
  3 saluran aktif (CLI, Telegram, Slack)
  Enjin dasar dimuatkan (12 peraturan, 3 tersuai)
  5 kemahiran dipasang (2 terbundel, 1 diuruskan, 2 ruang kerja)
  Rahsia disimpan dengan selamat (macOS Keychain)
  2 cron jobs dijadualkan
  Titik akhir webhook dikonfigurasi (2 aktif)

Keseluruhan: SIHAT
```

### `triggerfish config`

Urus fail konfigurasi anda. Menggunakan laluan bertitik ke dalam `triggerfish.yaml`.

```bash
# Tetapkan mana-mana nilai konfigurasi
triggerfish config set <kunci> <nilai>

# Baca mana-mana nilai konfigurasi
triggerfish config get <kunci>

# Sahkan sintaks dan struktur konfigurasi
triggerfish config validate

# Tambah saluran secara interaktif
triggerfish config add-channel [jenis]
```

Contoh:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migrasi kelayakan teks biasa daripada `triggerfish.yaml` ke keychain OS.

```bash
triggerfish config migrate-secrets
```

Ini mengimbas konfigurasi anda untuk kunci API teks biasa, token, dan kata laluan, menyimpannya dalam keychain OS, dan menggantikan nilai teks biasa dengan rujukan `secret:`. Sandaran fail asal dicipta sebelum sebarang perubahan.

### `triggerfish connect`

Sambungkan perkhidmatan luaran ke Triggerfish.

```bash
triggerfish connect google    # Google Workspace (aliran OAuth2)
triggerfish connect github    # GitHub (Token Akses Peribadi)
```

**Google Workspace** — Memulakan aliran OAuth2. Meminta ID Klien OAuth Google Cloud dan Rahsia Klien anda, membuka penyemak imbas untuk kebenaran, dan menyimpan token dengan selamat dalam keychain OS. Lihat [Google Workspace](/ms-MY/integrations/google-workspace) untuk arahan persediaan penuh.

**GitHub** — Membimbing anda membuat Token Akses Peribadi yang halus, mengesahkannya terhadap API GitHub, dan menyimpannya dalam keychain OS. Lihat [GitHub](/ms-MY/integrations/github) untuk butiran.

### `triggerfish disconnect`

Buang pengesahan untuk perkhidmatan luaran.

```bash
triggerfish disconnect google    # Buang token Google
triggerfish disconnect github    # Buang token GitHub
```

### `triggerfish update`

Semak kemas kini yang tersedia dan pasangnya.

```bash
triggerfish update
```

### `triggerfish version`

Paparkan versi Triggerfish semasa.

```bash
triggerfish version
```

## Perintah Kemahiran

Urus kemahiran daripada pasaran The Reef dan ruang kerja tempatan anda.

```bash
triggerfish skill search "calendar"     # Cari kemahiran di The Reef
triggerfish skill install google-cal    # Pasang kemahiran
triggerfish skill list                  # Senaraikan kemahiran yang dipasang
triggerfish skill update --all          # Kemas kini semua kemahiran yang dipasang
triggerfish skill publish               # Terbitkan kemahiran ke The Reef
triggerfish skill create                # Buat kemahiran baru
```

## Perintah Plugin

Urus plugin daripada pasaran The Reef dan sistem fail tempatan anda.

```bash
triggerfish plugin search "weather"     # Cari plugin di The Reef
triggerfish plugin install weather      # Pasang plugin daripada The Reef
triggerfish plugin update               # Semak kemas kini plugin yang dipasang
triggerfish plugin publish ./my-plugin  # Sediakan plugin untuk penerbitan Reef
triggerfish plugin scan ./my-plugin     # Jalankan pengimbas keselamatan pada plugin
triggerfish plugin list                 # Senaraikan plugin yang dipasang secara tempatan
```

## Perintah Sesi

Periksa dan urus sesi aktif.

```bash
triggerfish session list                # Senaraikan sesi aktif
triggerfish session history             # Lihat transkrip sesi
triggerfish session spawn               # Cipta sesi latar belakang
```

## Perintah Dalam-Chat

Perintah ini tersedia semasa sesi chat interaktif (melalui `triggerfish chat` atau mana-mana saluran yang disambungkan). Ia adalah untuk pemilik sahaja.

| Perintah | Keterangan |
| ----------------------- | ------------------------------------------------------------- |
| `/help` | Tunjukkan perintah dalam-chat yang tersedia |
| `/status` | Paparkan status sesi: model, kiraan token, kos, tahap taint |
| `/reset` | Tetapkan semula taint sesi dan sejarah perbualan |
| `/compact` | Mampat sejarah perbualan menggunakan ringkasan LLM |
| `/model <nama>` | Tukar model LLM untuk sesi semasa |
| `/skill install <nama>` | Pasang kemahiran daripada The Reef |
| `/cron list` | Senaraikan cron jobs yang dijadualkan |

## Pintasan Papan Kekunci

Pintasan ini berfungsi dalam antara muka chat CLI:

| Pintasan | Tindakan |
| -------- | --------------------------------------------------------------------------- |
| ESC | Hentikan respons LLM semasa |
| Ctrl+V | Tampal imej daripada papan klip (lihat [Imej dan Visi](/ms-MY/features/image-vision)) |
| Ctrl+O | Togol paparan panggilan alat padat/lanjutan |
| Ctrl+C | Keluar sesi chat |
| Atas/Bawah | Navigasi sejarah input |

## Output Debug

Triggerfish termasuk pengelogan debug terperinci untuk mendiagnosis isu pembekal LLM, penghuraian panggilan alat, dan tingkah laku gelung ejen. Aktifkan dengan menetapkan pemboleh ubah persekitaran `TRIGGERFISH_DEBUG` kepada `1`.

::: tip Cara yang disyorkan untuk mengawal verbositi log adalah melalui `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose, atau debug
```

Pemboleh ubah persekitaran `TRIGGERFISH_DEBUG=1` masih disokong untuk keserasian ke belakang. Lihat [Pengelogan Berstruktur](/ms-MY/features/logging) untuk butiran penuh. :::

::: warning Output debug termasuk muatan permintaan dan respons LLM penuh. Jangan biarkan ia didayakan dalam pengeluaran kerana ia mungkin mengelokan kandungan perbualan sensitif ke stderr/journal. :::

## Rujukan Cepat

```bash
# Persediaan dan pengurusan
triggerfish dive              # Wizard persediaan
triggerfish start             # Mulakan daemon
triggerfish stop              # Hentikan daemon
triggerfish status            # Semak status
triggerfish logs --tail       # Strim log
triggerfish patrol            # Semakan kesihatan
triggerfish config set <k> <v> # Tetapkan nilai konfigurasi
triggerfish config get <kunci>  # Baca nilai konfigurasi
triggerfish config add-channel # Tambah saluran
triggerfish config migrate-secrets  # Migrasi rahsia ke keychain
triggerfish update            # Semak kemas kini
triggerfish version           # Tunjukkan versi

# Penggunaan harian
triggerfish chat              # Chat interaktif
triggerfish run               # Mod latar depan

# Kemahiran
triggerfish skill search      # Cari di The Reef
triggerfish skill install     # Pasang kemahiran
triggerfish skill list        # Senaraikan yang dipasang
triggerfish skill create      # Cipta kemahiran baru

# Plugin
triggerfish plugin search     # Cari di The Reef
triggerfish plugin install    # Pasang plugin
triggerfish plugin update     # Semak kemas kini
triggerfish plugin scan       # Imbasan keselamatan
triggerfish plugin list       # Senaraikan yang dipasang

# Sesi
triggerfish session list      # Senaraikan sesi
triggerfish session history   # Lihat transkrip
```
