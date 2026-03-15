# Saluran CLI

Antara muka baris perintah adalah saluran lalai dalam Triggerfish. Ia sentiasa tersedia, tidak memerlukan persediaan luaran, dan merupakan cara utama anda berinteraksi dengan ejen anda semasa pembangunan dan penggunaan tempatan.

## Pengkelasan

Saluran CLI lalai kepada pengkelasan `INTERNAL`. Pengguna terminal **sentiasa** dilayan sebagai pemilik — tiada aliran padanan atau pengesahan kerana anda menjalankan proses secara langsung pada mesin anda.

::: info Mengapa INTERNAL? CLI adalah antara muka tempatan yang langsung. Hanya seseorang yang mempunyai akses ke terminal anda yang boleh menggunakannya. Ini menjadikan `INTERNAL` sebagai lalai yang sesuai — ejen anda boleh berkongsi data dalaman dengan bebas dalam konteks ini. :::

## Ciri-ciri

### Input Terminal Mentah

CLI menggunakan mod terminal mentah dengan penghuraian urutan pelepasan ANSI penuh. Ini memberi anda pengalaman penyuntingan yang kaya terus dalam terminal anda:

- **Penyuntingan baris** — Navigasi dengan kekunci anak panah, Home/End, padamkan perkataan dengan Ctrl+W
- **Sejarah input** — Tekan Atas/Bawah untuk melayari input sebelumnya
- **Cadangan** — Penyempurnaan tab untuk perintah biasa
- **Input berbilang baris** — Masukkan prompt yang lebih panjang secara semula jadi

### Paparan Alat Padat

Apabila ejen memanggil alat, CLI menunjukkan ringkasan satu baris yang padat secara lalai:

```
tool_name arg  result
```

Togol antara output alat padat dan dikembangkan dengan **Ctrl+O**.

### Putuskan Operasi yang Sedang Berjalan

Tekan **ESC** untuk memutuskan operasi semasa. Ini menghantar isyarat batalkan melalui pengorkestra ke pembekal LLM, menghentikan penjanaan dengan serta-merta. Anda tidak perlu menunggu respons yang panjang selesai.

### Paparan Taint

Anda boleh secara pilihan memaparkan tahap taint sesi semasa dalam output dengan mendayakan `showTaint` dalam konfigurasi saluran CLI. Ini menambah awalan tahap pengkelasan pada setiap respons:

```
[CONFIDENTIAL] Berikut adalah angka saluran paip Q4 anda...
```

### Bar Kemajuan Panjang Konteks

CLI memaparkan bar penggunaan tetingkap konteks masa nyata dalam baris pemisah di bahagian bawah terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Bar memenuhi apabila token konteks digunakan
- Penanda biru muncul pada ambang 70% (di mana pemadatan automatik dicetuskan)
- Bar bertukar merah apabila menghampiri had
- Selepas pemadatan (`/compact` atau automatik), bar ditetapkan semula

### Status Pelayan MCP

Pemisah juga menunjukkan status sambungan pelayan MCP:

| Paparan             | Maksud                                      |
| ------------------- | ------------------------------------------- |
| `MCP 3/3` (hijau)   | Semua pelayan yang dikonfigurasi disambungkan |
| `MCP 2/3` (kuning)  | Beberapa pelayan masih menyambung atau gagal |
| `MCP 0/3` (merah)   | Tiada pelayan disambungkan                   |

Pelayan MCP menyambung secara malas di latar belakang selepas permulaan. Status dikemas kini dalam masa nyata apabila pelayan dalam talian.

## Sejarah Input

Sejarah input anda dikekalkan merentasi sesi di:

```
~/.triggerfish/data/input_history.json
```

Sejarah dimuatkan semasa permulaan dan disimpan selepas setiap input. Anda boleh mengosongkannya dengan memadam fail.

## Input Non-TTY / Dipaip

Apabila stdin bukan TTY (contohnya, apabila mengepam input dari proses lain), CLI secara automatik jatuh balik ke **mod penimbal baris**. Dalam mod ini:

- Ciri terminal mentah (kekunci anak panah, navigasi sejarah) dilumpuhkan
- Input dibaca baris demi baris dari stdin
- Output ditulis ke stdout tanpa pemformatan ANSI

Ini membolehkan anda membuat skrip interaksi dengan ejen anda:

```bash
echo "Apakah cuaca hari ini?" | triggerfish run
```

## Konfigurasi

Saluran CLI memerlukan konfigurasi yang minimum. Ia dicipta secara automatik apabila anda menjalankan `triggerfish run` atau menggunakan REPL interaktif.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Pilihan       | Jenis   | Lalai  | Keterangan                                |
| ------------- | ------- | ------ | ----------------------------------------- |
| `interactive` | boolean | `true` | Dayakan mod REPL interaktif               |
| `showTaint`   | boolean | `false`| Tunjukkan tahap taint sesi dalam output   |

::: tip Tiada Persediaan Diperlukan Saluran CLI berfungsi dengan segera. Anda tidak perlu mengkonfigurasi apa-apa untuk mula menggunakan Triggerfish dari terminal anda. :::

## Pintasan Papan Kekunci

| Pintasan    | Tindakan                                                       |
| ----------- | -------------------------------------------------------------- |
| Enter       | Hantar mesej                                                   |
| Atas / Bawah| Navigasi sejarah input                                         |
| Ctrl+V      | Tampal imej dari papan klip (dihantar sebagai kandungan multimodal) |
| Ctrl+O      | Togol paparan alat padat/dikembangkan                          |
| ESC         | Putuskan operasi semasa                                        |
| Ctrl+C      | Keluar dari CLI                                                |
| Ctrl+W      | Padamkan perkataan sebelumnya                                  |
| Home / End  | Lompat ke permulaan/penghujung baris                           |
