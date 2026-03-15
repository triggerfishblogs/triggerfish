# Penyelesaian Masalah: Automasi Pelayar

## Chrome / Chromium Tidak Ditemui

Triggerfish menggunakan puppeteer-core (bukan Chromium yang dibundel) dan mengesan Chrome atau Chromium secara automatik pada sistem anda. Jika tiada pelayar ditemui, alat pelayar akan gagal dengan ralat pelancaran.

### Laluan pengesanan mengikut platform

**Linux:**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak: `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS:**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows:**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Memasang pelayar

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Atau pasang Brave, yang juga dikesan
```

### Gantian laluan manual

Jika pelayar anda dipasang di lokasi bukan standard, anda boleh menetapkan laluan. Hubungi projek untuk kunci konfigurasi yang tepat (ini kini ditetapkan melalui konfigurasi pengurus pelayar).

---

## Kegagalan Pelancaran

### "Direct Chrome process launch failed"

Triggerfish melancarkan Chrome dalam mod tanpa kepala melalui `Deno.Command`. Jika proses gagal bermula:

1. **Binari tidak boleh dilaksanakan.** Semak kebenaran fail.
2. **Perpustakaan kongsi hilang.** Pada pemasangan Linux minimal (bekas, WSL), Chrome mungkin memerlukan perpustakaan tambahan:
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Tiada pelayan paparan.** Chrome tanpa kepala tidak memerlukan X11/Wayland, tetapi sesetengah versi Chrome masih cuba memuatkan perpustakaan berkaitan paparan.

### Flatpak Chrome

Jika Chrome dipasang sebagai pakej Flatpak, Triggerfish mencipta skrip pembalut yang memanggil `flatpak run` dengan argumen yang sesuai.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Jika skrip pembalut gagal:
- Semak bahawa `/usr/bin/flatpak` atau `/usr/local/bin/flatpak` wujud
- Semak bahawa ID aplikasi Flatpak adalah betul (jalankan `flatpak list` untuk melihat aplikasi yang dipasang)
- Skrip pembalut ditulis ke direktori sementara. Jika direktori sementara tidak boleh ditulis, penulisan gagal.

### Titik akhir CDP tidak bersedia

Selepas melancarkan Chrome, Triggerfish mengundi titik akhir Chrome DevTools Protocol (CDP) untuk menubuhkan sambungan. Tamat masa lalai ialah 30 saat dengan selang pengundian 200ms.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Ini bermakna Chrome bermula tetapi tidak membuka port CDP dalam masa yang ditetapkan. Punca:
- Chrome memuatkan perlahan (sistem terhad sumber)
- Tika Chrome lain menggunakan port penyahpepijatan yang sama
- Chrome ranap semasa permulaan (semak output Chrome sendiri)

---

## Isu Navigasi

### "Navigation blocked by domain policy"

Alat pelayar menggunakan perlindungan SSRF yang sama dengan web_fetch. URL yang menunjuk ke alamat IP peribadi disekat:

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

Ini adalah penguatkuasaan keselamatan yang disengajakan. Pelayar tidak boleh mengakses:
- `localhost` / `127.0.0.1`
- Rangkaian peribadi (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Alamat pautan-tempatan (`169.254.x.x`)

Tiada cara untuk melumpuhkan semakan ini.

### "Invalid URL"

URL tidak betul bentuknya. Navigasi pelayar memerlukan URL penuh dengan protokol:

```
# Salah
browser_navigate google.com

# Betul
browser_navigate https://google.com
```

### Tamat masa navigasi

```
Navigation failed: Timeout
```

Halaman mengambil masa terlalu lama untuk dimuatkan. Ini biasanya pelayan yang perlahan atau halaman yang tidak pernah selesai memuatkan (ubah hala tidak terbatas, JavaScript yang tersekat).

---

## Isu Interaksi Halaman

### "Click failed", "Type failed", "Select failed"

Ralat-ralat ini menyertakan pemilih CSS yang gagal:

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Pemilih tidak sepadan dengan mana-mana elemen pada halaman. Punca biasa:
- Halaman belum selesai memuatkan
- Elemen berada di dalam iframe (pemilih tidak merentasi sempadan iframe)
- Pemilih salah (nama kelas dinamik, shadow DOM)

### "Snapshot failed"

Snapshot halaman (pengekstrakan DOM untuk konteks) gagal. Ini boleh berlaku jika:
- Halaman tiada kandungan (halaman kosong)
- Ralat JavaScript menghalang akses DOM
- Halaman bernavigasi pergi semasa tangkapan snapshot

### "Scroll failed"

Biasanya berlaku pada halaman dengan bekas tatal tersuai. Arahan tatal menyasarkan viewport dokumen utama.

---

## Pengasingan Profil

Profil pelayar diasingkan bagi setiap ejen. Setiap ejen mendapat direktori profil Chrome sendiri di bawah direktori asas profil. Ini bermakna:

- Sesi log masuk tidak dikongsi antara ejen
- Kuki, storan tempatan, dan cache adalah bagi setiap ejen
- Kawalan akses sedar klasifikasi menghalang pencemaran silang

Jika anda melihat tingkah laku profil yang tidak dijangka, direktori profil mungkin rosak. Padamkannya dan biarkan Triggerfish mencipta yang segar pada pelancaran pelayar seterusnya.
