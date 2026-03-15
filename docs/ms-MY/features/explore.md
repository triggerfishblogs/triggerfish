# Penerokaan Pangkalan Kod

Alat `explore` memberikan ejen pemahaman yang cepat dan berstruktur tentang pangkalan kod dan direktori. Berbanding memanggil `read_file`, `list_directory`, dan `search_files` secara berurutan secara manual, ejen memanggil `explore` sekali dan mendapat laporan berstruktur yang dihasilkan oleh sub-ejen selari.

## Alat

### `explore`

Terokai direktori atau pangkalan kod untuk memahami struktur, corak, dan konvensyen. Baca-sahaja.

| Parameter | Jenis  | Diperlukan | Keterangan                                                          |
| --------- | ------ | ---------- | ------------------------------------------------------------------- |
| `path`    | string | ya         | Direktori atau fail untuk diterokai                                 |
| `focus`   | string | tidak      | Apa yang dicari (contoh "corak auth", "struktur ujian")             |
| `depth`   | string | tidak      | Seberapa menyeluruh: `shallow`, `standard` (lalai), atau `deep`     |

## Tahap Kedalaman

| Kedalaman  | Ejen Dijana | Apa yang Dianalisis                                              |
| ---------- | ----------- | ---------------------------------------------------------------- |
| `shallow`  | 2           | Pokok direktori + manifes kebergantungan                         |
| `standard` | 3-4         | Pokok + manifes + corak kod + fokus (jika dinyatakan)           |
| `deep`     | 5-6         | Semua di atas + pengesanan graf import + sejarah git            |

## Cara Ia Berfungsi

Alat explore menjana sub-ejen selari, masing-masing berfokus pada aspek yang berbeza:

1. **Ejen pokok** -- Memetakan struktur direktori (3 tahap dalam), mengenal pasti fail utama mengikut konvensyen (`mod.ts`, `main.ts`, `deno.json`, `README.md`, dll.)
2. **Ejen manifes** -- Membaca fail kebergantungan (`deno.json`, `package.json`, `tsconfig.json`), menyenaraikan kebergantungan, skrip, dan titik masuk
3. **Ejen corak** -- Mengambil sampel fail sumber untuk mengesan corak pengekodan: struktur modul, pengendalian ralat, konvensyen jenis, gaya import, penamaan, pengujian
4. **Ejen fokus** -- Mencari fail dan corak yang berkaitan dengan pertanyaan fokus
5. **Ejen import** (hanya deep) -- Mengesan graf import dari titik masuk, mengesan kebergantungan bulat
6. **Ejen git** (hanya deep) -- Menganalisis komit terkini, cawangan semasa, perubahan yang belum dikomit

Semua ejen berjalan serentak. Keputusan dihimpun ke dalam `ExploreResult` berstruktur:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## Bila Ejen Menggunakannya

Ejen diarahkan untuk menggunakan `explore` dalam situasi ini:

- Sebelum mengubah kod yang tidak biasa
- Apabila ditanya "apa yang ini lakukan" atau "bagaimana ini berstruktur"
- Pada permulaan sebarang tugas yang tidak remeh yang melibatkan kod sedia ada
- Apabila ia perlu mencari fail atau corak yang betul untuk diikuti

Selepas meneroka, ejen merujuk corak dan konvensyen yang ditemuinya apabila menulis kod baru, memastikan konsistensi dengan pangkalan kod sedia ada.

## Contoh

```
# Gambaran ringkas sebuah direktori
explore({ path: "src/auth" })

# Carian berfokus untuk corak tertentu
explore({ path: "src/auth", focus: "how tokens are validated" })

# Analisis mendalam termasuk sejarah git dan graf import
explore({ path: "src/core", depth: "deep" })

# Fahami konvensyen ujian sebelum menulis ujian
explore({ path: "tests/", focus: "test patterns and assertions" })
```
