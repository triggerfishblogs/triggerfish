# Penyelesaian Masalah: Konfigurasi

## Ralat Hurai YAML

### "Configuration parse failed"

Fail YAML mempunyai ralat sintaks. Punca biasa:

- **Ketidakpadanan indentasi.** YAML sensitif terhadap ruang kosong. Gunakan ruang, bukan tab. Setiap tahap sarang sepatutnya tepat 2 ruang.
- **Aksara khas tidak dikuota.** Nilai yang mengandungi `:`, `#`, `{`, `}`, `[`, `]`, atau `&` mesti dikuotakan.
- **Kolon hilang selepas kunci.** Setiap kunci memerlukan `: ` (kolon diikuti dengan ruang).

Sahkan YAML anda:

```bash
triggerfish config validate
```

Atau gunakan pengesah YAML dalam talian untuk mencari baris yang tepat.

### "Configuration file did not parse to an object"

Fail YAML berjaya dihurai tetapi hasilnya bukan pemetaan YAML (objek). Ini berlaku jika fail anda hanya mengandungi nilai skalar, senarai, atau kosong.

`triggerfish.yaml` anda mesti mempunyai pemetaan peringkat atas. Sekurang-kurangnya:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish mencari konfigurasi di laluan-laluan ini, mengikut urutan:

1. Pemboleh ubah persekitaran `$TRIGGERFISH_CONFIG` (jika ditetapkan)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (jika `TRIGGERFISH_DATA_DIR` ditetapkan)
3. `/data/triggerfish.yaml` (persekitaran Docker)
4. `~/.triggerfish/triggerfish.yaml` (lalai)

Jalankan wizard persediaan untuk mencipta satu:

```bash
triggerfish dive
```

---

## Ralat Pengesahan

### "Configuration validation failed"

Ini bermakna YAML berjaya dihurai tetapi gagal pengesahan struktur. Mesej khusus:

**"models is required"** atau **"models.primary is required"**

Bahagian `models` adalah wajib. Anda memerlukan sekurang-kurangnya pembekal utama dan model:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** atau **"primary.model must be non-empty"**

Medan `primary` mesti mempunyai kedua-dua `provider` dan `model` ditetapkan kepada rentetan bukan kosong.

**"Invalid classification level"** dalam `classification_models`

Tahap yang sah ialah: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Ini sensitif terhadap huruf besar/kecil. Semak kunci `classification_models` anda.

---

## Ralat Rujukan Rahsia

### Rahsia tidak diselesaikan semasa permulaan

Jika konfigurasi anda mengandungi `secret:some-key` dan kunci itu tidak wujud dalam keychain, daemon keluar dengan ralat seperti:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Pembetulan:**

```bash
# Senaraikan rahsia yang wujud
triggerfish config get-secret --list

# Simpan rahsia yang hilang
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Backend rahsia tidak tersedia

Pada Linux, stor rahsia menggunakan `secret-tool` (libsecret / GNOME Keyring). Jika antara muka D-Bus Secret Service tidak tersedia (pelayan tanpa kepala, bekas minimal), anda akan melihat ralat semasa menyimpan atau mendapatkan semula rahsia.

**Penyelesaian sampingan untuk Linux tanpa kepala:**

1. Pasang `gnome-keyring` dan `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Mulakan daemon keyring:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Atau gunakan jatuh balik fail yang disulitkan dengan menetapkan:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Nota: jatuh balik memori bermakna rahsia hilang semasa mulakan semula. Ini hanya sesuai untuk pengujian.

---

## Isu Nilai Konfigurasi

### Paksaan boolean

Apabila menggunakan `triggerfish config set`, nilai rentetan `"true"` dan `"false"` ditukar secara automatik ke boolean YAML. Jika anda benar-benar memerlukan rentetan literal `"true"`, edit fail YAML secara langsung.

Begitu juga, rentetan yang kelihatan seperti integer (`"8080"`) dipaksa ke nombor.

### Sintaks laluan bertitik

Arahan `config set` dan `config get` menggunakan laluan bertitik untuk menavigasi YAML bersarang:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Jika segmen laluan mengandungi titik, tiada sintaks pelepasan. Edit fail YAML secara langsung.

### Penutupan rahsia dalam `config get`

Apabila anda menjalankan `triggerfish config get` pada kunci yang mengandungi "key", "secret", atau "token", output ditutup: `****...****` dengan hanya 4 aksara pertama dan terakhir kelihatan. Ini adalah disengajakan. Gunakan `triggerfish config get-secret <kunci>` untuk mendapatkan nilai sebenar.

---

## Sandaran Konfigurasi

Triggerfish mencipta sandaran bertimestamp dalam `~/.triggerfish/backups/` sebelum setiap operasi `config set`, `config add-channel`, atau `config add-plugin`. Sehingga 10 sandaran dikekalkan.

Untuk memulihkan sandaran:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Pengesahan Pembekal

Wizard persediaan mengesahkan kunci API dengan memanggil titik akhir penyenaraian model setiap pembekal (yang tidak menggunakan token). Titik akhir pengesahan ialah:

| Pembekal | Titik akhir |
|----------|-------------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Jika pengesahan gagal, semak semula:
- Kunci API adalah betul dan tidak tamat tempoh
- Titik akhir boleh dicapai dari rangkaian anda
- Untuk pembekal tempatan (Ollama, LM Studio), pelayan benar-benar sedang berjalan

### Model tidak ditemui

Jika pengesahan berjaya tetapi model tidak ditemui, wizard memberi amaran. Ini biasanya bermakna:

- **Salah taip dalam nama model.** Semak dokumentasi pembekal untuk ID model yang tepat.
- **Model Ollama belum ditarik.** Jalankan `ollama pull <model>` terlebih dahulu.
- **Pembekal tidak menyenaraikan model.** Sesetengah pembekal (Fireworks) menggunakan format penamaan berbeza. Wizard menormalkan corak biasa, tetapi ID model yang luar biasa mungkin tidak sepadan.
