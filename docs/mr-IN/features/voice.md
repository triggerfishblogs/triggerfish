# Voice Pipeline

<ComingSoon />

::: info खाली listed STT आणि TTS providers interface-only stubs आहेत. Provider
interfaces defined आहेत पण implementations actual speech services शी अद्याप
connected नाहीत. :::

Triggerfish macOS, iOS, आणि Android वर wake word detection, push-to-talk, आणि
text-to-speech response सह speech interaction support करतो.

## Architecture

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Audio text सारख्याच agent processing pipeline मधून जातो. Voice input transcribed
केला जातो, session मध्ये classified message म्हणून enter होतो, policy hooks
मधून जातो, आणि response speech ला synthesized केला जातो.

## Voice Modes

| Mode         | वर्णन                                                 | Platform                       |
| ------------ | ----------------------------------------------------- | ------------------------------ |
| Voice Wake   | Configurable wake word साठी always-on listening        | macOS, iOS, Android            |
| Push-to-Talk | Button किंवा keyboard shortcut द्वारे manual activation | macOS (menu bar), iOS, Android |
| Talk Mode    | Continuous conversational speech                      | All platforms                  |

## STT Providers

Speech-to-text तुमचा voice एजंट process करण्यासाठी text मध्ये convert करतो.

| Provider           | Type  | Notes                                                               |
| ------------------ | ----- | ------------------------------------------------------------------- |
| Whisper            | Local | Default. On-device runs, cloud dependency नाही. Privacy साठी सर्वोत्तम. |
| Deepgram           | Cloud | Low-latency streaming transcription.                                |
| OpenAI Whisper API | Cloud | High accuracy, API key आवश्यक.                                      |

## TTS Providers

Text-to-speech एजंट responses spoken audio मध्ये convert करतो.

| Provider      | Type  | Notes                                                             |
| ------------- | ----- | ----------------------------------------------------------------- |
| ElevenLabs    | Cloud | Default. Voice cloning options सह natural-sounding voices.       |
| OpenAI TTS    | Cloud | High quality, multiple voice options.                             |
| System Voices | Local | OS-native voices. Cloud dependency नाही.                         |

## Provider Registry

Triggerfish STT आणि TTS दोन्हीसाठी provider registry pattern वापरतो. तुम्ही
corresponding interface implement करून compatible provider plug in करू शकता:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuration

`triggerfish.yaml` मध्ये voice settings configure करा:

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

Voice data text सारख्याच classification rules follow करतो:

- **Voice input text input प्रमाणेच classified आहे.** Transcribed speech session
  मध्ये enter होतो आणि typed message प्रमाणेच taint escalate करू शकतो.
- **TTS output synthesis पूर्वी PRE_OUTPUT hook मधून जातो.** Policy engine
  response block करत असल्यास, ते कधीही spoken नाही.
- **Voice sessions text sessions प्रमाणेच taint वाहतात.** Session mid-way
  मध्ये voice ला switch केल्याने taint reset होत नाही.
- **Wake word detection locally run होते.** Wake word matching साठी cloud ला
  कोणताही audio पाठवला जात नाही.
- **Audio recordings** (retained असल्यास) capture वेळी session च्या taint level
  वर classified आहेत.

::: info Voice pipeline iOS आणि Android वर Buoy companion apps शी integrate
होईल, mobile devices वरून push-to-talk आणि voice wake enable करेल. Buoy अद्याप
available नाही. :::
