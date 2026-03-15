# Röstpipeline

<ComingSoon />

::: info STT- och TTS-leverantörerna listade nedan är endast gränssnittsstubbar. Leverantörsgränssnitten är definierade men implementeringarna är inte ännu anslutna till faktiska taltjänster. :::

Triggerfish stöder talinteraktion med veckordidentifiering, tryck-för-att-prata och text-till-tal-svar på macOS, iOS och Android.

## Arkitektur

<img src="/diagrams/voice-pipeline.svg" alt="Röstpipeline: Veckordidentifiering → STT → Agentbearbetning → TTS → Röstutdata" style="max-width: 100%;" />

Ljud flödar genom samma agentbearbetningspipeline som text. Röstinmatning transkriberas, läggs in i sessionen som ett klassificerat meddelande, passerar genom policykrokar och svaret syntetiseras tillbaka till tal.

## Röstlägen

| Läge             | Beskrivning                                          | Plattform                      |
| ---------------- | ---------------------------------------------------- | ------------------------------ |
| Röstuppvakning   | Alltid lyssnande på ett konfigurerbart veckoord      | macOS, iOS, Android            |
| Tryck-för-att-prata | Manuell aktivering via knapp eller kortkommando  | macOS (menyfält), iOS, Android |
| Pratstudläge     | Kontinuerlig konversationstal                        | Alla plattformar               |

## STT-leverantörer

Tal-till-text konverterar din röst till text för agenten att bearbeta.

| Leverantör         | Typ    | Noteringar                                                         |
| ------------------ | ------ | ------------------------------------------------------------------ |
| Whisper            | Lokal  | Standard. Körs lokalt, inget molnberoende. Bäst för integritet.   |
| Deepgram           | Moln   | Låg latens strömmande transkription.                               |
| OpenAI Whisper API | Moln   | Hög noggrannhet, kräver API-nyckel.                                |

## TTS-leverantörer

Text-till-tal konverterar agentens svar till talat ljud.

| Leverantör     | Typ    | Noteringar                                                          |
| -------------- | ------ | ------------------------------------------------------------------- |
| ElevenLabs     | Moln   | Standard. Naturligtklingande röster med röstklonalternativ.         |
| OpenAI TTS     | Moln   | Hög kvalitet, flera röstval.                                        |
| Systemröster   | Lokal  | OS-inbyggda röster. Inget molnberoende.                             |

## Leverantörsregister

Triggerfish använder ett leverantörsregistermönster för både STT och TTS. Du kan koppla in valfri kompatibel leverantör genom att implementera motsvarande gränssnitt:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Konfiguration

Konfigurera röstinställningar i `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper-modellstorlek (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "din-röst" # Leverantörsspecifik röstidentifierare
  wake_word: "triggerfish" # Anpassat veckoord
  push_to_talk:
    shortcut: "Ctrl+Space" # Kortkommando (macOS)
```

## Säkerhetsintegration

Röstdata följer samma klassificeringsregler som text:

- **Röstinmatning klassificeras på samma sätt som textinmatning.** Transkriberat tal läggs in i sessionen och kan eskalera taint precis som ett skrivet meddelande.
- **TTS-utdata passerar genom PRE_OUTPUT-kroken** innan syntes. Om policymotorn blockerar svaret talas det aldrig.
- **Röstsessioner bär taint** precis som textsessioner. Att byta till röst mitt i en session återställer inte taint.
- **Veckordidentifiering körs lokalt.** Inget ljud skickas till molnet för veckordmatchning.
- **Ljudinspelningar** (om de behålls) klassificeras vid sessionens taint-nivå.

::: info Röstpipelinen kommer att integreras med Buoy-kompanjonapparna på iOS och Android, vilket möjliggör tryck-för-att-prata och röstuppvakning från mobila enheter. Buoy är inte ännu tillgänglig. :::
