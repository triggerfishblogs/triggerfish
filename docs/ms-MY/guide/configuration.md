# Konfigurasi

Triggerfish dikonfigurasi melalui satu fail YAML di `~/.triggerfish/triggerfish.yaml`. Wizard persediaan (`triggerfish dive`) mencipta fail ini untuk anda, tetapi anda boleh mengeditnya secara manual pada bila-bila masa.

## Lokasi Fail Konfigurasi

```
~/.triggerfish/triggerfish.yaml
```

Anda boleh menetapkan nilai individu daripada baris perintah menggunakan laluan bertitik:

```bash
triggerfish config set <kunci> <nilai>
triggerfish config get <kunci>
```

Nilai boolean dan integer diproses secara automatik. Rahsia disamarkan dalam output.

Sahkan konfigurasi anda dengan:

```bash
triggerfish config validate
```

## Model

Bahagian `models` mengkonfigurasi pembekal LLM dan tingkah laku failover anda.

```yaml
models:
  # Pembekal dan model mana yang akan digunakan secara lalai
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Pilihan: model visi untuk huraian imej automatik apabila model utama
  # tidak menyokong visi
  # vision: gemini-2.0-flash

  # Respons penstriman (lalai: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Lalai Ollama

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # Lalai LM Studio

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Rantaian failover: jika utama gagal, cuba ini mengikut urutan
  failover:
    - openai
    - google
```

Kunci API disimpan dalam keychain OS, bukan dalam fail ini. Wizard persediaan (`triggerfish dive`) meminta kunci API anda dan menyimpannya dengan selamat. Ollama dan LM Studio adalah tempatan dan tidak memerlukan pengesahan.

## Saluran

Bahagian `channels` menentukan platform pemesejan mana yang ejen anda sambungkan dan tahap pengkelasan untuk setiap satu.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

Token, kata laluan, dan kunci API untuk setiap saluran disimpan dalam keychain OS. Jalankan `triggerfish config add-channel <nama>` untuk memasukkan kelayakan secara interaktif — ia disimpan ke keychain, bukan ke fail ini.

### Kunci Konfigurasi Saluran

Konfigurasi bukan-rahsia dalam `triggerfish.yaml`:

| Saluran | Kunci Konfigurasi | Kunci Pilihan |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI | `enabled` | `classification` |
| Telegram | `enabled`, `ownerId` | `classification` |
| Signal | `enabled`, `endpoint`, `account` | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack | `enabled` | `classification`, `ownerId` |
| Discord | `enabled`, `ownerId` | `classification` |
| WhatsApp | `enabled`, `phoneNumberId` | `classification`, `ownerPhone`, `webhookPort` |
| WebChat | `enabled` | `classification`, `port`, `allowedOrigins` |
| Email | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval` |

### Tahap Pengkelasan Lalai

| Saluran | Lalai |
| -------- | -------------- |
| CLI | `INTERNAL` |
| Telegram | `INTERNAL` |
| Signal | `PUBLIC` |
| Slack | `PUBLIC` |
| Discord | `PUBLIC` |
| WhatsApp | `PUBLIC` |
| WebChat | `PUBLIC` |
| Email | `CONFIDENTIAL` |

Semua lalai boleh dikonfigurasi. Tetapkan mana-mana saluran ke mana-mana tahap pengkelasan.

## Pelayan MCP

Sambungkan pelayan MCP luaran untuk memberikan akses ejen anda kepada alat tambahan. Lihat [MCP Gateway](/ms-MY/integrations/mcp-gateway) untuk model keselamatan penuh.

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
```

Setiap pelayan mesti mempunyai tahap `classification` atau ia akan ditolak (tolak sebagai lalai). Gunakan `command` + `args` untuk pelayan tempatan (dilahirkan sebagai subproses) atau `url` untuk pelayan jauh (HTTP SSE). Nilai persekitaran dengan awalan `keychain:` diselesaikan daripada keychain OS.

Untuk bantuan memilih tahap pengkelasan, lihat [Panduan Pengkelasan](./classification-guide).

## Pengkelasan

Bahagian `classification` mengawal cara Triggerfish mengkelaskan dan melindungi data.

```yaml
classification:
  mode: personal # "personal" atau "enterprise" (akan datang)
```

**Tahap pengkelasan:**

| Tahap | Keterangan | Contoh |
| -------------- | --------------- | ----------------------------------------------------- |
| `RESTRICTED` | Paling sensitif | Dokumen M&A, PII, akaun bank, rekod perubatan |
| `CONFIDENTIAL` | Sensitif | Data CRM, kewangan, kontrak, rekod cukai |
| `INTERNAL` | Dalaman sahaja | Wiki dalaman, nota peribadi, kenalan |
| `PUBLIC` | Selamat untuk sesiapa | Bahan pemasaran, maklumat awam, kandungan web umum |

## Dasar

Bahagian `policy` mengkonfigurasi peraturan penguatkuasaan tersuai melebihi perlindungan terbina dalam.

```yaml
policy:
  # Tindakan lalai apabila tiada peraturan sepadan
  default_action: ALLOW

  # Peraturan tersuai
  rules:
    # Sekat respons alat yang mengandungi corak SSN
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # Hadkan kadar panggilan API luaran
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Peraturan keselamatan teras — tiada write-down, eskalasi taint sesi, pengelogan audit — sentiasa dikuatkuasakan dan tidak boleh dilumpuhkan. Peraturan dasar tersuai menambah kawalan tambahan di atas perlindungan tetap ini. :::

## Carian & Fetch Web

Bahagian `web` mengkonfigurasi carian web dan pengambilan kandungan, termasuk kawalan keselamatan domain.

```yaml
web:
  search:
    provider: brave # Backend carian (brave disokong pada masa ini)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Permintaan sesaat
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability atau raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Kosong = benarkan semua (tolak senarai deny)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

## Cron Jobs

Jadualkan tugas berulang untuk ejen anda:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # Jam 7 pagi setiap hari
      task: "Sediakan taklimat pagi dengan kalendar, e-mel yang belum dibaca, dan cuaca"
      channel: telegram # Tempat untuk menghantar keputusan
      classification: INTERNAL # Had siling taint maksimum untuk kerja ini

    - id: pipeline-check
      schedule: "0 */4 * * *" # Setiap 4 jam
      task: "Semak saluran paip Salesforce untuk perubahan"
      channel: slack
      classification: CONFIDENTIAL
```

Setiap cron job berjalan dalam sesi terpencil sendiri dengan siling pengkelasan. Semua tindakan cron melalui hook dasar normal.

## Masa Trigger

Konfigurasi seberapa kerap ejen anda melakukan check-in proaktif:

```yaml
trigger:
  interval: 30m # Semak setiap 30 minit
  classification: INTERNAL # Had siling taint maksimum untuk sesi trigger
  quiet_hours: "22:00-07:00" # Jangan trigger semasa waktu senyap
```

Sistem trigger membaca fail `~/.triggerfish/TRIGGER.md` anda untuk memutuskan apa yang perlu diperiksa pada setiap wakeup. Lihat [SPINE dan Triggers](./spine-and-triggers) untuk butiran tentang menulis TRIGGER.md anda.

## Webhooks

Terima peristiwa masuk daripada perkhidmatan luaran:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Semak PR dan hantar ringkasan"
        - event: "issues.opened"
          task: "Triage isu baru"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Siasat ralat dan cipta PR pembaikan jika boleh"
```

## Contoh Lengkap

Berikut adalah contoh konfigurasi lengkap dengan komen:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- Pembekal LLM ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Saluran ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- Pengkelasan ---
classification:
  mode: personal

# --- Dasar ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Sediakan taklimat pagi"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Langkah Seterusnya

- Takrifkan identiti ejen anda dalam [SPINE.md](./spine-and-triggers)
- Sediakan pemantauan proaktif dengan [TRIGGER.md](./spine-and-triggers)
- Ketahui semua perintah CLI dalam [rujukan Perintah](./commands)
