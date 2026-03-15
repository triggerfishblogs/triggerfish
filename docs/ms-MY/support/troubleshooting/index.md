# Penyelesaian Masalah

Mulakan di sini apabila sesuatu tidak berfungsi. Ikut langkah-langkah mengikut urutan.

## Langkah Pertama

### 1. Semak sama ada daemon sedang berjalan

```bash
triggerfish status
```

Jika daemon tidak berjalan, mulakan ia:

```bash
triggerfish start
```

### 2. Semak log

```bash
triggerfish logs
```

Ini mengekori fail log secara masa nyata. Gunakan penapis tahap untuk mengurangkan bunyi:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Jalankan diagnostik

```bash
triggerfish patrol
```

Patrol menyemak sama ada gateway boleh dicapai, pembekal LLM memberi respons, saluran disambungkan, peraturan dasar dimuatkan, dan kemahiran ditemui. Sebarang semakan yang ditanda `CRITICAL` atau `WARNING` memberitahu anda di mana hendak menumpukan perhatian.

### 4. Sahkan konfigurasi anda

```bash
triggerfish config validate
```

Ini menghurai `triggerfish.yaml`, menyemak medan yang diperlukan, mengesahkan tahap klasifikasi, dan menyelesaikan rujukan rahsia.

## Penyelesaian Masalah Mengikut Kawasan

Jika langkah-langkah pertama di atas tidak menunjukkan masalah, pilih kawasan yang sepadan dengan gejala anda:

- [Pemasangan](/ms-MY/support/troubleshooting/installation) - kegagalan skrip pemasangan, isu binaan dari sumber, masalah platform
- [Daemon](/ms-MY/support/troubleshooting/daemon) - perkhidmatan tidak mahu bermula, konflik port, ralat "sudah berjalan"
- [Konfigurasi](/ms-MY/support/troubleshooting/configuration) - ralat hurai YAML, medan hilang, kegagalan penyelesaian rahsia
- [Saluran](/ms-MY/support/troubleshooting/channels) - bot tidak memberi respons, kegagalan pengesahan, isu penghantaran mesej
- [Pembekal LLM](/ms-MY/support/troubleshooting/providers) - ralat API, model tidak ditemui, kegagalan penstriman
- [Integrasi](/ms-MY/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, pelayan MCP
- [Automasi Pelayar](/ms-MY/support/troubleshooting/browser) - Chrome tidak ditemui, kegagalan pelancaran, navigasi disekat
- [Keselamatan & Klasifikasi](/ms-MY/support/troubleshooting/security) - blok write-down, isu taint, SSRF, penolakan dasar
- [Rahsia & Kelayakan](/ms-MY/support/troubleshooting/secrets) - ralat keychain, stor fail yang disulitkan, masalah kebenaran

## Masih Tersekat?

Jika tiada panduan di atas menyelesaikan isu anda:

1. Kumpulkan [bundle log](/ms-MY/support/guides/collecting-logs)
2. Baca [panduan pemfailan isu](/ms-MY/support/guides/filing-issues)
3. Buka isu di [GitHub](https://github.com/greghavens/triggerfish/issues/new)
