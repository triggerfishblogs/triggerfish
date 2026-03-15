# Had Kadar

Triggerfish merangkumi had kadar tetingkap gelongsor yang menghalang mencapai had API pembekal LLM. Ia membungkus mana-mana pembekal secara telus -- gelung ejen tidak perlu tahu tentang had kadar. Apabila kapasiti habis, panggilan ditangguhkan secara automatik sehingga tetingkap bergeser cukup untuk membebaskan kapasiti.

## Cara Ia Berfungsi

Had kadar menggunakan tetingkap gelongsor (lalai 60 saat) untuk menjejak dua metrik:

- **Token per minit (TPM)** -- jumlah token yang digunakan (gesaan + penyempurnaan) dalam tetingkap
- **Permintaan per minit (RPM)** -- jumlah panggilan API dalam tetingkap

Sebelum setiap panggilan LLM, had kadar memeriksa kapasiti yang tersedia terhadap kedua-dua had. Jika sama ada habis, panggilan menunggu sehingga entri tertua bergeser keluar dari tetingkap dan membebaskan kapasiti yang cukup. Selepas setiap panggilan selesai, penggunaan token sebenar direkodkan.

Panggilan strim dan bukan-strim menggunakan belanjawan yang sama. Untuk panggilan strim, penggunaan token direkodkan apabila strim selesai.

<img src="/diagrams/rate-limiter-flow.svg" alt="Aliran had kadar: Gelung Ejen → Had Kadar → pemeriksaan kapasiti → hantar ke pembekal atau tunggu" style="max-width: 100%;" />

## Had Tahap OpenAI

Had kadar dihantar dengan lalai terbina dalam untuk had tahap yang diterbitkan OpenAI:

| Tahap  | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30,000     | 500        | 30,000  | 500    |
| Tahap 1 | 30,000    | 500        | 30,000  | 500    |
| Tahap 2 | 450,000   | 5,000      | 100,000 | 1,000  |
| Tahap 3 | 800,000   | 5,000      | 100,000 | 1,000  |
| Tahap 4 | 2,000,000 | 10,000     | 200,000 | 10,000 |
| Tahap 5 | 30,000,000 | 10,000    | 200,000 | 10,000 |

::: warning Ini adalah lalai berdasarkan had yang diterbitkan OpenAI. Had sebenar anda bergantung pada tahap akaun OpenAI anda dan sejarah penggunaan. Pembekal lain (Anthropic, Google) mengurus had kadar mereka sendiri di sebelah pelayan -- had kadar paling berguna untuk OpenAI di mana pendiaman di sebelah klien menghalang ralat 429. :::

## Konfigurasi

Had kadar adalah automatik apabila menggunakan pembekal yang dibungkus. Tiada konfigurasi pengguna diperlukan untuk tingkah laku lalai. Had kadar mengesan pembekal anda dan menggunakan had yang sesuai.

Pengguna lanjutan boleh menyesuaikan had melalui konfigurasi pembekal dalam `triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Token per minit
        rpm: 5000 # Permintaan per minit
        window_ms: 60000 # Saiz tetingkap (lalai 60s)
```

::: info Had kadar melindungi anda dari ralat 429 dan bil yang tidak dijangka. Ia berfungsi bersama rantaian failover -- jika had kadar dicapai dan had kadar tidak dapat menunggu (tamat masa), failover diaktifkan untuk mencuba pembekal seterusnya. :::

## Memantau Penggunaan

Had kadar mendedahkan snapshot penggunaan semasa:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

Bar kemajuan konteks dalam CLI dan Tide Pool menunjukkan penggunaan konteks. Status had kadar kelihatan dalam log debug:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Apabila had kadar melambatkan panggilan, ia mencatat masa tunggu:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Had Kadar Saluran

Selain had kadar pembekal LLM, Triggerfish menguatkuasakan had kadar mesej per-saluran untuk menghalang pembanjiran platform pemesejan. Setiap penyesuai saluran menjejak kekerapan mesej keluar dan melambatkan penghantaran apabila had dihampiri.

Ini melindungi daripada:

- Larangan API platform akibat jumlah mesej yang berlebihan
- Spam tidak sengaja dari gelung ejen yang tidak terkawal
- Ribut mesej yang dicetuskan oleh webhook

Had kadar saluran dikuatkuasakan secara telus oleh penghala saluran. Jika ejen menghasilkan output lebih cepat dari yang dibenarkan saluran, mesej diberikan dalam baris gilir dan disampaikan pada kadar maksimum yang dibenarkan.

## Berkaitan

- [Pembekal LLM dan Failover](/ms-MY/features/model-failover) -- integrasi rantaian failover dengan had kadar
- [Konfigurasi](/ms-MY/guide/configuration) -- skema `triggerfish.yaml` penuh
