# Pipeline de voz

<ComingSoon />

::: info Los proveedores STT y TTS listados a continuación son solo stubs de interfaz. Las interfaces de los proveedores están definidas pero las implementaciones aún no están conectadas a servicios de voz reales. :::

Triggerfish admite interacción por voz con detección de palabra de activación, pulsar para hablar y texto a voz en macOS, iOS y Android.

## Arquitectura

<img src="/diagrams/voice-pipeline.svg" alt="Pipeline de voz: detección de palabra de activación → STT → procesamiento del agente → TTS → salida de voz" style="max-width: 100%;" />

El audio fluye a través del mismo pipeline de procesamiento del agente que el texto. La entrada de voz se transcribe, entra en la sesión como un mensaje clasificado, pasa por los hooks de políticas, y la respuesta se sintetiza de vuelta a voz.

## Modos de voz

| Modo              | Descripción                                            | Plataforma                        |
| ----------------- | ------------------------------------------------------ | --------------------------------- |
| Activación por voz | Escucha continua de una palabra de activación configurable | macOS, iOS, Android             |
| Pulsar para hablar | Activación manual por botón o atajo de teclado         | macOS (barra de menú), iOS, Android |
| Modo conversación  | Habla conversacional continua                          | Todas las plataformas             |

## Proveedores STT

La conversión de voz a texto convierte su voz en texto para que el agente lo procese.

| Proveedor          | Tipo  | Notas                                                                  |
| ------------------ | ----- | ---------------------------------------------------------------------- |
| Whisper            | Local | Predeterminado. Se ejecuta en el dispositivo, sin dependencia de la nube. Mejor para privacidad. |
| Deepgram           | Nube  | Transcripción en streaming de baja latencia.                           |
| OpenAI Whisper API | Nube  | Alta precisión, requiere clave API.                                    |

## Proveedores TTS

La conversión de texto a voz convierte las respuestas del agente en audio hablado.

| Proveedor     | Tipo  | Notas                                                                 |
| ------------- | ----- | --------------------------------------------------------------------- |
| ElevenLabs    | Nube  | Predeterminado. Voces naturales con opciones de clonación de voz.     |
| OpenAI TTS    | Nube  | Alta calidad, múltiples opciones de voz.                              |
| Voces del SO  | Local | Voces nativas del SO. Sin dependencia de la nube.                     |

## Registro de proveedores

Triggerfish usa un patrón de registro de proveedores tanto para STT como para TTS. Puede conectar cualquier proveedor compatible implementando la interfaz correspondiente:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuración

Configure los ajustes de voz en `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Tamaño del modelo Whisper (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Identificador de voz específico del proveedor
  wake_word: "triggerfish" # Palabra de activación personalizada
  push_to_talk:
    shortcut: "Ctrl+Space" # Atajo de teclado (macOS)
```

## Integración de seguridad

Los datos de voz siguen las mismas reglas de clasificación que el texto:

- **La entrada de voz se clasifica igual que la entrada de texto.** El habla transcrita entra en la sesión y puede escalar el taint igual que un mensaje escrito.
- **La salida TTS pasa por el hook PRE_OUTPUT** antes de la síntesis. Si el motor de políticas bloquea la respuesta, nunca se pronuncia.
- **Las sesiones de voz llevan taint** igual que las sesiones de texto. Cambiar a voz a mitad de sesión no reinicia el taint.
- **La detección de palabra de activación se ejecuta localmente.** No se envía audio a la nube para la coincidencia de la palabra de activación.
- **Las grabaciones de audio** (si se retienen) se clasifican al nivel de taint de la sesión.

::: info El pipeline de voz se integrará con las aplicaciones complementarias Buoy en iOS y Android, habilitando pulsar para hablar y activación por voz desde dispositivos móviles. Buoy aún no está disponible. :::
