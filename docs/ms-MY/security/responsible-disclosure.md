---
title: Dasar Pendedahan Bertanggungjawab
description: Cara melaporkan kelemahan keselamatan dalam Triggerfish.
---

# Dasar Pendedahan Bertanggungjawab

## Melaporkan Kelemahan

**Jangan buka isu GitHub awam untuk kelemahan keselamatan.**

Lapor melalui e-mel:

```
security@trigger.fish
```

Sila sertakan:

- Keterangan dan potensi impak
- Langkah-langkah untuk menghasilkan semula atau bukti konsep
- Versi atau komponen yang terjejas
- Cadangan pemulihan, jika ada

## Garis Masa Respons

| Garis Masa | Tindakan                                                |
| ---------- | ------------------------------------------------------- |
| 24 jam     | Pengesahan penerimaan                                   |
| 72 jam     | Penilaian awal dan pengelasan keterukan                 |
| 14 hari    | Pembetulan dibangunkan dan diuji (keterukan kritikal/tinggi) |
| 90 hari    | Tetingkap pendedahan yang diselaraskan                  |

Kami meminta anda tidak mendedahkan secara awam sebelum tetingkap 90 hari atau sebelum pembetulan dikeluarkan, mana-mana yang berlaku dahulu.

## Skop

### Dalam skop

- Aplikasi teras Triggerfish
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Pintasan penguatkuasaan dasar keselamatan (pengkelasan, penjejakan taint, tanpa-tulis-bawah)
- Pelarian sandbox plugin
- Pintasan pengesahan atau kebenaran
- Pelanggaran sempadan keselamatan MCP Gateway
- Kebocoran rahsia (kelayakan muncul dalam log, konteks, atau storan)
- Serangan suntikan arahan yang berjaya mempengaruhi keputusan dasar deterministik
- Imej Docker rasmi (apabila tersedia) dan skrip pemasangan

### Di luar skop

- Tingkah laku LLM yang tidak memintas lapisan dasar deterministik (model yang mengatakan sesuatu yang salah bukan kelemahan jika lapisan dasar telah menyekat tindakan dengan betul)
- Kemahiran atau plugin pihak ketiga yang tidak dikekalkan oleh Triggerfish
- Serangan kejuruteraan sosial terhadap pekerja Triggerfish
- Serangan penafian perkhidmatan
- Laporan pengimbas automatik tanpa impak yang ditunjukkan

## Pelabuhan Selamat

Penyelidikan keselamatan yang dijalankan mengikut dasar ini adalah dibenarkan. Kami tidak akan mengambil tindakan undang-undang terhadap penyelidik yang melaporkan kelemahan dengan suci hati. Kami meminta anda membuat usaha suci hati untuk mengelakkan pelanggaran privasi, kemusnahan data, dan gangguan perkhidmatan.

## Pengiktirafan

Kami memberi kredit kepada penyelidik yang melaporkan kelemahan yang sah dalam nota keluaran dan nasihat keselamatan kami, melainkan anda lebih suka kekal tanpa nama. Kami pada masa ini tidak menawarkan program ganjaran pepijat berbayar tetapi mungkin memperkenalkannya pada masa hadapan.

## Kunci PGP

Jika anda perlu menyulitkan laporan anda, kunci PGP kami untuk `security@trigger.fish` diterbitkan di
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
dan pada pelayan kunci utama.
