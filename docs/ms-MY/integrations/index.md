# Membina Integrasi

Triggerfish direka untuk dilanjutkan. Sama ada anda ingin menyambungkan sumber data baru, mengautomasikan aliran kerja, memberi ejen anda kemahiran baru, atau bertindak balas terhadap peristiwa luaran, terdapat laluan integrasi yang ditakrifkan dengan baik -- dan setiap laluan menghormati model keselamatan yang sama.

## Laluan Integrasi

Triggerfish menawarkan lima cara berbeza untuk melanjutkan platform. Setiap satu memenuhi tujuan yang berbeza, tetapi semuanya berkongsi jaminan keselamatan yang sama: penguatkuasaan pengkelasan, penjejakan taint, hook dasar, dan pengelogan audit penuh.

| Laluan                                    | Tujuan                                             | Terbaik Untuk                                                                   |
| ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)              | Sambungkan pelayan alat luaran                     | Komunikasi ejen-ke-alat yang standard melalui Model Context Protocol            |
| [Plugin](./plugins)                       | Perluaskan ejen dengan alat tersuai                | Integrasi yang dibina ejen, penyambung API, pertanyaan sistem luaran, aliran kerja |
| [Persekitaran Exec](./exec-environment)   | Ejen menulis dan menjalankan kodnya sendiri        | Membina integrasi, prototip, pengujian, dan iterasi dalam gelung maklum balas   |
| [Kemahiran](./skills)                     | Beri ejen keupayaan baru melalui arahan            | Tingkah laku yang boleh digunakan semula, pasaran komuniti, pengarangan diri ejen |
| [Automasi Pelayar](./browser)             | Kawal contoh pelayar melalui CDP                   | Penyelidikan web, mengisi borang, scraping, aliran kerja web automatik          |
| [Webhook](./webhooks)                     | Terima peristiwa masuk dari perkhidmatan luaran    | Reaksi masa nyata terhadap e-mel, amaran, peristiwa CI/CD, perubahan kalendar   |
| [GitHub](./github)                        | Integrasi aliran kerja GitHub penuh                | Gelung semakan PR, triaj isu, pengurusan cawangan melalui webhook + exec + kemahiran |
| [Google Workspace](./google-workspace)    | Sambungkan Gmail, Calendar, Tasks, Drive, Sheets   | Integrasi OAuth2 terbungkus dengan 14 alat untuk Google Workspace               |
| [Obsidian](./obsidian)                    | Baca, tulis, dan cari nota vault Obsidian          | Akses nota bersela pengkelasan dengan pemetaan folder, wikilink, nota harian    |

## Model Keselamatan

Setiap integrasi -- tanpa mengira laluan -- beroperasi di bawah kekangan keselamatan yang sama.

### Semua Bermula sebagai UNTRUSTED

Pelayan MCP baru, plugin, saluran, dan sumber webhook semuanya lalai ke keadaan `UNTRUSTED`. Mereka tidak boleh bertukar data dengan ejen sehingga diklasifikasikan secara eksplisit oleh pemilik (tahap peribadi) atau pentadbir (tahap perusahaan).

```
UNTRUSTED  -->  CLASSIFIED  (selepas semakan, diberikan tahap pengkelasan)
UNTRUSTED  -->  BLOCKED     (dilarang secara eksplisit)
```

### Pengkelasan Mengalir Melalui

Apabila integrasi mengembalikan data, data tersebut membawa tahap pengkelasan. Mengakses data terklasifikasi meningkatkan taint sesi agar sepadan. Setelah ditaint, sesi tidak boleh mengeluarkan ke destinasi pengkelasan yang lebih rendah. Ini adalah [peraturan Tanpa Tulis-Bawah](/ms-MY/security/no-write-down) -- ia tetap dan tidak boleh ditindih.

### Hook Dasar Menguatkuasakan di Setiap Sempadan

Semua tindakan integrasi melalui hook dasar deterministik:

| Hook                    | Bila Ia Diaktifkan                                                      |
| ----------------------- | ----------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | Data luaran memasuki konteks ejen (webhook, respons plugin)             |
| `PRE_TOOL_CALL`         | Ejen meminta panggilan alat (MCP, exec, pelayar)                        |
| `POST_TOOL_RESPONSE`    | Alat mengembalikan data (kelaskan respons, kemas kini taint)            |
| `PRE_OUTPUT`            | Respons meninggalkan sistem (semakan pengkelasan akhir)                 |

Hook ini adalah fungsi tulen -- tiada panggilan LLM, tiada rawak, tiada pintasan. Input yang sama sentiasa menghasilkan keputusan yang sama.

### Jejak Audit

Setiap tindakan integrasi direkodkan: apa yang dipanggil, siapa yang memanggilnya, apa keputusan dasar, dan bagaimana taint sesi berubah. Jejak audit ini tidak boleh diubah dan tersedia untuk semakan pematuhan.

::: warning KESELAMATAN LLM tidak boleh memintas, mengubah, atau mempengaruhi keputusan hook dasar. Hook berjalan dalam kod di bawah lapisan LLM. AI meminta tindakan -- lapisan dasar membuat keputusan. :::

## Memilih Laluan yang Betul

Gunakan panduan keputusan ini untuk memilih laluan integrasi yang sesuai dengan kes penggunaan anda:

- **Anda ingin menyambungkan pelayan alat standard** -- Gunakan [MCP Gateway](./mcp-gateway). Jika alat berbicara MCP, ini adalah laluan yang betul.
- **Anda perlu menjalankan kod tersuai terhadap API luaran** -- Gunakan [Plugin](./plugins). Ejen boleh membina, mengimbas, dan memuatkan plugin pada masa jalan. Plugin berjalan dalam kotak pasir dengan pengimbasan keselamatan.
- **Anda ingin ejen membina dan berulang pada kod** -- Gunakan [Persekitaran Exec](./exec-environment). Ejen mendapat ruang kerja dengan gelung tulis/jalankan/betulkan penuh.
- **Anda ingin mengajar ejen tingkah laku baru** -- Gunakan [Kemahiran](./skills). Tulis `SKILL.md` dengan arahan, atau biarkan ejen mengarang sendiri.
- **Anda perlu mengautomasikan interaksi web** -- Gunakan [Automasi Pelayar](./browser). Chromium yang dikawal CDP dengan penguatkuasaan dasar domain.
- **Anda perlu bertindak balas terhadap peristiwa luaran secara masa nyata** -- Gunakan [Webhook](./webhooks). Peristiwa masuk disahkan, diklasifikasikan, dan dihalakan ke ejen.

::: tip Laluan-laluan ini tidak saling eksklusif. Kemahiran mungkin menggunakan automasi pelayar secara dalaman. Plugin mungkin dicetuskan oleh webhook. Integrasi yang dibina ejen dalam persekitaran exec boleh dikekalkan sebagai kemahiran. Mereka tersusun secara semula jadi. :::
