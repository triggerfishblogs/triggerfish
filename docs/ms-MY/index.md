---
layout: home

hero:
  name: Triggerfish
  text: Ejen AI Selamat
  tagline: Penguatkuasaan dasar deterministik di bawah lapisan LLM. Setiap saluran. Tanpa pengecualian.
  image:
    src: /triggerfish.png
    alt: Triggerfish — merentasi lautan digital
  actions:
    - theme: brand
      text: Mulakan
      link: /ms-MY/guide/
    - theme: alt
      text: Harga
      link: /ms-MY/pricing
    - theme: alt
      text: Lihat di GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Keselamatan di Bawah LLM
    details: Penguatkuasaan dasar deterministik di peringkat sub-LLM. Hook kod tulen yang tidak boleh dipintas, dikesampingkan, atau dipengaruhi oleh AI. Input yang sama sentiasa menghasilkan keputusan yang sama.
  - icon: "\U0001F4AC"
    title: Setiap Saluran yang Anda Gunakan
    details: Telegram, Slack, Discord, WhatsApp, E-mel, WebChat, CLI — semua dengan pengkelasan per-saluran dan penjejakan taint automatik.
  - icon: "\U0001F528"
    title: Bina Apa Sahaja
    details: Persekitaran pelaksanaan ejen dengan gelung maklum balas tulis/jalankan/betulkan. Kemahiran yang mengurus sendiri. Pasaran The Reef untuk menemui dan berkongsi keupayaan.
  - icon: "\U0001F916"
    title: Mana-mana Pembekal LLM
    details: Anthropic, OpenAI, Google Gemini, model tempatan melalui Ollama, OpenRouter. Rantaian failover automatik. Atau pilih Triggerfish Gateway — tiada kunci API diperlukan.
  - icon: "\U0001F3AF"
    title: Proaktif sebagai Lalai
    details: Cron jobs, triggers, dan webhooks. Ejen anda menyemak, memantau, dan bertindak secara autonomi — dalam sempadan dasar yang ketat.
  - icon: "\U0001F310"
    title: Sumber Terbuka
    details: Berlesen Apache 2.0. Komponen kritikal keselamatan terbuka sepenuhnya untuk audit. Jangan percaya kami — sahkan kod tersebut.
---

<LatestRelease />

## Pasang dalam satu perintah

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

Pemasang binari memuat turun keluaran pra-bina, mengesahkan checksum, dan menjalankan wizard persediaan. Lihat [panduan pemasangan](/ms-MY/guide/installation) untuk persediaan Docker, pembinaan daripada sumber, dan proses keluaran.

Tidak mahu mengurus kunci API? [Lihat harga](/ms-MY/pricing) untuk Triggerfish Gateway — infrastruktur LLM dan carian yang diuruskan, siap dalam beberapa minit.

## Cara Ia Berfungsi

Triggerfish meletakkan lapisan dasar deterministik antara ejen AI anda dan semua yang disentuhnya. LLM mencadangkan tindakan — hook kod tulen memutuskan sama ada ia dibenarkan.

- **Dasar Deterministik** — Keputusan keselamatan adalah kod tulen. Tiada kerawakan, tiada pengaruh LLM, tiada pengecualian. Input yang sama, keputusan yang sama, setiap kali.
- **Kawalan Aliran Maklumat** — Empat tahap pengkelasan (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) merebak secara automatik melalui taint sesi. Data tidak boleh mengalir ke bawah ke konteks yang kurang selamat.
- **Enam Hook Penguatkuasaan** — Setiap peringkat saluran paip data diperiksa: apa yang memasuki konteks LLM, alat mana yang dipanggil, keputusan apa yang dikembalikan, dan apa yang meninggalkan sistem. Setiap keputusan dilog untuk audit.
- **Tolak sebagai Lalai** — Tiada yang dibenarkan secara diam-diam. Alat, integrasi, dan sumber data yang tidak dikelaskan ditolak sehingga dikonfigurasi secara eksplisit.
- **Identiti Ejen** — Misi ejen anda berada dalam SPINE.md, tingkah laku proaktif dalam TRIGGER.md. Kemahiran memperluas keupayaan melalui konvensyen folder yang mudah. Pasaran The Reef membolehkan anda menemui dan berkongsinya.

[Ketahui lebih lanjut tentang seni bina.](/ms-MY/architecture/)
