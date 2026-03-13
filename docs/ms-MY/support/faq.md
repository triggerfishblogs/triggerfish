# Soalan Lazim

## Pemasangan

### Apakah keperluan sistem?

Triggerfish berjalan pada macOS (Intel dan Apple Silicon), Linux (x64 dan arm64), dan Windows (x64). Pemasang binari mengendalikan segalanya. Jika membina dari sumber, anda memerlukan Deno 2.x.

Untuk pelancaran Docker, mana-mana sistem yang menjalankan Docker atau Podman berfungsi. Imej bekas berdasarkan distroless Debian 12.

### Di mana Triggerfish menyimpan datanya?

Segalanya berada di bawah `~/.triggerfish/` secara lalai:

```
~/.triggerfish/
  triggerfish.yaml          # Konfigurasi
  SPINE.md                  # Identiti ejen
  TRIGGER.md                # Definisi tingkah laku proaktif
  logs/                     # Fail log (diputar pada 1 MB, 10 sandaran)
  data/triggerfish.db       # Pangkalan data SQLite (sesi, memori, keadaan)
  skills/                   # Kemahiran yang dipasang
  backups/                  # Sandaran konfigurasi bertanda masa
```

Pelancaran Docker menggunakan `/data` sebaliknya. Anda boleh mengatasi direktori asas dengan pemboleh ubah persekitaran `TRIGGERFISH_DATA_DIR`.

### Bolehkah saya memindahkan direktori data?

Ya. Tetapkan pemboleh ubah persekitaran `TRIGGERFISH_DATA_DIR` ke laluan yang anda inginkan sebelum memulakan daemon. Jika anda menggunakan systemd atau launchd, anda perlu mengemas kini definisi perkhidmatan (lihat [Nota Platform](/ms-MY/support/guides/platform-notes)).

### Pemasang berkata tidak boleh menulis ke `/usr/local/bin`

Pemasang mencuba `/usr/local/bin` dahulu. Jika itu memerlukan akses root, ia jatuh balik ke `~/.local/bin`. Jika anda mahu lokasi seluruh sistem, jalankan semula dengan `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Bagaimana cara menyahpasang Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Ini menghentikan daemon, membuang definisi perkhidmatan (unit systemd atau plist launchd), memadam binari, dan membuang keseluruhan direktori `~/.triggerfish/` termasuk semua data.

---

## Konfigurasi

### Bagaimana cara menukar pembekal LLM?

Edit `triggerfish.yaml` atau gunakan CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Daemon dimulakan semula secara automatik selepas perubahan konfigurasi.

### Di mana kunci API pergi?

Kunci API disimpan dalam keychain OS anda (macOS Keychain, Linux Secret Service, atau fail yang disulitkan pada Windows/Docker). Jangan pernah meletakkan kunci API mentah dalam `triggerfish.yaml`. Gunakan sintaks rujukan `secret:`:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Simpan kunci sebenar:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Apakah maksud `secret:` dalam konfigurasi saya?

Nilai yang diawali dengan `secret:` adalah rujukan ke keychain OS anda. Semasa permulaan, Triggerfish menyelesaikan setiap rujukan dan menggantikannya dengan nilai rahsia sebenar dalam memori. Rahsia mentah tidak pernah muncul dalam `triggerfish.yaml` pada cakera. Lihat [Rahsia & Kelayakan](/ms-MY/support/troubleshooting/secrets) untuk perincian backend mengikut platform.

### Apakah itu SPINE.md?

`SPINE.md` adalah fail identiti ejen anda. Ia mentakrifkan nama, misi, personaliti, dan garis panduan tingkah laku ejen. Anggapkan ia sebagai asas arahan sistem. Wizard persediaan (`triggerfish dive`) menjana satu untuk anda, tetapi anda boleh mengeditnya dengan bebas.

### Apakah itu TRIGGER.md?

`TRIGGER.md` mentakrifkan tingkah laku proaktif ejen anda: apa yang perlu ia semak, pantau, dan ambil tindakan semasa kebangkitan trigger berjadual. Tanpa `TRIGGER.md`, trigger masih akan dicetuskan tetapi ejen tidak akan mempunyai arahan tentang apa yang perlu dilakukan.

### Bagaimana cara menambah saluran baru?

```bash
triggerfish config add-channel telegram
```

Ini memulakan arahan interaktif yang membimbing anda melalui medan yang diperlukan (token bot, ID pemilik, tahap pengkelasan). Anda juga boleh mengedit `triggerfish.yaml` terus di bawah bahagian `channels:`.

### Saya menukar konfigurasi tetapi tiada yang berlaku

Daemon mesti dimulakan semula untuk mengambil perubahan. Jika anda menggunakan `triggerfish config set`, ia menawarkan untuk dimulakan semula secara automatik. Jika anda mengedit fail YAML dengan tangan, mulakan semula dengan:

```bash
triggerfish stop && triggerfish start
```

---

## Saluran

### Mengapa bot saya tidak bertindak balas kepada mesej?

Mulakan dengan menyemak:

1. **Adakah daemon berjalan?** Jalankan `triggerfish status`
2. **Adakah saluran disambungkan?** Semak log: `triggerfish logs`
3. **Adakah token bot sah?** Kebanyakan saluran gagal senyap dengan token tidak sah
4. **Adakah ID pemilik betul?** Jika anda tidak dikenali sebagai pemilik, bot mungkin menyekat respons

Lihat panduan [Penyelesaian Masalah Saluran](/ms-MY/support/troubleshooting/channels) untuk senarai semak khusus saluran.

### Apakah ID pemilik dan mengapa ia penting?

ID pemilik memberitahu Triggerfish pengguna mana pada saluran tertentu ialah anda (pengendali). Pengguna bukan-pemilik mendapat akses alat yang terhad dan mungkin tertakluk kepada had pengkelasan. Jika anda membiarkan ID pemilik kosong, tingkah laku berbeza mengikut saluran. Sesetengah saluran (seperti WhatsApp) akan melayan semua orang sebagai pemilik, yang merupakan risiko keselamatan.

### Bolehkah saya menggunakan pelbagai saluran pada masa yang sama?

Ya. Konfigurasikan seberapa banyak saluran yang anda mahu dalam `triggerfish.yaml`. Setiap saluran mengekalkan sesi dan tahap pengkelasannya sendiri. Penghala mengendalikan penghantaran mesej merentasi semua saluran yang disambungkan.

### Apakah had saiz mesej?

| Saluran  | Had | Tingkah Laku |
|----------|-----|--------------|
| Telegram | 4,096 aksara | Dipecah secara automatik |
| Discord  | 2,000 aksara | Dipecah secara automatik |
| Slack    | 40,000 aksara | Dipotong (tidak dipecah) |
| WhatsApp | 4,096 aksara | Dipotong |
| E-mel    | Tiada had keras | Mesej penuh dihantar |
| WebChat  | Tiada had keras | Mesej penuh dihantar |

### Mengapa mesej Slack dipotong?

Slack mempunyai had 40,000 aksara. Tidak seperti Telegram dan Discord, Triggerfish memotong mesej Slack dan bukannya membahaginya menjadi beberapa mesej. Respons yang sangat panjang (seperti output kod besar) mungkin kehilangan kandungan di hujung.

---

## Keselamatan & Pengkelasan

### Apakah tahap pengkelasan?

Empat peringkat, dari kurang sensitif ke paling sensitif:

1. **PUBLIC** - Tiada sekatan pada aliran data
2. **INTERNAL** - Data operasi standard
3. **CONFIDENTIAL** - Data sensitif (kelayakan, maklumat peribadi, rekod kewangan)
4. **RESTRICTED** - Kepekaan tertinggi (data terkawal selia, kritikal pematuhan)

Data hanya boleh mengalir dari peringkat lebih rendah ke peringkat yang sama atau lebih tinggi. Data CONFIDENTIAL tidak boleh mencapai saluran PUBLIC. Ini adalah peraturan "tanpa tulis-bawah" dan ia tidak boleh ditolak.

### Apakah maksud "taint sesi"?

Setiap sesi bermula pada PUBLIC. Apabila ejen mengakses data terklasifikasi (membaca fail CONFIDENTIAL, membuat pertanyaan pangkalan data RESTRICTED), taint sesi meningkat untuk sepadan. Taint hanya naik, tidak pernah turun. Sesi yang ditaint ke CONFIDENTIAL tidak boleh menghantar outputnya ke saluran PUBLIC.

### Mengapa saya mendapat ralat "tulis-bawah disekat"?

Sesi anda telah ditaint ke tahap pengkelasan yang lebih tinggi daripada destinasi. Sebagai contoh, jika anda mengakses data CONFIDENTIAL dan kemudian cuba menghantar keputusan ke saluran WebChat PUBLIC, enjin dasar menyekatnya.

Ini berfungsi seperti yang direka. Untuk menyelesaikannya, sama ada:
- Mulakan sesi segar (perbualan baru)
- Gunakan saluran yang dikelaskan pada atau di atas tahap taint sesi anda

### Bolehkah saya melumpuhkan penguatkuasaan pengkelasan?

Tidak. Sistem pengkelasan adalah invarian keselamatan teras. Ia berjalan sebagai kod deterministik di bawah lapisan LLM dan tidak boleh dipintas, dilumpuhkan, atau dipengaruhi oleh ejen. Ini adalah dengan reka bentuk.

---

## Pembekal LLM

### Pembekal mana yang disokong?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, dan model tempatan melalui Ollama atau LM Studio.

### Bagaimana failover berfungsi?

Konfigurasikan senarai `failover` dalam `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Jika pembekal utama gagal, Triggerfish mencuba setiap sandaran mengikut urutan. Bahagian `failover_config` mengawal kiraan percubaan semula, kelewatan, dan syarat ralat mana yang mencetuskan failover.

### Pembekal saya mengembalikan ralat 401 / 403

Kunci API anda tidak sah atau tamat tempoh. Simpan semula:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

Kemudian mulakan semula daemon. Lihat [Penyelesaian Masalah Pembekal LLM](/ms-MY/support/troubleshooting/providers) untuk panduan khusus pembekal.

### Bolehkah saya menggunakan model berbeza untuk tahap pengkelasan berbeza?

Ya. Gunakan konfigurasi `classification_models`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Sesi yang ditaint ke tahap tertentu akan menggunakan model yang sepadan. Peringkat tanpa pengatasan eksplisit jatuh balik ke model utama.

---

## Docker

### Bagaimana cara menjalankan Triggerfish dalam Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Ini memuat turun skrip pembungkus Docker dan fail compose, menarik imej, dan menjalankan wizard persediaan.

### Di mana data disimpan dalam Docker?

Semua data berterusan berada dalam volum dinamakan Docker (`triggerfish-data`) yang dipasang di `/data` dalam bekas. Ini termasuk konfigurasi, rahsia, pangkalan data SQLite, log, kemahiran, dan ruang kerja ejen.

### Bagaimana rahsia berfungsi dalam Docker?

Bekas Docker tidak boleh mengakses keychain OS hos. Triggerfish menggunakan storan fail yang disulitkan sebaliknya: `secrets.json` (nilai yang disulitkan) dan `secrets.key` (kunci enkripsi AES-256), kedua-duanya disimpan dalam volum `/data`. Perlakukan volum tersebut sebagai sensitif.

### Bekas tidak boleh mencari fail konfigurasi saya

Pastikan anda memasangnya dengan betul:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Jika bekas bermula tanpa fail konfigurasi, ia akan mencetak mesej bantuan dan keluar.

### Bagaimana cara mengemas kini imej Docker?

```bash
triggerfish update    # Jika menggunakan skrip pembungkus
# atau
docker compose pull && docker compose up -d
```

---

## Kemahiran & The Reef

### Apakah itu kemahiran?

Kemahiran adalah folder yang mengandungi fail `SKILL.md` yang memberikan ejen keupayaan, konteks, atau garis panduan tingkah laku baru. Kemahiran boleh merangkumi definisi alat, kod, templat, dan arahan.

### Apakah itu The Reef?

The Reef adalah pasaran kemahiran Triggerfish. Anda boleh menemui, memasang, dan menerbitkan kemahiran melaluinya:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Mengapa kemahiran saya disekat oleh pengimbas keselamatan?

Setiap kemahiran diimbas sebelum pemasangan. Pengimbas menyemak corak mencurigakan, kebenaran berlebihan, dan pelanggaran siling pengkelasan. Jika siling kemahiran adalah di bawah taint sesi semasa anda, pengaktifan disekat untuk mencegah tulis-bawah.

### Apakah siling pengkelasan pada kemahiran?

Kemahiran mengisytiharkan tahap pengkelasan maksimum yang dibenarkan untuk beroperasi. Kemahiran dengan `classification_ceiling: INTERNAL` tidak boleh diaktifkan dalam sesi yang ditaint ke CONFIDENTIAL atau di atasnya. Ini mencegah kemahiran mengakses data di atas kebenaran mereka.

---

## Trigger & Penjadualan

### Apakah itu trigger?

Trigger adalah kebangkitan ejen berkala untuk tingkah laku proaktif. Anda mentakrifkan apa yang perlu ejen semak dalam `TRIGGER.md`, dan Triggerfish membangunkannya mengikut jadual. Ejen menyemak arahannya, mengambil tindakan (semak kalendar, pantau perkhidmatan, hantar peringatan), dan kembali tidur.

### Bagaimana trigger berbeza daripada pekerjaan cron?

Pekerjaan cron menjalankan tugas tetap mengikut jadual. Trigger membangunkan ejen dengan konteks penuhnya (memori, alat, akses saluran) dan membiarkannya memutuskan apa yang perlu dilakukan berdasarkan arahan `TRIGGER.md`. Cron adalah mekanikal; trigger adalah berasaskan ejen.

### Apakah itu waktu senyap?

Tetapan `quiet_hours` dalam `scheduler.trigger` mencegah trigger dicetuskan semasa waktu yang dinyatakan:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Bagaimana webhook berfungsi?

Perkhidmatan luaran boleh POST ke titik akhir webhook Triggerfish untuk mencetuskan tindakan ejen. Setiap sumber webhook memerlukan penandatanganan HMAC untuk pengesahan dan merangkumi pengesanan ulang.

---

## Pasukan Ejen

### Apakah itu pasukan ejen?

Pasukan ejen adalah kumpulan ejen yang bekerjasama secara berterusan yang bekerja bersama pada tugas yang kompleks. Setiap ahli pasukan adalah sesi ejen berasingan dengan peranan, konteks perbualan, dan alatnya sendiri. Satu ahli ditetapkan sebagai ketua dan menyelaraskan kerja. Lihat [Pasukan Ejen](/ms-MY/features/agent-teams) untuk dokumentasi penuh.

### Bagaimana pasukan berbeza daripada sub-ejen?

Sub-ejen adalah hantar-dan-lupakan: anda mendelegasikan satu tugas dan menunggu hasilnya. Pasukan adalah berterusan -- ahli berkomunikasi antara satu sama lain melalui `sessions_send`, ketua menyelaraskan kerja, dan pasukan berjalan secara autonomi sehingga dibubarkan atau tamat masa. Gunakan sub-ejen untuk delegasi berfokus; gunakan pasukan untuk kerjasama berbilang peranan yang kompleks.

### Adakah pasukan ejen memerlukan pelan berbayar?

Pasukan ejen memerlukan pelan **Power** ($149/bulan) apabila menggunakan Triggerfish Gateway. Pengguna sumber terbuka yang menjalankan kunci API sendiri mempunyai akses penuh -- setiap ahli pasukan menggunakan inferens dari pembekal LLM yang dikonfigurasi.

### Mengapa ketua pasukan saya gagal serta-merta?

Punca paling biasa adalah pembekal LLM yang salah dikonfigurasi. Setiap ahli pasukan menjanakan sesi ejennya sendiri yang memerlukan sambungan LLM yang berfungsi. Semak `triggerfish logs` untuk ralat pembekal sekitar masa penciptaan pasukan.

### Bolehkah ahli pasukan menggunakan model berbeza?

Ya. Setiap definisi ahli menerima medan `model` pilihan. Jika ditinggalkan, ahli mewarisi model ejen yang mencipta. Ini membolehkan anda menetapkan model mahal untuk peranan kompleks dan model lebih murah untuk peranan mudah.

### Berapa lama pasukan boleh berjalan?

Secara lalai, pasukan mempunyai tempoh hayat 1 jam (`max_lifetime_seconds: 3600`). Apabila had dicapai, ketua mendapat amaran 60 saat untuk menghasilkan output akhir, kemudian pasukan dibubarkan secara automatik. Anda boleh mengkonfigurasi tempoh hayat yang lebih lama semasa penciptaan.

### Apa yang berlaku jika ahli pasukan terhempas?

Monitor kitaran hayat mengesan kegagalan ahli dalam masa 30 saat. Ahli yang gagal ditanda sebagai `failed` dan ketua diberitahu untuk meneruskan dengan ahli yang tinggal atau membubarkan. Jika ketua itu sendiri gagal, pasukan dijeda dan sesi yang mencipta diberitahu.

---

## Pelbagai

### Adakah Triggerfish sumber terbuka?

Ya, berlesen Apache 2.0. Kod sumber penuh, termasuk semua komponen kritikal keselamatan, tersedia untuk diaudit di [GitHub](https://github.com/greghavens/triggerfish).

### Adakah Triggerfish membuat panggilan balik ke rumah?

Tidak. Triggerfish tidak membuat sambungan keluar kecuali ke perkhidmatan yang anda konfigurasi secara eksplisit (pembekal LLM, API saluran, integrasi). Tiada telemetri, analitik, atau semakan kemas kini melainkan anda menjalankan `triggerfish update`.

### Bolehkah saya menjalankan pelbagai ejen?

Ya. Bahagian konfigurasi `agents` mentakrifkan pelbagai ejen, masing-masing dengan nama, model, pengikatan saluran, set alat, dan siling pengkelasan sendiri. Sistem penghalaan mengarahkan mesej ke ejen yang sesuai.

### Apakah itu gateway?

Gateway adalah satah kawalan WebSocket dalaman Triggerfish. Ia mengurus sesi, menghalakan mesej antara saluran dan ejen, menghantar alat, dan menguatkuasakan dasar. Antara muka sembang CLI menyambungkan ke gateway untuk berkomunikasi dengan ejen anda.

### Port apa yang digunakan Triggerfish?

| Port  | Tujuan | Pengikatan |
|-------|---------|------------|
| 18789 | Gateway WebSocket | localhost sahaja |
| 18790 | Tidepool A2UI | localhost sahaja |
| 8765  | WebChat (jika diaktifkan) | boleh dikonfigurasi |
| 8443  | Webhook WhatsApp (jika diaktifkan) | boleh dikonfigurasi |

Semua port lalai mengikat ke localhost. Tiada yang terdedah ke rangkaian melainkan anda mengkonfigurasi secara eksplisit atau menggunakan proksi songsang.
