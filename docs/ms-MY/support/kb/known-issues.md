# KB: Isu Diketahui

Isu diketahui semasa dan penyelesaian sampingannya. Halaman ini dikemas kini apabila isu ditemui dan diselesaikan.

---

## E-mel: Tiada Sambungan Semula IMAP

**Status:** Terbuka

Penyesuai saluran e-mel mengundi mesej baru setiap 30 saat melalui IMAP. Jika sambungan IMAP terputus (gangguan rangkaian, mulakan semula pelayan, tamat masa terbiar), gelung pengundian gagal senyap dan tidak cuba menyambung semula.

**Simptom:**
- Saluran e-mel berhenti menerima mesej baru
- `IMAP unseen email poll failed` muncul dalam log
- Tiada pemulihan automatik

**Penyelesaian sampingan:** Mulakan semula daemon:

```bash
triggerfish stop && triggerfish start
```

**Punca akar:** Gelung pengundian IMAP tidak mempunyai logik sambungan semula. `setInterval` terus mencetuskan tetapi setiap pengundian gagal kerana sambungan mati.

---

## Slack/Discord SDK: Kebocoran Operasi Async

**Status:** Isu hulu diketahui

SDK Slack (`@slack/bolt`) dan Discord (`discord.js`) membocorkan operasi async semasa import. Ini menjejaskan ujian (memerlukan `sanitizeOps: false`) tetapi tidak menjejaskan penggunaan pengeluaran.

**Simptom:**
- Kegagalan ujian dengan "leaking async ops" apabila menguji penyesuai saluran
- Tiada impak pengeluaran

**Penyelesaian sampingan:** Fail ujian yang mengimport penyesuai Slack atau Discord mesti menetapkan:

```typescript
Deno.test({
  name: "nama ujian",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Pemotongan Mesej Berbanding Pemecahan

**Status:** Dengan reka bentuk

Mesej Slack dipotong pada 40,000 aksara dan bukannya dibahagi kepada beberapa mesej (seperti yang dilakukan Telegram dan Discord). Respons ejen yang sangat panjang kehilangan kandungan di hujung.

**Penyelesaian sampingan:** Minta ejen menghasilkan respons yang lebih pendek, atau gunakan saluran berbeza untuk tugas yang menjana output besar.

---

## WhatsApp: Semua Pengguna Dilayan Sebagai Pemilik Apabila ownerPhone Tiada

**Status:** Dengan reka bentuk (dengan amaran)

Jika medan `ownerPhone` tidak dikonfigurasi untuk saluran WhatsApp, semua penghantar mesej dilayan sebagai pemilik, memberikan mereka akses alat penuh.

**Simptom:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (amaran log sebenarnya mengelirukan; tingkah laku memberikan akses pemilik)
- Mana-mana pengguna WhatsApp boleh mengakses semua alat

**Penyelesaian sampingan:** Sentiasa tetapkan `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH Tidak Dikemas Kini Selepas Pemasangan Alat

**Status:** Dengan reka bentuk

Fail unit systemd menangkap PATH shell anda semasa pemasangan daemon. Jika anda memasang alat baru (binari pelayan MCP, `npx`, dsb.) selepas memasang daemon, daemon tidak akan menemuinya.

**Simptom:**
- Pelayan MCP gagal dijana
- Binari alat "tidak ditemui" walaupun berfungsi dalam terminal anda

**Penyelesaian sampingan:** Pasang semula daemon untuk mengemas kini PATH yang ditangkap:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Ini juga terpakai untuk launchd (macOS).

---

## Pelayar: Sekatan CDP Chrome Flatpak

**Status:** Had platform

Sesetengah binaan Flatpak Chrome atau Chromium menyekat bendera `--remote-debugging-port`, yang menghalang Triggerfish daripada menyambung melalui Chrome DevTools Protocol.

**Simptom:**
- `CDP endpoint on port X not ready after Yms`
- Pelayar dilancarkan tetapi Triggerfish tidak boleh mengawalnya

**Penyelesaian sampingan:** Pasang Chrome atau Chromium sebagai pakej natif dan bukannya Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Kebenaran Volum dengan Podman

**Status:** Khusus platform

Apabila menggunakan Podman dengan bekas tanpa akar, pemetaan UID mungkin menghalang bekas (berjalan sebagai UID 65534) daripada menulis ke volum data.

**Simptom:**
- Ralat `Permission denied` semasa permulaan
- Tidak dapat mencipta fail konfigurasi, pangkalan data, atau log

**Penyelesaian sampingan:** Gunakan bendera mount volum `:Z` untuk pengelabelan semula SELinux, dan pastikan direktori volum boleh ditulis:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Atau cipta volum dengan pemilikan yang betul. Pertama, cari laluan mount volum, kemudian chown:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Perhatikan laluan "Mountpoint"
podman unshare chown 65534:65534 /laluan/dari/atas
```

---

## Windows: csc.exe .NET Framework Tidak Ditemui

**Status:** Khusus platform

Pemasang Windows mengkompil pembungkus perkhidmatan C# semasa pemasangan. Jika `csc.exe` tidak ditemui (.NET Framework tiada, atau laluan pemasangan bukan-standard), pemasangan perkhidmatan gagal.

**Simptom:**
- Pemasang selesai tetapi perkhidmatan tidak didaftarkan
- `triggerfish status` menunjukkan perkhidmatan tidak wujud

**Penyelesaian sampingan:** Pasang .NET Framework 4.x, atau jalankan Triggerfish dalam mod latar depan:

```powershell
triggerfish run
```

Biarkan terminal terbuka. Daemon berjalan sehingga anda menutupnya.

---

## CalDAV: Konflik ETag dengan Klien Serentak

**Status:** Dengan reka bentuk (spesifikasi CalDAV)

Apabila mengemas kini atau memadam peristiwa kalendar, CalDAV menggunakan ETag untuk kawalan konkurensi optimistik. Jika klien lain (aplikasi telefon, antara muka web) mengubah suai peristiwa antara bacaan dan penulisan anda, operasi gagal:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Penyelesaian sampingan:** Ejen sepatutnya mencuba semula secara automatik dengan mengambil versi peristiwa terkini. Jika tidak, minta ia "dapatkan versi terkini peristiwa dan cuba lagi."

---

## Memori Jatuh Balik: Rahsia Hilang Semasa Mulakan Semula

**Status:** Dengan reka bentuk

Apabila menggunakan `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, rahsia disimpan dalam memori sahaja dan hilang apabila daemon dimulakan semula. Mod ini hanya dimaksudkan untuk pengujian.

**Simptom:**
- Rahsia berfungsi sehingga daemon dimulakan semula
- Selepas mulakan semula: ralat `Secret not found`

**Penyelesaian sampingan:** Sediakan backend rahsia yang betul. Pada Linux tanpa kepala, pasang `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Token Penyegaran Tidak Dikeluarkan Semasa Kebenaran Semula

**Status:** Tingkah laku API Google

Google hanya mengeluarkan token penyegaran semasa kebenaran pertama. Jika anda telah memberi kuasa aplikasi sebelumnya dan menjalankan semula `triggerfish connect google`, anda mendapat token akses tetapi tiada token penyegaran.

**Simptom:**
- API Google berfungsi pada mulanya tetapi gagal selepas token akses tamat tempoh (1 jam)
- Ralat `No refresh token`

**Penyelesaian sampingan:** Batalkan akses aplikasi dahulu, kemudian beri kuasa semula:

1. Pergi ke [Kebenaran Akaun Google](https://myaccount.google.com/permissions)
2. Cari Triggerfish dan klik "Remove Access"
3. Jalankan `triggerfish connect google` semula
4. Google kini akan mengeluarkan token penyegaran segar

---

## Melaporkan Isu Baru

Jika anda menghadapi masalah yang tidak disenaraikan di sini, semak halaman [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Jika belum dilaporkan, laporkan isu baru mengikut [panduan pelaporan](/ms-MY/support/guides/filing-issues).
