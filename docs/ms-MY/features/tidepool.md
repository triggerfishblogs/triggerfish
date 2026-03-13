# Tide Pool / A2UI

Tide Pool ialah ruang kerja visual yang dipacu ejen di mana Triggerfish memaparkan kandungan interaktif: papan pemuka, carta, borang, pratonton kod, dan media kaya. Berbeza dengan sembang yang merupakan perbualan linear, Tide Pool ialah kanvas yang dikawal oleh ejen.

## Apakah A2UI?

A2UI (Agent-to-UI) ialah protokol yang menjanakan Tide Pool. Ia mentakrifkan cara ejen menolak kandungan visual dan kemas kini kepada klien yang disambungkan secara masa nyata. Ejen menentukan apa yang ditunjukkan; klien memaparkannya.

## Seni Bina

<img src="/diagrams/tidepool-architecture.svg" alt="Seni bina Tide Pool A2UI: Ejen menolak kandungan melalui Gateway ke Tide Pool Renderer pada klien yang disambungkan" style="max-width: 100%;" />

Ejen menggunakan alat `tide_pool` untuk menolak kandungan ke Tide Pool Host yang berjalan dalam Gateway. Host menyampaikan kemas kini melalui WebSocket ke mana-mana Tide Pool Renderer yang disambungkan pada platform yang disokong.

## Alat Tide Pool

Ejen berinteraksi dengan Tide Pool melalui alat-alat ini:

| Alat              | Keterangan                                             | Kes Penggunaan                                               |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `tidepool_render` | Papar pokok komponen dalam ruang kerja                 | Papan pemuka, borang, visualisasi, kandungan kaya            |
| `tidepool_update` | Kemas kini prop satu komponen mengikut ID              | Kemas kini tambahan tanpa menggantikan keseluruhan paparan   |
| `tidepool_clear`  | Kosongkan ruang kerja, mengalih keluar semua komponen  | Peralihan sesi, bermula semula                               |

### Tindakan Warisan

Host asas juga menyokong tindakan peringkat bawah untuk keserasian ke belakang:

| Tindakan   | Keterangan                                |
| ---------- | ----------------------------------------- |
| `push`     | Tolak kandungan HTML/JS mentah            |
| `eval`     | Laksanakan JavaScript dalam kotak pasir   |
| `reset`    | Kosongkan semua kandungan                 |
| `snapshot` | Tangkap sebagai imej                      |

## Kes Penggunaan

Tide Pool direka untuk senario di mana sembang sahaja tidak mencukupi:

- **Papan Pemuka** -- Ejen membina papan pemuka langsung yang menunjukkan metrik dari integrasi anda yang disambungkan.
- **Visualisasi Data** -- Carta dan graf yang dipapar dari hasil pertanyaan.
- **Borang dan Input** -- Borang interaktif untuk pengumpulan data berstruktur.
- **Pratonton Kod** -- Kod dengan penyerlahan sintaks dan keputusan pelaksanaan langsung.
- **Media Kaya** -- Imej, peta, dan kandungan terbenam.
- **Pengeditan Kolaboratif** -- Ejen membentangkan dokumen untuk anda semak dan anotasi.

## Cara Ia Berfungsi

1. Anda meminta ejen memvisualisasikan sesuatu (atau ejen memutuskan respons visual adalah sesuai).
2. Ejen menggunakan tindakan `push` untuk menghantar HTML dan JavaScript ke Tide Pool.
3. Tide Pool Host Gateway menerima kandungan dan menyampaikannya kepada klien yang disambungkan.
4. Pemaparan memaparkan kandungan secara masa nyata.
5. Ejen boleh menggunakan `eval` untuk membuat kemas kini tambahan tanpa menggantikan keseluruhan paparan.
6. Apabila konteks berubah, ejen menggunakan `reset` untuk mengosongkan ruang kerja.

## Integrasi Keselamatan

Kandungan Tide Pool tertakluk kepada penguatkuasaan keselamatan yang sama seperti output lain:

- **Hook PRE_OUTPUT** -- Semua kandungan yang ditolak ke Tide Pool melalui hook penguatkuasaan PRE_OUTPUT sebelum dipapar. Data terklasifikasi yang melanggar dasar output disekat.
- **Taint sesi** -- Kandungan yang dipapar mewarisi tahap taint sesi. Tide Pool yang menunjukkan data `CONFIDENTIAL` adalah `CONFIDENTIAL` itu sendiri.
- **Pengkelasan snapshot** -- Snapshot Tide Pool dikelaskan pada tahap taint sesi pada masa tangkapan.
- **Sandboxing JavaScript** -- JavaScript yang dilaksanakan melalui `eval` dikotak-pasirkan dalam konteks Tide Pool. Ia tidak mempunyai akses ke sistem hos, rangkaian, atau sistem fail.
- **Tiada akses rangkaian** -- Runtime Tide Pool tidak boleh membuat permintaan rangkaian. Semua data mengalir melalui ejen dan lapisan dasar.

## Penunjuk Status

Antara muka web Tidepool merangkumi penunjuk status masa nyata:

### Bar Panjang Konteks

Bar kemajuan bergaya yang menunjukkan penggunaan tetingkap konteks — berapa banyak tetingkap konteks LLM telah digunakan. Bar dikemas kini selepas setiap mesej dan selepas pemadatan.

### Status Pelayan MCP

Menunjukkan status sambungan pelayan MCP yang dikonfigurasi (contoh, "MCP 3/3"). Berwarna: hijau untuk semua tersambung, kuning untuk separa, merah untuk tiada.

### Input Rahsia Selamat

Apabila ejen memerlukan anda memasukkan rahsia (melalui alat `secret_save`), Tidepool memaparkan popup input selamat. Nilai yang dimasukkan pergi terus ke keychain — ia tidak pernah dihantar melalui sembang atau kelihatan dalam sejarah perbualan.

::: tip Fikirkan Tide Pool sebagai papan putih ejen. Sementara sembang adalah cara anda bercakap dengan ejen, Tide Pool adalah tempat ejen menunjukkan sesuatu kepada anda. :::
