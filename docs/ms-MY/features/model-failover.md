# Pembekal LLM dan Failover

Triggerfish menyokong berbilang pembekal LLM dengan failover automatik, pemilihan model per-ejen, dan penukaran model peringkat sesi. Tiada kunci masuk pembekal tunggal.

## Pembekal yang Disokong

| Pembekal   | Auth    | Model                      | Nota                                       |
| ---------- | ------- | -------------------------- | ------------------------------------------ |
| Anthropic  | Kunci API | Claude Opus, Sonnet, Haiku | API Anthropic standard                     |
| OpenAI     | Kunci API | GPT-4o, o1, o3             | API OpenAI standard                        |
| Google     | Kunci API | Gemini Pro, Flash          | API Google AI Studio                       |
| Tempatan   | Tiada   | Llama, Mistral, dll.       | Serasi Ollama, format OpenAI               |
| OpenRouter | Kunci API | Mana-mana model di OpenRouter | Akses bersatu ke banyak pembekal          |
| Z.AI       | Kunci API | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, serasi OpenAI            |

## Antara Muka LlmProvider

Semua pembekal melaksanakan antara muka yang sama:

```typescript
interface LlmProvider {
  /** Jana penyempurnaan dari sejarah mesej. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Strim penyempurnaan token demi token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Sama ada pembekal ini menyokong panggilan alat/fungsi. */
  supportsTools: boolean;

  /** Pengecam model (contoh, "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Ini bermakna anda boleh menukar pembekal tanpa mengubah sebarang logik aplikasi. Gelung ejen dan semua pengorkestra alat berfungsi identik tanpa mengira pembekal mana yang aktif.

## Konfigurasi

### Persediaan Asas

Konfigurasi model utama dan kelayakan pembekal anda dalam `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Lalai Ollama
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Rantaian Failover

FailoverChain menyediakan sandaran automatik apabila pembekal tidak tersedia. Konfigurasi senarai model sandaran yang tersusun:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Sandaran pertama
    - gpt-4o # Sandaran kedua
    - ollama/llama3 # Sandaran tempatan (tiada internet diperlukan)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Apabila model utama gagal akibat keadaan yang dikonfigurasi (had kadar, ralat pelayan, atau tamat masa), Triggerfish secara automatik mencuba pembekal seterusnya dalam rantaian. Ini berlaku secara telus — perbualan diteruskan tanpa gangguan.

### Keadaan Failover

| Keadaan        | Keterangan                                  |
| -------------- | ------------------------------------------- |
| `rate_limited` | Pembekal mengembalikan respons had kadar 429 |
| `server_error` | Pembekal mengembalikan ralat pelayan 5xx    |
| `timeout`      | Permintaan melebihi tamat masa yang dikonfigurasi |

## Pemilihan Model Per-Ejen

Dalam [persediaan berbilang ejen](./multi-agent), setiap ejen boleh menggunakan model yang berbeza yang dioptimumkan untuk peranannya:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Penaakulan terbaik untuk penyelidikan
    - id: quick-tasks
      model: claude-haiku-4-5 # Cepat dan murah untuk tugas mudah
    - id: coding
      model: claude-sonnet-4-5 # Keseimbangan baik untuk kod
```

## Penukaran Model Peringkat Sesi

Ejen boleh menukar model di pertengahan sesi untuk pengoptimuman kos. Gunakan model cepat untuk pertanyaan mudah dan tingkatkan ke model yang lebih berkemampuan untuk penaakulan kompleks. Ini tersedia melalui alat `session_status`.

## Had Kadar

Triggerfish merangkumi had kadar tetingkap gelongsor terbina dalam yang menghalang mencapai had API pembekal. Had kadar membungkus mana-mana pembekal secara telus — ia menjejak token-per-minit (TPM) dan permintaan-per-minit (RPM) dalam tetingkap gelongsor dan melewatkan panggilan apabila had dihampiri.

Had kadar berfungsi bersama failover: jika had kadar pembekal habis dan had kadar tidak dapat menunggu dalam tamat masa, rantaian failover diaktifkan dan mencuba pembekal seterusnya.

Lihat [Had Kadar](/ms-MY/features/rate-limiting) untuk butiran penuh termasuk had peringkat OpenAI.

::: info Kunci API tidak pernah disimpan dalam fail konfigurasi. Gunakan keychain OS anda melalui `triggerfish config set-secret`. Lihat [Model Keselamatan](/ms-MY/security/) untuk butiran pengurusan rahsia. :::
