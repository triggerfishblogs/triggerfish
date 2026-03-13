# SPINE dan Triggers

Triggerfish menggunakan dua fail markdown untuk menentukan tingkah laku ejen anda: **SPINE.md** mengawal siapa ejen anda, dan **TRIGGER.md** mengawal apa yang dilakukan oleh ejen anda secara proaktif. Kedua-duanya adalah markdown bebas — anda menulisnya dalam bahasa biasa.

## SPINE.md — Identiti Ejen

`SPINE.md` adalah asas system prompt ejen anda. Ia mentakrifkan nama, personaliti, misi, domain pengetahuan, dan had ejen. Triggerfish memuatkan fail ini setiap kali ia memproses mesej, jadi perubahan berkuat kuasa dengan segera.

### Lokasi Fail

```
~/.triggerfish/SPINE.md
```

Untuk persediaan berbilang ejen, setiap ejen mempunyai SPINE.md sendiri:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Memulakan

Wizard persediaan (`triggerfish dive`) menjana SPINE.md permulaan berdasarkan jawapan anda. Anda boleh mengeditnya dengan bebas pada bila-bila masa — ia hanyalah markdown.

### Menulis SPINE.md yang Berkesan

SPINE.md yang baik adalah spesifik. Semakin konkrit anda tentang peranan ejen, semakin baik prestasinya. Berikut adalah struktur yang disyorkan:

```markdown
# Identiti

Anda adalah Reef, pembantu AI peribadi untuk Sarah.

# Misi

Bantu Sarah kekal teratur, bermaklumat, dan produktif. Utamakan pengurusan
kalendar, triage e-mel, dan penjejakan tugas.

# Gaya Komunikasi

- Ringkas dan terus. Tiada pengisian.
- Gunakan titik-titik peluru untuk senarai 3+ item.
- Apabila tidak pasti, katakan demikian daripada meneka.
- Sesuaikan formaliti saluran: santai di WhatsApp, profesional di Slack.

# Pengetahuan Domain

- Sarah adalah pengurus produk di Acme Corp.
- Alat utama: Linear untuk tugas, Google Calendar, Gmail, Slack.
- Kenalan VIP: @boss (David Chen), @skip (Maria Lopez).
- Keutamaan semasa: peta jalan Q2, pelancaran aplikasi mudah alih.

# Had

- Jangan hantar mesej ke kenalan luaran tanpa kelulusan eksplisit.
- Jangan buat transaksi kewangan.
- Sentiasa sahkan sebelum memadamkan atau mengubah suai acara kalendar.
- Apabila membincangkan topik kerja di saluran peribadi, ingatkan Sarah
  tentang had pengkelasan.

# Keutamaan Respons

- Lalai kepada respons pendek (2-3 ayat).
- Gunakan respons yang lebih panjang hanya apabila soalan memerlukan butiran.
- Untuk kod, sertakan komen ringkas yang menerangkan keputusan utama.
```

### Amalan Terbaik

::: tip **Spesifik tentang personaliti.** Daripada "jadilah membantu," tulis "jadilah ringkas, terus, dan gunakan titik-titik peluru untuk kejelasan." :::

::: tip **Sertakan konteks tentang pemilik.** Ejen berprestasi lebih baik apabila ia mengetahui peranan, alat, dan keutamaan anda. :::

::: tip **Tetapkan had yang eksplisit.** Takrifkan apa yang ejen tidak seharusnya lakukan. Ini melengkapi (tetapi tidak menggantikan) penguatkuasaan deterministik enjin dasar. :::

::: warning Arahan SPINE.md membimbing tingkah laku LLM tetapi bukan kawalan keselamatan. Untuk sekatan yang boleh dikuatkuasakan, gunakan enjin dasar dalam `triggerfish.yaml`. Enjin dasar adalah deterministik dan tidak boleh dipintas — arahan SPINE.md boleh. :::

## TRIGGER.md — Tingkah Laku Proaktif

`TRIGGER.md` mentakrifkan apa yang ejen anda perlu semak, pantau, dan tindak semasa wakeup berkala. Tidak seperti cron jobs (yang melaksanakan tugas tetap mengikut jadual), triggers memberikan ejen budi bicara untuk menilai keadaan dan memutuskan sama ada tindakan diperlukan.

### Lokasi Fail

```
~/.triggerfish/TRIGGER.md
```

Untuk persediaan berbilang ejen:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Cara Triggers Berfungsi

1. Gelung trigger membangunkan ejen pada selang waktu yang dikonfigurasi (ditetapkan dalam `triggerfish.yaml`)
2. Triggerfish memuatkan TRIGGER.md anda dan membentangkannya kepada ejen
3. Ejen menilai setiap item dan mengambil tindakan jika perlu
4. Semua tindakan trigger melalui hook dasar normal
5. Sesi trigger berjalan dengan siling pengkelasan (juga dikonfigurasi dalam YAML)
6. Waktu senyap dihormati — tiada trigger diaktifkan semasa waktu tersebut

### Konfigurasi Trigger dalam YAML

Tetapkan masa dan kekangan dalam `triggerfish.yaml` anda:

```yaml
trigger:
  interval: 30m # Semak setiap 30 minit
  classification: INTERNAL # Had siling taint maksimum untuk sesi trigger
  quiet_hours: "22:00-07:00" # Tiada wakeup semasa jam ini
```

### Menulis TRIGGER.md

Susun trigger anda mengikut keutamaan. Spesifik tentang apa yang dianggap boleh diambil tindakan dan apa yang perlu dilakukan oleh ejen mengenainya.

```markdown
# Semakan Keutamaan

- Mesej yang belum dibaca merentasi semua saluran lebih daripada 1 jam — ringkaskan dan
  beritahu di saluran utama.
- Konflik kalendar dalam 24 jam akan datang — tandakan dan cadangkan penyelesaian.
- Tugas yang tertunggak di Linear — senaraikan dengan bilangan hari tertunggak.

# Pemantauan

- GitHub: PR yang menunggu semakan saya — beritahu jika lebih daripada 4 jam.
- E-mel: apa-apa daripada kenalan VIP (David Chen, Maria Lopez) — tandakan untuk
  pemberitahuan segera tanpa mengira waktu senyap.
- Slack: sebutan dalam saluran #incidents — ringkaskan dan eskalasikan jika tidak diselesaikan.

# Proaktif

- Jika pagi (7-9 pagi), sediakan taklimat harian dengan kalendar, cuaca, dan 3 keutamaan teratas.
- Jika petang Jumaat, draf ringkasan mingguan tugas yang telah diselesaikan dan item terbuka.
- Jika kiraan peti masuk melebihi 50 yang belum dibaca, tawarkan triage kelompok.
```

### Contoh: TRIGGER.md Minima

Jika anda mahukan titik permulaan yang mudah:

```markdown
# Semak setiap wakeup

- Sebarang mesej yang belum dibaca lebih daripada 1 jam
- Acara kalendar dalam 4 jam akan datang
- Apa-apa yang mendesak dalam e-mel
```

### Contoh: TRIGGER.md Berorientasikan Pembangun

```markdown
# Keutamaan Tinggi

- Kegagalan CI pada cawangan utama — siasat dan beritahu.
- PR yang menunggu semakan saya lebih daripada 2 jam.
- Ralat Sentry dengan keterukan "kritikal" dalam sejam terakhir.

# Pemantauan

- PR Dependabot — lulus kemas kini patch secara automatik, tandakan minor/major.
- Masa binaan yang melebihi 10 minit — laporan mingguan.
- Isu terbuka yang diberikan kepada saya tanpa kemas kini dalam 3 hari.

# Harian

- Pagi: ringkaskan larian CI semalaman dan status deploy.
- Hujung hari: senaraikan PR yang saya buka yang masih menunggu semakan.
```

### Triggers dan Enjin Dasar

Semua tindakan trigger tertakluk kepada penguatkuasaan dasar yang sama seperti perbualan interaktif:

- Setiap wakeup trigger menjanakan sesi terpencil dengan penjejakan taint sendiri
- Siling pengkelasan dalam konfigurasi YAML anda mengehadkan data yang boleh diakses oleh trigger
- Peraturan tiada write-down terpakai — jika trigger mengakses data sulit, ia tidak boleh menghantar keputusan ke saluran awam
- Semua tindakan trigger dilog dalam jejak audit

::: info Jika TRIGGER.md tidak wujud, wakeup trigger masih berlaku pada selang waktu yang dikonfigurasi. Ejen menggunakan pengetahuan umum dan SPINE.md untuk memutuskan apa yang perlu diberi perhatian. Untuk keputusan terbaik, tulis TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspek | SPINE.md | TRIGGER.md |
| -------- | ---------------------------------- | ------------------------------ |
| Tujuan | Takrifkan siapa ejen | Takrifkan apa yang ejen pantau |
| Dimuatkan | Setiap mesej | Setiap wakeup trigger |
| Skop | Semua perbualan | Sesi trigger sahaja |
| Mempengaruhi | Personaliti, pengetahuan, had | Semakan dan tindakan proaktif |
| Diperlukan | Ya (dijana oleh wizard dive) | Tidak (tetapi disyorkan) |

## Langkah Seterusnya

- Konfigurasi masa trigger dan cron jobs dalam [triggerfish.yaml](./configuration) anda
- Ketahui semua perintah CLI yang tersedia dalam [rujukan Perintah](./commands)
