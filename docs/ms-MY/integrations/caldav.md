# Integrasi CalDAV

Sambungkan ejen Triggerfish anda ke mana-mana pelayan kalendar yang serasi CalDAV. Ini membolehkan operasi kalendar merentasi pembekal yang menyokong standard CalDAV, termasuk iCloud, Fastmail, Nextcloud, Radicale, dan mana-mana pelayan CalDAV yang hos sendiri.

## Pembekal yang Disokong

| Pembekal   | URL CalDAV                                      | Nota                              |
| ---------- | ----------------------------------------------- | --------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Memerlukan kata laluan khusus-app |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | CalDAV standard                   |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Hos sendiri                       |
| Radicale   | `https://your-server.com`                       | Hos sendiri ringan                |
| Baikal     | `https://your-server.com/dav.php`               | Hos sendiri                       |

::: info Untuk Google Calendar, gunakan integrasi [Google Workspace](/ms-MY/integrations/google-workspace) sebaliknya, yang menggunakan API Google asli dengan OAuth2. CalDAV adalah untuk pembekal kalendar bukan-Google. :::

## Persediaan

### Langkah 1: Dapatkan Kelayakan CalDAV Anda

Anda memerlukan tiga maklumat dari pembekal kalendar anda:

- **URL CalDAV** -- URL asas untuk pelayan CalDAV
- **Nama pengguna** -- Nama pengguna atau e-mel akaun anda
- **Kata laluan** -- Kata laluan akaun atau kata laluan khusus-app

::: warning Kata Laluan Khusus-App Kebanyakan pembekal memerlukan kata laluan khusus-app berbanding kata laluan akaun utama anda. Semak dokumentasi pembekal anda untuk cara menjananya. :::

### Langkah 2: Konfigurasikan Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # kata laluan disimpan dalam keychain OS
    classification: CONFIDENTIAL
```

| Pilihan          | Jenis  | Diperlukan | Keterangan                                                |
| ---------------- | ------ | ---------- | --------------------------------------------------------- |
| `url`            | string | Ya         | URL asas pelayan CalDAV                                   |
| `username`       | string | Ya         | Nama pengguna atau e-mel akaun                            |
| `password`       | string | Ya         | Kata laluan akaun (disimpan dalam keychain OS)            |
| `classification` | string | Tidak      | Tahap pengkelasan (lalai: `CONFIDENTIAL`)                 |

### Langkah 3: Penemuan Kalendar

Pada sambungan pertama, ejen menjalankan penemuan CalDAV untuk mencari semua kalendar yang tersedia. Kalendar yang ditemui dicache secara tempatan.

```bash
triggerfish connect caldav
```

## Alat yang Tersedia

| Alat                | Keterangan                                                      |
| ------------------- | --------------------------------------------------------------- |
| `caldav_list`       | Senaraikan semua kalendar pada akaun                            |
| `caldav_events`     | Ambil peristiwa untuk julat tarikh dari satu atau semua kalendar |
| `caldav_create`     | Cipta peristiwa kalendar baru                                   |
| `caldav_update`     | Kemas kini peristiwa yang sedia ada                             |
| `caldav_delete`     | Padam peristiwa                                                 |
| `caldav_search`     | Cari peristiwa mengikut pertanyaan teks                         |
| `caldav_freebusy`   | Semak status bebas/sibuk untuk julat masa                       |

## Pengkelasan

Data kalendar lalai ke `CONFIDENTIAL` kerana ia mengandungi nama, jadual, lokasi, dan perincian mesyuarat. Mengakses mana-mana alat CalDAV meningkatkan taint sesi ke tahap pengkelasan yang dikonfigurasi.

## Pengesahan

CalDAV menggunakan HTTP Basic Auth melalui TLS. Kelayakan disimpan dalam keychain OS dan disuntik pada lapisan HTTP di bawah konteks LLM -- ejen tidak pernah melihat kata laluan mentah.

## Halaman Berkaitan

- [Google Workspace](/ms-MY/integrations/google-workspace) -- Untuk Google Calendar (menggunakan API asli)
- [Cron dan Trigger](/ms-MY/features/cron-and-triggers) -- Jadualkan tindakan ejen berasaskan kalendar
- [Panduan Pengkelasan](/ms-MY/guide/classification-guide) -- Memilih tahap pengkelasan yang betul
