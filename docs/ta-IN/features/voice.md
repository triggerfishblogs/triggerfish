# Voice Pipeline

<ComingSoon />

::: info கீழே listed STT மற்றும் TTS providers interface-only stubs. Provider interfaces வரையறுக்கப்பட்டுள்ளன ஆனால் implementations இன்னும் actual speech services உடன் connected ஆகவில்லை. :::

Triggerfish macOS, iOS, மற்றும் Android முழுவதும் wake word detection, push-to-talk, மற்றும் text-to-speech response உடன் speech interaction support செய்கிறது.

## Architecture

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Audio text போலவும் அதே agent processing pipeline மூலம் செல்கிறது. Voice input transcribe ஆகிறது, ஒரு classified செய்தியாக session க்கு நுழைகிறது, policy hooks மூலம் செல்கிறது, மற்றும் response speech ஆக synthesize ஆகிறது.

## Voice Modes

| Mode         | விளக்கம்                                         | Platform                       |
| ------------ | -------------------------------------------------- | ------------------------------ |
| Voice Wake   | கட்டமைக்கக்கூடிய wake word க்கு Always-on listening | macOS, iOS, Android          |
| Push-to-Talk | Button அல்லது keyboard shortcut மூலம் Manual activation | macOS (menu bar), iOS, Android |
| Talk Mode    | Continuous conversational speech                   | அனைத்து platforms              |

## STT Providers

Speech-to-text உங்கள் voice ஐ agent செயலாக்க text ஆக மாற்றுகிறது.

| Provider           | Type  | குறிப்புகள்                                                         |
| ------------------ | ----- | --------------------------------------------------------------------- |
| Whisper            | Local | Default. On-device இயங்குகிறது, cloud dependency இல்லை. Privacy க்கு சிறந்தது. |
| Deepgram           | Cloud | Low-latency streaming transcription.                                   |
| OpenAI Whisper API | Cloud | High accuracy, API key தேவை.                                         |

## TTS Providers

Text-to-speech agent responses ஐ spoken audio ஆக மாற்றுகிறது.

| Provider      | Type  | குறிப்புகள்                                                       |
| ------------- | ----- | ------------------------------------------------------------------- |
| ElevenLabs    | Cloud | Default. Voice cloning options உடன் Natural-sounding voices.       |
| OpenAI TTS    | Cloud | High quality, multiple voice options.                               |
| System Voices | Local | OS-native voices. Cloud dependency இல்லை.                         |

## Provider Registry

Triggerfish STT மற்றும் TTS இரண்டுக்கும் ஒரு provider registry pattern பயன்படுத்துகிறது. Corresponding interface implement செய்வதன் மூலம் எந்த compatible provider உம் plug in செய்யலாம்:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## கட்டமைப்பு

`triggerfish.yaml` இல் voice settings கட்டமைக்கவும்:

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

## பாதுகாப்பு Integration

Voice data text போலவும் அதே classification விதிகளை பின்பற்றுகிறது:

- **Voice input text input போலவும் classified ஆகிறது.** Transcribed speech session க்கு நுழைகிறது மற்றும் typed செய்தி போலவே taint escalate செய்யலாம்.
- **TTS output PRE_OUTPUT hook மூலம் செல்கிறது** synthesis க்கு முன்பு. Policy engine response ஐ block செய்தால், அது ஒருபோதும் பேசப்படுவதில்லை.
- **Voice sessions taint கொண்டுவருகின்றன** text sessions போலவே. Mid-session voice க்கு switching taint reset செய்வதில்லை.
- **Wake word detection locally இயங்குகிறது.** Wake word matching க்கு cloud க்கு audio அனுப்பப்படுவதில்லை.
- **Audio recordings** (retain ஆனால்) session இன் taint நிலையில் classified ஆகின்றன.

::: info Voice pipeline iOS மற்றும் Android இல் Buoy companion apps உடன் integrate ஆகும், mobile devices இலிருந்து push-to-talk மற்றும் voice wake enable செய்யும். Buoy இன்னும் available இல்லை. :::
