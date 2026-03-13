# Sistem Pengkelasan

Sistem pengkelasan data adalah asas model keselamatan Triggerfish. Setiap data yang memasuki, bergerak melalui, atau meninggalkan sistem membawa label pengkelasan. Label-label ini menentukan ke mana data boleh mengalir — dan yang lebih penting, ke mana ia tidak boleh.

## Tahap Pengkelasan

Triggerfish menggunakan hierarki empat peringkat yang tersusun tunggal untuk semua penyebaran.

| Tahap | Kedudukan | Keterangan | Contoh |
| -------------- | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `RESTRICTED` | 4 (tertinggi) | Data paling sensitif yang memerlukan perlindungan maksimum | Dokumen M&A, bahan lembaga, PII, akaun bank, rekod perubatan |
| `CONFIDENTIAL` | 3 | Maklumat sensitif perniagaan atau sensitif peribadi | Data CRM, kewangan, rekod HR, kontrak, rekod cukai |
| `INTERNAL` | 2 | Tidak dimaksudkan untuk perkongsian luaran | Wiki dalaman, dokumen pasukan, nota peribadi, kenalan |
| `PUBLIC` | 1 (terendah) | Selamat untuk sesiapa lihat | Bahan pemasaran, dokumentasi awam, kandungan web umum |

## Peraturan Tiada Write-Down

Invarian keselamatan tunggal paling penting dalam Triggerfish:

::: danger Data hanya boleh mengalir ke saluran atau penerima pada pengkelasan yang **sama atau lebih tinggi**. Ini adalah **peraturan tetap** — ia tidak boleh dikonfigurasi, dikesampingkan, atau dilumpuhkan. LLM tidak boleh mempengaruhi keputusan ini. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Hierarki pengkelasan: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Data hanya mengalir ke atas." style="max-width: 100%;" />

Ini bermakna:

- Respons yang mengandungi data `CONFIDENTIAL` tidak boleh dihantar ke saluran `PUBLIC`
- Sesi yang dicemarkan pada `RESTRICTED` tidak boleh mengeluarkan ke mana-mana saluran di bawah `RESTRICTED`
- Tiada penggantian pentadbir, tiada escape hatch enterprise, dan tiada penyelesaian LLM

## Pengkelasan Berkesan

Saluran dan penerima kedua-duanya membawa tahap pengkelasan. Apabila data hendak meninggalkan sistem, **pengkelasan berkesan** destinasi menentukan apa yang boleh dihantar:

```
PENGKELASAN_BERKESAN = min(pengkelasan_saluran, pengkelasan_penerima)
```

Pengkelasan berkesan adalah yang _lebih rendah_ daripada kedua-duanya. Ini bermakna saluran pengkelasan tinggi dengan penerima pengkelasan rendah masih dianggap sebagai pengkelasan rendah.

| Saluran | Penerima | Berkesan | Boleh terima data CONFIDENTIAL? |
| -------------- | ---------- | -------------- | ------------------------------ |
| `INTERNAL` | `INTERNAL` | `INTERNAL` | Tidak (CONFIDENTIAL > INTERNAL) |
| `INTERNAL` | `EXTERNAL` | `PUBLIC` | Tidak |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL` | Tidak (CONFIDENTIAL > INTERNAL) |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC` | Tidak |
| `RESTRICTED` | `INTERNAL` | `INTERNAL` | Tidak (CONFIDENTIAL > INTERNAL) |

## Peraturan Pengkelasan Saluran

Setiap jenis saluran mempunyai peraturan khusus untuk menentukan tahap pengkelaannya.

### E-mel

- **Padanan domain**: Mesej `@company.com` dikelaskan sebagai `INTERNAL`
- Pentadbir mengkonfigurasi domain mana yang dalaman
- Domain yang tidak diketahui atau luaran lalai kepada `EXTERNAL`
- Penerima luaran mengurangkan pengkelasan berkesan kepada `PUBLIC`

### Slack / Teams

- **Keahlian ruang kerja**: Ahli ruang kerja/penyewa yang sama adalah `INTERNAL`
- Pengguna luaran Slack Connect dikelaskan sebagai `EXTERNAL`
- Pengguna tetamu dikelaskan sebagai `EXTERNAL`
- Pengkelasan diperoleh daripada API platform, bukan daripada tafsiran LLM

### WhatsApp / Telegram / iMessage

- **Enterprise**: Nombor telefon yang dipadankan dengan penyegerakan direktori HR menentukan dalaman vs. luaran
- **Peribadi**: Semua penerima lalai kepada `EXTERNAL`
- Pengguna boleh menandakan kenalan yang dipercayai, tetapi ini tidak mengubah matematik pengkelasan — ia mengubah pengkelasan penerima

### WebChat

- Pelawat WebChat sentiasa dikelaskan sebagai `PUBLIC` (pelawat tidak pernah disahkan sebagai pemilik)
- WebChat dimaksudkan untuk interaksi yang menghadap awam

### CLI

- Saluran CLI berjalan secara tempatan dan dikelaskan berdasarkan pengguna yang disahkan
- Akses terminal langsung biasanya `INTERNAL` atau lebih tinggi

## Sumber Pengkelasan Penerima

### Enterprise

- **Penyegerakan direktori** (Okta, Azure AD, Google Workspace) secara automatik mengisi pengkelasan penerima
- Semua ahli direktori dikelaskan sebagai `INTERNAL`
- Tetamu dan vendor luaran dikelaskan sebagai `EXTERNAL`
- Pentadbir boleh menggantikan per-kenalan atau per-domain

### Peribadi

- **Lalai**: Semua penerima adalah `EXTERNAL`
- Pengguna mengklasifikasikan semula kenalan yang dipercayai melalui gesaan dalam aliran atau aplikasi pendamping
- Pengklasifikasian semula adalah eksplisit dan dilog

## Keadaan Saluran

Setiap saluran maju melalui mesin keadaan sebelum ia boleh membawa data:

<img src="/diagrams/state-machine.svg" alt="Mesin keadaan saluran: TIDAK DIPERCAYAI → DIKELASKAN atau DISEKAT" style="max-width: 100%;" />

| Keadaan | Boleh terima data? | Boleh hantar data ke konteks ejen? | Keterangan |
| ------------ | :-----------------: | :-------------------------------: | ------------------------------------------------------ |
| `UNTRUSTED` | Tidak | Tidak | Lalai untuk saluran baru/tidak diketahui. Diasingkan sepenuhnya. |
| `CLASSIFIED` | Ya (dalam dasar) | Ya (dengan pengkelasan) | Disemak dan diberikan tahap pengkelasan. |
| `BLOCKED` | Tidak | Tidak | Dilarang secara eksplisit oleh pentadbir atau pengguna. |

::: warning KESELAMATAN Saluran baru sentiasa berada dalam keadaan `UNTRUSTED`. Mereka tidak boleh menerima sebarang data daripada ejen dan tidak boleh menghantar data ke dalam konteks ejen. Saluran kekal diasingkan sepenuhnya sehingga pentadbir (enterprise) atau pengguna (peribadi) mengkelaskannya secara eksplisit. :::

## Cara Pengkelasan Berinteraksi dengan Sistem Lain

Pengkelasan bukan ciri yang berdiri sendiri — ia memacu keputusan di seluruh platform:

| Sistem | Cara pengkelasan digunakan |
| -------------------- | -------------------------------------------------------------------- |
| **Taint sesi** | Mengakses data yang dikelaskan mengeskalasikan sesi ke tahap tersebut |
| **Hook dasar** | PRE_OUTPUT membandingkan taint sesi terhadap pengkelasan destinasi |
| **MCP Gateway** | Respons pelayan MCP membawa pengkelasan yang mencemarkan sesi |
| **Keturunan data** | Setiap rekod keturunan termasuk tahap pengkelasan dan sebab |
| **Pemberitahuan** | Kandungan pemberitahuan tertakluk kepada peraturan pengkelasan yang sama |
| **Delegasi ejen** | Siling pengkelasan ejen yang dipanggil mesti memenuhi taint pemanggil |
| **Sandbox plugin** | SDK plugin mengkelaskan semua data yang dipancarkan secara automatik |
