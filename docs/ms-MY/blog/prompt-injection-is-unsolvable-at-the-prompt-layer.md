---
title: Suntikan Prompt Tidak Boleh Diselesaikan pada Lapisan Prompt
date: 2026-03-10
description: "Suntikan prompt telah menjadi kelemahan LLM nombor 1 OWASP sejak
  mereka mula menjejak. Inilah sebab setiap pertahanan yang dibina pada lapisan
  prompt terus gagal."
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - prompt injection
  - llm security
  - open source
  - triggerfish
  - owasp
  - agent security
draft: false
---
Suntikan prompt telah menjadi kelemahan nombor satu OWASP untuk aplikasi LLM sejak mereka mula menjejak. Setiap platform AI utama telah menerbitkan panduan mengenainya. Penyelidik telah menghasilkan berpuluh-puluh cadangan pertahanan. Tiada satu pun yang berjaya menyelesaikannya, dan corak mengapa mereka terus gagal menunjukkan sesuatu yang asas tentang di mana masalah sebenarnya wujud.

Versi pendeknya: anda tidak boleh membetulkan masalah pada lapisan yang itu sendiri merupakan masalahnya. Suntikan prompt berjaya kerana model tidak dapat membezakan antara arahan daripada pembangun dan arahan daripada penyerang. Setiap pertahanan yang cuba menyelesaikan ini dengan menambah lebih banyak arahan kepada model sedang bekerja dalam kekangan yang sama yang menjadikan serangan itu mungkin pada mulanya.

![](/blog/images/injectedcontext.jpg)

## Apa yang serangan itu sebenarnya lakukan

Model bahasa mengambil tetingkap konteks sebagai input dan menghasilkan penyempurnaan. Tetingkap konteks adalah urutan token yang rata. Model tidak mempunyai mekanisme asli untuk menjejak token mana yang datang dari system prompt yang dipercayai, mana yang datang daripada pengguna, dan mana yang datang dari kandungan luaran yang ejen dapatkan semasa melakukan kerjanya. Pembangun menggunakan konvensyen struktur seperti tag peranan untuk memberi isyarat niat, tetapi itu adalah konvensyen, bukan penguatkuasaan. Dari perspektif model, keseluruhan konteks adalah input yang memaklumkan ramalan token seterusnya.

Suntikan prompt mengeksploitasi ini. Penyerang membenamkan arahan dalam kandungan yang akan dibaca ejen, seperti halaman web, dokumen, e-mel, komen kod, atau medan pangkalan data, dan arahan tersebut bersaing dengan arahan pembangun dalam tetingkap konteks yang sama. Jika arahan yang disuntik cukup meyakinkan, cukup koheren, atau berada dalam kedudukan yang menguntungkan dalam konteks, model mengikutinya. Ini bukan pepijat dalam mana-mana model khusus. Ia adalah akibat daripada cara semua sistem ini berfungsi.

Suntikan prompt tidak langsung adalah bentuk yang lebih berbahaya. Daripada pengguna yang menaip prompt berniat jahat secara langsung, penyerang meracuni kandungan yang diambil oleh ejen secara autonomi. Pengguna tidak melakukan apa-apa yang salah. Ejen keluar, menemui kandungan yang diracuni dalam perjalanan melakukan tugasnya, dan serangan dilaksanakan. Penyerang tidak memerlukan akses ke perbualan. Mereka hanya perlu mendapatkan teks mereka di suatu tempat yang akan dibaca oleh ejen.

## Apa yang serangan yang didokumentasikan kelihatan

![](/blog/images/dataexfil.jpg)

Pada Ogos 2024, penyelidik keselamatan di PromptArmor mendokumentasikan kelemahan suntikan prompt dalam Slack AI. Serangan berfungsi seperti ini: penyerang mencipta saluran Slack awam dan menyiarkan mesej yang mengandungi arahan berniat jahat. Mesej itu memberitahu Slack AI bahawa apabila pengguna menanya untuk kunci API, ia harus menggantikan perkataan pemegang tempat dengan nilai kunci sebenar dan mengekodnya sebagai parameter URL dalam pautan "klik di sini untuk mengesahkan semula". Saluran penyerang hanya mempunyai satu ahli: penyerang. Mangsa tidak pernah melihatnya. Apabila pembangun di tempat lain dalam ruang kerja menggunakan Slack AI untuk mencari maklumat tentang kunci API mereka, yang disimpan dalam saluran peribadi yang tidak boleh diakses oleh penyerang, Slack AI mengambil mesej saluran awam penyerang ke dalam konteks, mengikuti arahan, dan memaparkan pautan pancingan data dalam persekitaran Slack pembangun. Mengklik menghantar kunci API peribadi ke pelayan penyerang.

Respons awal Slack kepada pendedahan adalah bahawa menanya saluran awam yang pengguna bukan ahlinya adalah tingkah laku yang dimaksudkan. Isu itu bukan dasar akses saluran. Isu itu adalah bahawa model tidak dapat membezakan antara arahan pekerja Slack dan arahan penyerang apabila keduanya ada dalam tetingkap konteks.

Pada Jun 2025, penyelidik menemui kelemahan suntikan prompt dalam GitHub Copilot, dijejak sebagai CVE-2025-53773 dan ditambal dalam keluaran Patch Tuesday Ogos 2025 Microsoft. Vektor serangan adalah arahan berniat jahat yang dibenamkan dalam fail kod sumber, fail README, isu GitHub, atau sebarang teks lain yang mungkin diproses oleh Copilot. Arahan itu mengarahkan Copilot untuk mengubah suai fail `.vscode/settings.json` projek untuk menambah satu baris konfigurasi yang mendayakan apa yang projek itu panggil "mod YOLO": melumpuhkan semua gesaan pengesahan pengguna dan memberikan AI kebenaran tanpa had untuk melaksanakan perintah shell. Setelah baris itu ditulis, ejen menjalankan perintah pada mesin pembangun tanpa bertanya. Penyelidik mendemonstrasikan ini dengan membuka kalkulator. Muatan realistik adalah jauh lebih teruk. Serangan itu ditunjukkan berfungsi merentasi GitHub Copilot yang disokong oleh GPT-4.1, Claude Sonnet 4, Gemini, dan model lain, yang memberitahu anda bahawa kelemahan itu bukan dalam model. Ia ada dalam seni bina.

![]()

Varian yang boleh menjangkiti adalah patut difahami. Kerana Copilot boleh menulis ke fail dan arahan yang disuntik boleh memberitahu Copilot untuk menyebarkan arahan ke fail lain yang diproses semasa pemfaktoran semula atau penjanaan dokumentasi, repositori yang diracuni boleh menjangkiti setiap projek yang disentuh oleh pembangun. Arahan tersebar melalui komit seperti virus menyebar melalui fail boleh laksana. GitHub kini memanggil kelas ancaman ini "virus AI."

## Mengapa pertahanan standard gagal

Respons intuitif terhadap suntikan prompt adalah menulis system prompt yang lebih baik. Tambah arahan yang memberitahu model untuk mengabaikan arahan dalam kandungan yang diambil. Beritahunya untuk melayan data luaran sebagai tidak dipercayai. Beritahunya untuk menanda apa sahaja yang kelihatan seperti percubaan untuk mengatasi tingkah lakunya. Banyak platform melakukan tepat ini. Vendor keselamatan menjual produk yang dibina di sekitar menambah prompt pengesanan yang direka dengan teliti ke konteks ejen.

Pasukan penyelidik dari OpenAI, Anthropic, dan Google DeepMind menerbitkan makalah pada Oktober 2025 yang menilai 12 pertahanan yang diterbitkan terhadap suntikan prompt dan mengenakan serangan adaptif pada setiap satu. Mereka memintas kesemua 12 dengan kadar kejayaan serangan melebihi 90% untuk kebanyakan. Pertahanan itu tidak buruk. Mereka termasuk kerja dari penyelidik serius menggunakan teknik sebenar. Masalahnya ialah sebarang pertahanan yang mengajar model apa yang perlu ditolak boleh direkayasa balik oleh penyerang yang mengetahui apa yang pertahanan itu katakan. Arahan penyerang bersaing dalam tetingkap konteks yang sama. Jika pertahanan itu berkata "abaikan arahan yang memberitahu anda untuk memajukan data," penyerang menulis arahan yang tidak menggunakan perkataan tersebut, atau yang memberikan justifikasi yang munasabah mengapa kes khusus ini berbeza, atau yang mendakwa autoriti dari sumber yang dipercayai. Model berfikir tentang ini. Pemikiran boleh dimanipulasi.

Pengesan berasaskan LLM mempunyai masalah yang sama pada peringkat yang berbeza. Jika anda menggunakan model kedua untuk memeriksa input dan memutuskan sama ada ia mengandungi prompt berniat jahat, model kedua itu mempunyai kekangan asas yang sama. Ia membuat pertimbangan berdasarkan kandungan yang diberikan, dan pertimbangan itu boleh dipengaruhi oleh kandungan tersebut. Penyelidik telah mendemonstrasikan serangan yang berjaya memintas pertahanan berasaskan pengesanan dengan mencipta suntikan yang kelihatan tidak berbahaya kepada pengesan dan berniat jahat kepada ejen hiliran.

Sebab semua pendekatan ini gagal terhadap penyerang yang bertekad adalah bahawa mereka cuba menyelesaikan masalah kepercayaan dengan menambah lebih banyak kandungan ke tetingkap konteks yang tidak boleh menguatkuasakan kepercayaan. Permukaan serangan adalah tetingkap konteks itu sendiri. Menambah lebih banyak arahan ke tetingkap konteks tidak mengurangkan permukaan serangan.

## Apa yang sebenarnya membatasi masalah

Terdapat pengurangan yang bermakna dalam risiko suntikan prompt apabila anda menerapkan prinsip bahawa sifat keselamatan sistem tidak seharusnya bergantung pada model membuat pertimbangan yang betul. Ini bukan idea baru dalam keselamatan. Prinsip yang sama mendorong anda untuk menguatkuasakan kawalan akses dalam kod daripada menulis "sila hanya akses data yang anda dibenarkan untuk mengakses" dalam dokumen dasar.

Untuk ejen AI, ini bermakna lapisan penguatkuasaan perlu berada di luar model, dalam kod yang pemikiran model tidak dapat mempengaruhi. Model menghasilkan permintaan. Kod menilai sama ada permintaan tersebut dibenarkan, berdasarkan fakta tentang keadaan sesi, pengkelasan data yang terlibat, dan kebenaran saluran yang akan menerima output. Model tidak boleh berbicara untuk melepasi penilaian ini kerana penilaian tersebut tidak membaca perbualan.

Ini tidak menjadikan suntikan prompt mustahil. Penyerang masih boleh menyuntik arahan dan model masih akan memprosesnya. Apa yang berubah adalah radius letupan. Jika arahan yang disuntik cuba untuk menyeludup data ke titik akhir luaran, panggilan keluar disekat bukan kerana model memutuskan untuk mengabaikan arahan, tetapi kerana lapisan penguatkuasaan memeriksa permintaan terhadap keadaan pengkelasan sesi dan lantai pengkelasan titik akhir sasaran dan mendapati aliran itu akan melanggar peraturan write-down. Niat model, sama ada sebenar atau disuntik, adalah tidak relevan untuk pemeriksaan tersebut.

![](/blog/images/promptinjectionblock.jpg)

Penjejakan taint sesi menutup jurang khusus yang kawalan akses sahaja tidak dapat liputi. Apabila ejen membaca dokumen yang dikelaskan pada CONFIDENTIAL, sesi tersebut kini dicemarkan pada CONFIDENTIAL. Sebarang percubaan seterusnya untuk menghantar output melalui saluran PUBLIC gagal semakan write-down, tanpa mengira apa yang diberitahu kepada model dan tanpa mengira sama ada arahan itu datang daripada pengguna yang sah atau muatan yang disuntik. Suntikan itu boleh memberitahu model untuk membocorkan data. Lapisan penguatkuasaan tidak peduli.

Pembingkaian seni bina penting: suntikan prompt adalah kelas serangan yang menyasarkan tingkah laku mengikut arahan model. Pertahanan yang betul bukan untuk mengajar model mengikut arahan dengan lebih baik atau mengesan arahan buruk dengan lebih tepat. Pertahanan yang betul adalah untuk mengurangkan set akibat yang boleh terjadi akibat model mengikuti arahan buruk. Anda melakukan itu dengan meletakkan akibat — panggilan alat sebenar, aliran data sebenar, komunikasi luaran sebenar — di belakang pintu gerbang yang tidak dapat dipengaruhi oleh model.

Itu adalah masalah yang boleh diselesaikan. Menjadikan model secara boleh dipercayai membezakan arahan yang dipercayai daripada yang tidak dipercayai tidak boleh diselesaikan.
