# Voice Pipeline

<ComingSoon />

::: info نیچے listed STT اور TTS providers interface-only stubs ہیں۔ Provider
interfaces define ہیں لیکن implementations ابھی actual speech services سے
connected نہیں ہیں۔ :::

Triggerfish macOS، iOS، اور Android پر wake word detection، push-to-talk، اور
text-to-speech response کے ساتھ speech interaction support کرتا ہے۔

## Architecture

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Audio text کی طرح ہی agent processing pipeline سے گزرتا ہے۔ Voice input
transcribe ہوتا ہے، session میں classified message کے طور پر داخل ہوتا ہے، policy
hooks سے گزرتا ہے، اور response speech میں synthesize ہوتا ہے۔

## Voice Modes

| Mode         | تفصیل                                                | Platform                       |
| ------------ | ----------------------------------------------------- | ------------------------------ |
| Voice Wake   | Configurable wake word کے لیے always-on listening    | macOS, iOS, Android            |
| Push-to-Talk | Button یا keyboard shortcut سے manual activation     | macOS (menu bar), iOS, Android |
| Talk Mode    | Continuous conversational speech                      | تمام platforms                 |

## STT Providers

Speech-to-text آپ کی آواز کو agent کے process کرنے کے لیے text میں convert کرتا ہے۔

| Provider           | Type  | نوٹس                                                             |
| ------------------ | ----- | ----------------------------------------------------------------- |
| Whisper            | Local | ڈیفالٹ۔ On-device چلتا ہے، کوئی cloud dependency نہیں۔ Privacy کے لیے بہترین |
| Deepgram           | Cloud | Low-latency streaming transcription۔                              |
| OpenAI Whisper API | Cloud | High accuracy، API key درکار ہے۔                                 |

## TTS Providers

Text-to-speech agent responses کو spoken audio میں convert کرتا ہے۔

| Provider      | Type  | نوٹس                                                        |
| ------------- | ----- | ------------------------------------------------------------ |
| ElevenLabs    | Cloud | ڈیفالٹ۔ Voice cloning options کے ساتھ natural-sounding voices |
| OpenAI TTS    | Cloud | High quality، multiple voice options۔                        |
| System Voices | Local | OS-native voices۔ کوئی cloud dependency نہیں۔               |

## Provider Registry

Triggerfish STT اور TTS دونوں کے لیے provider registry pattern استعمال کرتا ہے۔
آپ corresponding interface implement کر کے کوئی بھی compatible provider plug in
کر سکتے ہیں:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuration

`triggerfish.yaml` میں voice settings configure کریں:

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

Voice data text کی طرح classification rules follow کرتا ہے:

- **Voice input text input کی طرح classified ہے۔** Transcribed speech session میں
  داخل ہوتا ہے اور taint escalate کر سکتا ہے جیسے typed message کرتا ہے۔
- **TTS output synthesis سے پہلے PRE_OUTPUT hook سے گزرتا ہے۔** اگر policy engine
  response block کرے، یہ کبھی بولا نہیں جاتا۔
- **Voice sessions taint carry کرتی ہیں** جیسے text sessions۔ Mid-session voice
  پر switch کرنا taint reset نہیں کرتا۔
- **Wake word detection locally چلتی ہے۔** Wake word matching کے لیے کوئی audio
  cloud کو نہیں بھیجا جاتا۔
- **Audio recordings** (اگر retain کیے جائیں) capture کے وقت session کے taint level
  پر classified ہوتے ہیں۔

::: info Voice pipeline iOS اور Android پر Buoy companion apps کے ساتھ integrate
ہوگا، mobile devices سے push-to-talk اور voice wake ممکن بنائے گا۔ Buoy ابھی
available نہیں ہے۔ :::
