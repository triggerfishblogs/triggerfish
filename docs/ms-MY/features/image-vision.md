# Analisis Imej dan Vision

Triggerfish menyokong input imej merentasi semua antara muka. Anda boleh menampal imej dari papan klip dalam CLI atau pelayar, dan ejen boleh menganalisis fail imej pada cakera. Apabila model utama anda tidak menyokong vision, model vision yang berasingan boleh secara automatik menerangkan imej sebelum ia mencapai model utama.

## Input Imej

### CLI: Tampal Papan Klip (Ctrl+V)

Tekan **Ctrl+V** dalam sembang CLI untuk menampal imej dari papan klip sistem anda. Imej dibaca dari papan klip OS, dikodkan base64, dan dihantar ke ejen sebagai blok kandungan multimodal bersama mesej teks anda.

Pembacaan papan klip menyokong:

- **Linux** -- `xclip` atau `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- Akses papan klip PowerShell

### Tidepool: Tampal Pelayar

Dalam antara muka web Tidepool, tampal imej terus ke input sembang menggunakan fungsi tampal asli pelayar anda (Ctrl+V / Cmd+V). Imej dibaca sebagai URL data dan dihantar sebagai blok kandungan berkod base64.

### Alat `image_analyze`

Ejen boleh menganalisis fail imej pada cakera menggunakan alat `image_analyze`.

| Parameter | Jenis  | Diperlukan | Keterangan                                                                             |
| --------- | ------ | ---------- | -------------------------------------------------------------------------------------- |
| `path`    | string | ya         | Laluan mutlak ke fail imej                                                             |
| `prompt`  | string | tidak      | Soalan atau gesaan tentang imej (lalai: "Describe this image in detail")              |

**Format yang disokong:** PNG, JPEG, GIF, WebP, BMP, SVG

Alat ini membaca fail, mengkodnya dengan base64, dan menghantar ke pembekal LLM yang mampu vision untuk analisis.

## Sandaran Model Vision

Apabila model utama anda tidak menyokong vision (contoh, Z.AI `glm-5`), anda boleh mengkonfigurasi model vision yang berasingan untuk secara automatik menerangkan imej sebelum ia mencapai model utama.

### Cara Ia Berfungsi

1. Anda menampal imej (Ctrl+V) atau menghantar kandungan multimodal
2. Pengorkestra mengesan blok kandungan imej dalam mesej
3. Model vision menerangkan setiap imej (anda melihat spinner "Menganalisis imej...")
4. Blok imej digantikan dengan penerangan teks: `[The user shared an image. A vision model described it as follows: ...]`
5. Model utama menerima mesej hanya teks dengan penerangan tersebut
6. Petunjuk gesaan sistem memberitahu model utama untuk merawat penerangan seolah-olah ia dapat melihat imej

Ini adalah telus sepenuhnya -- anda menampal imej dan mendapat respons, tanpa mengira sama ada model utama menyokong vision.

### Konfigurasi

Tambah medan `vision` ke konfigurasi model anda:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Model utama bukan-vision
  vision: glm-4.5v # Model vision untuk penerangan imej
  providers:
    zai:
      model: glm-5
```

Model `vision` menggunakan semula kelayakan dari entri keychain pembekal utama. Dalam contoh ini, pembekal utama adalah `zai`, jadi `glm-4.5v` menggunakan kunci API yang sama yang disimpan dalam keychain OS untuk pembekal `zai`.

| Kunci           | Jenis  | Keterangan                                                         |
| --------------- | ------ | ------------------------------------------------------------------ |
| `models.vision` | string | Nama model vision pilihan untuk penerangan imej automatik          |

### Bila Sandaran Vision Diaktifkan

- Hanya apabila `models.vision` dikonfigurasi
- Hanya apabila mesej mengandungi blok kandungan imej
- Mesej hanya-string dan blok kandungan hanya-teks melewati sandaran sepenuhnya
- Jika pembekal vision gagal, ralat dikendalikan dengan baik dan ejen meneruskan

### Peristiwa

Pengorkestra memancarkan dua peristiwa semasa pemprosesan vision:

| Peristiwa         | Keterangan                                             |
| ----------------- | ------------------------------------------------------ |
| `vision_start`    | Penerangan imej bermula (termasuk `imageCount`)        |
| `vision_complete` | Semua imej telah diterangkan                           |

Peristiwa-peristiwa ini menjanakan spinner "Menganalisis imej..." dalam antara muka CLI dan Tidepool.

::: tip Jika model utama anda sudah menyokong vision (contoh, Anthropic Claude, OpenAI GPT-4o, Google Gemini), anda tidak perlu mengkonfigurasi `models.vision`. Imej akan dihantar terus ke model utama sebagai kandungan multimodal. :::
