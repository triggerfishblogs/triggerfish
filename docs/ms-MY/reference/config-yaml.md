# Skema Config

Triggerfish dikonfigurasi melalui `triggerfish.yaml`, terletak di `~/.triggerfish/triggerfish.yaml` selepas menjalankan `triggerfish dive`. Halaman ini mendokumentasikan setiap bahagian konfigurasi.

::: info Rujukan Rahsia Mana-mana nilai rentetan dalam fail ini boleh menggunakan awalan `secret:` untuk merujuk kelayakan yang disimpan dalam keychain OS. Sebagai contoh, `apiKey: "secret:provider:anthropic:apiKey"` menyelesaikan nilai dari keychain semasa permulaan. Lihat [Pengurusan Rahsia](/ms-MY/security/secrets#secret-references-in-configuration) untuk perincian. :::

## Contoh Beranotasi Penuh

```yaml
# =============================================================================
# triggerfish.yaml -- Rujukan konfigurasi lengkap
# =============================================================================

# ---------------------------------------------------------------------------
# Models: Konfigurasi pembekal LLM dan failover
# ---------------------------------------------------------------------------
models:
  # Model utama yang digunakan untuk penyelesaian ejen
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Pilihan: model visi berasingan untuk huraian imej
  # Apabila model utama tidak menyokong visi, imej secara automatik
  # dihuraikan oleh model ini sebelum mencapai yang utama.
  # vision: glm-4.5v

  # Respons penstriman (lalai: true)
  # streaming: true

  # Konfigurasi khusus pembekal
  # Kunci API dirujuk melalui sintaks secret: dan diselesaikan dari keychain OS.
  # Jalankan `triggerfish dive` atau `triggerfish config migrate-secrets` untuk persediaan.
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Rantaian failover tertib -- dicuba dalam urutan apabila yang utama gagal
  failover:
    - claude-haiku-4-5 # Jatuh balik pertama
    - gpt-4o # Jatuh balik kedua
    - ollama/llama3 # Jatuh balik tempatan (tiada internet diperlukan)

  # Tingkah laku failover
  failover_config:
    max_retries: 3 # Percubaan semula per pembekal sebelum beralih ke seterusnya
    retry_delay_ms: 1000 # Kelewatan antara percubaan semula
    conditions: # Apa yang mencetuskan failover
      - rate_limited # Pembekal mengembalikan 429
      - server_error # Pembekal mengembalikan 5xx
      - timeout # Permintaan melebihi tamat masa

# ---------------------------------------------------------------------------
# Logging: Output log berstruktur
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Sambungan platform pemesejan
# ---------------------------------------------------------------------------
# Rahsia (token bot, kunci API, kata laluan) disimpan dalam keychain OS.
# Jalankan `triggerfish config add-channel <name>` untuk memasukkannya dengan selamat.
# Hanya konfigurasi bukan rahsia muncul di sini.
channels:
  telegram:
    ownerId: 123456789 # ID pengguna numerik Telegram anda
    classification: INTERNAL # Lalai: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # Titik akhir daemon signal-cli
    account: "+14155552671" # Nombor telefon Signal anda (E.164)
    classification: PUBLIC # Lalai: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Lalai: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # ID pengguna Discord anda
    classification: PUBLIC # Lalai: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Dari Meta Business Dashboard
    classification: PUBLIC # Lalai: PUBLIC

  webchat:
    port: 8765 # Port WebSocket untuk klien web
    classification: PUBLIC # Lalai: PUBLIC (pelawat)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Lalai: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Model sensitiviti data
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" atau "enterprise" (akan datang)
# Peringkat: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy: Peraturan penguatkuasaan tersuai (jalan keluar perusahaan)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # Corak SSN
      action: REDACT
      message: "PII disunting untuk penerima luaran"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Had kadar alat browser dilampaui"

# ---------------------------------------------------------------------------
# MCP Servers: Pelayan alat luaran
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Plugins: Konfigurasi plugin dinamik (pilihan)
# ---------------------------------------------------------------------------
# Plugin dalam ~/.triggerfish/plugins/ dimuatkan semasa permulaan apabila diaktifkan di sini.
# Plugin yang dimuatkan oleh ejen semasa runtime (melalui plugin_install) TIDAK memerlukan
# entri config -- ia lalai ke kepercayaan sandbox dan pengkelasan manifest.
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed # atau "trusted" untuk memberikan kebenaran Deno penuh
    # Kunci tambahan dihantar sebagai context.config kepada plugin
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted # manifest DAN config mesti mengatakan "trusted"

# ---------------------------------------------------------------------------
# Scheduler: Pekerjaan cron dan trigger
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 pagi setiap hari
        task: "Sediakan taklimat pagi dengan kalendar, e-mel belum dibaca, dan cuaca"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Setiap 4 jam
        task: "Semak saluran paip Salesforce untuk perubahan dan beritahu jika ketara"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Setiap 15 minit
        task: "Semak fail penjejakan PR terbuka dan tanya GitHub untuk semakan baru"
        classification: INTERNAL

  trigger:
    interval: 30m # Semak setiap 30 minit
    classification: INTERNAL # Siling taint maks untuk trigger
    quiet_hours: "22:00-07:00" # Sekat semasa waktu ini

# ---------------------------------------------------------------------------
# Notifications: Keutamaan penghantaran
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Saluran penghantaran lalai
  quiet_hours: "22:00-07:00" # Sekat normal/keutamaan rendah
  batch_interval: 15m # Kumpulkan pemberitahuan keutamaan rendah

# ---------------------------------------------------------------------------
# Agents: Penghalaan berbilang ejen (pilihan)
# ---------------------------------------------------------------------------
agents:
  default: personal # Ejen jatuh balik
  list:
    - id: personal
      name: "Pembantu Peribadi"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Pembantu Kerja"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: Konfigurasi suara (pilihan)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Saiz model Whisper
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: Titik akhir peristiwa masuk (pilihan)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Rahsia webhook disimpan dalam keychain OS
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Semak PR dan hantar ringkasan"
        - event: "pull_request_review"
          task: "Semakan PR telah dihantar. Baca fail penjejakan, tangani maklum balas, komit, tolak."
        - event: "pull_request_review_comment"
          task: "Ulasan semakan sebaris telah disiarkan. Baca fail penjejakan, tangani ulasan."
        - event: "issue_comment"
          task: "Ulasan telah disiarkan pada PR. Jika dijejaki, tangani maklum balas."
        - event: "pull_request.closed"
          task: "PR ditutup atau digabungkan. Bersihkan cawangan dan arkibkan fail penjejakan."
        - event: "issues.opened"
          task: "Triage isu baru"

# ---------------------------------------------------------------------------
# GitHub: Tetapan integrasi GitHub (pilihan)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Lalai: false. Tetapkan true untuk cantum PR yang diluluskan secara automatik.

# ---------------------------------------------------------------------------
# Groups: Tingkah laku sembang kumpulan (pilihan)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Web: Konfigurasi carian dan ambil
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Backend carian (brave adalah lalai)
# Kunci API disimpan dalam keychain OS

# ---------------------------------------------------------------------------
# Remote: Akses jauh (pilihan)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# Token auth disimpan dalam keychain OS
```

## Rujukan Bahagian

### `models`

| Kunci                            | Jenis    | Keterangan                                                                                                     |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `primary`                        | objek    | Rujukan model utama dengan medan `provider` dan `model`                                                        |
| `primary.provider`               | string   | Nama pembekal (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)           |
| `primary.model`                  | string   | Pengecam model yang digunakan untuk penyelesaian ejen                                                          |
| `vision`                         | string   | Model visi pilihan untuk huraian imej automatik (lihat [Imej dan Visi](/ms-MY/features/image-vision))         |
| `streaming`                      | boolean  | Aktifkan respons penstriman (lalai: `true`)                                                                    |
| `providers`                      | objek    | Konfigurasi khusus pembekal (lihat di bawah)                                                                   |
| `failover`                       | string[] | Senarai tertib model jatuh balik                                                                               |
| `failover_config.max_retries`    | number   | Percubaan semula per pembekal sebelum failover                                                                 |
| `failover_config.retry_delay_ms` | number   | Kelewatan antara percubaan semula dalam milisaat                                                               |
| `failover_config.conditions`     | string[] | Syarat yang mencetuskan failover                                                                               |

### `channels`

Setiap kunci saluran adalah jenis saluran. Semua jenis saluran menyokong medan `classification` untuk mengatasi tahap pengkelasan lalai.

::: info Semua rahsia (token, kunci API, kata laluan) disimpan dalam keychain OS, bukan dalam fail ini. Jalankan `triggerfish config add-channel <name>` untuk memasukkan kelayakan dengan selamat. :::

### `classification`

| Kunci  | Jenis                            | Keterangan                                                                              |
| ------ | -------------------------------- | --------------------------------------------------------------------------------------- |
| `mode` | `"personal"` atau `"enterprise"` | Mod pelancaran (akan datang -- pada masa ini kedua-duanya menggunakan tahap pengkelasan yang sama) |

### `policy`

Peraturan tersuai yang dinilai semasa pelaksanaan hook. Setiap peraturan menentukan jenis hook, keutamaan, syarat, dan tindakan. Nombor keutamaan yang lebih tinggi dinilai dahulu.

### `mcp_servers`

Pelayan alat MCP luaran. Setiap pelayan menentukan arahan untuk melancarkannya, pemboleh ubah persekitaran pilihan, tahap pengkelasan, dan kebenaran per-alat.

### `plugins`

Konfigurasi plugin dinamik. Setiap kunci adalah nama plugin yang sepadan dengan direktori dalam `~/.triggerfish/plugins/`. Konfigurasi adalah pilihan -- plugin yang dimuatkan oleh ejen semasa runtime (melalui `plugin_install`) berfungsi tanpa entri konfigurasi.

| Kunci            | Jenis                         | Lalai         | Keterangan                                                         |
| ---------------- | ----------------------------- | ------------- | ------------------------------------------------------------------ |
| `enabled`        | boolean                       | `false`       | Sama ada hendak memuatkan plugin ini semasa permulaan              |
| `classification` | string                        | dari manifest | Mengatasi tahap pengkelasan plugin                                 |
| `trust`          | `"sandboxed"` atau `"trusted"` | `"sandboxed"` | Pemberian tahap kepercayaan. Manifest DAN konfigurasi mesti mengatakan `"trusted"` |
| (kunci lain)     | apa sahaja                    | --            | Dihantar kepada plugin sebagai `context.config`                    |

Lihat [Plugin](/ms-MY/integrations/plugins) untuk perincian tentang menulis, memuatkan, dan mengurus plugin.

### `scheduler`

Definisi pekerjaan cron dan masa trigger. Lihat [Cron dan Trigger](/ms-MY/features/cron-and-triggers) untuk perincian.

### `notifications`

Keutamaan penghantaran pemberitahuan. Lihat [Pemberitahuan](/ms-MY/features/notifications) untuk perincian.

### `web`

| Kunci                 | Jenis  | Keterangan                                                 |
| --------------------- | ------ | ---------------------------------------------------------- |
| `web.search.provider` | string | Backend carian untuk alat `web_search` (pada masa ini: `brave`) |

Lihat [Carian dan Ambil Web](/ms-MY/features/web-search) untuk perincian.

### `logging`

| Kunci   | Jenis  | Lalai      | Keterangan                                                                                       |
| ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------ |
| `level` | string | `"normal"` | Verbositi log: `quiet` (ralat sahaja), `normal` (info), `verbose` (debug), `debug` (jejak) |

Lihat [Pengelogan Berstruktur](/ms-MY/features/logging) untuk perincian tentang output log dan putaran fail.

### `github`

| Kunci        | Jenis   | Lalai   | Keterangan                                                                                                                                                                                        |
| ------------ | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | Apabila `true`, ejen mencantum PR secara automatik selepas menerima semakan yang meluluskan. Apabila `false` (lalai), ejen memberitahu pemilik dan menunggu arahan cantum eksplisit. |

Lihat panduan [Integrasi GitHub](/ms-MY/integrations/github) untuk arahan persediaan penuh.
