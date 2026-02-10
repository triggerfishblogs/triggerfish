# Voice Pipeline

<ComingSoon />

Triggerfish supports speech interaction with wake word detection, push-to-talk, and text-to-speech response across macOS, iOS, and Android.

## Architecture

```
  Wake Word       STT            Agent           TTS
  Detection    (Speech to      Processing     (Text to
  (local)       Text)        (normal flow)     Speech)
     |             |               |               |
     +------>------+------>--------+------>--------+
                                                   |
                                              Voice Output
```

Audio flows through the same agent processing pipeline as text. Voice input is transcribed, enters the session as a classified message, passes through policy hooks, and the response is synthesized back to speech.

## Voice Modes

| Mode | Description | Platform |
|------|-------------|----------|
| Voice Wake | Always-on listening for a configurable wake word | macOS, iOS, Android |
| Push-to-Talk | Manual activation via button or keyboard shortcut | macOS (menu bar), iOS, Android |
| Talk Mode | Continuous conversational speech | All platforms |

## STT Providers

Speech-to-text converts your voice into text for the agent to process.

| Provider | Type | Notes |
|----------|------|-------|
| Whisper | Local | Default. Runs on-device, no cloud dependency. Best for privacy. |
| Deepgram | Cloud | Low-latency streaming transcription. |
| OpenAI Whisper API | Cloud | High accuracy, requires API key. |

## TTS Providers

Text-to-speech converts agent responses into spoken audio.

| Provider | Type | Notes |
|----------|------|-------|
| ElevenLabs | Cloud | Default. Natural-sounding voices with voice cloning options. |
| OpenAI TTS | Cloud | High quality, multiple voice options. |
| System Voices | Local | OS-native voices. No cloud dependency. |

## Provider Registry

Triggerfish uses a provider registry pattern for both STT and TTS. You can plug in any compatible provider by implementing the corresponding interface:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuration

Configure voice settings in `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper        # whisper | deepgram | openai
    model: base              # Whisper model size (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs     # elevenlabs | openai | system
    voice_id: "your-voice"   # Provider-specific voice identifier
  wake_word: "triggerfish"   # Custom wake word
  push_to_talk:
    shortcut: "Ctrl+Space"   # Keyboard shortcut (macOS)
```

## Security Integration

Voice data follows the same classification rules as text:

- **Voice input is classified the same as text input.** Transcribed speech enters the session and may escalate taint just like a typed message.
- **TTS output passes through the PRE_OUTPUT hook** before synthesis. If the policy engine blocks the response, it is never spoken.
- **Voice sessions carry taint** just like text sessions. Switching to voice mid-session does not reset taint.
- **Wake word detection runs locally.** No audio is sent to the cloud for wake word matching.
- **Audio recordings** (if retained) are classified at the session's taint level.

::: info
The voice pipeline integrates with Buoy companion apps on iOS and Android, enabling push-to-talk and voice wake from mobile devices. See the design document for details on the Buoy architecture.
:::
