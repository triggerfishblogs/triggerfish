# Gambaran Keseluruhan Ciri

Di samping [model keselamatan](/ms-MY/security/) dan [sokongan saluran](/ms-MY/channels/), Triggerfish menyediakan keupayaan yang meluaskan ejen AI anda melebihi soal-jawab: tugas berjadual, memori berterusan, akses web, input suara, dan failover pelbagai model.

## Tingkah Laku Proaktif

### [Cron dan Trigger](./cron-and-triggers)

Jadualkan tugas berulang dengan ungkapan cron standard dan tentukan tingkah laku pemantauan proaktif melalui `TRIGGER.md`. Ejen anda boleh menyampaikan taklimat pagi, memeriksa saluran paip, memantau mesej yang belum dibaca, dan bertindak secara autonomi mengikut jadual yang boleh dikonfigurasi — semuanya dengan penguatkuasaan pengkelasan dan sesi terpencil.

### [Pemberitahuan](./notifications)

Perkhidmatan penghantaran pemberitahuan yang menghalakan mesej merentasi semua saluran yang disambungkan dengan tahap keutamaan, baris gilir luar talian, dan penyahduplikatan. Menggantikan corak pemberitahuan ad-hoc dengan abstraksi bersatu.

## Alat Ejen

### [Carian Web dan Ambil](./web-search)

Cari web dan ambil kandungan halaman. Ejen menggunakan `web_search` untuk mencari maklumat dan `web_fetch` untuk membaca halaman web, dengan pencegahan SSRF dan penguatkuasaan dasar pada semua permintaan keluar.

### [Memori Berterusan](./memory)

Memori merentas sesi dengan penghadangan pengkelasan. Ejen menyimpan dan mengingat fakta, keutamaan, dan konteks merentasi perbualan. Pengkelasan memori dipaksa ke taint sesi — LLM tidak boleh memilih tahap tersebut.

### [Analisis Imej dan Visi](./image-vision)

Tampal imej dari papan klip anda (Ctrl+V dalam CLI, tampal pelayar dalam Tide Pool) dan analisis fail imej pada cakera. Konfigurasi model visi berasingan untuk menghuraikan imej secara automatik apabila model utama tidak menyokong visi.

### [Penerokaan Kod Sumber](./explore)

Pemahaman kod sumber berstruktur melalui sub-ejen selari. Alat `explore` memetakan pokok direktori, mengesan corak pengkodan, menjejak import, dan menganalisis sejarah git — semuanya secara serentak.

### [Pengurusan Sesi](./sessions)

Periksa, berkomunikasi dengan, dan janakan sesi. Ejen boleh mendelegasikan tugas latar belakang, menghantar mesej merentas sesi, dan mencapai merentasi saluran — semuanya di bawah penguatkuasaan write-down.

### [Mod Perancangan dan Penjejakan Tugas](./planning)

Perancangan berstruktur sebelum pelaksanaan (mod perancangan) dan penjejakan tugas berterusan (todos) merentasi sesi. Mod perancangan mengekang ejen kepada penerokaan baca sahaja sehingga pengguna meluluskan pelan.

### [Sistem Fail dan Shell](./filesystem)

Baca, tulis, cari, dan laksanakan perintah. Alat asas untuk operasi fail, dengan skop ruang kerja dan penguatkuasaan senarai tolak perintah.

### [Sub-Ejen dan Tugas LLM](./subagents)

Delegasikan kerja kepada sub-ejen autonomi atau jalankan prompt LLM terpencil untuk ringkasan, pengkelasan, dan penaakulan berfokus tanpa mencemarkan perbualan utama.

### [Pasukan Ejen](./agent-teams)

Janakan pasukan ejen yang berkolaborasi secara berterusan dengan peranan khusus. Ketua menyelaraskan ahli yang berkomunikasi secara autonomi melalui pemesejan antara sesi. Termasuk pemantauan kitaran hayat dengan tamat masa terbiar, had hayat, dan semakan kesihatan. Terbaik untuk tugas kompleks yang mendapat manfaat daripada pelbagai perspektif yang berulang pada kerja antara satu sama lain.

## Interaksi Kaya

### [Saluran Paip Suara](./voice)

Sokongan pertuturan penuh dengan pembekal STT dan TTS yang boleh dikonfigurasi. Gunakan Whisper untuk transkripsi tempatan, Deepgram atau OpenAI untuk STT awan, dan ElevenLabs atau OpenAI untuk teks ke pertuturan. Input suara melalui pengkelasan dan penguatkuasaan dasar yang sama seperti teks.

### [Tide Pool / A2UI](./tidepool)

Ruang kerja visual yang dipacu ejen di mana Triggerfish memaparkan kandungan interaktif — papan pemuka, carta, borang, dan pratonton kod. Protokol A2UI (Ejen-ke-UI) menolak kemas kini masa nyata dari ejen ke klien yang disambungkan.

## Berbilang Ejen dan Berbilang Model

### [Penghalaan Berbilang Ejen](./multi-agent)

Halakan saluran, akaun, atau kenalan yang berbeza ke ejen terpencil yang berasingan, masing-masing dengan SPINE.md, ruang kerja, kemahiran, dan siling pengkelasan tersendiri. Slack kerja anda pergi ke satu ejen; WhatsApp peribadi anda pergi ke yang lain.

### [Pembekal LLM dan Failover](./model-failover)

Berhubung ke Anthropic, OpenAI, Google, model tempatan (Ollama), atau OpenRouter. Konfigurasi rantaian failover supaya ejen anda secara automatik kembali ke pembekal alternatif apabila satu tidak tersedia. Setiap ejen boleh menggunakan model yang berbeza.

### [Had Kadar](./rate-limiting)

Had kadar tetingkap gelongsor yang menghalang mencapai had API pembekal LLM. Menjejak token-per-minit dan permintaan-per-minit, melewatkan panggilan apabila kapasiti habis, dan berintegrasi dengan rantaian failover.

## Operasi

### [Pengelogan Berstruktur](./logging)

Pengelogan berstruktur bersatu dengan tahap keterukan, putaran fail, dan output berganda ke stderr dan fail. Baris log bertag komponen, putaran automatik 1 MB, dan alat `log_read` untuk mengakses sejarah log.

::: info Semua ciri berintegrasi dengan model keselamatan teras. Cron job menghormati siling pengkelasan. Input suara membawa taint. Kandungan Tide Pool melalui hook PRE_OUTPUT. Penghalaan berbilang ejen menguatkuasakan pengasingan sesi. Tiada ciri yang memintas lapisan dasar. :::
