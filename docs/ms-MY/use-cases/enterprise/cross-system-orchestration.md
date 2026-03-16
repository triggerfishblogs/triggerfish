---
title: Cross-System Orchestration
description: Cara Triggerfish mengendalikan aliran kerja yang merentasi 12+ sistem dengan pertimbangan kontekstual pada setiap langkah, tanpa kerapuhan yang membunuh automasi tradisional.
---

# Cross-System Orchestration dengan Pertimbangan Keputusan

Aliran kerja procure-to-pay yang tipikal melibatkan sedozen sistem. Permintaan pembelian bermula di satu platform, dihalakan ke rantai kelulusan di platform lain, mencetuskan carian vendor di yang ketiga, mencipta pesanan pembelian di yang keempat, memulakan proses penerimaan di yang kelima, memadankan invois di yang keenam, menjadualkan pembayaran di yang ketujuh, dan merekodkan semuanya di yang kelapan. Setiap sistem mempunyai API tersendiri, jadual kemas kini tersendiri, model pengesahan tersendiri, dan mod kegagalan tersendiri.

Automasi tradisional menangani ini dengan saluran paip yang tegar. Langkah satu memanggil API A, menghurai respons, menyerahkan medan ke langkah dua, yang memanggil API B. Ia berfungsi sehingga tidak lagi. Rekod vendor mempunyai format yang sedikit berbeza daripada yang dijangka. Kelulusan kembali dengan kod status yang tidak direka bentuk untuk saluran paip itu. Medan baharu yang diperlukan muncul dalam kemas kini API. Satu langkah yang rosak memecahkan keseluruhan rantai, dan tiada siapa yang tahu sehingga proses hiliran gagal beberapa hari kemudian.

Masalah yang lebih mendalam bukan kerapuhan teknikal. Ia adalah bahawa proses perniagaan sebenar memerlukan pertimbangan. Adakah percanggahan invois ini perlu dipertingkatkan atau diselesaikan secara automatik? Adakah corak penghantaran lewat vendor ini menjamin semakan kontrak? Adakah permintaan kelulusan ini cukup mendesak untuk melangkau penghalaan standard? Keputusan-keputusan ini kini hidup dalam kepala orang, yang bermakna automasi hanya boleh mengendalikan laluan yang bahagia.

## Cara Triggerfish Menyelesaikan Ini

Enjin aliran kerja Triggerfish melaksanakan definisi aliran kerja berasaskan YAML yang menggabungkan automasi deterministik dengan penaakulan AI dalam satu saluran paip. Setiap langkah dalam aliran kerja melepasi lapisan penguatkuasaan keselamatan yang sama yang mengawal semua operasi Triggerfish, jadi penjejakan pengelasan dan jejak audit bertahan sepanjang keseluruhan rantai tanpa mengira berapa banyak sistem yang terlibat.

### Langkah Deterministik untuk Kerja Deterministik

Apabila langkah aliran kerja mempunyai input yang diketahui dan output yang diketahui, ia berjalan sebagai panggilan HTTP standard, arahan shell, atau pemanggilan alat MCP. Tiada penglibatan LLM, tiada penalti latensi, tiada kos inferens. Enjin aliran kerja menyokong `call: http` untuk REST API, `call: triggerfish:mcp` untuk mana-mana pelayan MCP yang disambungkan, dan `run: shell` untuk alat baris arahan. Langkah-langkah ini dilaksanakan sama seperti automasi tradisional, kerana untuk kerja yang boleh diramalkan, automasi tradisional adalah pendekatan yang betul.

### Sub-Ejen LLM untuk Pertimbangan Keputusan

Apabila langkah aliran kerja memerlukan penaakulan kontekstual, enjin menjanakan sesi sub-ejen LLM sebenar menggunakan `call: triggerfish:llm`. Ini bukan satu prompt/respons tunggal. Sub-ejen mempunyai akses kepada setiap alat yang berdaftar dalam Triggerfish, termasuk carian web, memori, automasi pelayar, dan semua integrasi yang disambungkan. Ia boleh membaca dokumen, menanya pangkalan data, membandingkan rekod, dan membuat keputusan berdasarkan semua yang dijumpainya.

Output sub-ejen terus masuk ke langkah aliran kerja seterusnya. Jika ia mengakses data yang diklasifikasikan semasa penaakulannya, taint sesi meningkat secara automatik dan merambat kembali ke aliran kerja induk. Enjin aliran kerja menjejaki ini, jadi aliran kerja yang bermula pada PUBLIC tetapi menyentuh data CONFIDENTIAL semasa pertimbangan keputusan mendapat keseluruhan sejarah pelaksanaannya disimpan pada tahap CONFIDENTIAL. Sesi yang diklasifikasikan lebih rendah tidak boleh melihat bahawa aliran kerja itu berjalan.

### Percabangan Bersyarat Berdasarkan Konteks Sebenar

DSL aliran kerja menyokong blok `switch` untuk penghalaan bersyarat, gelung `for` untuk pemprosesan kelompok, dan operasi `set` untuk mengemas kini keadaan aliran kerja. Digabungkan dengan langkah sub-ejen LLM yang boleh menilai syarat-syarat kompleks, ini bermakna aliran kerja boleh bercabang berdasarkan konteks perniagaan sebenar dan bukannya sekadar nilai medan.

Aliran kerja perolehan boleh menghalakan secara berbeza berdasarkan penilaian sub-ejen terhadap risiko vendor. Aliran kerja onboarding boleh melangkau langkah-langkah yang tidak relevan untuk peranan tertentu. Aliran kerja tindak balas insiden boleh meningkat kepada pasukan yang berbeza berdasarkan analisis punca akar sub-ejen. Logik percabangan tinggal dalam definisi aliran kerja, tetapi input keputusan datang dari penaakulan AI.

### Penyembuhan Sendiri Apabila Sistem Berubah

Apabila langkah deterministik gagal kerana API mengubah format responsnya atau sistem mengembalikan ralat yang tidak dijangka, aliran kerja tidak hanya berhenti. Enjin boleh mewakilkan langkah yang gagal kepada sub-ejen LLM yang membaca ralat, memeriksa respons, dan mencuba pendekatan alternatif. API yang menambah medan baharu yang diperlukan ditangani oleh sub-ejen yang membaca mesej ralat dan melaraskan permintaan. Sistem yang mengubah aliran pengesahannya dinilai oleh alat automasi pelayar.

Ini tidak bermakna setiap kegagalan diselesaikan secara ajaib. Tetapi ia bermakna aliran kerja merosot dengan baik dan bukannya gagal senyap. Sub-ejen sama ada mencari jalan ke hadapan atau menghasilkan penjelasan yang jelas tentang apa yang berubah dan mengapa campur tangan manusia diperlukan, dan bukannya kod ralat yang samar yang terkubur dalam fail log yang tiada siapa semak.

### Keselamatan Merentasi Keseluruhan Rantai

Setiap langkah dalam aliran kerja Triggerfish melepasi hook penguatkuasaan dasar yang sama seperti mana-mana panggilan alat langsung. PRE_TOOL_CALL mengesahkan kebenaran dan menyemak had kadar sebelum pelaksanaan. POST_TOOL_RESPONSE mengklasifikasikan data yang dikembalikan dan mengemas kini taint sesi. PRE_OUTPUT memastikan tiada yang meninggalkan sistem pada tahap pengelasan yang lebih tinggi daripada yang dibenarkan oleh sasaran.

Ini bermakna aliran kerja yang membaca dari CRM anda (CONFIDENTIAL), memproses data melalui LLM, dan menghantar ringkasan ke Slack tidak secara tidak sengaja membocorkan butiran sulit ke dalam saluran awam. Peraturan pencegahan write-down menangkapnya di PRE_OUTPUT hook, tanpa mengira berapa banyak langkah pertengahan yang dilalui data itu. Pengelasan melakukan perjalanan bersama data sepanjang keseluruhan aliran kerja.

Definisi aliran kerja itu sendiri boleh menetapkan `classification_ceiling` yang menghalang aliran kerja daripada menyentuh data di atas tahap yang ditentukan. Aliran kerja ringkasan mingguan yang diklasifikasikan pada INTERNAL tidak boleh mengakses data CONFIDENTIAL walaupun ia mempunyai kelayakan untuk berbuat demikian. Siling dikuatkuasakan dalam kod, bukan dengan mengharap LLM menghormati arahan prompt.

### Pencetus Cron dan Webhook

Aliran kerja tidak memerlukan seseorang untuk memulakan secara manual. Penjadual menyokong pencetus berasaskan cron untuk aliran kerja berulang dan pencetus webhook untuk pelaksanaan dipacu peristiwa. Aliran kerja taklimat pagi berjalan pada 7 pagi. Aliran kerja semakan PR dicetuskan apabila GitHub menghantar webhook. Aliran kerja pemprosesan invois dicetuskan apabila fail baharu muncul dalam pemacu kongsi.

Acara webhook membawa tahap pengelasan mereka sendiri. Webhook GitHub untuk repositori peribadi diklasifikasikan secara automatik pada CONFIDENTIAL berdasarkan pemetaan pengelasan domain dalam konfigurasi keselamatan. Aliran kerja mewarisi pengelasan itu dan semua penguatkuasaan hiliran terpakai.

## Rupa dalam Praktik

Sebuah syarikat mid-market yang menjalankan procure-to-pay merentasi NetSuite, Coupa, DocuSign, dan Slack mentakrifkan aliran kerja Triggerfish yang mengendalikan keseluruhan kitaran. Langkah deterministik mengendalikan panggilan API untuk mencipta pesanan pembelian, menghalakan kelulusan, dan memadankan invois. Langkah sub-ejen LLM mengendalikan pengecualian: invois dengan barisan item yang tidak sepadan dengan PO, vendor yang menyerahkan dokumentasi dalam format yang tidak dijangka, permintaan kelulusan yang memerlukan konteks tentang sejarah pemohon.

Aliran kerja berjalan pada instance Triggerfish yang dihoskan sendiri. Tiada data yang meninggalkan infrastruktur syarikat. Sistem pengelasan memastikan data kewangan dari NetSuite kekal pada CONFIDENTIAL dan tidak boleh dihantar ke saluran Slack yang diklasifikasikan pada INTERNAL. Jejak audit menangkap setiap keputusan yang dibuat oleh sub-ejen LLM, setiap alat yang dipanggilnya, dan setiap data yang diaksesnya, disimpan dengan penjejakan keturunan penuh untuk semakan pematuhan.

Apabila Coupa mengemas kini API mereka dan mengubah nama medan, langkah HTTP deterministik aliran kerja gagal. Enjin mendelegasikan kepada sub-ejen yang membaca ralat, mengenal pasti medan yang diubah, dan mencuba semula dengan parameter yang betul. Aliran kerja selesai tanpa campur tangan manusia, dan insiden itu dilog supaya jurutera boleh mengemas kini definisi aliran kerja untuk mengendalikan format baharu ke hadapan.
