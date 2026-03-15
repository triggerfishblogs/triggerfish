# Voice Pipeline

<ComingSoon />

::: info ಕೆಳಗೆ ಪಟ್ಟಿ ಮಾಡಿದ STT ಮತ್ತು TTS providers interface-only stubs ಮಾತ್ರ.
Provider interfaces ನಿರ್ಧರಿಸಲ್ಪಟ್ಟಿವೆ ಆದರೆ implementations ಇನ್ನು ನಿಜವಾದ speech
services ಗೆ ಸಂಪರ್ಕಿಸಲ್ಪಟ್ಟಿಲ್ಲ. :::

Triggerfish macOS, iOS, ಮತ್ತು Android ನಾದ್ಯಂತ wake word detection, push-to-talk,
ಮತ್ತು text-to-speech response ಜೊತೆ ಭಾಷಣ ಸಂವಾದ ಬೆಂಬಲಿಸುತ್ತದೆ.

## Architecture

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Audio ಅದೇ agent processing pipeline ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ. Voice input transcribe
ಮಾಡಲ್ಪಡುತ್ತದೆ, classified message ಆಗಿ session ಗೆ ಪ್ರವೇಶಿಸುತ್ತದೆ, policy hooks
ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ, ಮತ್ತು response ಮತ್ತೆ ಭಾಷಣಕ್ಕೆ synthesize ಮಾಡಲ್ಪಡುತ್ತದೆ.

## Voice Modes

| Mode         | Description                                       | Platform                       |
| ------------ | ------------------------------------------------- | ------------------------------ |
| Voice Wake   | Configure ಮಾಡಬಹುದಾದ wake word ಗಾಗಿ ಸದಾ ಆಲಿಸುವಿಕೆ | macOS, iOS, Android            |
| Push-to-Talk | Button ಅಥವಾ keyboard shortcut ಮೂಲಕ ಹಸ್ತಚಾಲಿತ activation | macOS (menu bar), iOS, Android |
| Talk Mode    | ನಿರಂತರ conversational speech                      | ಎಲ್ಲ platforms                  |

## STT Providers

Speech-to-text ನಿಮ್ಮ ಧ್ವನಿ ಅನ್ನು agent process ಮಾಡಲು text ಗೆ ಪರಿವರ್ತಿಸುತ್ತದೆ.

| Provider           | Type  | Notes                                                           |
| ------------------ | ----- | --------------------------------------------------------------- |
| Whisper            | Local | ಡಿಫಾಲ್ಟ್. On-device ಚಲಿಸುತ್ತದೆ, cloud dependency ಇಲ್ಲ. Privacy ಗೆ ಉತ್ತಮ. |
| Deepgram           | Cloud | Low-latency streaming transcription.                            |
| OpenAI Whisper API | Cloud | ಉತ್ತಮ accuracy, API key ಅಗತ್ಯ.                                  |

## TTS Providers

Text-to-speech agent responses ಅನ್ನು spoken audio ಗೆ ಪರಿವರ್ತಿಸುತ್ತದೆ.

| Provider      | Type  | Notes                                                        |
| ------------- | ----- | ------------------------------------------------------------ |
| ElevenLabs    | Cloud | ಡಿಫಾಲ್ಟ್. Voice cloning options ಜೊತೆ ನೈಸರ್ಗಿಕ-ಸದ್ದಿನ voices. |
| OpenAI TTS    | Cloud | ಉತ್ತಮ quality, ಬಹು voice options.                            |
| System Voices | Local | OS-native voices. Cloud dependency ಇಲ್ಲ.                     |

## Provider Registry

Triggerfish STT ಮತ್ತು TTS ಎರಡಕ್ಕೂ provider registry pattern ಬಳಸುತ್ತದೆ.
ಸಂಬಂಧಿತ interface implement ಮಾಡಿ ಯಾವ compatible provider ಪ್ಲಗ್ ಮಾಡಬಹುದು:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## ಸಂರಚನೆ

`triggerfish.yaml` ನಲ್ಲಿ voice settings configure ಮಾಡಿ:

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

## ಭದ್ರತಾ ಸಂಯೋಜನೆ

Voice ಡೇಟಾ ಪಠ್ಯದಂತೆಯೇ classification rules ಅನುಸರಿಸುತ್ತದೆ:

- **Voice input ಅನ್ನು text input ಅದೇ ರೀತಿ classified ಮಾಡಲ್ಪಡುತ್ತದೆ.** Transcribed
  speech session ಗೆ ಪ್ರವೇಶಿಸಿ typed message ನಂತೆಯೇ taint escalate ಮಾಡಬಹುದು.
- **TTS output synthesis ಗೆ ಮೊದಲು PRE_OUTPUT hook ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ.** Policy
  engine response block ಮಾಡಿದರೆ, ಅದು ಎಂದಿಗೂ ಮಾತನಾಡುವುದಿಲ್ಲ.
- **Voice sessions ಪಠ್ಯ sessions ನಂತೆಯೇ taint ಒಯ್ಯುತ್ತವೆ.** Session ನಡು-ಮಧ್ಯದಲ್ಲಿ
  voice ಗೆ ತಿರುಗಿದ್ದು taint reset ಮಾಡುವುದಿಲ್ಲ.
- **Wake word detection locally ಚಲಿಸುತ್ತದೆ.** Wake word matching ಗಾಗಿ audio
  cloud ಗೆ ಕಳುಹಿಸಲ್ಪಡುವುದಿಲ್ಲ.
- **Audio recordings** (ಉಳಿಸಿಕೊಂಡಿದ್ದರೆ) session ನ taint ಮಟ್ಟದಲ್ಲಿ classified
  ಮಾಡಲ್ಪಡುತ್ತವೆ.

::: info Voice pipeline iOS ಮತ್ತು Android ನಲ್ಲಿ Buoy companion apps ಜೊತೆ ಸಂಯೋಜಿಸುತ್ತದೆ,
mobile devices ನಿಂದ push-to-talk ಮತ್ತು voice wake ಸಕ್ರಿಯಗೊಳಿಸುತ್ತದೆ. Buoy
ಇನ್ನು ಲಭ್ಯವಿಲ್ಲ. :::
