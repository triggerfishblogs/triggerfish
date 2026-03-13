# Obsidian

Sambungkan ejen Triggerfish anda ke satu atau lebih vault [Obsidian](https://obsidian.md/) supaya ia boleh membaca, mencipta, dan mencari nota anda. Integrasi mengakses vault terus pada sistem fail -- tiada aplikasi Obsidian atau plugin diperlukan.

## Apa yang Ia Lakukan

Integrasi Obsidian memberi ejen anda alat-alat ini:

| Alat              | Keterangan                                    |
| ----------------- | --------------------------------------------- |
| `obsidian_read`   | Baca kandungan nota dan frontmatter           |
| `obsidian_write`  | Cipta atau kemas kini nota                    |
| `obsidian_list`   | Senaraikan nota dalam folder                  |
| `obsidian_search` | Cari kandungan nota                           |
| `obsidian_daily`  | Baca atau cipta nota harian hari ini          |
| `obsidian_links`  | Selesaikan wikilink dan cari backlink         |
| `obsidian_delete` | Padam nota                                    |

## Persediaan

### Langkah 1: Sambungkan Vault Anda

```bash
triggerfish connect obsidian
```

Ini meminta laluan vault anda dan menulis konfigurasi. Anda juga boleh mengkonfigurasinya secara manual.

### Langkah 2: Konfigurasikan dalam triggerfish.yaml

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| Pilihan                 | Jenis    | Diperlukan | Keterangan                                                       |
| ----------------------- | -------- | ---------- | ---------------------------------------------------------------- |
| `vaultPath`             | string   | Ya         | Laluan mutlak ke akar vault Obsidian                             |
| `defaultClassification` | string   | Tidak      | Pengkelasan lalai untuk nota (lalai: `INTERNAL`)                 |
| `excludeFolders`        | string[] | Tidak      | Folder untuk diabaikan (lalai: `.obsidian`, `.trash`)            |
| `folderClassifications` | object   | Tidak      | Peta laluan folder ke tahap pengkelasan                          |

### Pelbagai Vault

Anda boleh menyambungkan pelbagai vault dengan tahap pengkelasan yang berbeza:

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## Pengkelasan Berasaskan Folder

Nota mewarisi pengkelasan dari foldernya. Folder yang sepadan paling spesifik menang:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Dengan konfigurasi ini:

- `Private/todo.md` adalah `CONFIDENTIAL`
- `Private/Health/records.md` adalah `RESTRICTED`
- `Work/project.md` adalah `INTERNAL`
- `notes.md` (akar vault) menggunakan `defaultClassification`

Pengkelasan bersela terpakai: ejen hanya boleh membaca nota yang tahap pengkelasannya mengalir ke taint sesi semasa. Sesi bertaint `PUBLIC` tidak boleh mengakses nota `CONFIDENTIAL`.

## Keselamatan

### Sekatan Laluan

Semua operasi fail disekatan ke akar vault. Penyesuai menggunakan `Deno.realPath` untuk menyelesaikan symlink dan mencegah serangan traversal laluan. Sebarang percubaan untuk membaca `../../etc/passwd` atau yang serupa disekat sebelum sistem fail disentuh.

### Pengesahan Vault

Penyesuai mengesahkan bahawa direktori `.obsidian/` wujud di akar vault sebelum menerima laluan. Ini memastikan anda menunjuk ke vault Obsidian sebenar, bukan direktori sewenang-wenangnya.

### Penguatkuasaan Pengkelasan

- Nota membawa pengkelasan dari pemetaan folder mereka
- Membaca nota `CONFIDENTIAL` meningkatkan taint sesi ke `CONFIDENTIAL`
- Peraturan tanpa-tulis-bawah menghalang penulisan kandungan terklasifikasi ke folder yang lebih rendah kelasnya
- Semua operasi nota melalui hook dasar standard

## Wikilink

Penyesuai memahami sintaks `[[wikilink]]` Obsidian. Alat `obsidian_links` menyelesaikan wikilink ke laluan fail sebenar dan mencari semua nota yang memaut kembali ke nota yang diberikan (backlink).

## Nota Harian

Alat `obsidian_daily` membaca atau mencipta nota harian hari ini menggunakan konvensyen folder nota harian vault anda. Jika nota tidak wujud, ia mencipta satu dengan templat lalai.

## Frontmatter

Nota dengan frontmatter YAML dihurai secara automatik. Medan frontmatter tersedia sebagai metadata semasa membaca nota. Penyesuai memelihara frontmatter semasa menulis atau mengemas kini nota.
