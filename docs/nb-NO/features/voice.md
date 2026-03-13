# Stemmerørledning

<ComingSoon />

::: info STT- og TTS-leverandørene som er oppgitt nedenfor er bare grensesnitt-stubber.
Leverandørgrensesnittene er definert, men implementasjonene er ennå ikke koblet til
faktiske taletjenester. :::

Triggerfish støtter taleinteraksjon med vekkeordoppdagelse, trykk-for-å-snakke
og tekst-til-tale-svar på macOS, iOS og Android.

## Arkitektur

<img src="/diagrams/voice-pipeline.svg" alt="Voice pipeline: Wake Word Detection → STT → Agent Processing → TTS → Voice Output" style="max-width: 100%;" />

Lyd flyter gjennom den samme agentbehandlingsrørledningen som tekst. Stemmeinput
transkriberes, går inn i sesjonen som en klassifisert melding, passerer gjennom
policy-hooks, og svaret syntetiseres tilbake til tale.

## Stemnemodi

| Modus          | Beskrivelse                                          | Plattform                         |
| -------------- | ---------------------------------------------------- | --------------------------------- |
| Voice Wake     | Alltid-på lytting etter et konfigurerbart vekkeord   | macOS, iOS, Android               |
| Push-to-Talk   | Manuell aktivering via knapp eller tastatursnarveier | macOS (menyrad), iOS, Android     |
| Talk Mode      | Kontinuerlig samtaletale                             | Alle plattformer                  |

## STT-leverandører

Tale-til-tekst konverterer stemmen din til tekst for agenten å behandle.

| Leverandør         | Type  | Merknader                                                             |
| ------------------ | ----- | --------------------------------------------------------------------- |
| Whisper            | Lokal | Standard. Kjører på enheten, ingen skyavhengighet. Best for personvern.|
| Deepgram           | Sky   | Lavforsinkelse strømmet transkripsjon.                                |
| OpenAI Whisper API | Sky   | Høy nøyaktighet, krever API-nøkkel.                                  |

## TTS-leverandører

Tekst-til-tale konverterer agentsvar til talt lyd.

| Leverandør     | Type  | Merknader                                                         |
| -------------- | ----- | ----------------------------------------------------------------- |
| ElevenLabs     | Sky   | Standard. Naturlig klingende stemmer med stemmekloning-alternativer.|
| OpenAI TTS     | Sky   | Høy kvalitet, flere stemmealternativer.                           |
| System Voices  | Lokal | OS-innebygde stemmer. Ingen skyavhengighet.                       |

## Leverandørregistret

Triggerfish bruker et leverandørregistermønster for både STT og TTS. Du kan
koble til en hvilken som helst kompatibel leverandør ved å implementere det
tilsvarende grensesnittet:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Konfigurasjon

Konfigurer stemmeinnstillinger i `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper-modellstørrelse (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Leverandørspesifikk stemmeidentifikator
  wake_word: "triggerfish" # Egendefinert vekkeord
  push_to_talk:
    shortcut: "Ctrl+Space" # Tastatursnarveier (macOS)
```

## Sikkerhetsintegrasjon

Stemmedata følger de samme klassifiseringsreglene som tekst:

- **Stemmeinput klassifiseres likt som tekstinput.** Transkribert tale går inn
  i sesjonen og kan eskalere taint akkurat som en skrevet melding.
- **TTS-utdata passerer gjennom PRE_OUTPUT-hooken** før syntese. Hvis policy-motoren
  blokkerer svaret, uttales det aldri.
- **Stemmesesjoner bærer taint** akkurat som tekstsesjoner. Å bytte til tale
  midt i en sesjon tilbakestiller ikke taint.
- **Vekkeordoppdagelse kjøres lokalt.** Ingen lyd sendes til skyen for
  vekkeordmatching.
- **Lydopptak** (hvis beholdt) klassifiseres på sesjonens taint-nivå.

::: info Stemmerørledningen vil integreres med Buoy følgeapp-er på iOS og
Android, noe som muliggjør trykk-for-å-snakke og stemmevekking fra mobile
enheter. Buoy er ikke tilgjengelig ennå. :::
