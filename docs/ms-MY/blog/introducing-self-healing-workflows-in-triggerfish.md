---
title: Memperkenalkan Aliran Kerja Pemulihan Sendiri dalam Triggerfish
date: 2026-03-13
description: Aliran kerja pemulihan sendiri Triggerfish mengunakan ejen pemerhati
  langsung dengan setiap jalankan aliran kerja, menangkap kegagalan dalam konteks
  dan mencadangkan pembetulan tanpa menghentikan pelaksanaan.
author: Greg Havens
tags:
  - workflow-automation
  - ai-agents
  - enterprise-it
  - self-healing
  - rpa
  - automation-maintenance
  - triggerfish
draft: false
---
Setiap program automasi enterprise mencapai dinding yang sama. Penghalaan tiket ServiceNow, pemulihan hanyut Terraform, putaran sijil, pembekalan kumpulan AD, penyebaran tampalan SCCM, orkestrasi saluran paip CI/CD. Sepuluh atau dua puluh aliran kerja pertama membenarkan pelaburan dengan mudah, dan matematik ROI bertahan betul sehingga bilangan aliran kerja melepasi ratusan dan bahagian yang bermakna dalam minggu pasukan IT beralih dari membina automasi baru kepada mengelakkan automasi yang sedia ada dari jatuh.

Portal pembayar mereka bentuk semula aliran auth dan aliran kerja penghantaran tuntutan berhenti mengesahkan. Salesforce menolak kemas kini metadata dan pemetaan medan dalam saluran paip peluang-ke-peluang mula menulis nilai null. AWS tidak lagi menyokong versi API dan pelan Terraform yang berjalan bersih selama setahun mula membuang 400 pada setiap pemakaian. Seseorang memfailkan tiket, orang lain mengetahui apa yang berubah, menampalnya, mengujinya, menggunakan pembetulan, dan sementara itu proses yang diotomatisasi sama ada berjalan secara manual atau tidak berjalan langsung.

Ini adalah perangkap penyelenggaraan, dan ia adalah struktural dan bukannya kegagalan pelaksanaan. Automasi tradisional mengikuti laluan yang tepat, memadankan corak yang tepat, dan rosak pada saat realiti menyimpang dari apa yang wujud ketika aliran kerja itu ditulis. Penyelidikan adalah konsisten: organisasi menghabiskan 70 hingga 75 peratus daripada jumlah kos program automasi mereka bukan membina aliran kerja baru tetapi menyelenggarakan yang sudah ada. Dalam penyebaran besar, 45 peratus aliran kerja rosak setiap minggu.

Enjin aliran kerja Triggerfish dibina untuk mengubah ini. Aliran kerja pemulihan sendiri dihantar hari ini, dan ia mewakili keupayaan paling ketara dalam platform setakat ini.

![](/blog/images/watcher-model-diagram.jpg)

## Apa yang Pemulihan Sendiri Sebenarnya Bermaksud

Frasa itu digunakan secara longgar, jadi izinkan saya berterus terang tentang apa ini.

Apabila anda mendayakan pemulihan sendiri pada aliran kerja Triggerfish, ejen utama dijanakan pada saat aliran kerja itu mula berjalan. Ia tidak melancarkan apabila sesuatu rosak; ia memerhati dari langkah pertama, menerima strim peristiwa langsung dari enjin semasa aliran kerja berkembang dan memerhati setiap langkah dalam masa nyata.

Ejen utama mengetahui definisi aliran kerja penuh sebelum satu langkah pun berjalan, termasuk niat di belakang setiap langkah, apa yang diharapkan oleh setiap langkah dari yang sebelumnya, dan apa yang ia hasilkan untuk yang sesudahnya. Ia juga mengetahui sejarah jalankan sebelumnya: apa yang berjaya, apa yang gagal, tampalan apa yang dicadangkan dan sama ada manusia meluluskan atau menolaknya. Apabila ia mengenal pasti sesuatu yang patut ditindaki, semua konteks itu sudah ada dalam memori kerana ia memerhati sepanjang masa dan bukannya membina semula selepas kejadian.

Apabila sesuatu yang salah berlaku, ejen utama membuat triaj. Panggilan rangkaian yang tidak stabil mendapat cuba semula dengan backoff. Titik akhir API yang berubah yang boleh dikerjakan mendapat kerja untuk jalankan ini. Masalah struktur dalam definisi aliran kerja mendapat tampalan yang dicadangkan digunakan untuk melengkapkan jalankan, dengan perubahan dihantar untuk kelulusan anda sebelum ia menjadi kekal. Integrasi plugin yang rosak mendapat plugin baru atau yang dikemas kini ditulis dan dihantar untuk semakan. Jika ejen utama kehabisan percubaan dan tidak dapat menyelesaikan isu, ia meningkat kepada anda dengan diagnosis berstruktur tentang apa yang telah dicuba dan apa yang difikirkannya sebagai punca asas.

Aliran kerja terus berjalan apabila ia selamat. Jika langkah disekat, hanya langkah hiliran yang bergantung padanya yang berhenti sementara cabang selari terus. Ejen utama mengetahui graf kebergantungan dan hanya menghentikan jeda yang benar-benar disekat.

## Mengapa Konteks yang Anda Bina ke dalam Aliran Kerja Penting

Perkara yang menjadikan pemulihan sendiri berfungsi dalam amalan ialah aliran kerja Triggerfish memerlukan metadata kaya peringkat langkah dari saat anda menulisnya. Ini bukan pilihan dan bukan dokumentasi untuk kepentingannya sendiri; ini adalah apa yang ejen utama fikir dari.

Setiap langkah dalam aliran kerja mempunyai empat medan yang diperlukan di luar definisi tugas itu sendiri: penerangan tentang apa yang dilakukan langkah itu secara mekanik, pernyataan niat yang menjelaskan mengapa langkah ini wujud dan tujuan perniagaan apa yang dilayaninya, medan `expects` yang menerangkan data apa yang diasumsikan diterimanya dan keadaan apa yang mesti ada pada langkah sebelumnya, dan medan `produces` yang menerangkan apa yang ditulisnya ke konteks untuk langkah hiliran digunakan.

Inilah rupanya dalam amalan. Katakan anda mengautomatikkan pembekalan akses pekerja. Pekerja baharu mula Isnin dan aliran kerja perlu mencipta akaun dalam Active Directory, membekali keahlian GitHub org mereka, menetapkan kumpulan Okta mereka, dan membuka tiket Jira mengesahkan selesainya. Satu langkah mengambil rekod pekerja dari sistem HR anda. Medan `intent`-nya tidak hanya berkata "dapatkan rekod pekerja." Ia berbunyi: "Langkah ini adalah sumber kebenaran untuk setiap keputusan pembekalan hiliran. Peranan, jabatan, dan tarikh mula dari rekod ini menentukan kumpulan AD mana yang diberikan, pasukan GitHub mana yang dibekalkan, dan dasar Okta mana yang terpakai. Jika langkah ini mengembalikan data yang lapuk atau tidak lengkap, setiap langkah hiliran akan membekali akses yang salah."

![](/blog/images/employee-recrod.jpg)

Ejen utama membaca pernyataan niat tersebut apabila langkah gagal dan memahami apa yang dipertaruhkan. Ia mengetahui bahawa rekod separa bermakna langkah pembekalan akses akan berjalan dengan input yang salah, berpotensi memberikan kebenaran yang salah kepada orang sebenar yang bermula dalam dua hari. Konteks itu membentuk cara ia cuba pulih, sama ada ia menghentikan jeda langkah hiliran, dan apa yang diberitahukannya kepada anda jika meningkat.

Langkah lain dalam aliran kerja yang sama memeriksa medan `produces` langkah pengambilan HR dan mengetahui bahawa ia mengharapkan `.employee.role` dan `.employee.department` sebagai rentetan tidak kosong. Jika sistem HR anda mengemas kini APInya dan mula mengembalikan medan tersebut bersarang di bawah `.employee.profile.role` sebaliknya, ejen utama mengesan hanyut skema, menggunakan pemetaan masa nyata untuk jalankan ini agar pekerja baharu dibekalkan dengan betul, dan mencadangkan pembetulan struktur untuk mengemas kini definisi langkah. Anda tidak menulis peraturan migrasi skema atau pengendalian pengecualian untuk kes khusus ini. Ejen utama berfikir padanya dari konteks yang sudah ada.

Inilah sebab kualiti pengarangan aliran kerja penting. Metadata bukan upacara; ia adalah bahan api yang dijalankan oleh sistem pemulihan sendiri. Aliran kerja dengan penerangan langkah yang cetek adalah aliran kerja yang tidak dapat difikirkan oleh ejen utama apabila diperlukan.

## Memerhati Langsung Bermakna Menangkap Masalah Sebelum Ia Menjadi Kegagalan

Kerana ejen utama memerhati dalam masa nyata, ia boleh bertindak atas isyarat lembut sebelum perkara benar-benar rosak. Langkah yang secara sejarah siap dalam dua saat kini mengambil masa empat puluh saat. Langkah yang mengembalikan data dalam setiap jalankan sebelumnya mengembalikan hasil kosong. Cabang bersyarat diambil yang tidak pernah diambil dalam keseluruhan sejarah jalankan. Tiada satu pun ini adalah ralat keras dan aliran kerja terus berjalan, tetapi ia adalah isyarat bahawa sesuatu telah berubah dalam persekitaran. Lebih baik menangkapnya sebelum langkah seterusnya cuba menggunakan data yang tidak baik.

Kepekaan semakan ini boleh dikonfigurasi per aliran kerja. Penjanaan laporan malam mungkin mempunyai ambang longgar sementara saluran paip pembekalan akses memerhati dengan teliti. Anda tetapkan tahap penyelewengan yang mana yang menjamin perhatian ejen utama.

![](/blog/images/self-healing-workflow.jpg)

## Ia Masih Aliran Kerja Anda

Ejen utama dan pasukannya tidak boleh mengubah definisi aliran kerja kanonik anda tanpa kelulusan anda. Apabila ejen utama mencadangkan pembetulan struktur, ia menggunakan pembetulan untuk melengkapkan jalankan semasa dan mengemukakan perubahan sebagai cadangan. Anda melihatnya dalam baris gilir anda, anda melihat alasannya, anda meluluskan atau menolaknya. Jika anda menolaknya, penolakan itu direkodkan dan setiap ejen utama yang akan datang yang bekerja pada aliran kerja tersebut mengetahui untuk tidak mencadangkan perkara yang sama sekali lagi.

Terdapat satu perkara yang tidak boleh diubah oleh ejen utama tanpa mengira konfigurasi: mandatnya sendiri. Dasar pemulihan sendiri dalam definisi aliran kerja — sama ada hendak berhenti sebentar, berapa lama untuk mencuba semula, sama ada memerlukan kelulusan — adalah dasar yang ditulis oleh pemilik. Ejen utama boleh menampal definisi tugas, mengemas kini panggilan API, menyesuaikan parameter, dan mengarang plugin baru. Ia tidak boleh mengubah peraturan yang mengawal tingkah lakunya sendiri. Sempadan itu dikodkan keras. Ejen yang boleh melumpuhkan keperluan kelulusan yang mengawal cadangannya sendiri akan menjadikan keseluruhan model kepercayaan tidak bermakna.

Perubahan plugin mengikuti laluan kelulusan yang sama seperti mana-mana plugin yang ditulis oleh ejen dalam Triggerfish. Fakta bahawa plugin itu ditulis untuk membetulkan aliran kerja yang rosak tidak memberikannya sebarang kepercayaan khas. Ia melalui semakan yang sama seolah-olah anda telah meminta ejen untuk membina integrasi baru untuk anda dari awal.

## Mengurus Ini Merentasi Setiap Saluran yang Sudah Anda Gunakan

Anda tidak seharusnya perlu log masuk ke papan pemuka berasingan untuk mengetahui apa yang dilakukan oleh aliran kerja anda. Pemberitahuan pemulihan sendiri datang melalui mana sahaja yang anda telah konfigurasikan Triggerfish untuk menghubungi anda: ringkasan campur tangan di Slack, permintaan kelulusan di Telegram, laporan peningkatan melalui e-mel. Sistem datang kepada anda di saluran yang masuk akal untuk kecemasan tanpa anda menyegarkan konsol pemantauan.

Model status aliran kerja dibina untuk ini. Status bukan rentetan rata tetapi objek berstruktur yang membawa semua yang diperlukan oleh pemberitahuan untuk bermakna: keadaan semasa, isyarat kesihatan, sama ada tampalan ada dalam baris gilir kelulusan anda, hasil jalankan terakhir, dan apa yang sedang dilakukan oleh ejen utama. Mesej Slack anda boleh berkata "aliran kerja pembekalan akses dijeda, ejen utama sedang mengarang pembetulan plugin, kelulusan akan diperlukan" dalam satu pemberitahuan tanpa perlu mencari konteks.

![](/blog/images/workflow-status-reporting.jpg)

Status berstruktur yang sama menyuap antara muka Tidepool langsung apabila anda menginginkan gambaran penuh. Data yang sama, permukaan yang berbeza.

## Apa yang Ini Sebenarnya Mengubah untuk Pasukan IT

Orang dalam organisasi anda yang menghabiskan minggu mereka membetulkan aliran kerja yang rosak tidak melakukan kerja berkemahiran rendah. Mereka menyahpepijat sistem yang diedarkan, membaca log perubahan API, dan merekayasa balik mengapa aliran kerja yang berjalan baik semalam gagal hari ini. Itu adalah pertimbangan yang berharga, dan sekarang ia hampir sepenuhnya digunakan untuk mengekalkan automasi yang sedia ada berbanding membina automasi baru atau menyelesaikan masalah yang lebih sukar.

Aliran kerja pemulihan sendiri tidak menghapuskan pertimbangan itu, tetapi mengalihkan bila ia diterapkan. Daripada memadamkan api aliran kerja yang rosak pada tengah malam, anda menyemak tampalan yang dicadangkan pada waktu pagi dan memutuskan sama ada diagnosis ejen utama itu betul. Anda adalah pelulus perubahan yang dicadangkan, bukan pengarang tampalan di bawah tekanan.

Itulah model buruh yang dibina oleh Triggerfish: manusia menyemak dan meluluskan kerja ejen dan bukannya melaksanakan kerja yang boleh dikendalikan oleh ejen. Liputan automasi meningkat sementara beban penyelenggaraan menurun, dan pasukan yang menghabiskan 75 peratus masanya untuk penyelenggaraan boleh mengarahkan semula sebahagian besar masa itu ke arah perkara yang benar-benar memerlukan pertimbangan manusia.

## Dihantar Hari Ini

Aliran kerja pemulihan sendiri dihantar hari ini sebagai ciri pilihan dalam enjin aliran kerja Triggerfish. Ia adalah pilih-masuk per aliran kerja, dikonfigurasi dalam blok metadata aliran kerja. Jika anda tidak mendayakannya, tiada apa yang berubah tentang cara aliran kerja anda berjalan.

Ini penting bukan kerana ia adalah masalah teknikal yang sukar (walaupun ia memang), tetapi kerana ia menangani secara langsung perkara yang telah menjadikan automasi enterprise lebih mahal dan lebih menyakitkan daripada yang perlu. Pasukan penyelenggaraan aliran kerja seharusnya menjadi pekerjaan pertama yang diambil alih oleh automasi AI. Itulah penggunaan teknologi yang betul, dan itulah yang dibina oleh Triggerfish.

Jika anda ingin menyelami cara ia berfungsi, spesifikasi penuh ada dalam repositori. Jika anda ingin mencubanya, kemahiran workflow-builder akan membimbing anda menulis aliran kerja pemulihan sendiri pertama anda.
