# Voice Pipeline

<ComingSoon />

::: info Ang mga STT at TTS providers na nakalista sa ibaba ay interface-only stubs. Ang provider interfaces ay defined pero ang implementations ay hindi pa connected sa aktwal na speech services. :::

Sinusuportahan ng Triggerfish ang speech interaction na may wake word detection, push-to-talk, at text-to-speech response sa macOS, iOS, at Android.

## Architecture

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Dumadaloy ang audio sa parehong agent processing pipeline tulad ng text. Ang voice input ay tina-transcribe, pumapasok sa session bilang classified message, dumadaan sa policy hooks, at ang response ay sine-synthesize pabalik sa speech.

## Mga Voice Mode

| Mode         | Paglalarawan                                                | Platform                       |
| ------------ | ----------------------------------------------------------- | ------------------------------ |
| Voice Wake   | Always-on listening para sa configurable wake word          | macOS, iOS, Android            |
| Push-to-Talk | Manual activation sa pamamagitan ng button o keyboard shortcut | macOS (menu bar), iOS, Android |
| Talk Mode    | Continuous conversational speech                            | Lahat ng platforms             |

## Mga STT Provider

Kino-convert ng speech-to-text ang boses mo sa text para ma-process ng agent.

| Provider           | Type  | Mga Tala                                                             |
| ------------------ | ----- | -------------------------------------------------------------------- |
| Whisper            | Local | Default. Tumatakbo sa device, walang cloud dependency. Pinakamainam para sa privacy. |
| Deepgram           | Cloud | Low-latency streaming transcription.                                  |
| OpenAI Whisper API | Cloud | Mataas na accuracy, nangangailangan ng API key.                       |

## Mga TTS Provider

Kino-convert ng text-to-speech ang mga response ng agent sa spoken audio.

| Provider      | Type  | Mga Tala                                                              |
| ------------- | ----- | --------------------------------------------------------------------- |
| ElevenLabs    | Cloud | Default. Natural-sounding voices na may voice cloning options.        |
| OpenAI TTS    | Cloud | Mataas na kalidad, maramihang voice options.                          |
| System Voices | Local | OS-native voices. Walang cloud dependency.                            |

## Provider Registry

Gumagamit ang Triggerfish ng provider registry pattern para sa parehong STT at TTS. Maaari kang mag-plug in ng anumang compatible provider sa pamamagitan ng pag-implement ng katumbas na interface:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuration

I-configure ang voice settings sa `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper model size (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Provider-specific voice identifier
  wake_word: "triggerfish" # Custom wake word
  push_to_talk:
    shortcut: "Ctrl+Space" # Keyboard shortcut (macOS)
```

## Security Integration

Sinusunod ng voice data ang parehong classification rules tulad ng text:

- **Kla-classify ang voice input tulad ng text input.** Pumapasok ang transcribed speech sa session at maaaring mag-escalate ng taint tulad ng nai-type na mensahe.
- **Dumadaan ang TTS output sa PRE_OUTPUT hook** bago ang synthesis. Kung bina-block ng policy engine ang response, hindi ito kailanman sinasalita.
- **May taint ang voice sessions** tulad ng text sessions. Ang pag-switch sa voice sa gitna ng session ay hindi nagre-reset ng taint.
- **Lokal na tumatakbo ang wake word detection.** Walang audio na ipinapadala sa cloud para sa wake word matching.
- **Ang audio recordings** (kung nire-retain) ay classified sa taint level ng session.

::: info Ang voice pipeline ay mag-integrate sa Buoy companion apps sa iOS at Android, na nagbibigay-daan sa push-to-talk at voice wake mula sa mobile devices. Hindi pa available ang Buoy. :::
