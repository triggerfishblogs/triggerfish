# KB: Penghijrahan Rahsia

Artikel ini merangkumi penghijrahan rahsia dari storan teks biasa ke format yang disulitkan, dan dari nilai konfigurasi sebaris ke rujukan keychain.

## Latar Belakang

Versi awal Triggerfish menyimpan rahsia sebagai JSON teks biasa. Versi semasa menggunakan enkripsi AES-256-GCM untuk stor rahsia yang disandarkan fail (Windows, Docker) dan keychain natif OS (macOS Keychain, Linux Secret Service).

## Penghijrahan Automatik (Teks Biasa ke Disulitkan)

Apabila Triggerfish membuka fail rahsia dan mengesan format teks biasa lama (objek JSON rata tanpa medan `v`), ia secara automatik berhijrah:

1. **Pengesanan.** Fail diperiksa untuk kehadiran struktur `{v: 1, entries: {...}}`. Jika ia adalah `Record<string, string>` biasa, ia adalah format warisan.

2. **Penghijrahan.** Setiap nilai teks biasa disulitkan dengan AES-256-GCM menggunakan kunci mesin yang diperoleh melalui PBKDF2. IV unik dijana untuk setiap nilai.

3. **Penulisan atomik.** Data yang disulitkan ditulis ke fail sementara dahulu, kemudian dinamakan semula secara atomik untuk menggantikan yang asal. Ini mencegah kehilangan data jika proses diganggu.

4. **Pengelogan.** Dua entri log dicipta:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Pengendalian merentasi peranti.** Jika penggantian nama atomik gagal (contoh, fail sementara dan fail rahsia berada pada sistem fail berbeza), penghijrahan jatuh balik ke salin-kemudian-buang.

### Apa yang perlu anda lakukan

Tiada. Penghijrahan adalah sepenuhnya automatik dan berlaku semasa akses pertama. Walau bagaimanapun, selepas penghijrahan:

- **Putar rahsia anda.** Versi teks biasa mungkin telah disandarkan, dicache, atau dilog. Jana kunci API baru dan kemas kini:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <kunci-baru>
  ```

- **Padam sandaran lama.** Jika anda mempunyai sandaran fail rahsia teks biasa lama, padamkan dengan selamat.

## Penghijrahan Manual (Konfigurasi Sebaris ke Keychain)

Jika `triggerfish.yaml` anda mengandungi nilai rahsia mentah dan bukannya rujukan `secret:`:

```yaml
# Sebelum (tidak selamat)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-kunci-sebenar-di-sini"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Jalankan arahan penghijrahan:

```bash
triggerfish config migrate-secrets
```

Arahan ini:

1. Mengimbas konfigurasi untuk medan rahsia yang diketahui (kunci API, token bot, kata laluan)
2. Menyimpan setiap nilai dalam keychain OS di bawah nama kunci standardnya
3. Menggantikan nilai sebaris dengan rujukan `secret:`

```yaml
# Selepas (selamat)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Medan rahsia yang diketahui

Arahan penghijrahan mengetahui medan-medan ini:

| Laluan konfigurasi | Kunci keychain |
|--------------------|----------------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## Kunci Mesin

Stor fail yang disulitkan memperoleh kunci enkripsinya dari kunci mesin yang disimpan dalam `secrets.key`. Kunci ini dijana secara automatik semasa penggunaan pertama.

### Kebenaran fail kunci

Pada sistem Unix, fail kunci mesti mempunyai kebenaran `0600` (hanya baca/tulis pemilik). Triggerfish menyemak ini semasa permulaan dan mencatat amaran jika kebenaran terlalu terbuka:

```
Machine key file permissions too open
```

Pembetulan:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Kehilangan fail kunci

Jika fail kunci mesin dipadam atau rosak, semua rahsia yang disulitkan dengannya menjadi tidak dapat dipulihkan. Anda perlu menyimpan semula setiap rahsia:

```bash
triggerfish config set-secret provider:anthropic:apiKey <kunci>
triggerfish config set-secret telegram:botToken <token>
# ... dsb
```

Sandarkan fail `secrets.key` anda di lokasi yang selamat.

### Laluan kunci tersuai

Tindih laluan fail kunci dengan:

```bash
export TRIGGERFISH_KEY_PATH=/laluan/tersuai/secrets.key
```

Ini terutamanya berguna untuk pelancaran Docker dengan susun atur volum bukan-standard.
