# Rujukan Ralat

Indeks mesej ralat yang boleh dicari. Gunakan carian pelayar anda (Ctrl+F / Cmd+F) untuk mencari teks ralat tepat yang anda lihat dalam log anda.

## Permulaan & Daemon

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Fatal startup error` | Pengecualian tidak dikendalikan semasa but gateway | Semak jejak tindanan penuh dalam log |
| `Daemon start failed` | Pengurus perkhidmatan tidak dapat memulakan daemon | Semak `triggerfish logs` atau jurnal sistem |
| `Daemon stop failed` | Pengurus perkhidmatan tidak dapat menghentikan daemon | Bunuh proses secara manual |
| `Failed to load configuration` | Fail konfigurasi tidak boleh dibaca atau tidak betul bentuknya | Jalankan `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Bahagian `models` hilang atau tiada pembekal ditakrifkan | Konfigurasikan sekurang-kurangnya satu pembekal |
| `Configuration file not found` | `triggerfish.yaml` tidak wujud di laluan yang dijangka | Jalankan `triggerfish dive` atau cipta secara manual |
| `Configuration parse failed` | Ralat sintaks YAML | Betulkan sintaks YAML (semak indentasi, kolon, kuota) |
| `Configuration file did not parse to an object` | YAML dihurai tetapi hasilnya bukan pemetaan | Pastikan peringkat atas adalah pemetaan YAML, bukan senarai atau skalar |
| `Configuration validation failed` | Medan yang diperlukan hilang atau nilai tidak sah | Semak mesej pengesahan khusus |
| `Triggerfish is already running` | Fail log dikunci oleh tika lain | Hentikan tika yang sedang berjalan terlebih dahulu |
| `Linger enable failed` | `loginctl enable-linger` tidak berjaya | Jalankan `sudo loginctl enable-linger $USER` |

## Pengurusan Rahsia

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Secret store failed` | Tidak dapat memulakan backend rahsia | Semak ketersediaan keychain/libsecret |
| `Secret not found` | Kunci rahsia yang dirujuk tidak wujud | Simpannya: `triggerfish config set-secret <kunci> <nilai>` |
| `Machine key file permissions too open` | Fail kunci mempunyai kebenaran lebih luas dari 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Fail kunci tidak boleh dibaca atau dipotong | Padam dan simpan semula semua rahsia |
| `Machine key chmod failed` | Tidak dapat menetapkan kebenaran pada fail kunci | Semak sistem fail menyokong chmod |
| `Secret file permissions too open` | Fail rahsia mempunyai kebenaran yang terlalu terbuka | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Tidak dapat menetapkan kebenaran pada fail rahsia | Semak jenis sistem fail |
| `Secret backend selection failed` | OS tidak disokong atau tiada keychain tersedia | Gunakan Docker atau aktifkan jatuh balik memori |
| `Migrating legacy plaintext secrets to encrypted format` | Fail rahsia format lama dikesan (INFO, bukan ralat) | Tiada tindakan diperlukan; penghijrahan adalah automatik |

## Pembekal LLM

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Primary provider not found in registry` | Nama pembekal dalam `models.primary.provider` tidak dalam `models.providers` | Betulkan nama pembekal |
| `Classification model provider not configured` | `classification_models` merujuk pembekal yang tidak diketahui | Tambah pembekal ke `models.providers` |
| `All providers exhausted` | Setiap pembekal dalam rantai failover gagal | Semak semua kunci API dan status pembekal |
| `Provider request failed with retryable error, retrying` | Ralat sementara, cuba semula sedang berjalan | Tunggu; ini adalah pemulihan automatik |
| `Provider stream connection failed, retrying` | Sambungan penstriman terputus | Tunggu; ini adalah pemulihan automatik |
| `Local LLM request failed (status): text` | Ollama/LM Studio mengembalikan ralat | Semak pelayan tempatan sedang berjalan dan model dimuatkan |
| `No response body for streaming` | Pembekal mengembalikan respons penstriman kosong | Cuba semula; mungkin isu pembekal sementara |
| `Unknown provider name in createProviderByName` | Kod merujuk jenis pembekal yang tidak wujud | Semak ejaan nama pembekal |

## Saluran

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Channel send failed` | Penghala tidak dapat menghantar mesej | Semak ralat khusus saluran dalam log |
| `WebSocket connection failed` | Sembang CLI tidak dapat mencapai gateway | Semak daemon sedang berjalan |
| `Message parse failed` | Menerima JSON tidak betul bentuknya dari saluran | Semak klien menghantar JSON yang sah |
| `WebSocket upgrade rejected` | Sambungan ditolak oleh gateway | Semak token pengesahan dan header asal |
| `Chat WebSocket message rejected: exceeds size limit` | Badan mesej melebihi 1 MB | Hantar mesej yang lebih kecil |
| `Discord channel configured but botToken is missing` | Konfigurasi Discord wujud tetapi token kosong | Tetapkan token bot |
| `WhatsApp send failed (status): error` | API Meta menolak permintaan hantar | Semak kesahihan token akses |
| `Signal connect failed` | Tidak dapat mencapai daemon signal-cli | Semak signal-cli sedang berjalan |
| `Signal ping failed after retries` | signal-cli sedang berjalan tetapi tidak memberi respons | Mulakan semula signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli tidak bermula dalam masa | Semak pemasangan Java dan persediaan signal-cli |
| `IMAP LOGIN failed` | Kelayakan IMAP salah | Semak nama pengguna dan kata laluan |
| `IMAP connection not established` | Tidak dapat mencapai pelayan IMAP | Semak nama hos pelayan dan port 993 |
| `Google Chat PubSub poll failed` | Tidak dapat menarik dari langganan Pub/Sub | Semak kelayakan Google Cloud |
| `Clipboard image rejected: exceeds size limit` | Imej yang diperakau terlalu besar untuk penimbal input | Gunakan imej yang lebih kecil |

## Integrasi

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Google OAuth token exchange failed` | Pertukaran kod OAuth mengembalikan ralat | Sahkan semula: `triggerfish connect google` |
| `GitHub token verification failed` | PAT tidak sah atau tamat tempoh | Simpan semula: `triggerfish connect github` |
| `GitHub API request failed` | API GitHub mengembalikan ralat | Semak skop token dan had kadar |
| `Clone failed` | git clone gagal | Semak token, akses repositori, dan rangkaian |
| `Notion enabled but token not found in keychain` | Token integrasi Notion tidak disimpan | Jalankan `triggerfish connect notion` |
| `Notion API rate limited` | Melebihi 3 permintaan/saat | Tunggu cuba semula automatik (sehingga 3 percubaan) |
| `Notion API network request failed` | Tidak dapat mencapai api.notion.com | Semak kesambungan rangkaian |
| `CalDAV credential resolution failed` | Nama pengguna atau kata laluan CalDAV hilang | Tetapkan kelayakan dalam konfigurasi dan keychain |
| `CalDAV principal discovery failed` | Tidak dapat mencari URL prinsipal CalDAV | Semak format URL pelayan |
| `MCP server 'name' not found` | Pelayan MCP yang dirujuk tidak dalam konfigurasi | Tambahnya ke `mcp_servers` dalam konfigurasi |
| `MCP SSE connection blocked by SSRF policy` | URL SSE MCP menunjuk ke IP peribadi | Gunakan pengangkutan stdio |
| `Vault path does not exist` | Laluan vault Obsidian salah | Betulkan `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Laluan nota cuba melepaskan direktori vault | Gunakan laluan dalam vault |

## Keselamatan & Dasar

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Write-down blocked` | Data mengalir dari klasifikasi tinggi ke rendah | Gunakan saluran/alat pada tahap klasifikasi yang betul |
| `SSRF blocked: hostname resolves to private IP` | Permintaan keluar menyasarkan rangkaian dalaman | Tidak boleh dilumpuhkan; gunakan URL awam |
| `Hook evaluation failed, defaulting to BLOCK` | Hook dasar mengeluarkan pengecualian | Semak peraturan dasar tersuai |
| `Policy rule blocked action` | Peraturan dasar menolak tindakan | Semak `policy.rules` dalam konfigurasi |
| `Tool floor violation` | Alat memerlukan klasifikasi yang lebih tinggi dari yang sesi ada | Tingkatkan sesi atau gunakan alat berbeza |
| `Plugin network access blocked` | Plugin cuba mengakses URL yang tidak dibenarkan | Plugin mesti mengisytiharkan titik akhir dalam manifestnya |
| `Plugin SSRF blocked` | URL plugin diselesaikan ke IP peribadi | Plugin tidak boleh mengakses rangkaian peribadi |
| `Skill activation blocked by classification ceiling` | Taint sesi melebihi siling kemahiran | Tidak boleh menggunakan kemahiran ini pada tahap taint semasa |
| `Skill content integrity check failed` | Fail kemahiran diubah suai selepas pemasangan | Pasang semula kemahiran |
| `Skill install rejected by scanner` | Pengimbas keselamatan menemui kandungan mencurigakan | Semak amaran pengimbasan |
| `Delegation certificate signature invalid` | Rantai delegasi mempunyai tandatangan tidak sah | Keluarkan semula delegasi |
| `Delegation certificate expired` | Delegasi telah tamat tempoh | Keluarkan semula dengan TTL yang lebih panjang |
| `Webhook HMAC verification failed` | Tandatangan webhook tidak sepadan | Semak konfigurasi rahsia dikongsi |
| `Webhook replay detected` | Muatan webhook pendua diterima | Bukan ralat jika dijangka; sebaliknya siasat |
| `Webhook rate limit exceeded` | Terlalu banyak panggilan webhook dari satu sumber | Kurangkan kekerapan webhook |

## Pelayar

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Browser launch failed` | Tidak dapat memulakan Chrome/Chromium | Pasang pelayar berasaskan Chromium |
| `Direct Chrome process launch failed` | Binari Chrome gagal dilaksanakan | Semak kebenaran binari dan kebergantungan |
| `Flatpak Chrome launch failed` | Pembalut Flatpak Chrome gagal | Semak pemasangan Flatpak |
| `CDP endpoint not ready after Xms` | Chrome tidak membuka port nyahpepijat dalam masa | Sistem mungkin terhad sumber |
| `Navigation blocked by domain policy` | URL menyasarkan domain yang disekat atau IP peribadi | Gunakan URL awam |
| `Navigation failed` | Ralat muatan halaman atau tamat masa | Semak URL dan rangkaian |
| `Click/Type/Select failed on "selector"` | Pemilih CSS tidak sepadan dengan mana-mana elemen | Semak pemilih terhadap DOM halaman |
| `Snapshot failed` | Tidak dapat menangkap keadaan halaman | Halaman mungkin kosong atau JavaScript ralat |

## Pelaksanaan & Kotak Pasir

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Working directory path escapes workspace jail` | Percubaan traversal laluan dalam persekitaran exec | Gunakan laluan dalam ruang kerja |
| `Working directory does not exist` | Direktori kerja yang dinyatakan tidak ditemui | Cipta direktori terlebih dahulu |
| `Workspace access denied for PUBLIC session` | Sesi PUBLIC tidak boleh menggunakan ruang kerja | Ruang kerja memerlukan klasifikasi INTERNAL+ |
| `Workspace path traversal attempt blocked` | Laluan cuba melepaskan sempadan ruang kerja | Gunakan laluan relatif dalam ruang kerja |
| `Workspace agentId rejected: empty after sanitization` | ID ejen hanya mengandungi aksara tidak sah | Semak konfigurasi ejen |
| `Sandbox worker unhandled error` | Pekerja kotak pasir plugin ranap | Semak kod plugin untuk ralat |
| `Sandbox has been shut down` | Operasi dicuba pada kotak pasir yang dimusnahkan | Mulakan semula daemon |

## Penjadual

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Trigger callback failed` | Pengendalian trigger mengeluarkan pengecualian | Semak TRIGGER.md untuk isu |
| `Trigger store persist failed` | Tidak dapat menyimpan keputusan trigger | Semak kesambungan storan |
| `Notification delivery failed` | Tidak dapat menghantar notifikasi trigger | Semak kesambungan saluran |
| `Cron expression parse error` | Ungkapan cron tidak sah | Betulkan ungkapan dalam `scheduler.cron.jobs` |

## Kemas Kini Sendiri

| Ralat | Punca | Pembetulan |
|-------|-------|------------|
| `Triggerfish self-update failed` | Proses kemas kini menghadapi ralat | Semak ralat khusus dalam log |
| `Binary replacement failed` | Tidak dapat menukar binari lama dengan yang baru | Semak kebenaran fail; hentikan daemon terlebih dahulu |
| `Checksum file download failed` | Tidak dapat memuat turun SHA256SUMS.txt | Semak kesambungan rangkaian |
| `Asset not found in SHA256SUMS.txt` | Keluaran tiada checksum untuk platform anda | Failkan isu GitHub |
| `Checksum verification exception` | Hash binari yang dimuat turun tidak sepadan | Cuba semula; muat turun mungkin rosak |
