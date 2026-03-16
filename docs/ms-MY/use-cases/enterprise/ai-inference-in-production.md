---
title: AI Inference dalam Aliran Kerja Pengeluaran
description: Cara Triggerfish merapatkan jurang antara demo AI dan aliran kerja pengeluaran yang tahan lama dengan penguatkuasaan keselamatan, jejak audit, dan orchestration aliran kerja.
---

# Integrasi AI/ML Inference ke dalam Aliran Kerja Pengeluaran

Kebanyakan projek AI enterprise mati dalam jurang antara demo dan pengeluaran. Satu pasukan membina bukti konsep yang menggunakan GPT-4 untuk mengklasifikasikan tiket sokongan atau meringkaskan dokumen undang-undang atau menjana salinan pemasaran. Demo berjaya. Kepimpinan teruja. Kemudian projek terhenti selama berbulan-bulan cuba menjawab soalan yang tidak pernah perlu dijawab oleh demo: Di mana data itu datang? Di mana outputnya pergi? Siapa yang meluluskan keputusan AI? Apa yang berlaku apabila model berhalusinasi? Bagaimana kita mengaudit apa yang dilakukannya? Bagaimana kita menghalangnya daripada mengakses data yang tidak patut dilihat? Bagaimana kita menghalangnya daripada menghantar maklumat sensitif ke tempat yang salah?

Ini bukan kebimbangan hipotetikal. 95% perintis AI generatif enterprise gagal memberikan pulangan kewangan, dan sebabnya bukan teknologi tidak berfungsi. Model-modelnya berkemampuan. Kegagalannya adalah dalam plumbum: mengintegrasikan AI inference secara boleh dipercayai ke dalam aliran kerja perniagaan sebenar di mana ia perlu beroperasi, dengan kawalan keselamatan, pengendalian ralat, dan jejak audit yang diperlukan oleh sistem pengeluaran.

Respons enterprise biasa adalah membina lapisan integrasi tersuai. Pasukan kejuruteraan menghabiskan berbulan-bulan menghubungkan model AI ke sumber data, membina saluran paip, menambah pengesahan, melaksanakan pengelogan, mencipta aliran kerja kelulusan, dan memasang semakan keselamatan. Menjelang integrasi itu "bersedia untuk pengeluaran," model asal telah digantikan oleh yang lebih baharu, keperluan perniagaan telah berubah, dan pasukan perlu bermula semula.

## Cara Triggerfish Menyelesaikan Ini

Triggerfish menghapuskan jurang integrasi dengan menjadikan AI inference sebagai langkah kelas pertama dalam enjin aliran kerja, dikawal oleh penguatkuasaan keselamatan yang sama, pengelogan audit, dan kawalan pengelasan yang terpakai kepada setiap operasi lain dalam sistem. Langkah sub-ejen LLM dalam aliran kerja Triggerfish bukanlah tambahan. Ia adalah operasi asli dengan hook dasar yang sama, penjejakan keturunan, dan pencegahan write-down seperti panggilan HTTP atau pertanyaan pangkalan data.

### AI sebagai Langkah Aliran Kerja, Bukan Sistem Berasingan

Dalam DSL aliran kerja, langkah inferens LLM ditakrifkan dengan `call: triggerfish:llm`. Huraian tugas memberitahu sub-ejen apa yang perlu dilakukan dalam bahasa semula jadi. Sub-ejen mempunyai akses kepada setiap alat yang berdaftar dalam Triggerfish. Ia boleh mencari di web, menanya pangkalan data melalui alat MCP, membaca dokumen, melayari laman web, dan menggunakan memori lintas sesi. Apabila langkah selesai, outputnya terus masuk ke langkah aliran kerja seterusnya.

Ini bermakna tiada "sistem AI" yang berasingan untuk diintegrasikan. Inferens berlaku di dalam aliran kerja, menggunakan kelayakan yang sama, sambungan data yang sama, dan penguatkuasaan keselamatan yang sama seperti segala-galanya yang lain. Pasukan kejuruteraan tidak perlu membina lapisan integrasi tersuai kerana lapisan integrasi sudah wujud.

### Keselamatan yang Tidak Memerlukan Kejuruteraan Tersuai

Bahagian yang paling memakan masa dalam memproduktifkan aliran kerja AI bukan AI itu sendiri. Ia adalah kerja keselamatan dan pematuhan. Data mana yang boleh dilihat model? Ke mana ia boleh menghantar outputnya? Bagaimana kita menghalangnya daripada membocorkan maklumat sensitif? Bagaimana kita merekodkan segalanya untuk audit?

Dalam Triggerfish, soalan-soalan ini dijawab oleh seni bina platform, bukan oleh kejuruteraan per-projek. Sistem pengelasan menjejaki kepekaan data pada setiap sempadan. Taint sesi meningkat apabila model mengakses data yang diklasifikasikan. Pencegahan write-down menyekat output daripada mengalir ke saluran yang diklasifikasikan di bawah tahap taint sesi. Setiap panggilan alat, setiap akses data, dan setiap keputusan output direkodkan dengan keturunan penuh.

Aliran kerja AI yang membaca rekod pelanggan (CONFIDENTIAL) dan menjana ringkasan tidak boleh menghantar ringkasan tersebut ke saluran Slack awam. Ini bukan dikuatkuasakan oleh arahan prompt yang mungkin diabaikan oleh model. Ia dikuatkuasakan oleh kod deterministik dalam PRE_OUTPUT hook yang tidak boleh dilihat oleh model, tidak boleh diubah, dan tidak boleh dipintas. Hook dasar berjalan di bawah lapisan LLM. LLM meminta tindakan, dan lapisan dasar memutuskan sama ada untuk membenarkannya. Tamat masa sama dengan penolakan. Tiada laluan dari model ke dunia luar yang tidak melalui penguatkuasaan.

### Jejak Audit yang Sudah Wujud

Setiap keputusan AI dalam aliran kerja Triggerfish menjana rekod keturunan secara automatik. Keturunan menjejaki data apa yang diakses model, tahap pengelasan apa yang dibawanya, transformasi apa yang diterapkan, dan ke mana output dihantar. Ini bukan ciri pengelogan yang perlu diaktifkan atau dikonfigurasi. Ia adalah sifat struktural platform. Setiap elemen data membawa metadata provenance dari penciptaan melalui setiap transformasi ke destinasi akhirnya.

Untuk industri yang dikawal selia, ini bermakna bukti pematuhan untuk aliran kerja AI wujud dari hari pertama. Juruaudit boleh mengesan mana-mana output yang dijana AI kembali melalui rantai yang lengkap: model mana yang menghasilkannya, data apa yang diasaskan, alat apa yang digunakan model semasa penaakulan, tahap pengelasan apa yang terpakai pada setiap langkah, dan sama ada sebarang tindakan penguatkuasaan dasar berlaku. Pengumpulan bukti ini berlaku secara automatik kerana ia dibina ke dalam hook penguatkuasaan, bukan ditambah sebagai lapisan pelaporan.

### Fleksibiliti Model Tanpa Seni Semula Bina

Triggerfish menyokong berbilang pembekal LLM melalui antara muka LlmProvider: Anthropic, OpenAI, Google, model tempatan melalui Ollama, dan OpenRouter untuk mana-mana model yang dihalakan. Pemilihan pembekal boleh dikonfigurasi per-ejen dengan failover automatik. Apabila model yang lebih baik tersedia atau pembekal mengubah harga, penukaran berlaku pada tahap konfigurasi tanpa menyentuh definisi aliran kerja.

Ini menangani secara langsung masalah "projek sudah lapuk sebelum dihantar". Definisi aliran kerja menerangkan apa yang perlu dilakukan AI, bukan model mana yang melakukannya. Beralih dari GPT-4 ke Claude ke model tempatan yang disesuaikan mengubah satu nilai konfigurasi. Aliran kerja, kawalan keselamatan, jejak audit, dan titik integrasi semuanya kekal sama persis.

### Cron, Webhooks, dan Pelaksanaan Dipacu Peristiwa

Aliran kerja AI yang berjalan mengikut jadual atau sebagai respons kepada peristiwa tidak memerlukan manusia untuk memberi arahan. Penjadual menyokong ungkapan cron lima medan untuk aliran kerja berulang dan titik akhir webhook untuk pencetus dipacu peristiwa. Aliran kerja penjanaan laporan harian berjalan pada pukul 6 pagi. Aliran kerja pengelasan dokumen dicetuskan apabila fail baharu tiba melalui webhook. Aliran kerja analisis sentimen dicetuskan pada setiap tiket sokongan baharu.

Setiap pelaksanaan berjadual atau dicetuskan peristiwa menjanakan sesi terpencil dengan taint yang segar. Aliran kerja berjalan dalam konteks keselamatannya sendiri, bebas daripada mana-mana sesi interaktif. Jika aliran kerja yang dicetuskan cron mengakses data CONFIDENTIAL, hanya sejarah pelaksanaan itu diklasifikasikan pada CONFIDENTIAL. Aliran kerja berjadual lain yang berjalan pada pengelasan PUBLIC tidak terjejas.

### Pengendalian Ralat dan Manusia-dalam-Gelung

Aliran kerja AI pengeluaran perlu mengendalikan kegagalan dengan baik. DSL aliran kerja menyokong `raise` untuk syarat ralat yang jelas dan semantik try/catch melalui pengendalian ralat dalam takrifan tugas. Apabila sub-ejen LLM menghasilkan output keyakinan rendah atau menemui situasi yang tidak dapat dikendalikannya, aliran kerja boleh menghalakan ke giliran kelulusan manusia, menghantar pemberitahuan melalui perkhidmatan pemberitahuan, atau mengambil tindakan sandaran.

Perkhidmatan pemberitahuan menghantar amaran merentasi semua saluran yang disambungkan dengan keutamaan dan penyahduplikasian. Jika aliran kerja memerlukan kelulusan manusia sebelum pindaan kontrak yang dijana AI dihantar, permintaan kelulusan boleh tiba di Slack, WhatsApp, e-mel, atau di mana sahaja pemberi kelulusan berada. Aliran kerja dijeda sehingga kelulusan tiba, kemudian diteruskan dari tempat ia berhenti.

## Rupa dalam Praktik

Jabatan undang-undang ingin mengautomasikan semakan kontrak. Pendekatan tradisional: enam bulan pembangunan tersuai untuk membina saluran paip yang mengekstrak fasal-fasal dari kontrak yang dimuat naik, mengklasifikasikan tahap risiko, membenderakan terma yang tidak standard, dan menjana ringkasan untuk peguam yang menyemak. Projek memerlukan pasukan kejuruteraan yang berdedikasi, semakan keselamatan tersuai, tandatangan pematuhan, dan penyelenggaraan berterusan.

Dengan Triggerfish, definisi aliran kerja mengambil masa sehari untuk ditulis. Muat naik mencetuskan webhook. Sub-ejen LLM membaca kontrak, mengekstrak fasal utama, mengklasifikasikan tahap risiko, dan mengenal pasti terma yang tidak standard. Langkah pengesahan menyemak pengekstrakan terhadap perpustakaan fasal syarikat yang disimpan dalam memori. Ringkasan dihalakan ke saluran pemberitahuan peguam yang ditetapkan. Keseluruhan saluran paip berjalan pada pengelasan RESTRICTED kerana kontrak mengandungi maklumat istimewa klien, dan pencegahan write-down memastikan tiada data kontrak bocor ke saluran di bawah RESTRICTED.

Apabila firma menukar pembekal LLM (kerana model baharu lebih baik mengendalikan bahasa undang-undang, atau kerana pembekal semasa menaikkan harga), perubahan itu adalah satu baris dalam konfigurasi. Definisi aliran kerja, kawalan keselamatan, jejak audit, dan penghalaan pemberitahuan semuanya terus berfungsi tanpa pengubahsuaian. Apabila firma menambah jenis fasal baharu pada rangka kerja risiko mereka, sub-ejen LLM mengambilnya tanpa menulis semula peraturan pengekstrakan kerana ia membaca untuk makna, bukan corak.

Pasukan pematuhan mendapat jejak audit yang lengkap dari hari pertama. Setiap kontrak yang diproses, setiap fasal yang diekstrak, setiap pengelasan risiko yang ditetapkan, setiap pemberitahuan yang dihantar, dan setiap kelulusan peguam yang direkodkan, dengan keturunan penuh kembali ke dokumen sumber. Pengumpulan bukti yang akan mengambil masa berminggu-minggu kerja pelaporan tersuai wujud secara automatik sebagai sifat struktural platform.
