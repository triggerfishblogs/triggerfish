# Voice Pipeline

<ComingSoon />

::: info नीचे सूचीबद्ध STT और TTS providers केवल interface stubs हैं। Provider
interfaces परिभाषित हैं लेकिन implementations अभी तक वास्तविक speech सेवाओं से
जुड़े नहीं हैं। :::

Triggerfish macOS, iOS, और Android पर wake word detection, push-to-talk, और
text-to-speech प्रतिक्रिया के साथ speech interaction का समर्थन करता है।

## आर्किटेक्चर

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Audio text के समान agent processing pipeline के माध्यम से प्रवाहित होता है।
Voice input transcribed होता है, session में एक classified message के रूप में
प्रवेश करता है, policy hooks से गुज़रता है, और प्रतिक्रिया वापस speech में
synthesized होती है।

## Voice Modes

| Mode         | विवरण                                               | Platform                       |
| ------------ | --------------------------------------------------- | ------------------------------ |
| Voice Wake   | कॉन्फ़िगर करने योग्य wake word के लिए हमेशा-on सुनना  | macOS, iOS, Android            |
| Push-to-Talk | Button या keyboard shortcut द्वारा मैन्युअल सक्रियण    | macOS (menu bar), iOS, Android |
| Talk Mode    | निरंतर वार्तालापिक speech                              | सभी platforms                   |

## STT Providers

Speech-to-text आपकी आवाज़ को agent द्वारा संसाधित करने के लिए text में बदलता है।

| Provider           | Type  | नोट्स                                                           |
| ------------------ | ----- | --------------------------------------------------------------- |
| Whisper            | Local | डिफ़ॉल्ट। डिवाइस पर चलता है, कोई cloud dependency नहीं। गोपनीयता के लिए सर्वोत्तम। |
| Deepgram           | Cloud | कम-latency streaming transcription।                              |
| OpenAI Whisper API | Cloud | उच्च accuracy, API key आवश्यक।                                   |

## TTS Providers

Text-to-speech agent प्रतिक्रियाओं को बोले गए audio में बदलता है।

| Provider      | Type  | नोट्स                                                         |
| ------------- | ----- | ------------------------------------------------------------- |
| ElevenLabs    | Cloud | डिफ़ॉल्ट। Voice cloning विकल्पों के साथ प्राकृतिक-ध्वनि वाली आवाज़ें। |
| OpenAI TTS    | Cloud | उच्च गुणवत्ता, कई voice विकल्प।                                 |
| System Voices | Local | OS-native voices। कोई cloud dependency नहीं।                    |

## Provider Registry

Triggerfish STT और TTS दोनों के लिए provider registry pattern उपयोग करता है। आप
संबंधित interface implement करके कोई भी संगत provider plug कर सकते हैं:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## कॉन्फ़िगरेशन

`triggerfish.yaml` में voice सेटिंग्स कॉन्फ़िगर करें:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper model आकार (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Provider-विशिष्ट voice पहचानकर्ता
  wake_word: "triggerfish" # कस्टम wake word
  push_to_talk:
    shortcut: "Ctrl+Space" # Keyboard shortcut (macOS)
```

## सुरक्षा एकीकरण

Voice डेटा text के समान classification नियमों का पालन करता है:

- **Voice input text input के समान वर्गीकृत है।** Transcribed speech session में
  प्रवेश करती है और typed message की तरह taint बढ़ा सकती है।
- **TTS output synthesis से पहले PRE_OUTPUT hook से गुज़रता है।** यदि policy engine
  प्रतिक्रिया अवरुद्ध करता है, यह कभी बोली नहीं जाती।
- **Voice sessions text sessions की तरह taint रखते हैं।** Mid-session voice पर
  स्विच करने से taint reset नहीं होता।
- **Wake word detection स्थानीय रूप से चलता है।** Wake word matching के लिए कोई
  audio cloud पर नहीं भेजा जाता।
- **Audio recordings** (यदि बनाए रखी जाएँ) कैप्चर के समय session के taint स्तर
  पर वर्गीकृत होती हैं।

::: info Voice pipeline iOS और Android पर Buoy companion apps के साथ एकीकृत
होगी, मोबाइल उपकरणों से push-to-talk और voice wake सक्षम करती है। Buoy अभी
उपलब्ध नहीं है। :::
