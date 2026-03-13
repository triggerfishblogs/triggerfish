# Glosari

| Istilah                      | Definisi                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | Kumpulan sesi ejen yang bekerjasama secara berterusan dengan peranan yang berbeza. Satu ahli adalah ketua yang menyelaraskan kerja. Dicipta melalui `team_create`, dipantau dengan semakan kitaran hayat. |
| **A2UI**                     | Protokol Agent-to-UI untuk menolak kandungan visual dari ejen ke ruang kerja Tide Pool secara masa nyata.                                                             |
| **Background Session**       | Sesi yang dilahirkan untuk tugas autonomi (cron, trigger) yang bermula dengan taint PUBLIC segar dan berjalan dalam ruang kerja yang diasingkan.                       |
| **Buoy**                     | Aplikasi natif teman (iOS, Android) yang menyediakan keupayaan peranti seperti kamera, lokasi, rakaman skrin, dan pemberitahuan tolak kepada ejen. (Akan datang.)     |
| **Classification**           | Label sensitiviti yang diberikan kepada data, saluran, dan penerima. Empat peringkat: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                     |
| **Cron**                     | Tugas berulang berjadual yang dilaksanakan oleh ejen pada masa yang dinyatakan menggunakan sintaks ungkapan cron standard.                                            |
| **Dive**                     | Wizard persediaan pertama kali (`triggerfish dive`) yang membina perancah `triggerfish.yaml`, SPINE.md, dan konfigurasi awal.                                         |
| **Effective Classification** | Tahap pengkelasan yang digunakan untuk keputusan output, dikira sebagai `min(channel_classification, recipient_classification)`.                                      |
| **Exec Environment**         | Ruang kerja kod ejen untuk menulis, menjalankan, dan menyahpepijat kod dalam gelung maklum balas tulis-jalankan-betulkan, berbeza daripada Plugin Sandbox.            |
| **Failover**                 | Jatuh balik automatik ke pembekal LLM alternatif apabila pembekal semasa tidak tersedia kerana had kadar, ralat pelayan, atau tamat masa.                             |
| **Gateway**                  | Satah kawalan tempatan yang berjalan lama yang mengurus sesi, saluran, alat, peristiwa, dan proses ejen melalui titik akhir WebSocket JSON-RPC.                       |
| **Hook**                     | Titik penguatkuasaan deterministik dalam aliran data di mana enjin dasar menilai peraturan dan memutuskan sama ada untuk membenarkan, menyekat, atau menyunting tindakan. |
| **Lineage**                  | Metadata provenance yang menjejaki asal, transformasi, dan lokasi semasa setiap elemen data yang diproses oleh Triggerfish.                                           |
| **LlmProvider**              | Antara muka untuk penyelesaian LLM, dilaksanakan oleh setiap pembekal yang disokong (Anthropic, OpenAI, Google, Tempatan, OpenRouter).                                |
| **MCP**                      | Model Context Protocol, standard untuk komunikasi ejen-alat. MCP Gateway Triggerfish menambah kawalan pengkelasan kepada mana-mana pelayan MCP.                      |
| **No Write-Down**            | Peraturan tetap, tidak boleh dikonfigurasi bahawa data hanya boleh mengalir ke saluran atau penerima pada tahap pengkelasan yang sama atau lebih tinggi.              |
| **NotificationService**      | Abstraksi bersatu untuk menghantar pemberitahuan pemilik merentasi semua saluran yang disambungkan dengan keutamaan, beratur, dan penyahduplikatan.                   |
| **Patrol**                   | Arahan pemeriksaan kesihatan diagnostik (`triggerfish patrol`) yang mengesahkan gateway, pembekal LLM, saluran, dan konfigurasi dasar.                                |
| **Reef (The)**               | Pasaran kemahiran komuniti untuk menemui, memasang, menerbitkan, dan mengurus kemahiran Triggerfish.                                                                   |
| **Ripple**                   | Penunjuk menaip masa nyata dan isyarat status dalam talian yang disampaikan merentasi saluran yang menyokongnya.                                                      |
| **Session**                  | Unit asas keadaan perbualan dengan penjejakan taint bebas. Setiap sesi mempunyai ID unik, pengguna, saluran, tahap taint, dan sejarah.                               |
| **Skill**                    | Folder yang mengandungi fail `SKILL.md` dan fail sokongan pilihan yang memberikan ejen keupayaan baru tanpa menulis plugin.                                           |
| **SPINE.md**                 | Fail identiti dan misi ejen yang dimuatkan sebagai asas arahan sistem. Mentakrifkan personaliti, peraturan, dan sempadan. Setara dengan CLAUDE.md dalam Triggerfish.  |
| **StorageProvider**          | Abstraksi kegigihan bersatu (antara muka nilai-kunci) di mana semua data berkeadaan mengalir. Pelaksanaan termasuk Memory, SQLite, dan backend perusahaan.            |
| **Taint**                    | Tahap pengkelasan yang dilampirkan ke sesi berdasarkan data yang telah diaksesnya. Taint hanya boleh meningkat dalam sesi, tidak boleh menurun.                       |
| **Tide Pool**                | Ruang kerja visual yang dipacu ejen di mana Triggerfish membuat kandungan interaktif (papan pemuka, carta, borang) menggunakan protokol A2UI.                        |
| **TRIGGER.md**               | Fail definisi tingkah laku proaktif ejen, menentukan apa yang perlu diperiksa, dipantau, dan diambil tindakan semasa kebangkitan trigger berkala.                    |
| **Webhook**                  | Titik akhir HTTP masuk yang menerima peristiwa dari perkhidmatan luaran (GitHub, Sentry, dsb.) dan mencetuskan tindakan ejen.                                        |
| **Team Lead**                | Penyelaras yang ditetapkan dalam pasukan ejen. Menerima objektif pasukan, mengurai kerja, menugaskan tugas kepada ahli, dan memutuskan bila pasukan selesai.          |
| **Workspace**                | Direktori sistem fail per-ejen di mana ejen menulis dan melaksanakan kodnya sendiri, diasingkan dari ejen lain.                                                      |
| **Write-Down**               | Aliran data yang dilarang dari tahap pengkelasan lebih tinggi ke yang lebih rendah (contoh, data CONFIDENTIAL dihantar ke saluran PUBLIC).                           |
