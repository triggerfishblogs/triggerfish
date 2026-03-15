# Storan

Semua data berkeadaan dalam Triggerfish mengalir melalui abstraksi `StorageProvider` yang bersatu. Tiada modul yang mencipta mekanisme storanan sendiri — setiap komponen yang memerlukan kegigihan mengambil `StorageProvider` sebagai kebergantungan. Reka bentuk ini menjadikan backend boleh ditukar tanpa menyentuh logik perniagaan dan memastikan semua ujian cepat dan deterministik.

## Antara Muka StorageProvider

```typescript
interface StorageProvider {
  /** Dapatkan semula nilai mengikut kunci. Mengembalikan null jika tidak dijumpai. */
  get(key: string): Promise<StorageValue | null>;

  /** Simpan nilai pada kunci. Menggantikan sebarang nilai yang sedia ada. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Padamkan kunci. Tiada-op jika kunci tidak wujud. */
  delete(key: string): Promise<void>;

  /** Senaraikan semua kunci yang sepadan dengan awalan pilihan. */
  list(prefix?: string): Promise<string[]>;

  /** Padamkan semua kunci. Gunakan dengan berhati-hati. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` adalah rentetan. Semua data berstruktur (sesi, rekod keturunan, konfigurasi) disiri ke JSON sebelum storan dan dinyahsiri semasa pembacaan. Ini memastikan antara muka mudah dan bebas backend. :::

## Pelaksanaan

| Backend | Kes Penggunaan | Kegigihan | Konfigurasi |
| ----------------------- | --------------------------- | -------------------------------------------------- | ------------------------------- |
| `MemoryStorageProvider` | Ujian, sesi sementara | Tiada (hilang semasa pemulaan semula) | Tiada konfigurasi diperlukan |
| `SqliteStorageProvider` | Lalai untuk peringkat peribadi | SQLite WAL di `~/.triggerfish/data/triggerfish.db` | Konfigurasi sifar |
| Backend enterprise | Peringkat enterprise | Diuruskan pelanggan | Postgres, S3, atau backend lain |

### MemoryStorageProvider

Digunakan dalam semua ujian untuk kelajuan dan determinisme. Data hanya wujud dalam memori dan hilang apabila proses keluar. Setiap suite ujian mencipta `MemoryStorageProvider` baharu, memastikan ujian adalah terpencil dan boleh diulang.

### SqliteStorageProvider

Lalai untuk penyebaran peringkat peribadi. Menggunakan SQLite dalam mod WAL (Write-Ahead Logging) untuk akses baca serentak dan keselamatan kerosakan. Pangkalan data berada di:

```
~/.triggerfish/data/triggerfish.db
```

SQLite tidak memerlukan konfigurasi, tiada proses pelayan, dan tiada rangkaian. Satu fail menyimpan semua keadaan Triggerfish.

::: tip Mod SQLite WAL membolehkan berbilang pembaca mengakses pangkalan data secara serentak dengan satu penulis. Ini penting untuk Gateway, yang mungkin membaca keadaan sesi semasa ejen menulis keputusan alat. :::

### Backend Enterprise

Penyebaran enterprise boleh memasang backend storan luaran (Postgres, S3, dll.) tanpa perubahan kod. Sebarang pelaksanaan antara muka `StorageProvider` berfungsi. Backend dikonfigurasi dalam `triggerfish.yaml`.

## Kunci Bernamespace

Semua kunci dalam sistem storan diruang nama dengan awalan yang mengenal pasti jenis data. Ini mencegah perlanggaran dan membolehkan pertanyaan, pengekalan, dan penyucian data mengikut kategori.

| Namespace | Corak Kunci | Keterangan |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:` | `sessions:sess_abc123` | Keadaan sesi (sejarah perbualan, metadata) |
| `taint:` | `taint:sess_abc123` | Tahap taint sesi |
| `lineage:` | `lineage:lin_789xyz` | Rekod keturunan data (penjejakan provenance) |
| `audit:` | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Entri log audit |
| `cron:` | `cron:job_daily_report` | Keadaan cron job dan sejarah pelaksanaan |
| `notifications:` | `notifications:notif_456` | Baris gilir pemberitahuan |
| `exec:` | `exec:run_789` | Sejarah persekitaran pelaksanaan ejen |
| `skills:` | `skills:skill_weather` | Metadata kemahiran yang dipasang |
| `config:` | `config:v3` | Petikan konfigurasi |

## Dasar Pengekalan

Setiap namespace mempunyai dasar pengekalan lalai. Penyebaran enterprise boleh menyesuaikan ini.

| Namespace | Pengekalan Lalai | Rasional |
| ---------------- | ------------------------- | ------------------------------------------ |
| `sessions:` | 30 hari | Sejarah perbualan tamat tempoh |
| `taint:` | Sepadan dengan pengekalan sesi | Taint tidak bermakna tanpa sesinya |
| `lineage:` | 90 hari | Dipacu pematuhan, jejak audit |
| `audit:` | 1 tahun | Dipacu pematuhan, undang-undang dan kawal selia |
| `cron:` | 30 hari | Sejarah pelaksanaan untuk penyahpepijatan |
| `notifications:` | Sehingga dihantar + 7 hari | Pemberitahuan yang tidak dihantar mesti berterusan |
| `exec:` | 30 hari | Artifak pelaksanaan untuk penyahpepijatan |
| `skills:` | Kekal | Metadata kemahiran yang dipasang tidak seharusnya tamat tempoh |
| `config:` | 10 versi | Sejarah konfigurasi bergulir untuk rollback |

## Prinsip Reka Bentuk

### Semua Modul Menggunakan StorageProvider

Tiada modul dalam Triggerfish yang mencipta mekanisme storanan sendiri. Pengurusan sesi, penjejakan taint, rakaman keturunan, pengelogan audit, keadaan cron, baris gilir pemberitahuan, sejarah pelaksanaan, dan konfigurasi — semua mengalir melalui `StorageProvider`.

Ini bermakna:

- Menukar backend memerlukan perubahan satu titik suntikan kebergantungan
- Ujian menggunakan `MemoryStorageProvider` untuk kelajuan — tiada persediaan SQLite, tiada sistem fail
- Terdapat tepat satu tempat untuk melaksanakan penyulitan-semasa-rehat, sandaran, atau replikasi

### Kebolehubahan

Operasi sesi adalah tidak boleh diubah. Membaca sesi, mengubahnya, dan menulisnya semula sentiasa menghasilkan objek baru. Fungsi tidak pernah mengubah objek yang disimpan di tempatnya. Ini selaras dengan prinsip Triggerfish yang lebih luas bahawa fungsi mengembalikan objek baru dan tidak pernah mengubah.

## Struktur Direktori

```
~/.triggerfish/
  config/          # Konfigurasi ejen, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Persekitaran exec ejen
    <agent-id>/    # Ruang kerja per-ejen (berterusan)
    background/    # Ruang kerja sesi latar belakang
  skills/          # Kemahiran yang dipasang
  logs/            # Log audit
  secrets/         # Stor kelayakan yang disulitkan
```

::: warning KESELAMATAN Direktori `secrets/` mengandungi kelayakan yang disulitkan yang diuruskan oleh integrasi keychain OS. Jangan simpan rahsia dalam fail konfigurasi atau dalam `StorageProvider`. Gunakan keychain OS (peringkat peribadi) atau integrasi vault (peringkat enterprise). :::
