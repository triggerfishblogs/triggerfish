# Penyelesaian Masalah: Daemon

## Daemon Tidak Mahu Bermula

### "Triggerfish is already running"

Mesej ini muncul apabila fail log dikunci oleh proses lain. Pada Windows, ini dikesan melalui `EBUSY` / "os error 32" apabila penulis fail cuba membuka fail log.

**Pembetulan:**

```bash
triggerfish status    # Semak sama ada ada tika yang sedang berjalan
triggerfish stop      # Hentikan tika sedia ada
triggerfish start     # Mulakan semula
```

Jika `triggerfish status` melaporkan daemon tidak berjalan tetapi anda masih mendapat ralat ini, proses lain memegang fail log terbuka. Semak proses zombie:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Bunuh sebarang proses lapuk, kemudian cuba lagi.

### Port 18789 atau 18790 sudah digunakan

Gateway mendengar pada port 18789 (WebSocket) dan Tidepool pada 18790 (A2UI). Jika aplikasi lain menduduki port-port ini, daemon akan gagal untuk bermula.

**Cari apa yang menggunakan port:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Tiada pembekal LLM dikonfigurasi

Jika `triggerfish.yaml` tiada bahagian `models` atau pembekal utama tidak mempunyai kunci API, gateway mencatat:

```
No LLM provider configured. Check triggerfish.yaml.
```

**Pembetulan:** Jalankan wizard persediaan atau konfigurasikan secara manual:

```bash
triggerfish dive                    # Persediaan interaktif
# atau
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Fail konfigurasi tidak ditemui

Daemon keluar jika `triggerfish.yaml` tidak wujud di laluan yang dijangka. Mesej ralat berbeza mengikut persekitaran:

- **Pemasangan natif:** Mencadangkan untuk menjalankan `triggerfish dive`
- **Docker:** Mencadangkan untuk memasang fail konfigurasi dengan `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Semak laluan:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Natif
docker exec triggerfish ls /data/       # Docker
```

### Penyelesaian rahsia gagal

Jika konfigurasi anda merujuk rahsia (`secret:provider:anthropic:apiKey`) yang tidak wujud dalam keychain, daemon keluar dengan ralat menamakan rahsia yang hilang.

**Pembetulan:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <kunci-anda>
```

---

## Pengurusan Perkhidmatan

### systemd: daemon berhenti selepas log keluar

Secara lalai, perkhidmatan pengguna systemd berhenti apabila pengguna log keluar. Triggerfish mengaktifkan `loginctl enable-linger` semasa pemasangan untuk mencegah ini. Jika linger gagal diaktifkan:

```bash
# Semak status linger
loginctl show-user $USER | grep Linger

# Aktifkan (mungkin memerlukan sudo)
sudo loginctl enable-linger $USER
```

Tanpa linger, daemon hanya berjalan semasa anda log masuk.

### systemd: perkhidmatan gagal bermula

Semak status perkhidmatan dan jurnal:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Punca biasa:
- **Binari dipindah atau dipadam.** Fail unit mempunyai laluan yang dikodkan keras ke binari. Pasang semula daemon: `triggerfish dive --install-daemon`
- **Isu PATH.** Unit systemd menangkap PATH anda semasa pemasangan. Jika anda memasang alat baru (seperti pelayan MCP) selepas pemasangan daemon, pasang semula daemon untuk mengemas kini PATH.
- **DENO_DIR tidak ditetapkan.** Unit systemd menetapkan `DENO_DIR=~/.cache/deno`. Jika direktori ini tidak boleh ditulis, plugin SQLite FFI akan gagal dimuatkan.

### launchd: daemon tidak bermula semasa log masuk

Semak status plist:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Jika plist tidak dimuatkan:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Punca biasa:
- **Plist dibuang atau rosak.** Pasang semula: `triggerfish dive --install-daemon`
- **Binari dipindah.** Plist mempunyai laluan yang dikodkan keras. Pasang semula selepas memindah binari.
- **PATH semasa pemasangan.** Seperti systemd, launchd menangkap PATH apabila plist dicipta. Pasang semula jika anda menambah alat baru ke PATH.

### Windows: perkhidmatan tidak bermula

Semak status perkhidmatan:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Punca biasa:
- **Perkhidmatan tidak dipasang.** Pasang semula: jalankan pemasang sebagai Pentadbir.
- **Laluan binari berubah.** Pembalut perkhidmatan mempunyai laluan yang dikodkan keras. Pasang semula.
- **Kompilasi .NET gagal semasa pemasangan.** Pembalut perkhidmatan C# memerlukan `csc.exe` dari .NET Framework 4.x.

### Naik taraf merosakkan daemon

Selepas menjalankan `triggerfish update`, daemon dimulakan semula secara automatik. Jika tidak:

1. Binari lama mungkin masih berjalan. Hentikannya secara manual: `triggerfish stop`
2. Pada Windows, binari lama dinamakan semula ke `.old`. Jika penggantian nama gagal, kemas kini akan ralat. Hentikan perkhidmatan terlebih dahulu, kemudian kemas kini.

---

## Isu Fail Log

### Fail log kosong

Daemon menulis ke `~/.triggerfish/logs/triggerfish.log`. Jika fail wujud tetapi kosong:

- Daemon mungkin baru sahaja bermula. Tunggu sebentar.
- Tahap log ditetapkan ke `quiet`, yang hanya mencatat mesej tahap ERROR. Tetapkan ke `normal` atau `verbose`:

```bash
triggerfish config set logging.level normal
```

### Log terlalu banyak

Tetapkan tahap log ke `quiet` untuk hanya melihat ralat:

```bash
triggerfish config set logging.level quiet
```

Pemetaan tahap:

| Nilai konfigurasi | Tahap minimum dicatat |
|-------------------|----------------------|
| `quiet` | ERROR sahaja |
| `normal` | INFO dan ke atas |
| `verbose` | DEBUG dan ke atas |
| `debug` | TRACE dan ke atas (semua) |

### Putaran log

Log diputar secara automatik apabila fail semasa melebihi 1 MB. Sehingga 10 fail yang diputar disimpan:

```
triggerfish.log        # Semasa
triggerfish.1.log      # Sandaran terbaru
triggerfish.2.log      # Kedua paling terkini
...
triggerfish.10.log     # Paling lama (dipadam apabila putaran baru berlaku)
```

Tiada putaran berasaskan masa, hanya berasaskan saiz.
