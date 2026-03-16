---
title: Unstructured Data Ingestion
description: Cara Triggerfish mengendalikan pemprosesan invois, pengambilan dokumen, dan penghuraian e-mel tanpa rosak apabila format input berubah.
---

# Pengingesan Data Tidak Berstruktur dan Semi-Berstruktur

Pemprosesan invois sepatutnya sudah diselesaikan sekarang. Dokumen tiba, medan diekstrak, data disahkan terhadap rekod sedia ada, dan hasilnya dihalakan ke sistem yang betul. Hakikatnya ialah pemprosesan invois sahaja menelan kos berbilion dolar dalam buruh manual setiap tahun bagi enterprise, dan projek automasi yang bertujuan untuk memperbaikinya kerap rosak.

Sebabnya ialah variasi format. Invois tiba sebagai PDF, lampiran e-mel, imej yang diimbas, eksport hamparan, dan kadang-kadang faks. Setiap vendor menggunakan susun atur yang berbeza. Barisan item muncul dalam jadual, dalam teks bebas, atau gabungan kedua-duanya. Pengiraan cukai mengikut peraturan yang berbeza mengikut bidang kuasa. Format mata wang berbeza. Format tarikh berbeza. Malah vendor yang sama mengubah templat invois mereka tanpa notis.

RPA tradisional menangani ini dengan pemadanan templat. Tentukan koordinat tempat nombor invois muncul, tempat barisan item bermula, tempat jumlah berada. Ia berfungsi untuk satu templat semasa vendor. Kemudian vendor mengemas kini sistem mereka, mengalihkan lajur, menambah baris pengepala, atau mengubah penjana PDF mereka, dan bot sama ada gagal sepenuhnya atau mengekstrak data sampah yang merebak ke hiliran sehingga seseorang menangkapnya secara manual.

Corak yang sama berulang merentasi setiap aliran kerja data tidak berstruktur. Pemprosesan EOB insurans rosak apabila pembayar mengubah susun atur borang mereka. Pengambilan kebenaran awal rosak apabila jenis dokumen baharu ditambah ke proses. Penghuraian e-mel pelanggan rosak apabila seseorang menggunakan format baris subjek yang sedikit berbeza. Kos penyelenggaraan untuk memastikan automasi ini berjalan sering melebihi kos membuat kerja secara manual.

## Cara Triggerfish Menyelesaikan Ini

Triggerfish menggantikan pengekstrakan medan kedudukan dengan pemahaman dokumen berasaskan LLM. AI membaca dokumen seperti manusia: memahami konteks, membuat kesimpulan tentang hubungan antara medan, dan menyesuaikan diri secara automatik dengan perubahan susun atur. Digabungkan dengan enjin aliran kerja untuk orchestration saluran paip dan sistem pengelasan untuk keselamatan data, ini mencipta saluran paip pengingesan yang tidak rosak apabila dunia berubah.

### Penghuraian Dokumen Berkuasa LLM

Apabila dokumen memasuki aliran kerja Triggerfish, sub-ejen LLM membaca keseluruhan dokumen dan mengekstrak data berstruktur berdasarkan maksud dokumen itu, bukan di mana piksel tertentu berada. Nombor invois adalah nombor invois sama ada ia berada di penjuru kanan atas berlabel "Invoice #" atau di tengah halaman berlabel "Factura No." atau tertanam dalam perenggan teks. LLM memahami bahawa "Net 30" bermaksud syarat pembayaran, bahawa "Qty" dan "Quantity" dan "Units" bermaksud perkara yang sama, dan bahawa jadual dengan lajur untuk huraian, kadar, dan amaun adalah senarai barisan item tanpa mengira susunan lajur.

Ini bukan pendekatan generik "hantar dokumen ke ChatGPT dan harap yang terbaik". Definisi aliran kerja menyatakan dengan tepat output berstruktur yang perlu dihasilkan LLM, peraturan pengesahan yang terpakai, dan apa yang berlaku apabila keyakinan pengekstrakan rendah. Huraian tugas sub-ejen mentakrifkan skema yang dijangka, dan langkah-langkah aliran kerja seterusnya mengesahkan data yang diekstrak terhadap peraturan perniagaan sebelum ia memasuki mana-mana sistem hiliran.

### Automasi Pelayar untuk Pengambilan Dokumen

Banyak aliran kerja pengingesan dokumen bermula dengan mendapatkan dokumen itu sendiri. EOB insurans berada dalam portal pembayar. Invois vendor berada dalam platform pembekal. Borang kerajaan berada di laman web agensi negeri. Automasi tradisional menggunakan skrip Selenium atau panggilan API untuk mengambil dokumen-dokumen ini, dan skrip tersebut rosak apabila portal berubah.

Automasi pelayar Triggerfish menggunakan Chromium yang dikawal CDP dengan LLM membaca gambar halaman untuk menavigasi. Ejen melihat halaman seperti manusia dan mengklik, menaip, dan menatal berdasarkan apa yang dilihatnya dan bukannya pemilih CSS yang dikodkan keras. Apabila portal pembayar mereka bentuk semula halaman log masuk mereka, ejen menyesuaikan diri kerana ia masih boleh mengenal pasti medan nama pengguna, medan kata laluan, dan butang hantar daripada konteks visual. Apabila menu navigasi berubah, ejen mencari laluan baharu ke bahagian muat turun dokumen.

Ini tidak sempurna boleh dipercayai. CAPTCHA, aliran pengesahan berbilang faktor, dan portal yang sangat bergantung pada JavaScript masih menyebabkan masalah. Tetapi mod kegagalan secara asasnya berbeza daripada skrip tradisional. Skrip Selenium gagal senyap apabila pemilih CSS berhenti sepadan. Ejen Triggerfish melaporkan apa yang dilihatnya, apa yang dicubanya, dan di mana ia terhenti, memberikan pengendali konteks yang mencukupi untuk campur tangan atau menyesuaikan aliran kerja.

### Pemprosesan Berpagar Pengelasan

Dokumen membawa tahap sensitiviti yang berbeza, dan sistem pengelasan menangani ini secara automatik. Invois yang mengandungi syarat penetapan harga mungkin CONFIDENTIAL. Respons RFP awam mungkin INTERNAL. Dokumen yang mengandungi PHI adalah RESTRICTED. Apabila sub-ejen LLM membaca dokumen dan mengekstrak data, PRE_TOOL_CALL hook mengklasifikasikan kandungan yang diekstrak, dan taint sesi meningkat dengan sewajarnya.

Ini penting untuk penghalaan hiliran. Data invois yang diekstrak yang diklasifikasikan pada CONFIDENTIAL tidak boleh dihantar ke saluran Slack yang diklasifikasikan pada PUBLIC. Aliran kerja yang memproses dokumen insurans yang mengandungi PHI secara automatik menyekat ke mana data yang diekstrak boleh mengalir. Peraturan pencegahan write-down menguatkuasakan ini pada setiap sempadan, dan LLM tidak mempunyai kuasa untuk mengatasi ini.

Untuk perkhidmatan kesihatan dan kewangan khususnya, ini bermakna overhead pematuhan pemprosesan dokumen automatik berkurangan dengan ketara. Daripada membina kawalan akses tersuai ke setiap langkah setiap saluran paip, sistem pengelasan mengendalikannya secara seragam. Juruaudit boleh mengesan dengan tepat dokumen mana yang diproses, data apa yang diekstrak, ke mana ia dihantar, dan mengesahkan bahawa tiada data mengalir ke destinasi yang tidak sesuai, semua daripada rekod keturunan yang dicipta secara automatik pada setiap langkah.

### Penyesuaian Format Penyembuhan Sendiri

Apabila vendor mengubah templat invois mereka, automasi tradisional rosak dan kekal rosak sehingga seseorang mengemas kini peraturan pengekstrakan secara manual. Dalam Triggerfish, sub-ejen LLM menyesuaikan diri pada larian seterusnya. Ia masih mencari nombor invois, barisan item, dan jumlah, kerana ia membaca untuk makna dan bukannya kedudukan. Pengekstrakan berjaya, data disahkan terhadap peraturan perniagaan yang sama, dan aliran kerja selesai.

Dari masa ke masa, ejen boleh menggunakan memori lintas sesi untuk mempelajari corak. Jika vendor A sentiasa memasukkan fi penyimpanan semula yang tidak dilakukan vendor lain, ejen mengingatinya dari pengekstrakan sebelumnya dan tahu mencarinya. Jika format EOB pembayar tertentu sentiasa meletakkan kod pelarasan di lokasi yang tidak biasa, memori ejen tentang pengekstrakan yang berjaya sebelumnya menjadikan pengekstrakan masa hadapan lebih dipercayai.

Apabila perubahan format cukup ketara sehingga keyakinan pengekstrakan LLM jatuh di bawah ambang yang ditakrifkan dalam aliran kerja, aliran kerja menghalakan dokumen ke giliran semakan manusia dan bukannya meneka. Pembetulan manusia disuapkan semula melalui aliran kerja, dan memori ejen menyimpan corak baharu untuk rujukan masa hadapan. Sistem menjadi lebih bijak dari masa ke masa tanpa sesiapa menulis semula peraturan pengekstrakan.

### Orchestration Saluran Paip

Pengingesan dokumen jarang hanya "ekstrak dan simpan". Saluran paip yang lengkap mengambil dokumen, mengekstrak data berstruktur, mengesahkannya terhadap rekod sedia ada, memperkayakannya dengan data dari sistem lain, menghalakan pengecualian untuk semakan manusia, dan memuatkan data yang disahkan ke dalam sistem sasaran. Enjin aliran kerja mengendalikan semua ini dalam satu definisi YAML.

Saluran paip kebenaran awal penjagaan kesihatan mungkin kelihatan seperti ini: automasi pelayar mengambil imej faks dari portal pembekal, sub-ejen LLM mengekstrak pengecam pesakit dan kod prosedur, panggilan HTTP mengesahkan pesakit terhadap EHR, sub-ejen lain menilai sama ada kebenaran memenuhi kriteria keperluan perubatan berdasarkan dokumentasi klinikal, dan hasilnya dihalakan sama ada ke kelulusan automatik atau ke giliran penyemak klinikal. Setiap langkah dijejaki pengelasan. Setiap PHI ditanda taint. Jejak audit yang lengkap wujud secara automatik.

## Rupa dalam Praktik

Sistem kesihatan serantau memproses permintaan kebenaran awal daripada empat puluh pejabat pembekal yang berbeza, masing-masing menggunakan susun atur borang sendiri, ada yang difaks, ada yang dihantar melalui e-mel, ada yang dimuat naik ke portal. Pendekatan tradisional memerlukan pasukan lapan orang untuk menyemak dan memasukkan setiap permintaan secara manual, kerana tiada alat automasi yang boleh mengendalikan variasi format dengan boleh dipercayai.

Dengan Triggerfish, satu aliran kerja mengendalikan saluran paip yang lengkap. Automasi pelayar atau penghuraian e-mel mendapatkan semula dokumen. Sub-ejen LLM mengekstrak data berstruktur tanpa mengira format. Langkah pengesahan menyemak data yang diekstrak terhadap pangkalan data EHR dan formulari. Batas pengelasan RESTRICTED memastikan PHI tidak pernah meninggalkan sempadan saluran paip. Dokumen yang tidak boleh dihurai LLM dengan keyakinan tinggi dihalakan ke penyemak manusia, tetapi volum tersebut berkurangan dari masa ke masa apabila memori ejen membina perpustakaan corak format.

Pasukan lapan orang menjadi dua orang yang mengendalikan pengecualian yang dibenderakan sistem, ditambah audit kualiti berkala bagi pengekstrakan automatik. Perubahan format dari pejabat pembekal diserap secara automatik. Susun atur borang baharu dikendalikan pada pertemuan pertama. Kos penyelenggaraan yang mengambil sebahagian besar daripada belanjawan automasi tradisional jatuh hampir kepada sifar.
