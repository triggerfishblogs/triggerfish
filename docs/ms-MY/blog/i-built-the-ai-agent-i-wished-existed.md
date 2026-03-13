---
title: Saya Membina Ejen AI Yang Saya Inginkan
date: 2026-03-08
description: Saya membina Triggerfish kerana setiap ejen AI yang saya jumpa
  mempercayai model untuk menguatkuasakan peraturannya sendiri. Itu bukan
  keselamatan. Inilah yang saya lakukan sebagai gantinya.
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
![](/blog/images/gemini_generated_image_ygq4uwygq4uwygq4.jpg)

Suatu ketika dahulu, saya mula memerhatikan dengan teliti apa yang sebenarnya boleh dilakukan oleh ejen AI. Bukan demo. Yang sebenar, berjalan pada data sebenar, dalam persekitaran sebenar di mana kesilapan mempunyai akibat. Apa yang saya dapati adalah keupayaannya memang ada. Anda boleh menghubungkan ejen ke e-mel, kalendar, kod, fail anda, dan ia boleh melakukan kerja yang bermakna. Bahagian itu mengesankan saya.

Yang tidak mengesankan saya adalah model keselamatannya. Atau lebih tepat lagi, ketiadaannya. Setiap platform yang saya lihat menguatkuasakan peraturannya dengan cara yang sama: dengan memberitahu model apa yang tidak seharusnya dilakukannya. Tulis system prompt yang baik, huraikan batasan, percayakan model untuk kekal dalam batasan tersebut. Itu berfungsi sehingga seseorang mengetahui cara merangka permintaan yang meyakinkan model bahawa peraturan tidak berlaku di sini, sekarang, dalam kes khusus ini. Dan orang memang mengetahui itu. Ia tidak terlalu susah.

Saya terus menunggu seseorang membina versi ini yang sebenarnya saya mahu gunakan. Satu yang boleh berhubung dengan segalanya, bekerja merentasi setiap saluran yang sudah saya gunakan, dan menangani data yang benar-benar sensitif tanpa saya perlu bersilang jari dan berharap model sedang dalam keadaan baik. Ia tidak muncul.

Jadi saya membinanya.

Triggerfish adalah ejen yang saya inginkan. Ia berhubung ke e-mel, kalendar, fail, kod, aplikasi pemesejan anda. Ia berjalan secara proaktif, bukan hanya apabila anda memberi prompt padanya. Ia berfungsi di mana sahaja anda sudah bekerja. Tetapi bahagian yang paling saya ambil berat ialah seni bina keselamatan. Peraturan tentang apa yang ejen boleh akses dan ke mana data boleh mengalir tidak tinggal dalam prompt. Mereka tinggal dalam lapisan penguatkuasaan yang berada di luar model sepenuhnya. Model memberitahu sistem apa yang ingin dilakukannya, dan lapisan yang berasingan memutuskan sama ada itu sebenarnya berlaku. Model tidak boleh berunding dengan lapisan tersebut. Ia tidak boleh berfikir untuk mengelakkannya. Ia tidak boleh melihatnya.

Perbezaan itu lebih penting daripada yang mungkin kedengarannya. Ia bermakna sifat keselamatan sistem tidak merosot apabila model menjadi lebih berkemampuan. Ia bermakna alat pihak ketiga yang dikompromi tidak boleh memujuk ejen untuk melakukan sesuatu yang seharusnya tidak dilakukannya. Ia bermakna anda sebenarnya boleh melihat peraturan, memahaminya, dan mempercayainya, kerana mereka adalah kod, bukan prosa.

Saya mengopen-source teras penguatkuasaan tepat atas sebab itu. Jika anda tidak boleh membacanya, anda tidak boleh mempercayainya. Itu benar untuk sebarang dakwaan keselamatan, dan ia terutamanya benar apabila perkara yang anda jaga ialah ejen autonomi yang mempunyai akses ke data paling sensitif anda.

Platform ini percuma untuk individu dan anda boleh menjalankannya sendiri. Jika anda lebih suka tidak memikirkan infrastruktur, terdapat pilihan langganan di mana kami mengendalikan model dan carian. Dalam apa jua keadaan, model keselamatan adalah sama.

Inilah ejen yang saya inginkan pada masa itu. Saya rasa ramai orang telah menunggu perkara yang sama.
