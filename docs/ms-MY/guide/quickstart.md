# Permulaan Cepat

Panduan ini membawa anda melalui 5 minit pertama dengan Triggerfish — daripada menjalankan wizard persediaan hingga mempunyai ejen AI yang berfungsi yang boleh anda berbual dengannya.

## Jalankan Wizard Persediaan

Jika anda menggunakan pemasang satu-perintah, wizard sudah berjalan semasa pemasangan. Untuk menjalankannya semula atau bermula baharu:

```bash
triggerfish dive
```

Wizard membawa anda melalui lapan langkah:

### Langkah 1: Pilih Pembekal LLM Anda

```
Langkah 1/8: Pilih pembekal LLM anda
  > Triggerfish Gateway — tiada kunci API diperlukan
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Tempatan (Ollama)
    OpenRouter
```

Pilih pembekal dan masukkan kelayakan anda. Triggerfish menyokong pelbagai pembekal dengan failover automatik. **Triggerfish Gateway** adalah pilihan paling mudah — langgan [pelan Pro atau Power](/ms-MY/pricing), dan ejen anda menghubungkan ke infrastruktur LLM dan carian yang diuruskan tanpa kunci API untuk dikonfigurasi.

### Langkah 2: Namakan Ejen Anda

```
Langkah 2/8: Namakan ejen anda dan tetapkan personalitinya
  Nama ejen: Reef
  Misi (satu ayat): Bantu saya kekal teratur dan bermaklumat
  Nada: > Profesional  Santai  Ringkas  Tersuai
```

Ini menjana fail `SPINE.md` anda — asas system prompt ejen anda. Anda boleh mengeditnya pada bila-bila masa di `~/.triggerfish/SPINE.md`.

### Langkah 3: Sambungkan Saluran

```
Langkah 3/8: Sambungkan saluran pertama anda
  > CLI (sudah tersedia)
    WebChat
    Telegram (masukkan token bot)
    Langkau buat masa ini
```

Pilih platform pemesejan atau langkau langkah ini untuk bermula dengan hanya CLI. Anda boleh menambah saluran kemudian dalam `triggerfish.yaml` anda.

### Langkah 4: Plugin Pilihan

```
Langkah 4/8: Pasang plugin pilihan
  > Obsidian
    Langkau
```

Sambungkan integrasi pilihan seperti Obsidian untuk pengambilan nota.

### Langkah 5: Sambungkan Google Workspace (pilihan)

Sambungkan akaun Google anda untuk Gmail, Kalendar, Tugas, Drive, dan Sheets melalui OAuth2. Anda boleh melangkau ini dan menyambung kemudian dengan `triggerfish connect google`.

### Langkah 6: Sambungkan GitHub (pilihan)

Sambungkan GitHub dengan menampal Token Akses Peribadi. Memberikan ejen alat untuk repo, PR, isu, dan Actions. Anda boleh melangkau ini dan menyambung kemudian dengan `triggerfish connect github`.

### Langkah 7: Sediakan Carian Web

Pilih enjin carian (Brave Search atau SearXNG yang di-host sendiri) untuk digunakan oleh ejen anda, atau langkau buat masa ini.

### Langkah 8: Mulakan Daemon

```
Langkah 8/8: Pasang sebagai daemon?
  > Ya (mulakan semasa log masuk, berjalan di latar belakang)
    Tidak (mulakan manual sahaja)
```

Pilih Ya untuk mempunyai ejen anda berjalan setiap kali mesin anda dihidupkan.

## Mula Berbual

Selepas wizard selesai, anda boleh mula berbual serta-merta melalui CLI:

```bash
triggerfish chat
```

Atau, jika anda menyambungkan saluran pemesejan, hantar mesej kepada ejen anda di sana.

### Contoh Perbualan

```
Anda: Apa yang anda boleh bantu saya?

Reef: Saya boleh membantu anda dengan pelbagai tugas. Berikut adalah beberapa perkara
yang telah saya sediakan:

  - Menjawab soalan dan menjalankan perbualan
  - Mengurus kalendar dan jadual anda
  - Meringkaskan e-mel dan mesej
  - Menulis dan menyunting dokumen
  - Menjalankan kod dalam persekitaran kotak pasir
  - Mencari maklumat di web
  - Mengautomasikan tugas berulang dengan cron jobs

Apa yang anda ingin mulakan?

Anda: Sediakan taklimat pagi setiap hari jam 7 pagi

Reef: Saya telah mencipta cron job untuk taklimat pagi anda:

  Jadual: Setiap hari jam 7:00 pagi
  Tugas: Sediakan taklimat dengan acara kalendar, e-mel yang belum dibaca,
        dan ramalan cuaca
  Penghantaran: CLI (tambah saluran dalam konfigurasi untuk menerimanya di Telegram/Slack)

Anda akan menerima taklimat pertama anda esok pagi. Anda boleh mengurus
cron jobs pada bila-bila masa dengan /cron list.
```

## Sahkan Persediaan Anda

Jalankan semakan kesihatan untuk memastikan semua berfungsi:

```bash
triggerfish patrol
```

```
Semakan Kesihatan Triggerfish

  Gateway berjalan (PID 12345, masa jalan 2m)
  Pembekal LLM disambungkan (Anthropic, Claude Sonnet 4.5)
  1 saluran aktif (CLI)
  Enjin dasar dimuatkan (4 peraturan)
  3 kemahiran dipasang (3 terbundel)

Keseluruhan: SIHAT
```

## Apa yang Perlu Dilakukan Seterusnya

- **Sesuaikan ejen anda** — edit `~/.triggerfish/SPINE.md` untuk memperhalusi personaliti dan keupayaan ejen anda. Lihat [SPINE dan Triggers](./spine-and-triggers).
- **Tambah lebih banyak saluran** — sambungkan Telegram, Slack, Discord, atau WhatsApp dalam `triggerfish.yaml` anda. Lihat [Konfigurasi](./configuration).
- **Sambungkan integrasi** — `triggerfish connect google` untuk Google Workspace, `triggerfish connect github` untuk GitHub. Lihat [Integrasi](/ms-MY/integrations/).
- **Sediakan tingkah laku proaktif** — cipta `~/.triggerfish/TRIGGER.md` untuk memberitahu ejen anda apa yang perlu dipantau. Lihat [SPINE dan Triggers](./spine-and-triggers).
- **Terokai perintah** — ketahui semua perintah CLI dan dalam-chat yang tersedia. Lihat [Perintah CLI](./commands).
