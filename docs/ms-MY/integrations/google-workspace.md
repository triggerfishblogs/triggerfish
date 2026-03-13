# Google Workspace

Sambungkan akaun Google anda untuk memberi ejen anda akses ke Gmail, Calendar, Tasks, Drive, dan Sheets.

## Prasyarat

- Akaun Google
- Projek Google Cloud dengan kelayakan OAuth

## Persediaan

### Langkah 1: Cipta Projek Google Cloud

1. Pergi ke [Google Cloud Console](https://console.cloud.google.com/)
2. Klik dropdown projek di bahagian atas dan pilih **New Project**
3. Namakannya "Triggerfish" (atau apa sahaja yang anda suka) dan klik **Create**

### Langkah 2: Aktifkan API

Aktifkan setiap API ini dalam projek anda:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Klik **Enable** pada setiap halaman. Ini hanya perlu dilakukan sekali per projek.

### Langkah 3: Konfigurasikan Skrin Persetujuan OAuth

Sebelum anda boleh mencipta kelayakan, Google memerlukan skrin persetujuan OAuth. Ini adalah skrin yang dilihat oleh pengguna apabila memberikan akses.

1. Pergi ke [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Jenis pengguna: pilih **External** (atau **Internal** jika anda berada dalam organisasi Google Workspace dan hanya mahu pengguna org)
3. Klik **Create**
4. Isi medan yang diperlukan:
   - **App name**: "Triggerfish" (atau apa sahaja yang anda suka)
   - **User support email**: alamat e-mel anda
   - **Developer contact email**: alamat e-mel anda
5. Klik **Save and Continue**
6. Pada skrin **Scopes**, klik **Add or Remove Scopes** dan tambah:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Klik **Update**, kemudian **Save and Continue**
8. Pergi ke halaman **Audience** (dalam bar sisi kiri di bawah "OAuth consent screen") — di sinilah anda akan menemui bahagian **Test users**
9. Klik **+ Add Users** dan tambah alamat e-mel Google anda sendiri
10. Klik **Save and Continue**, kemudian **Back to Dashboard**

::: warning Selagi aplikasi anda dalam status "Testing", hanya pengguna ujian yang anda tambah boleh memberi kuasa. Ini baik untuk kegunaan peribadi. Menerbitkan aplikasi menghapuskan sekatan pengguna ujian tetapi memerlukan pengesahan Google. :::

### Langkah 4: Cipta Kelayakan OAuth

1. Pergi ke [Credentials](https://console.cloud.google.com/apis/credentials)
2. Klik **+ CREATE CREDENTIALS** di bahagian atas
3. Pilih **OAuth client ID**
4. Jenis aplikasi: **Desktop app**
5. Nama: "Triggerfish" (atau apa sahaja yang anda suka)
6. Klik **Create**
7. Salin **Client ID** dan **Client Secret**

### Langkah 5: Sambungkan

```bash
triggerfish connect google
```

Anda akan diminta untuk:

1. **Client ID** anda
2. **Client Secret** anda

Tetingkap pelayar akan dibuka untuk anda memberikan akses. Selepas kebenaran, token disimpan dengan selamat dalam keychain OS anda (macOS Keychain atau Linux libsecret). Tiada kelayakan disimpan dalam fail konfigurasi atau pemboleh ubah persekitaran.

### Sambungan Terputus

```bash
triggerfish disconnect google
```

Membuang semua token Google dari keychain anda. Anda boleh menyambungkan semula pada bila-bila masa dengan menjalankan `connect` semula.

## Alat yang Tersedia

Sebaik sahaja disambungkan, ejen anda mempunyai akses ke 14 alat:

| Alat              | Keterangan                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `gmail_search`    | Cari e-mel mengikut pertanyaan (menyokong sintaks carian Gmail) |
| `gmail_read`      | Baca e-mel tertentu mengikut ID                                  |
| `gmail_send`      | Tulis dan hantar e-mel                                           |
| `gmail_label`     | Tambah atau buang label pada mesej                               |
| `calendar_list`   | Senaraikan peristiwa kalendar yang akan datang                   |
| `calendar_create` | Cipta peristiwa kalendar baru                                    |
| `calendar_update` | Kemas kini peristiwa yang sedia ada                              |
| `tasks_list`      | Senaraikan tugas dari Google Tasks                               |
| `tasks_create`    | Cipta tugas baru                                                 |
| `tasks_complete`  | Tandakan tugas sebagai selesai                                   |
| `drive_search`    | Cari fail dalam Google Drive                                     |
| `drive_read`      | Baca kandungan fail (mengeksport Google Docs sebagai teks)       |
| `sheets_read`     | Baca julat dari hamparan                                         |
| `sheets_write`    | Tulis nilai ke julat hamparan                                    |

## Contoh Interaksi

Tanya ejen anda perkara seperti:

- "Apa yang ada dalam kalendar saya hari ini?"
- "Cari e-mel saya untuk mesej dari alice@example.com"
- "Hantar e-mel kepada bob@example.com dengan subjek 'Nota mesyuarat'"
- "Cari hamparan bajet Q4 dalam Drive"
- "Tambah 'Beli barang runcit' ke senarai tugas saya"
- "Baca sel A1:D10 dari hamparan Jualan"

## Skop OAuth

Triggerfish meminta skop ini semasa kebenaran:

| Skop             | Tahap Akses                                    |
| ---------------- | ---------------------------------------------- |
| `gmail.modify`   | Baca, hantar, dan uruskan e-mel dan label      |
| `calendar`       | Akses baca/tulis penuh ke Google Calendar      |
| `tasks`          | Akses baca/tulis penuh ke Google Tasks         |
| `drive.readonly` | Akses baca-sahaja ke fail Google Drive         |
| `spreadsheets`   | Akses baca dan tulis ke Google Sheets          |

::: tip Akses Drive adalah baca-sahaja. Triggerfish boleh mencari dan membaca fail anda tetapi tidak boleh mencipta, mengubah, atau memadam. Sheets mempunyai akses tulis berasingan untuk kemas kini sel hamparan. :::

## Keselamatan

- Semua data Google Workspace diklasifikasikan sekurang-kurangnya **INTERNAL**
- Kandungan e-mel, perincian kalendar, dan kandungan dokumen biasanya **CONFIDENTIAL**
- Token disimpan dalam keychain OS (macOS Keychain / Linux libsecret)
- Kelayakan klien disimpan bersama token dalam keychain, tidak pernah dalam pemboleh ubah persekitaran atau fail konfigurasi
- [Peraturan Tanpa Tulis-Bawah](/ms-MY/security/no-write-down) terpakai: data Google CONFIDENTIAL tidak boleh mengalir ke saluran PUBLIC
- Semua panggilan alat direkodkan dalam jejak audit dengan konteks pengkelasan penuh

## Penyelesaian Masalah

### "No Google tokens found"

Jalankan `triggerfish connect google` untuk mengesah.

### "Google refresh token revoked or expired"

Token refresh anda dibatalkan (contoh, anda membatalkan akses dalam tetapan Akaun Google). Jalankan `triggerfish connect google` untuk menyambungkan semula.

### "Access blocked: has not completed the Google verification process"

Ini bermakna akaun Google anda tidak disenaraikan sebagai pengguna ujian untuk aplikasi. Selagi aplikasi dalam status "Testing" (lalai), hanya akaun yang ditambah secara eksplisit sebagai pengguna ujian boleh memberi kuasa.

1. Pergi ke [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Pergi ke halaman **Audience** (dalam bar sisi kiri)
3. Dalam bahagian **Test users**, klik **+ Add Users** dan tambah alamat e-mel Google anda
4. Simpan dan cuba `triggerfish connect google` semula

### "Token exchange failed"

Semak semula Client ID dan Client Secret anda. Pastikan:

- Jenis klien OAuth adalah "Desktop app"
- Semua API yang diperlukan diaktifkan dalam projek Google Cloud anda
- Akaun Google anda disenaraikan sebagai pengguna ujian (jika aplikasi dalam mod pengujian)

### API tidak diaktifkan

Jika anda melihat ralat 403 untuk perkhidmatan tertentu, pastikan API yang sepadan diaktifkan dalam [Perpustakaan API Google Cloud Console](https://console.cloud.google.com/apis/library) anda.
