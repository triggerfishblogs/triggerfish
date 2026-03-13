# Memilih Tahap Pengkelasan

Setiap saluran, pelayan MCP, integrasi, dan plugin dalam Triggerfish mesti mempunyai tahap pengkelasan. Halaman ini membantu anda memilih yang betul.

## Empat Tahap

| Tahap | Maksudnya | Data mengalir ke... |
| ---------------- | ------------------------------------------------------ | ---------------------------------- |
| **PUBLIC** | Selamat untuk sesiapa lihat | Mana-mana sahaja |
| **INTERNAL** | Untuk mata anda sahaja — tiada yang sensitif, tetapi bukan awam | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Mengandungi data sensitif yang tidak anda mahu bocor | CONFIDENTIAL, RESTRICTED |
| **RESTRICTED** | Paling sensitif — undang-undang, perubatan, kewangan, PII | RESTRICTED sahaja |

Data hanya boleh mengalir **ke atas atau ke sisi**, tidak pernah ke bawah. Ini adalah [peraturan tiada write-down](/ms-MY/security/no-write-down) dan ia tidak boleh dikesampingkan.

## Dua Soalan yang Perlu Ditanya

Untuk sebarang integrasi yang anda konfigurasikan, tanya:

**1. Apakah data paling sensitif yang boleh dikembalikan oleh sumber ini?**

Ini menentukan tahap pengkelasan **minimum**. Jika pelayan MCP boleh mengembalikan data kewangan, ia mesti sekurang-kurangnya CONFIDENTIAL — walaupun kebanyakan alatnya mengembalikan metadata yang tidak berbahaya.

**2. Adakah saya selesa jika data sesi mengalir _ke_ destinasi ini?**

Ini menentukan tahap pengkelasan **maksimum** yang anda mahu tetapkan. Pengkelasan yang lebih tinggi bermakna taint sesi meningkat apabila anda menggunakannya, yang mengehadkan ke mana data boleh mengalir selepas itu.

## Pengkelasan mengikut Jenis Data

| Jenis data | Tahap yang disyorkan | Mengapa |
| ------------------------------------------ | ----------------- | ---------------------------------------- |
| Cuaca, halaman web awam, zon waktu | **PUBLIC** | Tersedia secara bebas kepada sesiapa |
| Nota peribadi, penanda buku, senarai tugas | **INTERNAL** | Peribadi tetapi tidak berbahaya jika didedahkan |
| Wiki dalaman, dokumen pasukan, papan projek | **INTERNAL** | Maklumat dalaman organisasi |
| E-mel, acara kalendar, kenalan | **CONFIDENTIAL** | Mengandungi nama, jadual, hubungan |
| Data CRM, saluran paip jualan, rekod pelanggan | **CONFIDENTIAL** | Sensitif perniagaan, data pelanggan |
| Rekod kewangan, akaun bank, invois | **CONFIDENTIAL** | Maklumat monetari |
| Repositori kod sumber (peribadi) | **CONFIDENTIAL** | Harta intelek |
| Rekod perubatan atau kesihatan | **RESTRICTED** | Dilindungi undang-undang (HIPAA, dll.) |
| Nombor ID kerajaan, SSN, pasport | **RESTRICTED** | Risiko kecurian identiti |
| Dokumen undang-undang, kontrak di bawah NDA | **RESTRICTED** | Pendedahan undang-undang |
| Kunci penyulitan, kelayakan, rahsia | **RESTRICTED** | Risiko kompromi sistem |

## Pelayan MCP

Apabila menambah pelayan MCP ke `triggerfish.yaml`, pengkelasan menentukan dua perkara:

1. **Taint sesi** — memanggil mana-mana alat pada pelayan ini mengeskalasikan sesi ke tahap ini
2. **Pencegahan write-down** — sesi yang sudah dicemarkan di atas tahap ini tidak boleh menghantar data _ke_ pelayan ini

```yaml
mcp_servers:
  # PUBLIC — data terbuka, tiada sensitiviti
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — sistem fail anda sendiri, peribadi tetapi bukan rahsia
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — mengakses repo peribadi, isu pelanggan
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — pangkalan data dengan PII, rekod perubatan, dokumen undang-undang
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning TOLAK SEBAGAI LALAI Jika anda meninggalkan `classification`, pelayan didaftarkan sebagai **TIDAK DIPERCAYAI** dan gateway menolak semua panggilan alat. Anda mesti memilih tahap secara eksplisit. :::

### Pengkelasan Pelayan MCP Biasa

| Pelayan MCP | Tahap yang dicadangkan | Alasan |
| ------------------------------ | --------------- | --------------------------------------------- |
| Sistem fail (dokumen awam) | PUBLIC | Hanya mendedahkan fail yang tersedia secara awam |
| Sistem fail (direktori rumah) | INTERNAL | Fail peribadi, tiada yang rahsia |
| Sistem fail (projek kerja) | CONFIDENTIAL | Mungkin mengandungi kod atau data proprietari |
| GitHub (repo awam sahaja) | INTERNAL | Kod adalah awam tetapi corak penggunaan adalah peribadi |
| GitHub (repo peribadi) | CONFIDENTIAL | Kod sumber proprietari |
| Slack | CONFIDENTIAL | Perbualan tempat kerja, mungkin sensitif |
| Pangkalan data (analitik/pelaporan) | CONFIDENTIAL | Data perniagaan agregat |
| Pangkalan data (pengeluaran dengan PII) | RESTRICTED | Mengandungi maklumat yang boleh mengenal pasti individu |
| Cuaca / masa / kalkulator | PUBLIC | Tiada data sensitif |
| Carian web | PUBLIC | Mengembalikan maklumat yang tersedia secara awam |
| E-mel | CONFIDENTIAL | Nama, perbualan, lampiran |
| Google Drive | CONFIDENTIAL | Dokumen mungkin mengandungi data perniagaan sensitif |

## Saluran

Pengkelasan saluran menentukan **siling** — sensitiviti maksimum data yang boleh dihantar ke saluran tersebut.

```yaml
channels:
  cli:
    classification: INTERNAL # Terminal tempatan anda — selamat untuk data dalaman
  telegram:
    classification: INTERNAL # Bot peribadi anda — sama seperti CLI untuk pemilik
  webchat:
    classification: PUBLIC # Pelawat tanpa nama — data awam sahaja
  email:
    classification: CONFIDENTIAL # E-mel adalah peribadi tetapi boleh diteruskan
```

::: tip PEMILIK vs. BUKAN-PEMILIK Untuk **pemilik**, semua saluran mempunyai tahap kepercayaan yang sama — anda adalah anda, tanpa mengira aplikasi yang anda gunakan. Pengkelasan saluran paling penting untuk **pengguna bukan-pemilik** (pelawat di webchat, ahli di saluran Slack, dll.) di mana ia mengekang data yang boleh mengalir kepada mereka. :::

### Memilih Pengkelasan Saluran

| Soalan | Jika ya... | Jika tidak... |
| ----------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Bolehkah orang asing melihat mesej di saluran ini? | **PUBLIC** | Teruskan membaca |
| Adakah saluran ini hanya untuk anda secara peribadi? | **INTERNAL** atau lebih tinggi | Teruskan membaca |
| Bolehkah mesej diteruskan, diskilkrin, atau dilog oleh pihak ketiga? | Had pada **CONFIDENTIAL** | Boleh jadi **RESTRICTED** |
| Adakah saluran disulitkan hujung-ke-hujung dan di bawah kawalan penuh anda? | Boleh jadi **RESTRICTED** | Had pada **CONFIDENTIAL** |

## Apa yang Berlaku Apabila Anda Tersalah

**Terlalu rendah (cth., pelayan CONFIDENTIAL ditanda PUBLIC):**

- Data daripada pelayan ini tidak akan mengeskalasikan taint sesi
- Sesi boleh mengalirkan data yang dikelaskan ke saluran awam — **risiko kebocoran data**
- Ini adalah arah yang berbahaya

**Terlalu tinggi (cth., pelayan PUBLIC ditanda CONFIDENTIAL):**

- Taint sesi meningkat secara tidak perlu apabila menggunakan pelayan ini
- Anda akan disekat daripada menghantar ke saluran yang dikelaskan lebih rendah selepas itu
- Menjengkelkan tetapi **selamat** — tersalah ke pihak yang lebih tinggi

::: danger Apabila ragu-ragu, **kelaskan lebih tinggi**. Anda sentiasa boleh merendahkannya kemudian selepas menyemak data yang sebenarnya dikembalikan oleh pelayan. Pengkelasan yang terlalu rendah adalah risiko keselamatan; pengkelasan yang terlalu tinggi hanyalah ketidakselesaan. :::

## Lata Taint

Memahami impak praktikal membantu anda memilih dengan bijak. Berikut adalah apa yang berlaku dalam sesi:

```
1. Sesi bermula pada PUBLIC
2. Anda bertanya tentang cuaca (pelayan PUBLIC)     → taint kekal PUBLIC
3. Anda semak nota anda (sistem fail INTERNAL)    → taint meningkat ke INTERNAL
4. Anda query isu GitHub (CONFIDENTIAL)        → taint meningkat ke CONFIDENTIAL
5. Anda cuba menyiar ke webchat (saluran PUBLIC)   → DISEKAT (pelanggaran write-down)
6. Anda tetapkan semula sesi                         → taint kembali ke PUBLIC
7. Anda siar ke webchat                           → dibenarkan
```

## Laluan Sistem Fail

Anda juga boleh mengkelaskan laluan sistem fail individu, yang berguna apabila ejen anda mempunyai akses ke direktori dengan kepekaan campuran:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Senarai Semak Ulasan

Sebelum menggunakan integrasi baru:

- [ ] Apakah data paling teruk yang boleh dikembalikan sumber ini? Kelaskan pada tahap tersebut.
- [ ] Adakah pengkelasan sekurang-kurangnya setinggi yang disarankan oleh jadual jenis data?
- [ ] Jika ini adalah saluran, adakah pengkelasan sesuai untuk semua penerima yang mungkin?
- [ ] Adakah anda telah menguji bahawa lata taint berfungsi untuk aliran kerja biasa anda?
- [ ] Apabila ragu-ragu, adakah anda mengkelaskan lebih tinggi daripada lebih rendah?

## Halaman Berkaitan

- [Peraturan Tiada Write-Down](/ms-MY/security/no-write-down) — peraturan aliran data yang tetap
- [Konfigurasi](/ms-MY/guide/configuration) — rujukan YAML penuh
- [MCP Gateway](/ms-MY/integrations/mcp-gateway) — model keselamatan pelayan MCP
