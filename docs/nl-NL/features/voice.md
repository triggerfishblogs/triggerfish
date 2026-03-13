# Stempijplijn

<ComingSoon />

::: info De hieronder vermelde STT- en TTS-providers zijn interface-only stubs. De providerinterfaces zijn gedefinieerd maar de implementaties zijn nog niet verbonden met werkelijke spraakservices. :::

Triggerfish ondersteunt spraakinteractie met wekwoorddetectie, push-to-talk en tekst-naar-spraak-antwoorden op macOS, iOS en Android.

## Architectuur

<img src="/diagrams/voice-pipeline.svg" alt="Stempijplijn: Wekwoorddetectie → STT → Agentverwerking → TTS → Spraakuitvoer" style="max-width: 100%;" />

Audio stroomt door dezelfde agentpijplijn als tekst. Spraakinvoer wordt getranscribeerd, treedt de sessie in als een geclassificeerd bericht, doorloopt beleidshooks en het antwoord wordt teruggesynthetiseerd naar spraak.

## Spraakmodi

| Modus        | Beschrijving                                         | Platform                       |
| ------------ | ---------------------------------------------------- | ------------------------------ |
| Voice Wake   | Altijd aan luisteren voor een configureerbaar wekwoord | macOS, iOS, Android          |
| Push-to-Talk | Handmatige activering via knop of sneltoets          | macOS (menubalk), iOS, Android |
| Talk Mode    | Continue conversationele spraak                      | Alle platforms                 |

## STT-providers

Spraak-naar-tekst zet uw stem om in tekst voor de agent om te verwerken.

| Provider           | Type  | Opmerkingen                                                         |
| ------------------ | ----- | ------------------------------------------------------------------- |
| Whisper            | Lokaal | Standaard. Draait op het apparaat, geen cloudafhankelijkheid. Best voor privacy. |
| Deepgram           | Cloud | Laag-latentie streamingtranscriptie.                                |
| OpenAI Whisper API | Cloud | Hoge nauwkeurigheid, vereist API-sleutel.                           |

## TTS-providers

Tekst-naar-spraak zet agentantwoorden om in gesproken audio.

| Provider      | Type  | Opmerkingen                                                        |
| ------------- | ----- | ------------------------------------------------------------------ |
| ElevenLabs    | Cloud | Standaard. Natuurlijk klinkende stemmen met stemkloningsopties.    |
| OpenAI TTS    | Cloud | Hoge kwaliteit, meerdere stemopties.                               |
| System Voices | Lokaal | OS-native stemmen. Geen cloudafhankelijkheid.                      |

## Providerregister

Triggerfish gebruikt een providerregisterpatroon voor zowel STT als TTS. U kunt elke compatibele provider koppelen door de overeenkomstige interface te implementeren:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuratie

Configureer spraakinstellingen in `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper-modelgrootte (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "uw-stem" # Providerspecifieke stemidentificatie
  wake_word: "triggerfish" # Aangepast wekwoord
  push_to_talk:
    shortcut: "Ctrl+Space" # Sneltoets (macOS)
```

## Beveiligingsintegratie

Spraakgegevens volgen dezelfde classificatieregels als tekst:

- **Spraakinvoer wordt hetzelfde geclassificeerd als tekstinvoer.** Getranscribeerde spraak treedt de sessie in en kan taint escaleren net als een getypt bericht.
- **TTS-uitvoer doorloopt de PRE_OUTPUT-hook** vóór synthese. Als de beleidsengine het antwoord blokkeert, wordt het nooit uitgesproken.
- **Spraaксessies dragen taint** net als textsessies. Omschakelen naar spraak midden in een sessie reset taint niet.
- **Wekwoorddetectie draait lokaal.** Er wordt geen audio naar de cloud gestuurd voor wekwoordherkenning.
- **Geluidsopnamen** (indien bewaard) worden geclassificeerd op het taint-niveau van de sessie.

::: info De stempijplijn zal integreren met Buoy-companion-apps op iOS en Android, waardoor push-to-talk en spraakwek van mobiele apparaten mogelijk worden. Buoy is nog niet beschikbaar. :::
