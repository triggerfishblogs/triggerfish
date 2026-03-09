# Voice-Pipeline

<ComingSoon />

::: info Die unten aufgefuehrten STT- und TTS-Anbieter sind nur Interface-Stubs. Die Anbieter-Interfaces sind definiert, aber die Implementierungen sind noch nicht mit tatsaechlichen Sprachdiensten verbunden. :::

Triggerfish unterstuetzt Sprachinteraktion mit Wake-Word-Erkennung, Push-to-Talk und Text-to-Speech-Antwort auf macOS, iOS und Android.

## Architektur

<img src="/diagrams/voice-pipeline.svg" alt="Voice-Pipeline: Wake-Word-Erkennung --> STT --> Agenten-Verarbeitung --> TTS --> Sprachausgabe" style="max-width: 100%;" />

Audio durchlaeuft dieselbe Agenten-Verarbeitungs-Pipeline wie Text. Spracheingabe wird transkribiert, tritt als klassifizierte Nachricht in die Session ein, durchlaeuft Policy-Hooks, und die Antwort wird zurueck in Sprache synthetisiert.

## Sprachmodi

| Modus        | Beschreibung                                           | Plattform                      |
| ------------ | ------------------------------------------------------ | ------------------------------ |
| Voice Wake   | Permanentes Lauschen auf ein konfigurierbares Wake-Wort | macOS, iOS, Android            |
| Push-to-Talk | Manuelle Aktivierung ueber Taste oder Tastenkombination | macOS (Menuleiste), iOS, Android |
| Talk Mode    | Kontinuierliche Konversationssprache                    | Alle Plattformen               |

## STT-Anbieter

Speech-to-Text wandelt Ihre Stimme in Text um, den der Agent verarbeitet.

| Anbieter           | Typ   | Hinweise                                                              |
| ------------------ | ----- | --------------------------------------------------------------------- |
| Whisper            | Lokal | Standard. Laeuft auf dem Geraet, keine Cloud-Abhaengigkeit. Am besten fuer Privatsphaere. |
| Deepgram           | Cloud | Latenzarme Streaming-Transkription.                                    |
| OpenAI Whisper API | Cloud | Hohe Genauigkeit, erfordert API-Schluessel.                            |

## TTS-Anbieter

Text-to-Speech wandelt Agenten-Antworten in gesprochenes Audio um.

| Anbieter      | Typ   | Hinweise                                                               |
| ------------- | ----- | ---------------------------------------------------------------------- |
| ElevenLabs    | Cloud | Standard. Natuerlich klingende Stimmen mit Stimmenklonungs-Optionen.   |
| OpenAI TTS    | Cloud | Hohe Qualitaet, mehrere Stimmoptionen.                                 |
| System Voices | Lokal | Betriebssystem-native Stimmen. Keine Cloud-Abhaengigkeit.             |

## Anbieter-Registry

Triggerfish verwendet ein Anbieter-Registry-Muster fuer sowohl STT als auch TTS. Sie koennen jeden kompatiblen Anbieter einbinden, indem Sie das entsprechende Interface implementieren:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Konfiguration

Konfigurieren Sie Spracheinstellungen in `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper-Modellgroesse (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Anbieterspezifische Stimmkennung
  wake_word: "triggerfish" # Benutzerdefiniertes Wake-Wort
  push_to_talk:
    shortcut: "Ctrl+Space" # Tastenkombination (macOS)
```

## Sicherheitsintegration

Sprachdaten folgen denselben Klassifizierungsregeln wie Text:

- **Spracheingabe wird gleich wie Texteingabe klassifiziert.** Transkribierte Sprache tritt in die Session ein und kann Taint eskalieren, genau wie eine getippte Nachricht.
- **TTS-Ausgabe durchlaeuft den PRE_OUTPUT-Hook** vor der Synthese. Wenn die Policy-Engine die Antwort blockiert, wird sie nie gesprochen.
- **Sprach-Sessions tragen Taint**, genau wie Text-Sessions. Der Wechsel zu Sprache waehrend einer Session setzt den Taint nicht zurueck.
- **Wake-Word-Erkennung laeuft lokal.** Kein Audio wird zur Wake-Word-Erkennung in die Cloud gesendet.
- **Audio-Aufnahmen** (falls aufbewahrt) werden auf der Taint-Stufe der Session zum Zeitpunkt der Erfassung klassifiziert.

::: info Die Voice-Pipeline wird sich mit Buoy-Companion-Apps auf iOS und Android integrieren und Push-to-Talk und Voice Wake von mobilen Geraeten ermoeglichen. Buoy ist noch nicht verfuegbar. :::
