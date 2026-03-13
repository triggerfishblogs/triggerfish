---
title: Saluran Paip Suara
---

# Saluran Paip Suara

<ComingSoon />

::: info Pembekal STT dan TTS yang disenaraikan di bawah adalah stub antara muka sahaja. Antara muka pembekal ditakrifkan tetapi pelaksanaannya belum lagi disambungkan ke perkhidmatan pertuturan sebenar. :::

Triggerfish menyokong interaksi pertuturan dengan pengesanan kata tanda, tekan-untuk-bercakap, dan respons teks ke pertuturan merentasi macOS, iOS, dan Android.

## Seni Bina

<img src="/diagrams/voice-pipeline.svg" alt="Saluran paip suara: Pengesanan Kata Tanda → STT → Pemprosesan Ejen → TTS → Output Suara" style="max-width: 100%;" />

Audio mengalir melalui saluran paip pemprosesan ejen yang sama seperti teks. Input suara ditranskripsi, memasuki sesi sebagai mesej terklasifikasi, melalui hook dasar, dan respons disintesis kembali ke pertuturan.

## Mod Suara

| Mod            | Keterangan                                           | Platform                       |
| -------------- | ---------------------------------------------------- | ------------------------------ |
| Voice Wake     | Mendengar sentiasa untuk kata tanda yang boleh dikonfigurasi | macOS, iOS, Android     |
| Push-to-Talk   | Pengaktifan manual melalui butang atau pintasan papan kekunci | macOS (bar menu), iOS, Android |
| Talk Mode      | Pertuturan perbualan berterusan                      | Semua platform                 |

## Pembekal STT

Pertuturan ke teks menukar suara anda kepada teks untuk diproses oleh ejen.

| Pembekal           | Jenis  | Nota                                                               |
| ------------------ | ------ | ------------------------------------------------------------------ |
| Whisper            | Tempatan | Lalai. Berjalan pada peranti, tiada kebergantungan awan. Terbaik untuk privasi. |
| Deepgram           | Awan   | Transkripsi strim kependaman rendah.                               |
| OpenAI Whisper API | Awan   | Ketepatan tinggi, memerlukan kunci API.                            |

## Pembekal TTS

Teks ke pertuturan menukar respons ejen menjadi audio yang dipertuturkan.

| Pembekal      | Jenis  | Nota                                                                        |
| ------------- | ------ | --------------------------------------------------------------------------- |
| ElevenLabs    | Awan   | Lalai. Suara yang terdengar semula jadi dengan pilihan pengklonan suara.    |
| OpenAI TTS    | Awan   | Berkualiti tinggi, pelbagai pilihan suara.                                  |
| Suara Sistem  | Tempatan | Suara asli OS. Tiada kebergantungan awan.                                 |

## Daftar Pembekal

Triggerfish menggunakan corak daftar pembekal untuk kedua-dua STT dan TTS. Anda boleh memasang mana-mana pembekal yang serasi dengan melaksanakan antara muka yang sepadan:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Konfigurasi

Konfigurasi tetapan suara dalam `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Saiz model Whisper (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Pengecam suara khusus pembekal
  wake_word: "triggerfish" # Kata tanda tersuai
  push_to_talk:
    shortcut: "Ctrl+Space" # Pintasan papan kekunci (macOS)
```

## Integrasi Keselamatan

Data suara mengikut peraturan pengkelasan yang sama seperti teks:

- **Input suara dikelaskan sama seperti input teks.** Pertuturan yang ditranskripsi memasuki sesi dan mungkin meningkatkan taint sama seperti mesej yang ditaip.
- **Output TTS melalui hook PRE_OUTPUT** sebelum sintesis. Jika enjin dasar menyekat respons, ia tidak pernah dipertuturkan.
- **Sesi suara membawa taint** sama seperti sesi teks. Beralih ke suara di pertengahan sesi tidak menetapkan semula taint.
- **Pengesanan kata tanda berjalan secara tempatan.** Tiada audio dihantar ke awan untuk padanan kata tanda.
- **Rakaman audio** (jika disimpan) dikelaskan pada tahap taint sesi.

::: info Saluran paip suara akan berintegrasi dengan aplikasi pendamping Buoy pada iOS dan Android, membolehkan tekan-untuk-bercakap dan kata tanda suara dari peranti mudah alih. Buoy belum tersedia lagi. :::
