---
title: Automasi Portal Pihak Ketiga
description: Cara Triggerfish mengautomasikan interaksi dengan portal vendor, laman kerajaan, dan sistem pembayar tanpa rosak apabila UI berubah.
---

# Automasi Bergantung UI Terhadap Portal Pihak Ketiga

Setiap enterprise mempunyai senarai portal yang dilog masuk secara manual oleh pekerja, setiap hari, untuk melakukan kerja yang sepatutnya diautomasikan tetapi tidak. Portal vendor untuk menyemak status pesanan. Laman kerajaan untuk memfailkan penyerahan kawal selia. Portal pembayar insurans untuk mengesahkan kelayakan dan menyemak status tuntutan. Lembaga pelesenan negeri untuk pengesahan kelayakan. Portal pihak berkuasa cukai untuk pemfailan pematuhan.

Portal-portal ini tidak mempunyai API. Atau mereka mempunyai API yang tidak didokumentasikan, terhad kadar, atau terhad kepada "rakan kongsi pilihan" yang membayar untuk akses. Data berada di belakang halaman log masuk, dipaparkan dalam HTML, dan satu-satunya cara untuk mendapatkannya adalah dengan log masuk dan menavigasi UI.

Automasi tradisional menggunakan skrip pelayar. Skrip Selenium, Playwright, atau Puppeteer yang log masuk, menavigasi ke halaman yang betul, mencari elemen dengan pemilih CSS atau XPath, mengekstrak data, dan log keluar. Skrip-skrip ini berfungsi sehingga tidak lagi. Reka bentuk semula portal mengubah nama kelas CSS. CAPTCHA baharu ditambahkan ke aliran log masuk. Menu navigasi berpindah dari bar sisi ke menu hamburger. Sepanduk persetujuan kuki mula menutupi butang hantar. Skrip gagal secara senyap, dan tiada siapa yang tahu sehingga proses hiliran yang bergantung kepada data mula menghasilkan ralat.

Lembaga perubatan negeri adalah contoh yang amat menyakitkan. Terdapat lima puluh daripadanya, masing-masing dengan laman web yang berbeza, susun atur yang berbeza, kaedah pengesahan yang berbeza, dan format data yang berbeza. Mereka mereka bentuk semula mengikut jadual mereka sendiri tanpa notis. Perkhidmatan pengesahan kelayakan yang bergantung pada pengikisan laman-laman ini mungkin mempunyai lima atau sepuluh dari lima puluh skrip yang rosak pada bila-bila masa, setiap satunya memerlukan pembangun untuk memeriksa susun atur baharu dan menulis semula pemilih.

## Cara Triggerfish Menyelesaikan Ini

Automasi pelayar Triggerfish menggabungkan Chromium yang dikawal CDP dengan navigasi visual berasaskan LLM. Ejen melihat halaman sebagai piksel yang dipaparkan dan gambar aksesibiliti, bukan sebagai pokok DOM. Ia mengenal pasti elemen berdasarkan rupa dan fungsinya, bukan berdasarkan nama kelas CSS. Apabila portal mereka bentuk semula, ejen menyesuaikan diri kerana borang log masuk masih kelihatan seperti borang log masuk, menu navigasi masih kelihatan seperti menu navigasi, dan jadual data masih kelihatan seperti jadual data.

### Navigasi Visual Berbanding Skrip Pemilih

Alat automasi pelayar berfungsi melalui tujuh operasi: navigate, snapshot, click, type, select, scroll, dan wait. Ejen menavigasi ke URL, mengambil gambar halaman yang dipaparkan, menaakulkan apa yang dilihatnya, dan memutuskan tindakan yang perlu diambil. Tiada alat `evaluate` yang menjalankan JavaScript sewenang-wenangnya dalam konteks halaman. Ini adalah keputusan keselamatan yang disengajakan. Ejen berinteraksi dengan halaman seperti manusia — melalui UI — dan tidak boleh melaksanakan kod yang boleh dieksploitasi oleh halaman berniat jahat.

Apabila ejen menemui borang log masuk, ia mengenal pasti medan nama pengguna, medan kata laluan, dan butang hantar berdasarkan susun atur visual, teks pemegang tempat, label, dan struktur halaman. Ia tidak perlu tahu bahawa medan nama pengguna mempunyai `id="auth-input-email"` atau `class="login-form__email-field"`. Apabila pengecam-pengecam tersebut berubah dalam reka bentuk semula, ejen tidak menyedarinya kerana ia tidak pernah bergantung padanya.

### Keselamatan Domain Dikongsi

Navigasi pelayar berkongsi konfigurasi keselamatan domain yang sama dengan operasi web fetch. Satu blok konfigurasi dalam `triggerfish.yaml` mentakrifkan senarai penolak SSRF, senarai benar domain, senarai tolak domain, dan pemetaan domain-ke-pengelasan. Apabila ejen menavigasi ke portal vendor yang diklasifikasikan pada CONFIDENTIAL, taint sesi meningkat secara automatik kepada CONFIDENTIAL, dan semua tindakan seterusnya dalam aliran kerja itu tertakluk kepada sekatan tahap CONFIDENTIAL.

Senarai penolak SSRF adalah dikodkan keras dan tidak boleh ditindih. Julat IP peribadi, alamat link-local, dan titik akhir metadata awan sentiasa disekat. Resolusi DNS disemak sebelum permintaan, menghalang serangan DNS rebinding. Ini penting kerana automasi pelayar adalah permukaan serangan risiko tertinggi dalam mana-mana sistem ejen. Halaman berniat jahat yang cuba mengalihkan ejen ke perkhidmatan dalaman disekat sebelum permintaan meninggalkan sistem.

### Tera Air Profil Pelayar

Setiap ejen mengekalkan profil pelayarnya sendiri, yang mengumpulkan kuki, storan setempat, dan data sesi apabila ia berinteraksi dengan portal dari masa ke masa. Profil membawa tera air pengelasan yang merekodkan tahap pengelasan tertinggi di mana ia telah digunakan. Tera air ini hanya boleh meningkat, tidak pernah berkurang.

Jika ejen menggunakan profil pelayarnya untuk log masuk ke portal vendor CONFIDENTIAL, profil itu ditanda dengan CONFIDENTIAL. Sesi seterusnya yang berjalan pada pengelasan PUBLIC tidak boleh menggunakan profil itu, menghalang kebocoran data melalui kelayakan yang disimpan cache, kuki, atau token sesi yang mungkin mengandungi maklumat sensitif. Pengasingan profil adalah per-ejen, dan penguatkuasaan tera air adalah automatik.

Ini menyelesaikan masalah halus tetapi penting dalam automasi portal. Profil pelayar mengumpulkan keadaan yang mencerminkan data yang diaksesnya. Tanpa tera air, profil yang log masuk ke portal sensitif boleh membocorkan maklumat melalui cadangan autoisi, data halaman yang disimpan cache, atau kuki berterusan ke sesi yang diklasifikasikan lebih rendah.

### Pengurusan Kelayakan

Kelayakan portal disimpan dalam rantai kunci OS (peringkat peribadi) atau peti besi enterprise (peringkat enterprise), bukan dalam fail konfigurasi atau pemboleh ubah persekitaran. SECRET_ACCESS hook merekodkan setiap pengambilan kelayakan. Kelayakan diselesaikan pada masa pelaksanaan oleh enjin aliran kerja dan disuntikkan ke dalam sesi pelayar melalui antara muka menaip, bukan dengan menetapkan nilai borang secara programatik. Ini bermakna kelayakan mengalir melalui lapisan keselamatan yang sama seperti setiap operasi sensitif lain.

### Daya Tahan terhadap Perubahan Portal Biasa

Inilah yang berlaku apabila perubahan portal biasa berlaku:

**Reka bentuk semula halaman log masuk.** Ejen mengambil gambar baharu, mengenal pasti susun atur yang dikemas kini, dan mencari medan borang melalui konteks visual. Melainkan portal beralih ke kaedah pengesahan yang berbeza sepenuhnya (SAML, OAuth, token perkakasan), log masuk terus berfungsi tanpa sebarang perubahan konfigurasi.

**Penstrukturan semula navigasi.** Ejen membaca halaman selepas log masuk dan menavigasi ke bahagian sasaran berdasarkan teks pautan, label menu, dan pengepala halaman dan bukannya corak URL. Jika portal vendor memindahkan "Order Status" dari bar sisi kiri ke menu lungsur navigasi atas, ejen mendapatinya di sana.

**Sepanduk persetujuan kuki baharu.** Ejen melihat sepanduk itu, mengenal pasti butang terima/tolak, mengkliknya, dan meneruskan dengan tugas asal. Ini dikendalikan oleh pemahaman halaman umum LLM, bukan oleh pengendali kuki khas.

**CAPTCHA yang ditambah.** Di sinilah pendekatan ini mempunyai batasan yang jujur. CAPTCHA imej mudah mungkin boleh diselesaikan bergantung pada keupayaan penglihatan LLM, tetapi reCAPTCHA v3 dan sistem analisis tingkah laku yang serupa boleh menyekat pelayar automatik. Aliran kerja menghalakan ini ke giliran campur tangan manusia dan bukannya gagal secara senyap.

**Gesaan pengesahan berbilang faktor.** Jika portal mula memerlukan MFA yang sebelumnya tidak diperlukan, ejen mengesan halaman yang tidak dijangka, melaporkan situasi melalui sistem pemberitahuan, dan menjeda aliran kerja sehingga manusia melengkapkan langkah MFA. Aliran kerja boleh dikonfigurasi untuk menunggu selesai MFA dan kemudian menyambung dari tempat ia berhenti.

### Pemprosesan Kelompok Merentasi Pelbagai Portal

Sokongan gelung `for` enjin aliran kerja bermakna satu aliran kerja boleh berulang merentasi pelbagai sasaran portal. Perkhidmatan pengesahan kelayakan boleh mentakrifkan aliran kerja yang menyemak status pelesenan merentasi semua lima puluh lembaga perubatan negeri dalam satu larian kelompok. Setiap interaksi portal berjalan sebagai sub-langkah berasingan dengan sesi pelayarnya sendiri, penjejakan pengelasannya sendiri, dan pengendalian ralatnya sendiri. Jika tiga daripada lima puluh portal gagal, aliran kerja melengkapkan empat puluh tujuh yang lain dan menghalakan tiga kegagalan ke giliran semakan dengan konteks ralat terperinci.

## Rupa dalam Praktik

Sebuah organisasi pensijilan mengesahkan lesen pembekal penjagaan kesihatan merentasi lembaga perubatan negeri sebagai sebahagian daripada proses pendaftaran pembekal. Secara tradisional, pembantu pengesahan log masuk ke laman web setiap lembaga secara manual, mencari pembekal, mengambil tangkap layar status lesen, dan memasukkan data ke dalam sistem pensijilan. Setiap pengesahan mengambil masa lima hingga lima belas minit, dan organisasi memproses beratus-ratus setiap minggu.

Dengan Triggerfish, satu aliran kerja mengendalikan keseluruhan kitaran pengesahan. Aliran kerja menerima satu kelompok pembekal dengan nombor lesen dan negeri sasaran mereka. Untuk setiap pembekal, automasi pelayar menavigasi ke portal lembaga negeri yang relevan, log masuk dengan kelayakan yang disimpan, mencari pembekal, mengekstrak status lesen dan tarikh luput, dan menyimpan hasilnya. Data yang diekstrak diklasifikasikan pada CONFIDENTIAL kerana mengandungi PII pembekal, dan peraturan write-down menghalang ia dihantar ke mana-mana saluran di bawah tahap pengelasan tersebut.

Apabila lembaga negeri mereka bentuk semula portal mereka, ejen menyesuaikan diri pada percubaan pengesahan seterusnya. Apabila lembaga menambah CAPTCHA yang menghalang akses automatik, aliran kerja menandakan negeri tersebut untuk pengesahan manual dan meneruskan pemprosesan selebihnya kelompok. Pembantu pengesahan beralih dari melakukan semua pengesahan secara manual kepada mengendalikan hanya pengecualian yang tidak dapat diselesaikan oleh automasi.
