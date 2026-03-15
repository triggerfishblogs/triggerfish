---
title: "Bumper: Kekal dalam Laluan Anda Tanpa Memikirkannya"
date: 2026-03-08
description: Bumper Triggerfish mengekalkan ejen anda bekerja pada tahap di mana
  anda berada. Tiada eskalasi tidak sengaja, tiada kejutan. Hidupkan jika anda
  memerlukan lebih. Aktif secara lalai.
author: Greg Havens
tags:
  - ai agents
  - security
  - classification
  - bumpers
  - triggerfish
draft: false
---
![](/blog/images/chatgpt-image-mar-9-2026-04_07_56-pm.jpg "Grafik tajuk tentang Bumper yang mengekalkan anda dalam laluan")

Salah satu perkara yang menjadikan ejen AI benar-benar berguna juga ialah apa yang kadang-kadang membimbangkan. Beri ejen akses ke alat anda dan ia akan menggunakannya. Semua, jika tugasnya seperti memerlukannya. Anda memintanya membantu menggubal mesej dan ia mencapai ke dalam kalendar anda untuk memeriksa ketersediaan, mengambil konteks dari fail, memeriksa thread Slack. Sebelum anda sedar, tugas mudah telah menyentuh tiga sumber data berbeza pada tiga tahap pengkelasan berbeza dan sesi anda kini dicemarkan ke tahap yang tidak anda niatkan untuk bekerja padanya.

Ini bukan pepijat. Ini ejen melakukan kerjanya. Tetapi ia mencipta masalah kebolehgunaan yang nyata: jika anda melakukan kerja santai dan anda tidak mahu secara tidak sengaja meningkat ke konteks di mana data sulit anda dimainkan, anda sama ada perlu mengawal ejen secara mikro secara berterusan atau hanya menerima bahawa sesi hanyut.

Bumper menyelesaikan itu.

![](/blog/images/screenshot_20260309_161249.png)

Ideanya terus dari boling. Apabila anda meletakkan bumper, bola kekal dalam lorong. Ia boleh pergi ke mana sahaja dalam lorong, melantun, melakukan perkaranya. Ia hanya tidak boleh jatuh ke dalam parit. Bumper dalam Triggerfish berfungsi dengan cara yang sama. Apabila bumper aktif, ejen boleh melakukan apa sahaja yang beroperasi pada atau di bawah tahap pengkelasan sesi semasa. Apa yang tidak boleh dilakukannya ialah mengambil tindakan yang akan meningkatkan taint sesi. Jika ia mencuba, tindakan disekat sebelum dilaksanakan dan ejen diberitahu untuk mencari cara lain atau memberitahu anda bahawa anda perlu mematikan bumper untuk meneruskan.

Bumper aktif secara lalai. Apabila sesi anda bermula, anda akan melihat "Bumper digunakan." Jika anda ingin memberikan ejen julat pergerakan penuh, anda jalankan /bumpers dan ia dimatikan. Jalankan sekali lagi dan ia dihidupkan kembali. Keutamaan anda berterusan merentasi sesi, jadi jika anda jenis orang yang selalu bekerja tanpa bumper, anda hanya perlu menetapkan itu sekali.

Perkara penting yang perlu difahami tentang apa yang bumper lakukan dan tidak lakukan. Ia bukan sekatan tujuan umum pada ejen. Bumper tidak mengehadkan alat yang boleh dipanggil oleh ejen, data yang boleh dibaca, atau cara ia mengendalikan apa-apa dalam tahap pengkelasan semasa. Jika sesi anda sudah dicemarkan kepada CONFIDENTIAL dan ejen mengakses sumber CONFIDENTIAL lain, bumper tidak ada apa yang perlu dikatakannya tentang itu. Taint tidak bergerak. Bumper hanya mengambil berat tentang eskalasi.

![](/blog/images/gemini_generated_image_4ovbs34ovbs34ovb.jpg)

Ini penting kerana bumper direka untuk tidak menggangu anda. Keseluruhan tujuannya ialah anda tidak perlu memikirkan tahap pengkelasan semasa sesi kerja biasa. Anda tetapkan bumper aktif, anda bekerja, dan jika ejen mencapai untuk sesuatu yang akan mengubah sifat sesi anda, ia berhenti dan memberitahu anda. Anda memutuskan sama ada hendak membuka kuncinya. Itulah keseluruhan interaksi.

Terdapat satu kes tepi yang patut diketahui. Jika anda mematikan bumper di pertengahan sesi dan ejen meningkatkan taint, menghidupkan bumper semula tidak menurunkan taint. Taint adalah monoton. Ia hanya naik. Jadi jika anda melumpuhkan bumper, melakukan kerja pada tahap yang lebih tinggi, dan mendayakannya semula, bumper kini menjaga dari tahap yang lebih tinggi itu, bukan yang asal. Jika anda mahu kembali ke sesi tahap rendah yang bersih, lakukan reset penuh.

![](/blog/images/screenshot_20260309_164720.png)

Bagi kebanyakan orang, bumper hanya akan menjadi sesuatu yang senyap aktif dan sekali-sekala menjelaskan mengapa ejen meminta mereka untuk mendayakan sesuatu dan bukannya melakukannya secara automatik. Itulah pengalaman yang dimaksudkan. Ejen kekal dalam lorong, anda kekal dalam kawalan, dan anda hanya perlu membuat keputusan aktif apabila anda benar-benar mahu meneruskan lebih jauh.
