# MCP Gateway

> Gunakan mana-mana pelayan MCP. Kami menjamin sempadan.

Model Context Protocol (MCP) adalah standard yang semakin berkembang untuk komunikasi ejen-ke-alat. Triggerfish menyediakan MCP Gateway yang selamat yang membolehkan anda menyambungkan ke mana-mana pelayan yang serasi MCP sambil menguatkuasakan kawalan pengkelasan, kebenaran peringkat alat, penjejakan taint, dan pengelogan audit penuh.

Anda membawa pelayan MCP. Triggerfish menjamin setiap permintaan dan respons yang melepasi sempadan.

## Cara Ia Berfungsi

MCP Gateway duduk di antara ejen anda dan mana-mana pelayan MCP. Setiap panggilan alat melalui lapisan penguatkuasaan dasar sebelum mencapai pelayan luaran, dan setiap respons diklasifikasikan sebelum memasuki konteks ejen.

<img src="/diagrams/mcp-gateway-flow.svg" alt="Aliran MCP Gateway: Ejen → MCP Gateway → Lapisan Dasar → Pelayan MCP, dengan laluan tolak ke BLOCKED" style="max-width: 100%;" />

Gateway menyediakan lima fungsi teras:

1. **Pengesahan dan pengkelasan pelayan** -- Pelayan MCP mesti disemak dan diklasifikasikan sebelum digunakan
2. **Penguatkuasaan kebenaran peringkat alat** -- Alat individu boleh dibenarkan, dihadkan, atau disekat
3. **Penjejakan taint permintaan/respons** -- Taint sesi meningkat berdasarkan pengkelasan pelayan
4. **Pengesahan skema** -- Semua permintaan dan respons disahkan terhadap skema yang diisytiharkan
5. **Pengelogan audit** -- Setiap panggilan alat, keputusan, dan perubahan taint direkodkan

## Keadaan Pelayan MCP

Semua pelayan MCP lalai ke `UNTRUSTED`. Mereka mesti diklasifikasikan secara eksplisit sebelum ejen boleh memanggilnya.

| Keadaan      | Keterangan                                                             | Ejen Boleh Panggil? |
| ------------ | ---------------------------------------------------------------------- | :-----------------: |
| `UNTRUSTED`  | Lalai untuk pelayan baru. Menunggu semakan.                            | Tidak               |
| `CLASSIFIED` | Disemak dan diberikan tahap pengkelasan dengan kebenaran per-alat.     | Ya (dalam dasar)    |
| `BLOCKED`    | Dilarang secara eksplisit oleh pentadbir.                              | Tidak               |

<img src="/diagrams/state-machine.svg" alt="Mesin keadaan pelayan MCP: UNTRUSTED → CLASSIFIED atau BLOCKED" style="max-width: 100%;" />

::: warning KESELAMATAN Pelayan MCP `UNTRUSTED` tidak boleh dipanggil oleh ejen dalam apa jua keadaan. LLM tidak boleh meminta, meyakinkan, atau menipu sistem untuk menggunakan pelayan yang tidak diklasifikasikan. Pengkelasan adalah gerbang peringkat kod, bukan keputusan LLM. :::

## Konfigurasi

Pelayan MCP dikonfigurasi dalam `triggerfish.yaml` sebagai peta yang dikunci oleh ID pelayan. Setiap pelayan menggunakan sama ada subproses tempatan (pengangkutan stdio) atau titik akhir jauh (pengangkutan SSE).

### Pelayan Tempatan (Stdio)

Pelayan tempatan dijana sebagai subproses. Triggerfish berkomunikasi dengan mereka melalui stdin/stdout.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Pelayan Jauh (SSE)

Pelayan jauh berjalan di tempat lain dan diakses melalui HTTP Server-Sent Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Kunci Konfigurasi

| Kunci            | Jenis    | Diperlukan       | Keterangan                                                                  |
| ---------------- | -------- | ---------------- | --------------------------------------------------------------------------- |
| `command`        | string   | Ya (stdio)       | Binari untuk dijana (contoh, `npx`, `deno`, `node`)                        |
| `args`           | string[] | Tidak            | Argumen yang dihantar ke arahan                                             |
| `env`            | peta     | Tidak            | Pemboleh ubah persekitaran untuk subproses                                  |
| `url`            | string   | Ya (SSE)         | Titik akhir HTTP untuk pelayan jauh                                         |
| `classification` | string   | **Ya**           | Tahap sensitiviti data: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, atau `RESTRICTED` |
| `enabled`        | boolean  | Tidak            | Lalai: `true`. Tetapkan ke `false` untuk melangkau tanpa membuang konfigurasi. |

Setiap pelayan mesti mempunyai sama ada `command` (tempatan) atau `url` (jauh). Pelayan tanpa keduanya dilangkau.

### Sambungan Malas

Pelayan MCP menyambung di latar belakang selepas permulaan. Anda tidak perlu menunggu semua pelayan bersedia sebelum menggunakan ejen anda.

- Pelayan mencuba semula dengan backoff eksponen: 2s → 4s → 8s → maks 30s
- Pelayan baru tersedia kepada ejen apabila mereka menyambung -- tiada mulakan semula sesi diperlukan
- Jika pelayan gagal menyambung selepas semua ulang cuba, ia memasuki keadaan `failed` dan boleh dicuba semula pada mulakan semula daemon seterusnya

Antara muka CLI dan Tidepool memaparkan status sambungan MCP masa nyata. Lihat [Saluran CLI](/ms-MY/channels/cli#mcp-server-status) untuk perincian.

### Melumpuhkan Pelayan

Untuk melumpuhkan sementara pelayan MCP tanpa membuang konfigurasinya:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Dilangkau semasa permulaan
```

### Pemboleh Ubah Persekitaran dan Rahsia

Nilai env yang diawali dengan `keychain:` diselesaikan dari keychain OS semasa permulaan:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # Diselesaikan dari keychain OS
  PLAIN_VAR: "literal-value" # Dihantar seperti sedia ada
```

Hanya `PATH` yang diwarisi dari persekitaran hos (supaya `npx`, `node`, `deno`, dll. diselesaikan dengan betul). Tiada pemboleh ubah persekitaran hos lain yang bocor ke subproses pelayan MCP.

::: tip Simpan rahsia dengan `triggerfish config set-secret <nama> <nilai>`. Kemudian rujuknya sebagai `keychain:<nama>` dalam konfigurasi env pelayan MCP anda. :::

### Penamaan Alat

Alat dari pelayan MCP diruang nama sebagai `mcp_<serverId>_<toolName>` untuk mengelakkan perlanggaran dengan alat terbina dalam. Contohnya, jika pelayan bernama `github` mendedahkan alat bernama `list_repos`, ejen melihatnya sebagai `mcp_github_list_repos`.

### Pengkelasan dan Tolak Lalai

Jika anda menghilangkan `classification`, pelayan didaftarkan sebagai **UNTRUSTED** dan gateway menolak semua panggilan alat. Anda mesti memilih tahap pengkelasan secara eksplisit. Lihat [Panduan Pengkelasan](/ms-MY/guide/classification-guide) untuk bantuan memilih tahap yang betul.

## Aliran Panggilan Alat

Apabila ejen meminta panggilan alat MCP, gateway melaksanakan urutan pemeriksaan deterministik sebelum memajukan permintaan.

### 1. Pemeriksaan Pra-Terbang

Semua pemeriksaan adalah deterministik -- tiada panggilan LLM, tiada rawak.

| Pemeriksaan                                                  | Keputusan Kegagalan                     |
| ------------------------------------------------------------ | --------------------------------------- |
| Status pelayan adalah `CLASSIFIED`?                          | Sekat: "Pelayan tidak diluluskan"       |
| Alat dibenarkan untuk pelayan ini?                           | Sekat: "Alat tidak dibenarkan"          |
| Pengguna mempunyai kebenaran yang diperlukan?                | Sekat: "Kebenaran ditolak"              |
| Taint sesi serasi dengan pengkelasan pelayan?                | Sekat: "Akan melanggar tulis-bawah"     |
| Pengesahan skema lulus?                                      | Sekat: "Parameter tidak sah"            |

::: info Jika taint sesi lebih tinggi dari pengkelasan pelayan, panggilan disekat untuk mencegah tulis-bawah. Sesi yang ditaint pada `CONFIDENTIAL` tidak boleh menghantar data ke pelayan MCP `PUBLIC`. :::

### 2. Laksanakan

Jika semua pemeriksaan pra-terbang lulus, gateway memajukan permintaan ke pelayan MCP.

### 3. Pemprosesan Respons

Apabila pelayan MCP mengembalikan respons:

- Sahkan respons terhadap skema yang diisytiharkan
- Kelaskan data respons pada tahap pengkelasan pelayan
- Kemas kini taint sesi: `taint = max(taint_semasa, pengkelasan_pelayan)`
- Cipta rekod keturunan yang menjejaki asal-usul data

### 4. Audit

Setiap panggilan alat direkodkan dengan: identiti pelayan, nama alat, identiti pengguna, keputusan dasar, perubahan taint, dan cap masa.

## Peraturan Taint Respons

Respons pelayan MCP mewarisi tahap pengkelasan pelayan. Taint sesi hanya boleh meningkat.

| Pengkelasan Pelayan | Taint Respons  | Impak Sesi                                  |
| ------------------- | -------------- | ------------------------------------------- |
| `PUBLIC`            | `PUBLIC`       | Tiada perubahan taint                       |
| `INTERNAL`          | `INTERNAL`     | Taint meningkat sekurang-kurangnya `INTERNAL` |
| `CONFIDENTIAL`      | `CONFIDENTIAL` | Taint meningkat sekurang-kurangnya `CONFIDENTIAL` |
| `RESTRICTED`        | `RESTRICTED`   | Taint meningkat ke `RESTRICTED`             |

Sebaik sahaja sesi ditaint pada tahap tertentu, ia kekal pada tahap tersebut atau lebih tinggi untuk selebihnya sesi. Tetapan semula sesi penuh (yang mengosongkan sejarah perbualan) diperlukan untuk mengurangkan taint.

## Passthroughs Pengesahan Pengguna

Untuk pelayan MCP yang menyokong pengesahan peringkat pengguna, gateway menyebarkan kelayakan yang didelegasikan pengguna berbanding kelayakan sistem.

Apabila alat dikonfigurasi dengan `requires_user_auth: true`:

1. Gateway memeriksa sama ada pengguna telah menyambungkan pelayan MCP ini
2. Mendapatkan semula kelayakan yang didelegasikan pengguna dari stor kelayakan selamat
3. Menambah pengesahan pengguna ke pengepala permintaan MCP
4. Pelayan MCP menguatkuasakan kebenaran peringkat pengguna

Hasilnya: pelayan MCP melihat **identiti pengguna**, bukan identiti sistem. Warisan kebenaran berfungsi melalui sempadan MCP -- ejen hanya boleh mengakses apa yang boleh diakses oleh pengguna.

::: tip Passthroughs pengesahan pengguna adalah corak pilihan untuk mana-mana pelayan MCP yang mengurus kawalan akses. Ini bermakna ejen mewarisi kebenaran pengguna berbanding mempunyai akses sistem menyeluruh. :::

## Pengesahan Skema

Gateway mengesahkan semua permintaan dan respons MCP terhadap skema yang diisytiharkan sebelum memajukan:

```typescript
// Pengesahan permintaan (dipermudahkan)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Sahkan params terhadap skema JSON
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Periksa corak suntikan dalam params string
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Pengesahan skema menangkap permintaan yang cacat sebelum ia mencapai pelayan luaran dan menandai corak suntikan yang berpotensi dalam parameter string.

## Kawalan Perusahaan

Penerapan perusahaan mempunyai kawalan tambahan untuk pengurusan pelayan MCP:

- **Daftar pelayan yang diurus pentadbir** -- Hanya pelayan MCP yang diluluskan pentadbir boleh diklasifikasikan
- **Kebenaran alat per-jabatan** -- Pasukan yang berbeza boleh mempunyai akses alat yang berbeza
- **Pengelogan pematuhan** -- Semua interaksi MCP tersedia dalam papan pemuka pematuhan
- **Had kadar** -- Had kadar per-pelayan dan per-alat
- **Pemantauan kesihatan pelayan** -- Gateway menjejaki ketersediaan pelayan dan masa respons
