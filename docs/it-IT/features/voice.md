# Pipeline Vocale

<ComingSoon />

::: info I provider STT e TTS elencati di seguito sono stub di sole interfacce.
Le interfacce dei provider sono definite ma le implementazioni non sono ancora
connesse a servizi vocali effettivi. :::

Triggerfish supporta l'interazione vocale con rilevamento della parola di
attivazione, push-to-talk e risposta text-to-speech su macOS, iOS e Android.

## Architettura

<img src="/diagrams/voice-pipeline.svg" alt="Pipeline vocale: Rilevamento Parola di Attivazione → STT → Elaborazione Agent → TTS → Output Vocale" style="max-width: 100%;" />

L'audio fluisce attraverso la stessa pipeline di elaborazione dell'agent del
testo. L'input vocale viene trascritto, entra nella sessione come messaggio
classificato, passa attraverso gli hook di policy e la risposta viene
sintetizzata in voce.

## Modalità Vocali

| Modalità     | Descrizione                                                  | Piattaforma                    |
| ------------ | ------------------------------------------------------------ | ------------------------------ |
| Voice Wake   | Ascolto continuo per una parola di attivazione configurabile | macOS, iOS, Android            |
| Push-to-Talk | Attivazione manuale tramite pulsante o scorciatoia da tastiera | macOS (barra dei menu), iOS, Android |
| Talk Mode    | Conversazione vocale continua                                | Tutte le piattaforme           |

## Provider STT

Il speech-to-text converte la voce in testo per l'elaborazione dell'agent.

| Provider           | Tipo    | Note                                                                  |
| ------------------ | ------- | --------------------------------------------------------------------- |
| Whisper            | Locale  | Predefinito. Eseguito sul dispositivo, nessuna dipendenza cloud. Migliore per la privacy. |
| Deepgram           | Cloud   | Trascrizione in streaming a bassa latenza.                            |
| OpenAI Whisper API | Cloud   | Alta precisione, richiede chiave API.                                 |

## Provider TTS

Il text-to-speech converte le risposte dell'agent in audio parlato.

| Provider       | Tipo    | Note                                                                |
| -------------- | ------- | ------------------------------------------------------------------- |
| ElevenLabs     | Cloud   | Predefinito. Voci dal suono naturale con opzioni di clonazione vocale. |
| OpenAI TTS     | Cloud   | Alta qualità, opzioni vocali multiple.                              |
| System Voices  | Locale  | Voci native del SO. Nessuna dipendenza cloud.                       |

## Registro dei Provider

Triggerfish utilizza un pattern di registro dei provider sia per STT che per TTS.
È possibile collegare qualsiasi provider compatibile implementando l'interfaccia
corrispondente:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configurazione

Configurare le impostazioni vocali in `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Dimensione modello Whisper (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Identificatore vocale specifico del provider
  wake_word: "triggerfish" # Parola di attivazione personalizzata
  push_to_talk:
    shortcut: "Ctrl+Space" # Scorciatoia da tastiera (macOS)
```

## Integrazione con la Sicurezza

I dati vocali seguono le stesse regole di classificazione del testo:

- **L'input vocale è classificato come l'input testuale.** Il parlato trascritto
  entra nella sessione e può aumentare il taint proprio come un messaggio
  digitato.
- **L'output TTS passa attraverso l'hook PRE_OUTPUT** prima della sintesi. Se il
  motore delle policy blocca la risposta, non viene mai pronunciata.
- **Le sessioni vocali portano il taint** proprio come le sessioni testuali.
  Passare alla voce a metà sessione non resetta il taint.
- **Il rilevamento della parola di attivazione viene eseguito localmente.**
  Nessun audio viene inviato al cloud per il matching della parola di attivazione.
- **Le registrazioni audio** (se conservate) sono classificate al livello di
  taint della sessione.

::: info La pipeline vocale si integrerà con le app companion Buoy su iOS e
Android, abilitando push-to-talk e attivazione vocale da dispositivi mobili.
Buoy non è ancora disponibile. :::
