# Penyelesaian Masalah: Keselamatan & Klasifikasi

## Blok Write-Down

### "Write-down blocked"

Ini adalah ralat keselamatan yang paling biasa. Ia bermakna data cuba mengalir dari tahap klasifikasi yang lebih tinggi ke tahap yang lebih rendah.

**Contoh:** Sesi anda mengakses data CONFIDENTIAL (membaca fail terklasifikasi, menanyakan pangkalan data terklasifikasi). Taint sesi kini ialah CONFIDENTIAL. Anda kemudian cuba menghantar respons ke saluran WebChat PUBLIC. Enjin dasar menyekat ini kerana data CONFIDENTIAL tidak boleh mengalir ke destinasi PUBLIC.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Cara menyelesaikan:**
1. **Mulakan sesi baru.** Sesi segar bermula pada taint PUBLIC. Gunakan perbualan baru.
2. **Gunakan saluran yang diklasifikasikan lebih tinggi.** Hantar respons melalui saluran yang diklasifikasikan pada CONFIDENTIAL atau ke atas.
3. **Fahami apa yang menyebabkan taint.** Semak log untuk entri "Taint escalation" untuk melihat panggilan alat mana yang meningkatkan klasifikasi sesi.

### "Session taint cannot flow to channel"

Sama seperti write-down, tetapi khusus tentang klasifikasi saluran:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Panggilan alat ke integrasi terklasifikasi juga menguatkuasakan write-down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Tunggu, ini kelihatan terbalik. Taint sesi lebih tinggi dari klasifikasi alat. Ini bermakna sesi terlalu tercemar untuk menggunakan alat yang diklasifikasikan lebih rendah. Kebimbangannya ialah memanggil alat tersebut mungkin membocorkan konteks terklasifikasi ke dalam sistem yang kurang selamat.

### "Workspace write-down blocked"

Ruang kerja ejen mempunyai klasifikasi bagi setiap direktori. Menulis ke direktori yang diklasifikasikan lebih rendah dari sesi yang lebih tercemar disekat:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Peningkatan Taint

### "Taint escalation"

Ini adalah maklumat, bukan ralat. Ia bermakna tahap klasifikasi sesi baru sahaja meningkat kerana ejen mengakses data terklasifikasi.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint hanya naik, tidak pernah turun. Setelah sesi tercemar ke CONFIDENTIAL, ia kekal begitu sepanjang sesi.

### "Resource-based taint escalation firing"

Panggilan alat mengakses sumber dengan klasifikasi yang lebih tinggi dari taint semasa sesi. Taint sesi secara automatik ditingkatkan untuk sepadan.

### "Non-owner taint applied"

Pengguna bukan pemilik mungkin mempunyai sesi mereka yang dicontaminasi berdasarkan klasifikasi saluran atau kebenaran pengguna. Ini berasingan dari taint berasaskan sumber.

---

## SSRF (Pemalsuan Permintaan Sisi Pelayan)

### "SSRF blocked: hostname resolves to private IP"

Semua permintaan HTTP keluar (web_fetch, navigasi pelayar, sambungan SSE MCP) melalui perlindungan SSRF. Jika nama hos sasaran diselesaikan ke alamat IP peribadi, permintaan disekat.

**Julat yang disekat:**
- `127.0.0.0/8` (gelung balik)
- `10.0.0.0/8` (peribadi)
- `172.16.0.0/12` (peribadi)
- `192.168.0.0/16` (peribadi)
- `169.254.0.0/16` (pautan-tempatan)
- `0.0.0.0/8` (tidak ditentukan)
- `::1` (gelung balik IPv6)
- `fc00::/7` (ULA IPv6)
- `fe80::/10` (pautan-tempatan IPv6)

Perlindungan ini dikodkan keras dan tidak boleh dilumpuhkan atau dikonfigurasi. Ia menghalang ejen AI daripada diperdaya untuk mengakses perkhidmatan dalaman.

**IPv4 dipetakan ke IPv6:** Alamat seperti `::ffff:127.0.0.1` dikesan dan disekat.

### "SSRF check blocked outbound request"

Sama seperti di atas, tetapi dicatat dari alat web_fetch dan bukannya modul SSRF.

### Kegagalan resolusi DNS

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Nama hos tidak dapat diselesaikan. Semak:
- URL dieja dengan betul
- Pelayan DNS anda boleh dicapai
- Domain benar-benar wujud

---

## Enjin Dasar

### "Hook evaluation failed, defaulting to BLOCK"

Hook dasar mengeluarkan pengecualian semasa penilaian. Apabila ini berlaku, tindakan lalai ialah BLOCK (tolak). Ini adalah lalai yang selamat.

Semak log untuk pengecualian penuh. Ini kemungkinan menunjukkan pepijat dalam peraturan dasar tersuai.

### "Policy rule blocked action"

Peraturan dasar secara eksplisit menolak tindakan tersebut. Entri log menyertakan peraturan mana yang dicetuskan dan sebabnya. Semak bahagian `policy.rules` konfigurasi anda untuk melihat peraturan yang ditakrifkan.

### "Tool floor violation"

Alat dipanggil yang memerlukan tahap klasifikasi minimum, tetapi sesi berada di bawah tahap tersebut.

**Contoh:** Alat pemeriksaan kesihatan memerlukan sekurang-kurangnya klasifikasi INTERNAL (kerana ia mendedahkan dalaman sistem). Jika sesi PUBLIC mencuba menggunakannya, panggilan disekat.

---

## Keselamatan Plugin & Kemahiran

### "Plugin network access blocked"

Plugin berjalan dalam kotak pasir dengan akses rangkaian yang terhad. Mereka hanya boleh mengakses URL pada domain titik akhir yang mereka isytiharkan.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin mencuba mengakses URL yang bukan dalam titik akhir yang diisytiharkan, atau URL diselesaikan ke IP peribadi.

### "Skill activation blocked by classification ceiling"

Kemahiran mengisytiharkan `classification_ceiling` dalam frontmatter SKILL.md mereka. Jika siling berada di bawah tahap taint sesi, kemahiran tidak boleh diaktifkan:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Ini menghalang kemahiran yang diklasifikasikan lebih rendah daripada terdedah kepada data yang diklasifikasikan lebih tinggi.

### "Skill content integrity check failed"

Selepas pemasangan, Triggerfish membuat hash kandungan kemahiran. Jika hash berubah (kemahiran diubah suai selepas pemasangan), pemeriksaan integriti gagal:

```
Skill content hash mismatch detected
```

Ini mungkin menunjukkan gangguan. Pasang semula kemahiran dari sumber yang dipercayai.

### "Skill install rejected by scanner"

Pengimbas keselamatan menemui kandungan yang mencurigakan dalam kemahiran. Pengimbas menyemak corak yang boleh menunjukkan tingkah laku berniat jahat. Amaran khusus disertakan dalam mesej ralat.

---

## Keselamatan Sesi

### "Session not found"

```
Session not found: <session-id>
```

Sesi yang diminta tidak wujud dalam pengurus sesi. Ia mungkin telah dibersihkan, atau ID sesi tidak sah.

### "Session status access denied: taint exceeds caller"

Anda cuba melihat status sesi, tetapi sesi tersebut mempunyai tahap taint yang lebih tinggi dari sesi semasa anda. Ini menghalang sesi yang diklasifikasikan lebih rendah daripada mengetahui tentang operasi yang diklasifikasikan lebih tinggi.

### "Session history access denied"

Konsep yang sama seperti di atas, tetapi untuk melihat sejarah perbualan.

---

## Pasukan Ejen

### "Team message delivery denied: team status is ..."

Pasukan tidak dalam status `running`. Ini berlaku apabila:

- Pasukan telah **dibubarkan** (secara manual atau oleh pemantau kitar hidup)
- Pasukan telah **dijeda** kerana sesi pimpinan gagal
- Pasukan **tamat masa** selepas melebihi had jangka hayatnya

Semak status semasa pasukan dengan `team_status`. Jika pasukan dijeda kerana kegagalan pimpinan, anda boleh membubarkannya dengan `team_disband` dan mencipta yang baru.

### "Team member not found" / "Team member ... is not active"

Ahli sasaran sama ada tidak wujud (nama peranan salah) atau telah ditamatkan. Ahli ditamatkan apabila:

- Mereka melebihi tamat masa terbiar (2x `idle_timeout_seconds`)
- Pasukan dibubarkan
- Sesi mereka ranap dan pemantau kitar hidup mengesannya

Gunakan `team_status` untuk melihat semua ahli dan status semasa mereka.

### "Team disband denied: only the lead or creating session can disband"

Hanya dua sesi boleh membubarkan pasukan:

1. Sesi yang pada asalnya memanggil `team_create`
2. Sesi ahli pimpinan

Jika anda mendapat ralat ini dari dalam pasukan, ahli yang memanggil bukan pimpinan. Jika anda mendapatnya dari luar pasukan, anda bukan sesi yang menciptanya.

### Pimpinan pasukan terus gagal selepas penciptaan

Sesi ejen pimpinan tidak dapat menyelesaikan giliran pertamanya. Punca biasa:

1. **Ralat pembekal LLM:** Pembekal mengembalikan ralat (had kadar, kegagalan pengesahan, model tidak ditemui). Semak `triggerfish logs` untuk ralat pembekal.
2. **Siling klasifikasi terlalu rendah:** Jika pimpinan memerlukan alat yang diklasifikasikan di atas silingnya, sesi mungkin gagal pada panggilan alat pertama.
3. **Alat hilang:** Pimpinan mungkin memerlukan alat tertentu untuk menguraikan kerja. Pastikan profil alat dikonfigurasi dengan betul.

### Ahli pasukan terbiar dan tidak pernah menghasilkan output

Ahli menunggu pimpinan menghantar kerja kepada mereka melalui `sessions_send`. Jika pimpinan tidak mengurai tugas:

- Model pimpinan mungkin tidak memahami koordinasi pasukan. Cuba model yang lebih berkemampuan untuk peranan pimpinan.
- Penerangan `task` mungkin terlalu kabur untuk pimpinan mengurai kepada sub-tugas.
- Semak `team_status` untuk melihat sama ada pimpinan adalah `active` dan mempunyai aktiviti terkini.

### "Write-down blocked" antara ahli pasukan

Ahli pasukan mengikuti peraturan klasifikasi yang sama seperti semua sesi. Jika satu ahli telah tercemar ke `CONFIDENTIAL` dan cuba menghantar data ke ahli pada `PUBLIC`, semakan write-down menyekatnya. Ini adalah tingkah laku yang dijangka — data terklasifikasi tidak boleh mengalir ke sesi yang diklasifikasikan lebih rendah, walaupun dalam pasukan.

---

## Delegasi & Multi-Ejen

### "Delegation certificate signature invalid"

Delegasi ejen menggunakan sijil kriptografi. Jika semakan tandatangan gagal, delegasi ditolak. Ini menghalang rantai delegasi yang dipalsukan.

### "Delegation certificate expired"

Sijil delegasi mempunyai masa hidup. Jika ia telah tamat tempoh, ejen yang didelegasi tidak lagi boleh bertindak bagi pihak pendelegasi.

### "Delegation chain linkage broken"

Dalam delegasi berbilang hop (A mendelegasi ke B, B mendelegasi ke C), setiap pautan dalam rantai mesti sah. Jika mana-mana pautan terputus, keseluruhan rantai ditolak.

---

## Webhook

### "Webhook HMAC verification failed"

Webhook masuk memerlukan tandatangan HMAC untuk pengesahan. Jika tandatangan tiada, tidak betul bentuknya, atau tidak sepadan:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Semak bahawa:
- Sumber webhook menghantar header tandatangan HMAC yang betul
- Rahsia dikongsi dalam konfigurasi anda sepadan dengan rahsia sumber
- Format tandatangan sepadan (HMAC-SHA256 berkod hex)

### "Webhook replay detected"

Triggerfish menyertakan perlindungan ulangan. Jika muatan webhook diterima kali kedua (tandatangan yang sama), ia ditolak.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Terlalu banyak permintaan webhook dari sumber yang sama dalam tempoh yang singkat. Ini melindungi dari banjir webhook. Tunggu dan cuba lagi.

---

## Integriti Audit

### "previousHash mismatch"

Log audit menggunakan rantaian hash. Setiap entri menyertakan hash entri sebelumnya. Jika rantai terputus, ini bermakna log audit telah diganggu atau rosak.

### "HMAC mismatch"

Tandatangan HMAC entri audit tidak sepadan. Entri mungkin telah diubah suai selepas penciptaan.
