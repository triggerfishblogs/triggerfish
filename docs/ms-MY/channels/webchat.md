# WebChat

Saluran WebChat menyediakan widget sembang terbina dalam yang boleh dibenamkan yang berhubung ke ejen Triggerfish anda melalui WebSocket. Ia direka untuk interaksi yang menghadap pelanggan, widget sokongan, atau mana-mana senario di mana anda mahu menawarkan pengalaman sembang berasaskan web.

## Pengkelasan Lalai

WebChat lalai kepada pengkelasan `PUBLIC`. Ini adalah lalai yang kukuh atas sebab yang baik: **pelawat web tidak pernah dilayan sebagai pemilik**. Setiap mesej dari sesi WebChat membawa taint `PUBLIC` tanpa mengira konfigurasi.

::: warning Pelawat Tidak Pernah Pemilik Tidak seperti saluran lain di mana identiti pemilik disahkan oleh ID pengguna atau nombor telefon, WebChat menetapkan `isOwner: false` untuk semua sambungan. Ini bermakna ejen tidak akan pernah melaksanakan arahan peringkat pemilik dari sesi WebChat. Ini adalah keputusan keselamatan yang disengajakan — anda tidak boleh mengesahkan identiti pelawat web tanpa nama. :::

## Persediaan

### Langkah 1: Konfigurasi Triggerfish

Tambahkan saluran WebChat ke `triggerfish.yaml` anda:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| Pilihan          | Jenis    | Diperlukan | Keterangan                                     |
| ---------------- | -------- | ---------- | ---------------------------------------------- |
| `port`           | number   | Tidak      | Port pelayan WebSocket (lalai: `8765`)          |
| `classification` | string   | Tidak      | Tahap pengkelasan (lalai: `PUBLIC`)            |
| `allowedOrigins` | string[] | Tidak      | Asal CORS yang dibenarkan (lalai: `["*"]`)     |

### Langkah 2: Mulakan Triggerfish

```bash
triggerfish stop && triggerfish start
```

Pelayan WebSocket mula mendengar pada port yang dikonfigurasi.

### Langkah 3: Hubungkan Widget Sembang

Hubungkan ke titik akhir WebSocket dari aplikasi web anda:

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Disambungkan ke Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Pelayan memberikan ID sesi
    console.log("Sesi:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Respons ejen
    console.log("Ejen:", frame.content);
  }
};

// Hantar mesej
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Cara Ia Berfungsi

### Aliran Sambungan

1. Klien pelayar membuka sambungan WebSocket ke port yang dikonfigurasi
2. Triggerfish menaik taraf permintaan HTTP ke WebSocket
3. ID sesi unik dijana (`webchat-<uuid>`)
4. Pelayan menghantar ID sesi ke klien dalam bingkai `session`
5. Klien menghantar dan menerima bingkai `message` sebagai JSON

### Format Bingkai Mesej

Semua mesej adalah objek JSON dengan struktur ini:

```json
{
  "type": "message",
  "content": "Helo, bagaimana saya boleh membantu?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Jenis bingkai:

| Jenis     | Arah             | Keterangan                                           |
| --------- | ---------------- | ---------------------------------------------------- |
| `session` | Pelayan ke klien | Dihantar semasa sambungan dengan ID sesi yang diberikan |
| `message` | Kedua-dua        | Mesej sembang dengan kandungan teks                  |
| `ping`    | Kedua-dua        | Ping penjaga hidup                                   |
| `pong`    | Kedua-dua        | Respons penjaga hidup                                |

### Pengurusan Sesi

Setiap sambungan WebSocket mendapat sesinya sendiri. Apabila sambungan ditutup, sesi dikeluarkan dari peta sambungan aktif. Tiada penyambungan semula sesi — jika sambungan terputus, ID sesi baru diberikan semasa sambungan semula.

## Semakan Kesihatan

Pelayan WebSocket juga membalas permintaan HTTP biasa dengan semakan kesihatan:

```bash
curl http://localhost:8765
# Respons: "WebChat OK"
```

Ini berguna untuk semakan kesihatan pengimbang beban dan pemantauan.

## Petunjuk Menaip

Triggerfish menghantar dan menerima petunjuk menaip melalui WebChat. Apabila ejen memproses, bingkai petunjuk menaip dihantar ke klien. Widget boleh memaparkan ini untuk menunjukkan ejen sedang berfikir.

## Pertimbangan Keselamatan

- **Semua pelawat adalah luaran** — `isOwner` sentiasa `false`. Ejen tidak akan melaksanakan arahan pemilik dari WebChat.
- **Taint PUBLIC** — Setiap mesej dicemarkan sebagai `PUBLIC` pada peringkat sesi. Ejen tidak boleh mengakses atau mengembalikan data di atas pengkelasan `PUBLIC` dalam sesi WebChat.
- **CORS** — Konfigurasi `allowedOrigins` untuk mengehadkan domain mana yang boleh berhubung. Lalai `["*"]` membenarkan mana-mana asal, yang sesuai untuk pembangunan tetapi harus dikunci dalam pengeluaran.

::: tip Kunci Asal dalam Pengeluaran Untuk penyebaran pengeluaran, sentiasa tentukan asal yang dibenarkan secara eksplisit:

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## Menukar Pengkelasan

Walaupun WebChat lalai kepada `PUBLIC`, anda secara teknikal boleh menetapkannya ke tahap yang berbeza. Walau bagaimanapun, memandangkan `isOwner` sentiasa `false`, pengkelasan berkesan untuk semua mesej kekal sebagai `PUBLIC` disebabkan peraturan pengkelasan berkesan (`min(channel, recipient)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Dibenarkan, tetapi isOwner masih false
```

Tahap yang sah: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
