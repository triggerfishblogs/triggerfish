# Penyelesaian Masalah: Pemasangan

## Isu Pemasang Binari

### Pengesahan checksum gagal

Pemasang memuat turun fail `SHA256SUMS.txt` bersama binari dan mengesahkan hash sebelum pemasangan. Jika ini gagal:

- **Muat turun terganggu oleh rangkaian.** Padamkan muat turun separa dan cuba lagi.
- **Cermin atau CDN menghidangkan kandungan lapuk.** Tunggu beberapa minit dan cuba lagi. Pemasang mengambil dari GitHub Releases.
- **Aset tidak ditemui dalam SHA256SUMS.txt.** Ini bermakna keluaran diterbitkan tanpa checksum untuk platform anda. Failkan [isu GitHub](https://github.com/greghavens/triggerfish/issues).

Pemasang menggunakan `sha256sum` pada Linux dan `shasum -a 256` pada macOS. Jika tiada satu pun tersedia, ia tidak dapat mengesahkan muat turun.

### Kebenaran ditolak semasa menulis ke `/usr/local/bin`

Pemasang mencuba `/usr/local/bin` terlebih dahulu, kemudian jatuh balik ke `~/.local/bin`. Jika kedua-duanya tidak berfungsi:

```bash
# Pilihan 1: Jalankan dengan sudo untuk pemasangan seluruh sistem
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Pilihan 2: Cipta ~/.local/bin dan tambah ke PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Kemudian jalankan semula pemasang
```

### Amaran kuarantin macOS

macOS menyekat binari yang dimuat turun dari internet. Pemasang menjalankan `xattr -cr` untuk membersihkan atribut kuarantin, tetapi jika anda memuat turun binari secara manual, jalankan:

```bash
xattr -cr /usr/local/bin/triggerfish
```

Atau klik kanan binari dalam Finder, pilih "Open", dan sahkan gesaan keselamatan.

### PATH tidak dikemas kini selepas pemasangan

Pemasang menambah direktori pemasangan ke profil shell anda (`.zshrc`, `.bashrc`, atau `.bash_profile`). Jika arahan `triggerfish` tidak ditemui selepas pemasangan:

1. Buka tetingkap terminal baru (shell semasa tidak akan mengambil perubahan profil)
2. Atau sumber profil anda secara manual: `source ~/.zshrc` (atau fail profil mana yang digunakan shell anda)

Jika pemasang melangkau kemas kini PATH, ini bermakna direktori pemasangan sudah dalam PATH anda.

---

## Binaan dari Sumber

### Deno tidak ditemui

Pemasang dari sumber (`deploy/scripts/install-from-source.sh`) memasang Deno secara automatik jika ia tidak hadir. Jika itu gagal:

```bash
# Pasang Deno secara manual
curl -fsSL https://deno.land/install.sh | sh

# Sahkan
deno --version   # Sepatutnya 2.x
```

### Kompil gagal dengan ralat kebenaran

Arahan `deno compile` memerlukan `--allow-all` kerana binari yang dikompil memerlukan akses sistem penuh (rangkaian, sistem fail, FFI untuk SQLite, penghasilan subproses). Jika anda melihat ralat kebenaran semasa kompilasi, pastikan anda menjalankan skrip pemasangan sebagai pengguna dengan akses tulis ke direktori sasaran.

### Cawangan atau versi tertentu

Tetapkan `TRIGGERFISH_BRANCH` untuk mengklon cawangan tertentu:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Untuk pemasang binari, tetapkan `TRIGGERFISH_VERSION`:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Isu Khusus Windows

### Dasar pelaksanaan PowerShell menyekat pemasang

Jalankan PowerShell sebagai Pentadbir dan benarkan pelaksanaan skrip:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Kemudian jalankan semula pemasang.

### Kompilasi Perkhidmatan Windows gagal

Pemasang Windows mengkompil pembalut perkhidmatan C# semasa operasi menggunakan `csc.exe` dari .NET Framework 4.x. Jika kompilasi gagal:

1. **Sahkan .NET Framework dipasang.** Jalankan `where csc.exe` dalam command prompt. Pemasang mencari dalam direktori .NET Framework di bawah `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Jalankan sebagai Pentadbir.** Pemasangan perkhidmatan memerlukan keistimewaan yang ditingkatkan.
3. **Jatuh balik.** Jika kompilasi perkhidmatan gagal, anda masih boleh menjalankan Triggerfish secara manual: `triggerfish run` (mod latar depan). Anda perlu menjaga terminal terbuka.

### `Move-Item` gagal semasa naik taraf

Versi lama pemasang Windows menggunakan `Move-Item -Force` yang gagal apabila binari sasaran sedang digunakan. Ini telah diperbaiki dalam versi 0.3.4+. Jika anda menghadapi ini pada versi lama, hentikan perkhidmatan secara manual terlebih dahulu:

```powershell
Stop-Service Triggerfish
# Kemudian jalankan semula pemasang
```

---

## Isu Docker

### Bekas keluar serta-merta

Semak log bekas:

```bash
docker logs triggerfish
```

Punca biasa:

- **Fail konfigurasi hilang.** Pasang `triggerfish.yaml` anda ke `/data/`:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Konflik port.** Jika port 18789 atau 18790 sedang digunakan, gateway tidak dapat bermula.
- **Kebenaran ditolak pada volum.** Bekas berjalan sebagai UID 65534 (nonroot). Pastikan volum boleh ditulis oleh pengguna tersebut.

### Tidak dapat mengakses Triggerfish dari hos

Gateway mengikat ke `127.0.0.1` di dalam bekas secara lalai. Untuk mengaksesnya dari hos, fail Docker compose memetakan port `18789` dan `18790`. Jika anda menggunakan `docker run` secara langsung, tambah:

```bash
-p 18789:18789 -p 18790:18790
```

### Podman sebagai ganti Docker

Skrip pemasangan Docker mengesan `podman` secara automatik sebagai runtime bekas. Anda juga boleh menetapkannya secara eksplisit:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Skrip pembalut `triggerfish` (yang dipasang oleh pemasang Docker) juga mengesan podman secara automatik.

### Imej atau pendaftaran tersuai

Gantikan imej dengan `TRIGGERFISH_IMAGE`:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Selepas Pemasangan

### Wizard persediaan tidak bermula

Selepas pemasangan binari, pemasang menjalankan `triggerfish dive --install-daemon` untuk melancarkan wizard persediaan. Jika ia tidak bermula:

1. Jalankan secara manual: `triggerfish dive`
2. Jika anda melihat "Terminal requirement not met", wizard memerlukan TTY interaktif. Sesi SSH, saluran paip CI, dan input yang disalurkan tidak akan berfungsi. Konfigurasikan `triggerfish.yaml` secara manual.

### Pemasangan automatik saluran Signal gagal

Signal memerlukan `signal-cli`, yang merupakan aplikasi Java. Pemasang automatik memuat turun binari `signal-cli` yang dibina dan runtime JRE 25. Kegagalan boleh berlaku jika:

- **Tiada akses tulis ke direktori pemasangan.** Semak kebenaran pada `~/.triggerfish/signal-cli/`.
- **Muat turun JRE gagal.** Pemasang mengambil dari Adoptium. Sekatan rangkaian atau proksi korporat boleh menyekat ini.
- **Seni bina tidak disokong.** Pemasangan automatik JRE hanya menyokong x64 dan aarch64.

Jika pemasangan automatik gagal, pasang `signal-cli` secara manual dan pastikan ia berada dalam PATH anda. Lihat [dokumentasi saluran Signal](/ms-MY/channels/signal) untuk langkah persediaan manual.
