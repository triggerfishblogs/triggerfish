# Plugin

Plugin Triggerfish melanjutkan ejen dengan alat tersuai. Plugin adalah modul TypeScript yang mengeksport manifes, definisi alat, dan fungsi pelaksana. Ejen boleh membina plugin sendiri, mengimbasnya untuk isu keselamatan, dan memuatkannya pada masa jalan -- semua dalam satu perbualan.

## Cara Plugin Berfungsi

Plugin tinggal dalam direktori dengan titik masuk `mod.ts`:

```
~/.triggerfish/plugins/my-plugin/
  mod.ts    # eksport: manifest, toolDefinitions, createExecutor
```

Apabila dimuatkan, alat plugin menjadi tersedia kepada ejen sebagai `plugin_<name>_<toolName>`. Pengkelasan, taint, dan hook dasar terpakai tepat seperti yang mereka lakukan kepada alat terbina dalam -- plugin hanyalah sumber alat lain dalam rantaian pengiriman.

## Menulis Plugin

Plugin minimum yang menanyakan REST API:

```typescript
export const manifest = {
  name: "weather",
  version: "1.0.0",
  description: "Weather forecast lookups",
  classification: "PUBLIC" as const,
  trust: "sandboxed" as const,
  declaredEndpoints: ["https://api.weather.com"],
};

export const toolDefinitions = [
  {
    name: "forecast",
    description: "Get the weather forecast for a city.",
    parameters: {
      city: {
        type: "string",
        description: "City name",
        required: true,
      },
    },
  },
];

export const systemPrompt = "Use `forecast` to look up weather for any city.";

export function createExecutor(context) {
  return async (name, input) => {
    if (name !== "forecast") return null;
    const city = input.city;
    context.log.info("Fetching forecast", { city });
    const resp = await fetch(
      `https://api.weather.com/v1/forecast?city=${encodeURIComponent(city)}`,
    );
    return await resp.text();
  };
}
```

### Eksport yang Diperlukan

| Eksport            | Jenis                               | Keterangan                                            |
| ------------------ | ----------------------------------- | ----------------------------------------------------- |
| `manifest`         | `PluginManifest`                    | Identiti plugin, pengkelasan, kepercayaan, titik akhir |
| `toolDefinitions`  | `ToolDefinition[]`                  | Alat yang disediakan plugin                           |
| `createExecutor`   | `(context) => (name, input) => ...` | Kilang yang mengembalikan pengendali alat             |
| `systemPrompt`     | `string` (pilihan)                  | Disuntik ke gesaan sistem ejen                        |

### Medan Manifes

| Medan                | Jenis      | Keterangan                                                           |
| -------------------- | ---------- | -------------------------------------------------------------------- |
| `name`               | `string`   | Mesti sepadan dengan nama direktori. Huruf kecil + tanda sempang sahaja |
| `version`            | `string`   | Versi semantik (contoh `"1.0.0"`)                                   |
| `description`        | `string`   | Keterangan yang boleh dibaca manusia                                 |
| `classification`     | `string`   | `"PUBLIC"`, `"INTERNAL"`, `"CONFIDENTIAL"`, atau `"RESTRICTED"`     |
| `trust`              | `string`   | `"sandboxed"` (lalai) atau `"trusted"`                              |
| `declaredEndpoints`  | `string[]` | Senarai benarkan rangkaian untuk plugin yang dikotak pasirkan        |

### Fungsi Pelaksana

`createExecutor(context)` menerima `PluginContext` dengan:

- `pluginName` -- nama plugin
- `getSessionTaint()` -- tahap pengkelasan sesi semasa
- `escalateTaint(level)` -- tingkatkan taint sesi (tidak boleh diturunkan)
- `log` -- logger berstruktur diskopkan ke plugin (`debug`, `info`, `warn`, `error`)
- `config` -- konfigurasi khusus plugin dari `triggerfish.yaml`

Fungsi yang dikembalikan mengambil `(name: string, input: Record<string, unknown>)` dan mengembalikan `string | null`. Kembalikan `null` untuk nama alat yang tidak dikenali.

## Aliran Bina→Muat Ejen

Aliran kerja plugin utama: ejen menulis plugin, mengesahkannya, dan memuatkannya -- semua pada masa jalan.

```
1. Ejen menulis mod.ts     →  exec_write("my-plugin/mod.ts", code)
2. Ejen mengimbas plugin   →  plugin_scan({ path: "/workspace/my-plugin" })
3. Ejen memuatkan plugin   →  plugin_install({ name: "my-plugin", path: "/workspace/my-plugin" })
4. Alat plugin aktif       →  plugin_my-plugin_forecast({ city: "Austin" })
```

Tiada entri `triggerfish.yaml` diperlukan. Pengimbas keselamatan adalah penjaga gerbang -- plugin yang dimuatkan tanpa konfigurasi lalai ke kepercayaan **sandboxed** dan menggunakan pengkelasan dari manifes mereka.

### Alat Plugin Ejen

Ejen mempunyai empat alat terbina dalam untuk mengurus plugin:

| Alat             | Parameter                  | Keterangan                                              |
| ---------------- | -------------------------- | ------------------------------------------------------- |
| `plugin_scan`    | `path` (diperlukan)        | Imbas keselamatan direktori plugin sebelum memuatkan    |
| `plugin_install` | `name` (diperlukan), `path` | Muatkan plugin mengikut nama atau laluan               |
| `plugin_reload`  | `name` (diperlukan)        | Tukar panas plugin yang sedang berjalan dari laluan sumbernya |
| `plugin_list`    | (tiada)                    | Senaraikan semua plugin yang didaftarkan dengan metadata |

**Perincian `plugin_install`:**

- `name` -- digunakan sebagai awalan ruang nama alat (`plugin_<name>_`)
- `path` -- laluan mutlak ke direktori plugin. Apabila disediakan, muatkan dari laluan tersebut (contoh ruang kerja ejen). Apabila dihilangkan, muatkan dari `~/.triggerfish/plugins/<name>/`
- Pengimbasan keselamatan adalah wajib pada setiap pemasangan. Jika imbasan gagal, plugin ditolak.
- Tiada entri konfigurasi diperlukan. Jika ada, tetapan kepercayaan/pengkelasannya dihormati; jika tidak, lalai ke sandboxed.

**Perincian `plugin_reload`:**

Nyahregister plugin lama, imbas semula dan import semula dari laluan sumber asal, kemudian daftar semula. Jika mana-mana langkah gagal, versi lama dipulihkan. Ejen melihat alat yang dikemas kini pada gilirannya yang seterusnya.

## Pengimbasan Keselamatan

Setiap plugin diimbas untuk corak berbahaya sebelum dimuatkan. Pengimbas berjalan pada **permulaan** (untuk plugin yang dikonfigurasi terlebih dahulu) dan pada **masa jalan** (pada setiap `plugin_install` dan `plugin_reload`).

### Apa yang Diimbas

Pengimbas memeriksa semua fail `.ts` dalam direktori plugin untuk:

| Kategori           | Contoh                                   | Keterukan |
| ------------------ | ---------------------------------------- | --------- |
| Pelaksanaan kod    | `eval()`, `new Function()`, `atob`       | Kritikal  |
| Suntikan gesaan    | "ignore previous instructions"           | Kritikal  |
| Akses subproses    | `Deno.command`, `Deno.run`               | Kritikal  |
| Steganografi       | Aksara Unicode lebar sifar               | Kritikal  |
| Pendengar rangkaian | `Deno.listen`, `Deno.serve`             | Kritikal  |
| Akses persekitaran | `Deno.env.get()`                         | Sederhana |
| Akses sistem fail  | `Deno.readTextFile`, `Deno.writeFile`    | Sederhana |
| Import dinamik     | `import("https://...")`                  | Sederhana |
| Kebingunan         | Pengekodan ROT13, manipulasi base64      | Sederhana |

### Model Pemarkahan

Setiap corak mempunyai berat (1--3). Plugin ditolak jika:

- Mana-mana **corak kritikal** (berat >= 3) dikesan, ATAU
- **Skor kumulatif** mencapai ambang (>= 4)

Ini bermakna `eval()` sahaja menyebabkan penolakan (berat 3, kritikal), sementara akses `Deno.env` (berat 2) hanya gagal jika digabungkan dengan corak sederhana yang lain.

### Pra-Pemeriksaan dengan `plugin_scan`

Ejen sepatutnya memanggil `plugin_scan` sebelum `plugin_install` untuk menangkap isu:

```
plugin_scan({ path: "/workspace/my-plugin" })
→ { "ok": true, "scannedFiles": ["mod.ts"] }

plugin_scan({ path: "/workspace/bad-plugin" })
→ { "ok": false, "warnings": ["eval() detected in mod.ts:3"], "scannedFiles": ["mod.ts"] }
```

Jika imbasan gagal, ejen boleh membetulkan kod dan mengimbas semula sebelum mencuba memuatkan.

## Model Kepercayaan

Kepercayaan memerlukan kedua-dua belah untuk bersetuju:

```
effectiveTrust = (manifest.trust === "trusted" DAN config.trust === "trusted")
                 ? "trusted" : "sandboxed"
```

- **Sandboxed** (lalai): Ralat pelaksana ditangkap dan dikembalikan sebagai keputusan alat. Rangkaian terhad kepada `declaredEndpoints`. Gunakan untuk plugin yang tidak dipercayai atau yang dibina ejen.
- **Trusted**: Pelaksana berjalan dengan kebenaran Deno normal. Gunakan untuk plugin yang memerlukan API sistem seperti `Deno.hostname()` atau `Deno.memoryUsage()`.

Plugin yang dibina oleh ejen sentiasa berjalan dalam kotak pasir (tiada entri konfigurasi bermakna tiada geran `trust: "trusted"`). Plugin dalam `~/.triggerfish/plugins/` boleh diberikan status trusted melalui konfigurasi.

## Konfigurasi (Pilihan)

Plugin berfungsi tanpa konfigurasi. Tambah entri konfigurasi dalam `triggerfish.yaml` hanya apabila anda perlu:

- Memberikan kebenaran `trusted`
- Menindih tahap pengkelasan
- Menghantar tetapan khusus plugin

```yaml
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: ${WEATHER_API_KEY}    # tersedia sebagai context.config.api_key
```

Plugin yang dimuatkan oleh ejen tanpa entri konfigurasi menggunakan pengkelasan manifes mereka dan lalai ke kepercayaan sandboxed.

## Penamaan Ruang Nama Alat

Alat diberi awalan secara automatik untuk mencegah perlanggaran:

- Alat plugin `forecast` dalam plugin `weather` menjadi `plugin_weather_forecast`
- Pelaksana mendekod awalan (padanan terpanjang-dahulu) dan mendelegasikan ke plugin yang betul dengan nama alat asal

## Pengkelasan dan Taint

Alat plugin mengikut peraturan pengkelasan yang sama seperti semua alat lain:

- Tahap `classification` manifes didaftarkan untuk semua alat dengan awalan `plugin_<name>_`
- Taint sesi meningkat apabila alat plugin mengembalikan data pada tahap yang lebih tinggi
- Pencegahan tulis-bawah terpakai: plugin CONFIDENTIAL tidak boleh mengalirkan datanya ke saluran PUBLIC
- Semua penguatkuasaan hook (PRE_TOOL_CALL, POST_TOOL_RESPONSE) terpakai tanpa perubahan

## The Reef: Pasaran Plugin

Plugin boleh diterbitkan ke dan dipasang dari The Reef, pasaran yang sama yang digunakan untuk kemahiran.

### Arahan CLI

```bash
triggerfish plugin search "weather"     # Cari plugin
triggerfish plugin install weather      # Pasang dari The Reef
triggerfish plugin update               # Semak kemas kini
triggerfish plugin publish ./my-plugin  # Sediakan untuk penerbitan
triggerfish plugin scan ./my-plugin     # Imbasan keselamatan
triggerfish plugin list                 # Senaraikan plugin yang dipasang
```

### Pasang dari The Reef

Pemasangan Reef disahkan dengan checksum SHA-256 dan diimbas keselamatan sebelum pengaktifan:

```
1. Ambil catalog.json (dicache 1 jam)
2. Cari versi terkini plugin
3. Muat turun mod.ts
4. Sahkan checksum SHA-256 sepadan dengan entri katalog
5. Tulis ke ~/.triggerfish/plugins/<name>/mod.ts
6. Imbasan keselamatan -- buang jika imbasan gagal
7. Rekod hash integriti dalam .plugin-hash.json
```

### Penerbitan

Arahan terbit mengesahkan plugin (manifes, eksport, imbasan keselamatan), mengira checksum SHA-256, dan menghasilkan struktur direktori yang bersedia untuk penyerahan ke repositori Reef.

## Pemuatan Permulaan

Plugin yang dipasang terlebih dahulu dalam `~/.triggerfish/plugins/` dimuatkan semasa permulaan:

1. Pemuat mengimbas untuk subdirektori dengan `mod.ts`
2. Setiap modul di-`import()` secara dinamik dan disahkan
3. Hanya plugin dengan `enabled: true` dalam konfigurasi dimulakan semasa permulaan
4. Pengimbas keselamatan berjalan sebelum memuatkan
5. Kepercayaan diselesaikan, pelaksana dicipta, alat didaftarkan
6. Alat plugin muncul bersama alat terbina dalam dengan segera

Plugin yang dimuatkan oleh ejen pada masa jalan (melalui `plugin_install`) melewati pemeriksaan konfigurasi -- pengimbas keselamatan berfungsi sebagai penjaga gerbang.
