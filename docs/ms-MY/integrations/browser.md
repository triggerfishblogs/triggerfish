# Automasi Pelayar

Triggerfish menyediakan kawalan pelayar yang mendalam melalui contoh Chromium yang diurus menggunakan CDP (Chrome DevTools Protocol). Ejen boleh menavigasi web, berinteraksi dengan halaman, mengisi borang, mengambil tangkapan skrin, dan mengautomasikan aliran kerja web -- semuanya di bawah penguatkuasaan dasar.

## Seni Bina

Automasi pelayar dibina di atas `puppeteer-core`, menyambung ke contoh Chromium yang diurus melalui CDP. Setiap tindakan pelayar melalui lapisan dasar sebelum mencapai pelayar.

Triggerfish mengesan pelayar berasaskan Chromium secara automatik termasuk **Google Chrome**, **Chromium**, dan **Brave**. Pengesanan merangkumi laluan pemasangan standard pada Linux, macOS, Windows, dan persekitaran Flatpak.

::: info Alat `browser_navigate` memerlukan URL `http://` atau `https://`. Skema dalaman pelayar (seperti `chrome://`, `brave://`, `about:`) tidak disokong dan akan mengembalikan ralat dengan panduan untuk menggunakan URL web. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Aliran automasi pelayar: Ejen → Alat Pelayar → Lapisan Dasar → CDP → Chromium yang Diurus" style="max-width: 100%;" />

Profil pelayar diasingkan per-ejen. Contoh Chromium yang diurus tidak berkongsi kuki, sesi, atau penyimpanan tempatan dengan pelayar peribadi anda. Pengisian automatik kelayakan dilumpuhkan secara lalai.

## Tindakan yang Tersedia

| Tindakan   | Keterangan                                     | Contoh Penggunaan                                       |
| ---------- | ---------------------------------------------- | ------------------------------------------------------- |
| `navigate` | Pergi ke URL (tertakluk pada dasar domain)     | Buka halaman web untuk penyelidikan                     |
| `snapshot` | Tangkap tangkapan skrin halaman                | Dokumentasikan keadaan UI, ekstrak maklumat visual      |
| `click`    | Klik elemen pada halaman                       | Hantar borang, aktifkan butang                          |
| `type`     | Taip teks ke dalam medan input                 | Isi kotak carian, lengkapkan borang                     |
| `select`   | Pilih pilihan dari menu lungsur                | Pilih dari menu                                         |
| `upload`   | Muat naik fail ke borang                       | Lampirkan dokumen                                       |
| `evaluate` | Jalankan JavaScript dalam konteks halaman (dalam kotak pasir) | Ekstrak data, manipulasi DOM        |
| `wait`     | Tunggu elemen atau syarat                      | Pastikan halaman telah dimuat sebelum berinteraksi      |

## Penguatkuasaan Dasar Domain

Setiap URL yang dinavigasi oleh ejen diperiksa terhadap senarai benarkan dan senarai tolak domain sebelum pelayar bertindak.

### Konfigurasi

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Cara Dasar Domain Berfungsi

1. Ejen memanggil `browser.navigate("https://github.com/org/repo")`
2. Hook `PRE_TOOL_CALL` diaktifkan dengan URL sebagai konteks
3. Enjin dasar memeriksa domain terhadap senarai benarkan/tolak
4. Jika ditolak atau tidak dalam senarai benarkan, navigasi **disekat**
5. Jika dibenarkan, pengkelasan domain dicari
6. Taint sesi ditingkatkan agar sepadan dengan pengkelasan domain
7. Navigasi diteruskan

::: warning KESELAMATAN Jika domain tidak berada dalam senarai benarkan, navigasi disekat secara lalai. LLM tidak boleh menindih dasar domain. Ini menghalang ejen dari melawat tapak web sewenang-wenangnya yang boleh mendedahkan data sensitif atau mencetuskan tindakan yang tidak diingini. :::

## Tangkapan Skrin dan Pengkelasan

Tangkapan skrin yang diambil melalui `browser.snapshot` mewarisi tahap taint semasa sesi. Jika sesi ditaint pada `CONFIDENTIAL`, semua tangkapan skrin dari sesi tersebut diklasifikasikan sebagai `CONFIDENTIAL`.

Ini penting untuk dasar output. Tangkapan skrin yang diklasifikasikan pada `CONFIDENTIAL` tidak boleh dihantar ke saluran `PUBLIC`. Hook `PRE_OUTPUT` menguatkuasakan ini di sempadan.

## Kandungan yang Dikikis dan Keturunan

Apabila ejen mengekstrak kandungan dari halaman web (melalui `evaluate`, membaca teks, atau menghurai elemen), data yang diekstrak:

- Diklasifikasikan berdasarkan tahap pengkelasan yang ditetapkan untuk domain
- Mencipta rekod keturunan yang menjejaki URL sumber, masa pengekstrakan, dan pengkelasan
- Menyumbang kepada taint sesi (taint meningkat agar sepadan dengan pengkelasan kandungan)

Penjejakan keturunan ini bermakna anda sentiasa boleh mengesan asal-usul data, walaupun jika ia dikikis dari halaman web minggu yang lalu.

## Kawalan Keselamatan

### Pengasingan Pelayar Per-Ejen

Setiap ejen mendapat profil pelayarnya sendiri. Ini bermakna:

- Tiada kuki dikongsi antara ejen
- Tiada penyimpanan tempatan atau penyimpanan sesi yang dikongsi
- Tiada akses ke kuki atau sesi pelayar hos
- Pengisian automatik kelayakan dilumpuhkan secara lalai
- Sambungan pelayar tidak dimuatkan

### Integrasi Hook Dasar

Semua tindakan pelayar melalui hook dasar standard:

| Hook                 | Bila Ia Diaktifkan               | Apa yang Diperiksa                                          |
| -------------------- | -------------------------------- | ----------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Sebelum setiap tindakan pelayar  | Senarai benarkan domain, dasar URL, kebenaran tindakan      |
| `POST_TOOL_RESPONSE` | Selepas pelayar mengembalikan data | Kelaskan respons, kemas kini taint sesi, cipta keturunan  |
| `PRE_OUTPUT`         | Apabila kandungan pelayar meninggalkan sistem | Semakan pengkelasan terhadap destinasi             |

### Had Sumber

- Tamat masa navigasi menghalang pelayar dari tergantung tanpa batas waktu
- Had saiz muat halaman menghalang penggunaan memori yang berlebihan
- Had tab serentak dikuatkuasakan per-ejen

## Kawalan Perusahaan

Penerapan perusahaan mempunyai kawalan automasi pelayar tambahan:

| Kawalan                           | Keterangan                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| Pengkelasan peringkat domain      | Domain intranet diklasifikasikan secara automatik sebagai `INTERNAL`                 |
| Senarai domain yang disekat       | Senarai domain yang dilarang yang diurus oleh pentadbir                              |
| Dasar pengekalan tangkapan skrin  | Berapa lama tangkapan skrin yang diambil disimpan                                    |
| Pengelogan audit sesi pelayar     | Pengelogan penuh semua tindakan pelayar untuk pematuhan                              |
| Lumpuhkan automasi pelayar        | Pentadbir boleh melumpuhkan alat pelayar sepenuhnya untuk ejen atau peranan tertentu |

## Contoh: Aliran Kerja Penyelidikan Web

Aliran kerja ejen tipikal menggunakan automasi pelayar:

```
1. Pengguna: "Selidiki harga pesaing di example-competitor.com"

2. Ejen: browser.navigate("https://example-competitor.com/pricing")
         -> PRE_TOOL_CALL: domain "example-competitor.com" diperiksa terhadap senarai benarkan
         -> Dibenarkan, diklasifikasikan sebagai PUBLIC
         -> Navigasi diteruskan

3. Ejen: browser.snapshot()
         -> Tangkapan skrin diambil, diklasifikasikan pada tahap taint sesi (PUBLIC)

4. Ejen: browser.evaluate("document.querySelector('.pricing-table').innerText")
         -> Teks diekstrak, diklasifikasikan sebagai PUBLIC
         -> Rekod keturunan dicipta: sumber=example-competitor.com/pricing

5. Ejen: Meringkaskan maklumat harga dan mengembalikan kepada pengguna
         -> PRE_OUTPUT: Data PUBLIC ke saluran pengguna -- DIBENARKAN
```

Setiap langkah direkodkan, diklasifikasikan, dan boleh diaudit.
