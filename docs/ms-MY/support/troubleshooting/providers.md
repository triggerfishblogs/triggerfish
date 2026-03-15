# Penyelesaian Masalah: Pembekal LLM

## Ralat Pembekal Biasa

### 401 Tidak Dibenarkan / 403 Dilarang

Kunci API anda tidak sah, tamat tempoh, atau tidak mempunyai kebenaran yang mencukupi.

**Pembetulan:**

```bash
# Simpan semula kunci API
triggerfish config set-secret provider:<nama>:apiKey <kunci-anda>

# Mulakan semula daemon
triggerfish stop && triggerfish start
```

Nota khusus pembekal:

| Pembekal | Format kunci | Tempat mendapatkannya |
|----------|--------------|----------------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Had Kadar Dicapai

Anda telah melebihi had kadar pembekal. Triggerfish tidak mencuba semula secara automatik pada 429 untuk kebanyakan pembekal (kecuali Notion, yang mempunyai backoff terbina dalam).

**Pembetulan:** Tunggu dan cuba lagi. Jika anda sentiasa mencapai had kadar, pertimbangkan:
- Naik taraf pelan API anda untuk had yang lebih tinggi
- Menambah pembekal failover supaya permintaan diteruskan apabila yang utama dihadkan
- Mengurangkan kekerapan trigger jika tugas berjadual adalah puncanya

### Ralat Pelayan 500 / 502 / 503

Pelayan pembekal mengalami isu. Ini biasanya sementara.

Jika anda mempunyai rantai failover dikonfigurasi, Triggerfish mencuba pembekal seterusnya secara automatik. Tanpa failover, ralat disebarkan kepada pengguna.

### "No response body for streaming"

Pembekal menerima permintaan tetapi mengembalikan badan respons kosong untuk panggilan penstriman. Ini boleh berlaku apabila:

- Infrastruktur pembekal terlebih beban
- Proksi atau tembok api membuang badan respons
- Model tidak tersedia buat sementara

Ini menjejaskan: OpenRouter, Tempatan (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Isu Khusus Pembekal

### Anthropic

**Penukaran format alat.** Triggerfish menukar antara format alat dalaman dan format alat natif Anthropic. Jika anda melihat ralat berkaitan alat, semak bahawa definisi alat anda mempunyai JSON Schema yang sah.

**Pengendalian sistem prompt.** Anthropic memerlukan sistem prompt sebagai medan berasingan, bukan sebagai mesej. Penukaran ini adalah automatik, tetapi jika anda melihat mesej "system" muncul dalam perbualan, ada masalah dengan pemformatan mesej.

### OpenAI

**Penalti kekerapan.** Triggerfish menggunakan penalti kekerapan 0.3 untuk semua permintaan OpenAI untuk menghalang output berulang. Ini dikodkan keras dan tidak boleh diubah melalui konfigurasi.

**Sokongan imej.** OpenAI menyokong imej yang dikodkan base64 dalam kandungan mesej. Jika penglihatan tidak berfungsi, pastikan anda mempunyai model yang menyokong penglihatan (contoh, `gpt-4o`, bukan `gpt-4o-mini`).

### Google Gemini

**Kunci dalam rentetan pertanyaan.** Tidak seperti pembekal lain, Google menggunakan kunci API sebagai parameter pertanyaan, bukan header. Ini dikendalikan secara automatik, tetapi bermakna kunci mungkin muncul dalam log proksi/akses jika anda menghalakan melalui proksi korporat.

### Ollama / LM Studio (Tempatan)

**Pelayan mesti berjalan.** Pembekal tempatan memerlukan pelayan model berjalan sebelum Triggerfish bermula. Jika Ollama atau LM Studio tidak berjalan:

```
Local LLM request failed (connection refused)
```

**Mulakan pelayan:**

```bash
# Ollama
ollama serve

# LM Studio
# Buka LM Studio dan mulakan pelayan tempatan
```

**Model tidak dimuatkan.** Dengan Ollama, model mesti ditarik terlebih dahulu:

```bash
ollama pull llama3.3:70b
```

**Gantian titik akhir.** Jika pelayan tempatan anda tidak berada pada port lalai:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Lalai Ollama
      # endpoint: "http://localhost:1234"  # Lalai LM Studio
```

### Fireworks

**API natif.** Triggerfish menggunakan API natif Fireworks, bukan titik akhir yang serasi OpenAI. ID model mungkin berbeza dari apa yang anda lihat dalam dokumentasi yang serasi OpenAI.

**Format ID model.** Fireworks menerima beberapa corak ID model. Wizard menormalkan format biasa, tetapi jika pengesahan gagal, semak [perpustakaan model Fireworks](https://fireworks.ai/models) untuk ID yang tepat.

### OpenRouter

**Penghalaan model.** OpenRouter menghalakan permintaan ke pelbagai pembekal. Ralat dari pembekal asas dibungkus dalam format ralat OpenRouter. Mesej ralat sebenar diekstrak dan dipaparkan.

**Format ralat API.** OpenRouter mengembalikan ralat sebagai objek JSON. Jika mesej ralat kelihatan generik, ralat mentah dicatat pada tahap DEBUG.

### ZenMux / Z.AI

**Sokongan penstriman.** Kedua-dua pembekal menyokong penstriman. Jika penstriman gagal:

```
ZenMux stream failed (status): error text
```

Semak bahawa kunci API anda mempunyai kebenaran penstriman (sesetengah peringkat API menyekat akses penstriman).

---

## Failover

### Cara failover berfungsi

Apabila pembekal utama gagal, Triggerfish mencuba setiap model dalam senarai `failover` mengikut urutan:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Jika pembekal failover berjaya, respons dicatat dengan pembekal mana yang digunakan. Jika semua pembekal gagal, ralat terakhir dikembalikan kepada pengguna.

### "All providers exhausted"

Setiap pembekal dalam rantai gagal. Semak:

1. Adakah semua kunci API sah? Uji setiap pembekal secara individu.
2. Adakah semua pembekal mengalami gangguan? Semak halaman status mereka.
3. Adakah rangkaian anda menyekat HTTPS keluar ke mana-mana titik akhir pembekal?

### Konfigurasi failover

```yaml
models:
  failover_config:
    max_retries: 3          # Cuba semula per pembekal sebelum beralih ke seterusnya
    retry_delay_ms: 1000    # Kelewatan asas antara percubaan semula
    conditions:             # Ralat yang mencetuskan failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

Nama pembekal dalam `models.primary.provider` tidak sepadan dengan mana-mana pembekal yang dikonfigurasi dalam `models.providers`. Semak salah taip.

### "Classification model provider not configured"

Anda menetapkan gantian `classification_models` yang merujuk pembekal yang tidak hadir dalam `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Pembekal ini mesti wujud dalam models.providers
      model: llama3.3:70b
  providers:
    # "local" mesti ditakrifkan di sini
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Tingkah Laku Cuba Semula

Triggerfish mencuba semula permintaan pembekal pada ralat sementara (tamat masa rangkaian, respons 5xx). Logik cuba semula:

1. Menunggu dengan backoff eksponen antara percubaan
2. Mencatat setiap percubaan semula pada tahap WARN
3. Selepas menghabiskan percubaan semula untuk satu pembekal, beralih ke seterusnya dalam rantai failover
4. Sambungan penstriman mempunyai logik cuba semula berasingan untuk penubuhan sambungan berbanding kegagalan pertengahan aliran

Anda boleh melihat percubaan semula dalam log:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
