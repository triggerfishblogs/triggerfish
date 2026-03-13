# Membina Kemahiran

Panduan ini menerangkan cara mencipta kemahiran Triggerfish dari awal -- dari menulis fail `SKILL.md` hingga mengujinya dan mendapatkan kelulusan.

## Apa yang Akan Anda Bina

Kemahiran adalah folder yang mengandungi fail `SKILL.md` yang mengajar ejen cara melakukan sesuatu. Pada akhir panduan ini, anda akan mempunyai kemahiran yang berfungsi yang boleh ditemui dan digunakan oleh ejen.

## Anatomi Kemahiran

Setiap kemahiran adalah direktori dengan `SKILL.md` di akarnya:

```
my-skill/
  SKILL.md           # Diperlukan: frontmatter + arahan
  template.md        # Pilihan: templat yang dirujuk kemahiran
  helper.ts          # Pilihan: kod sokongan
```

Fail `SKILL.md` mempunyai dua bahagian:

1. **Frontmatter YAML** (antara pembatas `---`) -- metadata tentang kemahiran
2. **Badan markdown** -- arahan yang dibaca oleh ejen

## Langkah 1: Tulis Frontmatter

Frontmatter mengisytiharkan apa yang kemahiran lakukan, apa yang diperlukannya, dan kekangan keselamatan apa yang terpakai.

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### Medan yang Diperlukan

| Medan         | Keterangan                                                      | Contoh          |
| ------------- | --------------------------------------------------------------- | --------------- |
| `name`        | Pengecam unik. Huruf kecil, tanda sempang untuk ruang.          | `github-triage` |
| `description` | Apa yang kemahiran lakukan dan bila menggunakannya. 1-3 ayat.   | Lihat di atas   |

### Medan Pilihan

| Medan                    | Keterangan                                        | Lalai    |
| ------------------------ | ------------------------------------------------- | -------- |
| `classification_ceiling` | Tahap sensitiviti data maksimum                   | `PUBLIC` |
| `requires_tools`         | Alat yang diperlukan kemahiran akses              | `[]`     |
| `network_domains`        | Domain luaran yang diakses kemahiran              | `[]`     |

Medan tambahan seperti `version`, `category`, `tags`, dan `triggers` boleh disertakan untuk dokumentasi dan penggunaan masa depan. Pemuat kemahiran akan mengabaikan dengan senyap medan yang tidak dikenalinya.

### Memilih Siling Pengkelasan

Siling pengkelasan adalah sensitiviti data maksimum yang akan dikendalikan kemahiran anda. Pilih tahap terendah yang berfungsi:

| Tahap          | Bila Menggunakan                         | Contoh                                                    |
| -------------- | ---------------------------------------- | --------------------------------------------------------- |
| `PUBLIC`       | Hanya menggunakan data yang tersedia awam | Carian web, dokumen API awam, cuaca                      |
| `INTERNAL`     | Bekerja dengan data projek dalaman       | Analisis kod, semakan konfigurasi, dokumen dalaman         |
| `CONFIDENTIAL` | Mengendalikan data peribadi atau privat  | Ringkasan e-mel, pemberitahuan GitHub, pertanyaan CRM     |
| `RESTRICTED`   | Mengakses data yang sangat sensitif      | Pengurusan kunci, audit keselamatan, pematuhan            |

::: warning Jika siling kemahiran anda melebihi siling yang dikonfigurasi pengguna, API pengarang kemahiran akan menolaknya. Sentiasa gunakan tahap minimum yang diperlukan. :::

## Langkah 2: Tulis Arahan

Badan markdown adalah apa yang dibaca oleh ejen untuk belajar cara melaksanakan kemahiran. Jadikannya boleh dilaksanakan dan spesifik.

### Templat Struktur

```markdown
# Nama Kemahiran

Pernyataan tujuan satu baris.

## Bila Menggunakan

- Keadaan 1 (pengguna meminta X)
- Keadaan 2 (dicetuskan oleh cron)
- Keadaan 3 (kata kunci berkaitan dikesan)

## Langkah-langkah

1. Tindakan pertama dengan perincian spesifik
2. Tindakan kedua dengan perincian spesifik
3. Proses dan format keputusan
4. Hantar ke saluran yang dikonfigurasi

## Format Output

Terangkan cara keputusan sepatutnya diformat.

## Kesilapan Biasa

- Jangan lakukan X kerana Y
- Sentiasa semak Z sebelum meneruskan
```

### Amalan Terbaik

- **Mulakan dengan tujuan**: Satu ayat menerangkan apa yang kemahiran lakukan
- **Sertakan "Bila Menggunakan"**: Membantu ejen memutuskan bila untuk mengaktifkan kemahiran
- **Spesifik**: "Ambil e-mel yang belum dibaca 24 jam terakhir" lebih baik dari "Dapatkan e-mel"
- **Gunakan contoh kod**: Tunjukkan panggilan API tepat, format data, corak arahan
- **Tambah jadual**: Rujukan pantas untuk pilihan, titik akhir, parameter
- **Sertakan pengendalian ralat**: Apa yang perlu dilakukan apabila panggilan API gagal atau data tiada
- **Akhiri dengan "Kesilapan Biasa"**: Menghalang ejen daripada mengulangi isu yang diketahui

## Langkah 3: Uji Penemuan

Sahkan kemahiran anda boleh ditemui oleh pemuat kemahiran. Jika anda meletakkannya dalam direktori terbundel:

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

Semak bahawa:

- Kemahiran muncul dalam senarai yang ditemui
- `name` sepadan dengan frontmatter
- `classificationCeiling` adalah betul
- `requiresTools` dan `networkDomains` diisi

## Pengarangan Diri Ejen

Ejen boleh mencipta kemahiran secara programatik menggunakan API `SkillAuthor`. Inilah cara ejen melanjutkan dirinya apabila diminta melakukan sesuatu yang baru.

### Aliran Kerja

```
1. Pengguna:  "Saya perlukan anda menyemak Notion untuk tugas baru setiap pagi"
2. Ejen:      Menggunakan SkillAuthor untuk mencipta kemahiran dalam ruang kerjanya
3. Kemahiran: Memasuki status PENDING_APPROVAL
4. Pengguna:  Menerima pemberitahuan, menyemak kemahiran
5. Pengguna:  Meluluskan → kemahiran menjadi aktif
6. Ejen:      Menghubungkan kemahiran ke jadual cron pagi
```

### Menggunakan API SkillAuthor

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Status Kelulusan

| Status             | Makna                                      |
| ------------------ | ------------------------------------------ |
| `PENDING_APPROVAL` | Dicipta, menunggu semakan pemilik          |
| `APPROVED`         | Pemilik meluluskan, kemahiran aktif        |
| `REJECTED`         | Pemilik menolak, kemahiran tidak aktif     |

::: warning KESELAMATAN Ejen tidak boleh meluluskan kemahirannya sendiri. Ini dikuatkuasakan pada tahap API. Semua kemahiran yang dikarang ejen memerlukan pengesahan pemilik yang eksplisit sebelum pengaktifan. :::

## Pengimbasan Keselamatan

Sebelum pengaktifan, kemahiran melalui pengimbas keselamatan yang memeriksa corak suntikan gesaan:

- "Ignore all previous instructions" -- suntikan gesaan
- "You are now a..." -- pendefinisian semula identiti
- "Reveal secrets/credentials" -- percubaan penyingkiran data
- "Bypass security/policy" -- pengelakan keselamatan
- "Sudo/admin/god mode" -- peningkatan keistimewaan

Kemahiran yang ditandakan oleh pengimbas merangkumi amaran yang mesti disemak oleh pemilik sebelum kelulusan.

## Trigger

Kemahiran boleh mentakrifkan trigger automatik dalam frontmatter mereka:

```yaml
triggers:
  - cron: "0 7 * * *" # Setiap hari pada jam 7 pagi
  - cron: "*/30 * * * *" # Setiap 30 minit
```

Penjadual membaca definisi ini dan membangunkan ejen pada masa yang ditentukan untuk melaksanakan kemahiran. Anda boleh menggabungkan trigger dengan waktu senyap dalam `triggerfish.yaml` untuk mencegah pelaksanaan semasa tempoh tertentu.

## Contoh Lengkap

Berikut adalah kemahiran penuh untuk mengklasifikasikan pemberitahuan GitHub:

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Senarai Semak Kemahiran

Sebelum menganggap kemahiran lengkap:

- [ ] Nama folder sepadan dengan `name` dalam frontmatter
- [ ] Keterangan menerangkan **apa** dan **bila** untuk menggunakan
- [ ] Siling pengkelasan adalah tahap terendah yang berfungsi
- [ ] Semua alat yang diperlukan disenaraikan dalam `requires_tools`
- [ ] Semua domain luaran disenaraikan dalam `network_domains`
- [ ] Arahan adalah konkrit dan langkah demi langkah
- [ ] Contoh kod menggunakan corak Triggerfish (jenis Result, fungsi kilang)
- [ ] Format output ditentukan
- [ ] Bahagian kesilapan biasa disertakan
- [ ] Kemahiran boleh ditemui oleh pemuat (diuji)
