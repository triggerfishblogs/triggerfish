# Penyelesaian Masalah: Rahsia & Kelayakan

## Backend Keychain Mengikut Platform

| Platform | Backend | Perincian |
|----------|---------|-----------|
| macOS | Keychain (natif) | Menggunakan CLI `security` untuk mengakses Keychain Access |
| Linux | Secret Service (D-Bus) | Menggunakan CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | Stor fail yang disulitkan | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Stor fail yang disulitkan | `/data/secrets.json` + `/data/secrets.key` |

Backend dipilih secara automatik semasa permulaan. Anda tidak boleh menukar backend yang digunakan untuk platform anda.

---

## Isu macOS

### Gesaan akses keychain

macOS mungkin meminta anda membenarkan `triggerfish` mengakses keychain. Klik "Always Allow" untuk mengelakkan gesaan berulang. Jika anda tersilap klik "Deny", buka Keychain Access, cari entri tersebut, dan buangnya. Akses seterusnya akan meminta semula.

### Keychain dikunci

Jika keychain macOS dikunci (contoh, selepas tidur), operasi rahsia akan gagal. Buka kuncinya:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Atau hanya buka kunci Mac anda (keychain dibuka kunci semasa log masuk).

---

## Isu Linux

### "secret-tool" tidak ditemui

Backend keychain Linux menggunakan `secret-tool`, yang merupakan sebahagian dari pakej `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Tiada daemon Secret Service berjalan

Pada pelayan tanpa kepala atau persekitaran desktop minimal, mungkin tiada daemon Secret Service. Gejala:

- Arahan `secret-tool` tersekat atau gagal
- Mesej ralat tentang sambungan D-Bus

**Pilihan:**

1. **Pasang dan mulakan GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Gunakan jatuh balik fail yang disulitkan:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Amaran: jatuh balik memori tidak menyimpan rahsia merentasi mulakan semula. Ia hanya sesuai untuk pengujian.

3. **Untuk pelayan, pertimbangkan Docker.** Pelancaran Docker menggunakan stor fail yang disulitkan yang tidak memerlukan daemon keyring.

### KDE / KWallet

Jika anda menggunakan KDE dengan KWallet dan bukannya GNOME Keyring, `secret-tool` sepatutnya masih berfungsi melalui API D-Bus Secret Service yang KWallet laksanakan. Jika tidak, pasang `gnome-keyring` bersama KWallet.

---

## Stor Fail Disulitkan Windows / Docker

### Cara ia berfungsi

Stor fail yang disulitkan menggunakan enkripsi AES-256-GCM:

1. Kunci mesin diperoleh menggunakan PBKDF2 dan disimpan dalam `secrets.key`
2. Setiap nilai rahsia disulitkan secara individu dengan IV unik
3. Data yang disulitkan disimpan dalam `secrets.json` dalam format berversi (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

Pada sistem berasaskan Unix (Linux dalam Docker), fail kunci mesti mempunyai kebenaran `0600` (hanya baca/tulis pemilik). Jika kebenaran terlalu terbuka:

```
Machine key file permissions too open
```

**Pembetulan:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# atau dalam Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

Fail kunci wujud tetapi tidak dapat dihurai. Ia mungkin telah dipotong atau ditimpa.

**Pembetulan:** Padam fail kunci dan jana semula:

```bash
rm ~/.triggerfish/secrets.key
```

Pada permulaan seterusnya, kunci baru dijana. Namun, semua rahsia sedia ada yang disulitkan dengan kunci lama tidak akan dapat dibaca. Anda perlu menyimpan semula semua rahsia:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Ulangi untuk semua rahsia
```

### "Secret file permissions too open"

Sama seperti fail kunci, fail rahsia sepatutnya mempunyai kebenaran yang ketat:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

Sistem tidak dapat menetapkan kebenaran fail. Ini boleh berlaku pada sistem fail yang tidak menyokong kebenaran Unix (sesetengah mount rangkaian, volum FAT/exFAT). Sahkan sistem fail menyokong perubahan chmod.

---

## Penghijrahan Rahsia Warisan

### Penghijrahan automatik

Jika Triggerfish mengesan fail rahsia teks biasa (format lama tanpa enkripsi), ia secara automatik berhijrah ke format yang disulitkan semasa pemuatan pertama:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Penghijrahan:
1. Membaca fail JSON teks biasa
2. Menyulitkan setiap nilai dengan AES-256-GCM
3. Menulis ke fail sementara, kemudian menamakannya semula secara atomik
4. Mencatat amaran yang mengesyorkan putaran rahsia

### Penghijrahan manual

Jika anda mempunyai rahsia dalam fail `triggerfish.yaml` anda (tidak menggunakan rujukan `secret:`), hijrahkannya ke keychain:

```bash
triggerfish config migrate-secrets
```

Ini mengimbas konfigurasi anda untuk medan rahsia yang diketahui (kunci API, token bot, dsb.), menyimpannya dalam keychain, dan menggantikan nilai dalam fail konfigurasi dengan rujukan `secret:`.

### Isu pemindahan merentasi peranti

Jika penghijrahan melibatkan pemindahan fail merentasi sempadan sistem fail (titik mount berbeza, NFS), penggantian nama atomik mungkin gagal. Penghijrahan jatuh balik ke salin-kemudian-buang, yang masih selamat tetapi sebentar mempunyai kedua-dua fail pada cakera.

---

## Penyelesaian Rahsia

### Cara rujukan `secret:` berfungsi

Nilai konfigurasi yang diawali dengan `secret:` diselesaikan semasa permulaan:

```yaml
# Dalam triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Semasa permulaan, diselesaikan kepada:
apiKey: "sk-ant-api03-nilai-kunci-sebenar..."
```

Nilai yang diselesaikan hanya hidup dalam memori. Fail konfigurasi pada cakera sentiasa mengandungi rujukan `secret:`.

### "Secret not found"

```
Secret not found: <kunci>
```

Kunci yang dirujuk tidak wujud dalam keychain.

**Pembetulan:**

```bash
triggerfish config set-secret <kunci> <nilai>
```

### Menyenaraikan rahsia

```bash
# Senaraikan semua kunci rahsia yang disimpan (nilai tidak ditunjukkan)
triggerfish config get-secret --list
```

### Memadam rahsia

```bash
triggerfish config set-secret <kunci> ""
# atau melalui ejen:
# Ejen boleh meminta pemadaman rahsia melalui alat rahsia
```

---

## Gantian Pemboleh Ubah Persekitaran

Laluan fail kunci boleh digantikan dengan `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/laluan/tersuai/secrets.key
```

Ini terutamanya berguna untuk pelancaran Docker dengan susun atur volum tersuai.

---

## Nama Kunci Rahsia Biasa

Ini adalah kunci keychain standard yang digunakan oleh Triggerfish:

| Kunci | Penggunaan |
|-------|------------|
| `provider:<nama>:apiKey` | Kunci API pembekal LLM |
| `telegram:botToken` | Token bot Telegram |
| `slack:botToken` | Token bot Slack |
| `slack:appToken` | Token peringkat aplikasi Slack |
| `slack:signingSecret` | Rahsia tandatangan Slack |
| `discord:botToken` | Token bot Discord |
| `whatsapp:accessToken` | Token akses WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | Token pengesahan webhook WhatsApp |
| `email:smtpPassword` | Kata laluan geganti SMTP |
| `email:imapPassword` | Kata laluan pelayan IMAP |
| `web:search:apiKey` | Kunci API Brave Search |
| `github-pat` | Personal Access Token GitHub |
| `notion:token` | Token integrasi Notion |
| `caldav:password` | Kata laluan pelayan CalDAV |
| `google:clientId` | ID klien Google OAuth |
| `google:clientSecret` | Rahsia klien Google OAuth |
| `google:refreshToken` | Token penyegaran Google OAuth |
