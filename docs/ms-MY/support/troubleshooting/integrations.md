# Penyelesaian Masalah: Integrasi

## Google Workspace

### Token OAuth tamat tempoh atau dibatalkan

Token penyegaran Google OAuth boleh dibatalkan (oleh pengguna, oleh Google, atau kerana tidak aktif). Apabila ini berlaku:

```
Google OAuth token exchange failed
```

Atau anda akan melihat ralat 401 pada panggilan API Google.

**Pembetulan:** Sahkan semula:

```bash
triggerfish connect google
```

Ini membuka pelayar untuk aliran persetujuan OAuth. Selepas memberi akses, token baru disimpan dalam keychain.

### "No refresh token"

Aliran OAuth mengembalikan token akses tetapi tiada token penyegaran. Ini berlaku apabila:

- Anda telah memberi kuasa aplikasi sebelumnya (Google hanya menghantar token penyegaran semasa kebenaran pertama)
- Skrin persetujuan OAuth tidak meminta akses luar talian

**Pembetulan:** Batalkan akses aplikasi dalam [Tetapan Akaun Google](https://myaccount.google.com/permissions), kemudian jalankan `triggerfish connect google` sekali lagi. Kali ini Google akan menghantar token penyegaran segar.

### Pencegahan penyegaran serentak

Jika beberapa permintaan mencetuskan penyegaran token pada masa yang sama, Triggerfish menyusun siri mereka supaya hanya satu permintaan penyegaran dihantar. Jika anda melihat tamat masa semasa penyegaran token, mungkin penyegaran pertama mengambil masa terlalu lama.

---

## GitHub

### "GitHub token not found in keychain"

Integrasi GitHub menyimpan Personal Access Token dalam keychain OS di bawah kunci `github-pat`.

**Pembetulan:**

```bash
triggerfish connect github
# atau secara manual:
triggerfish config set-secret github-pat ghp_...
```

### Format token

GitHub menyokong dua format token:
- PAT klasik: `ghp_...`
- PAT berbutir halus: `github_pat_...`

Kedua-duanya berfungsi. Wizard persediaan mengesahkan token dengan memanggil API GitHub. Jika pengesahan gagal:

```
GitHub token verification failed
GitHub API request failed
```

Semak semula bahawa token mempunyai skop yang diperlukan. Untuk fungsi penuh, anda memerlukan: `repo`, `read:org`, `read:user`.

### Kegagalan klon

Alat klon GitHub mempunyai logik cuba semula automatik:

1. Percubaan pertama: klon dengan `--branch` yang dinyatakan
2. Jika cawangan tidak wujud: cuba semula tanpa `--branch` (gunakan cawangan lalai)

Jika kedua-dua percubaan gagal:

```
Clone failed on retry
Clone failed
```

Semak:
- Token mempunyai skop `repo`
- Repositori wujud dan token mempunyai akses
- Kesambungan rangkaian ke github.com

### Had kadar

Had kadar API GitHub ialah 5,000 permintaan/jam untuk permintaan yang disahkan. Kiraan had kadar yang tinggal dan masa set semula diekstrak dari header respons dan disertakan dalam mesej ralat:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Tiada backoff automatik. Tunggu tetingkap had kadar untuk set semula.

---

## Notion

### "Notion enabled but token not found in keychain"

Integrasi Notion memerlukan token integrasi dalaman yang disimpan dalam keychain.

**Pembetulan:**

```bash
triggerfish connect notion
```

Ini meminta token dan menyimpannya dalam keychain selepas mengesahkannya dengan API Notion.

### Format token

Notion menggunakan dua format token:
- Token integrasi dalaman: `ntn_...`
- Token warisan: `secret_...`

Kedua-duanya diterima. Wizard sambungan mengesahkan format sebelum menyimpan.

### Had kadar (429)

API Notion dihadkan kadar kepada kira-kira 3 permintaan sesaat. Triggerfish mempunyai had kadar terbina dalam (boleh dikonfigurasi) dan logik cuba semula:

- Kadar lalai: 3 permintaan/saat
- Cuba semula: sehingga 3 kali pada 429
- Backoff: eksponen dengan jitter, bermula pada 1 saat
- Menghormati header `Retry-After` dari respons Notion

Jika anda masih mencapai had kadar:

```
Notion API rate limited, retrying
```

Kurangkan operasi serentak atau turunkan had kadar dalam konfigurasi.

### 404 Tidak Ditemui

```
Notion: 404 Not Found
```

Sumber wujud tetapi tidak dikongsi dengan integrasi anda. Dalam Notion:

1. Buka halaman atau pangkalan data
2. Klik menu "..." > "Connections"
3. Tambah integrasi Triggerfish anda

### "client_secret removed" (Perubahan Pecahan)

Dalam kemas kini keselamatan, medan `client_secret` telah dibuang dari konfigurasi Notion. Jika anda mempunyai medan ini dalam `triggerfish.yaml` anda, buangnya. Notion kini hanya menggunakan token OAuth yang disimpan dalam keychain.

### Ralat rangkaian

```
Notion API network request failed
Notion API network error: <message>
```

API tidak boleh dicapai. Semak sambungan rangkaian anda. Jika anda berada di belakang proksi korporat, API Notion (`api.notion.com`) mesti boleh diakses.

---

## CalDAV (Kalendar)

### Penyelesaian kelayakan gagal

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

Integrasi CalDAV memerlukan nama pengguna dan kata laluan:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "nama-pengguna-anda"
  credential_ref: "secret:caldav:password"
```

Simpan kata laluan:

```bash
triggerfish config set-secret caldav:password <kata-laluan-anda>
```

### Kegagalan penemuan

CalDAV menggunakan proses penemuan berbilang langkah:
1. Cari URL prinsipal (PROPFIND pada titik akhir yang diketahui)
2. Cari kalendar-home-set
3. Senaraikan kalendar yang tersedia

Jika mana-mana langkah gagal:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Punca biasa:
- URL pelayan salah (sesetengah pelayan memerlukan `/dav/principals/` atau `/remote.php/dav/`)
- Kelayakan ditolak (nama pengguna/kata laluan salah)
- Pelayan tidak menyokong CalDAV (sesetengah pelayan mengiklankan WebDAV tetapi bukan CalDAV)

### Ketidakpadanan ETag semasa kemas kini/padam

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV menggunakan ETag untuk kawalan konkurensi optimistik. Jika klien lain (telefon, web) mengubah suai peristiwa antara bacaan dan kemas kini anda, ETag tidak akan sepadan.

**Pembetulan:** Ejen sepatutnya mengambil peristiwa sekali lagi untuk mendapatkan ETag semasa, kemudian cuba semula operasi. Ini dikendalikan secara automatik dalam kebanyakan kes.

### "CalDAV credentials not available, executor deferred"

Pelaksana CalDAV bermula dalam keadaan tertangguh jika kelayakan tidak dapat diselesaikan semasa permulaan. Ini tidak memberi kesan kepada fungsi lain; pelaksana akan melaporkan ralat jika anda cuba menggunakan alat CalDAV.

---

## Pelayan MCP (Model Context Protocol)

### Pelayan tidak ditemui

```
MCP server '<nama>' not found
```

Panggilan alat merujuk pelayan MCP yang tidak dikonfigurasi. Semak bahagian `mcp_servers` anda dalam `triggerfish.yaml`.

### Binari pelayan tidak dalam PATH

Pelayan MCP dijanakan sebagai subproses. Jika binari tidak ditemui:

```
MCP server '<nama>': <validation error>
```

Isu biasa:
- Arahan (contoh, `npx`, `python`, `node`) tidak dalam PATH daemon
- **Isu PATH systemd/launchd:** Daemon menangkap PATH anda semasa pemasangan. Jika anda memasang alat pelayan MCP selepas memasang daemon, pasang semula daemon untuk mengemas kini PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Pelayan ranap

Jika proses pelayan MCP ranap, gelung baca keluar dan pelayan menjadi tidak tersedia. Tiada sambungan semula automatik.

**Pembetulan:** Mulakan semula daemon untuk menjana semula semua pelayan MCP.

### Pengangkutan SSE disekat

Pelayan MCP yang menggunakan pengangkutan SSE (Server-Sent Events) tertakluk kepada semakan SSRF:

```
MCP SSE connection blocked by SSRF policy
```

URL SSE yang menunjuk ke alamat IP peribadi disekat. Ini adalah dengan reka bentuk. Gunakan pengangkutan stdio untuk pelayan MCP tempatan.

### Ralat panggilan alat

```
tools/list failed: <message>
tools/call failed: <message>
```

Pelayan MCP memberi respons dengan ralat. Ini adalah ralat pelayan, bukan Triggerfish. Semak log pelayan MCP sendiri untuk perincian.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /laluan/ke/vault
```

Laluan vault yang dikonfigurasi dalam `plugins.obsidian.vault_path` tidak wujud. Pastikan laluan adalah betul dan boleh diakses.

### Laluan traversal disekat

```
Path traversal rejected: <laluan>
Path escapes vault boundary: <laluan>
```

Laluan nota mencuba untuk melepaskan direktori vault (contoh, menggunakan `../`). Ini adalah semakan keselamatan. Semua operasi nota dihadkan kepada direktori vault.

### Folder dikecualikan

```
Path is excluded: <laluan>
```

Nota berada dalam folder yang disenaraikan dalam `exclude_folders`. Untuk mengaksesnya, buang folder dari senarai pengecualian.

### Penguatkuasaan klasifikasi

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vault atau folder tertentu mempunyai tahap klasifikasi yang bercanggah dengan taint sesi. Lihat [Penyelesaian Masalah Keselamatan](/ms-MY/support/troubleshooting/security) untuk perincian tentang peraturan write-down.
