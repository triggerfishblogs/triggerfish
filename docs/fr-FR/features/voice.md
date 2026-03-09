# Pipeline vocal

<ComingSoon />

::: info Les fournisseurs STT et TTS listes ci-dessous sont des stubs d'interface uniquement. Les
interfaces des fournisseurs sont definies mais les implementations ne sont pas encore connectees aux
services de parole reels. :::

Triggerfish prend en charge l'interaction vocale avec detection de mot d'activation, push-to-talk
et synthese vocale sur macOS, iOS et Android.

## Architecture

<img src="/diagrams/voice-pipeline.svg" alt="Pipeline vocal : Detection du mot d'activation -> STT -> Traitement par l'agent -> TTS -> Sortie vocale" style="max-width: 100%;" />

L'audio passe par le meme pipeline de traitement de l'agent que le texte. L'entree vocale est
transcrite, entre dans la session comme un message classifie, passe par les hooks de politique,
et la reponse est synthetisee en parole.

## Modes vocaux

| Mode         | Description                                              | Plateforme                     |
| ------------ | -------------------------------------------------------- | ------------------------------ |
| Voice Wake   | Ecoute permanente d'un mot d'activation configurable     | macOS, iOS, Android            |
| Push-to-Talk | Activation manuelle via bouton ou raccourci clavier      | macOS (barre de menus), iOS, Android |
| Talk Mode    | Conversation vocale continue                             | Toutes les plateformes         |

## Fournisseurs STT

La reconnaissance vocale convertit votre voix en texte pour le traitement par l'agent.

| Fournisseur        | Type  | Notes                                                                   |
| ------------------ | ----- | ----------------------------------------------------------------------- |
| Whisper            | Local | Par defaut. S'execute sur l'appareil, sans dependance cloud. Ideal pour la confidentialite. |
| Deepgram           | Cloud | Transcription en streaming a faible latence.                            |
| OpenAI Whisper API | Cloud | Haute precision, necessite une cle API.                                 |

## Fournisseurs TTS

La synthese vocale convertit les reponses de l'agent en audio parle.

| Fournisseur   | Type  | Notes                                                                |
| ------------- | ----- | -------------------------------------------------------------------- |
| ElevenLabs    | Cloud | Par defaut. Voix naturelles avec options de clonage vocal.           |
| OpenAI TTS    | Cloud | Haute qualite, options de voix multiples.                            |
| System Voices | Local | Voix natives du systeme d'exploitation. Pas de dependance cloud.     |

## Registre de fournisseurs

Triggerfish utilise un modele de registre de fournisseurs pour le STT et le TTS. Vous pouvez brancher
n'importe quel fournisseur compatible en implementant l'interface correspondante :

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuration

Configurez les parametres vocaux dans `triggerfish.yaml` :

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Taille du modele Whisper (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Identifiant de voix specifique au fournisseur
  wake_word: "triggerfish" # Mot d'activation personnalise
  push_to_talk:
    shortcut: "Ctrl+Space" # Raccourci clavier (macOS)
```

## Integration de la securite

Les donnees vocales suivent les memes regles de classification que le texte :

- **L'entree vocale est classifiee de la meme maniere que l'entree texte.** La parole transcrite
  entre dans la session et peut augmenter le taint tout comme un message tape.
- **La sortie TTS passe par le hook PRE_OUTPUT** avant la synthese. Si le
  moteur de politique bloque la reponse, elle n'est jamais prononcee.
- **Les sessions vocales portent le taint** tout comme les sessions texte. Passer a la voix
  en cours de session ne reinitialise pas le taint.
- **La detection du mot d'activation s'execute localement.** Aucun audio n'est envoye au cloud pour la
  correspondance du mot d'activation.
- **Les enregistrements audio** (s'ils sont conserves) sont classifies au niveau de taint
  de la session.

::: info Le pipeline vocal s'integrera aux applications compagnon Buoy sur iOS et
Android, permettant le push-to-talk et le reveil vocal depuis les appareils mobiles. Buoy n'est pas
encore disponible. :::
