# Pipeline de Voz

<ComingSoon />

::: info Los proveedores STT y TTS listados a continuacion son solo stubs de
interfaz. Las interfaces de los proveedores estan definidas pero las
implementaciones aun no estan conectadas a servicios de voz reales. :::

Triggerfish soporta interaccion por voz con deteccion de palabra de activacion,
pulsar para hablar y respuesta de texto a voz en macOS, iOS y Android.

## Arquitectura

<img src="/diagrams/voice-pipeline.svg" alt="Pipeline de voz: Deteccion de Palabra de Activacion -> STT -> Procesamiento del Agente -> TTS -> Salida de Voz" style="max-width: 100%;" />

El audio fluye a traves del mismo pipeline de procesamiento del agente que el
texto. La entrada de voz se transcribe, ingresa a la sesion como un mensaje
clasificado, pasa por hooks de politica, y la respuesta se sintetiza de vuelta a
voz.

## Modos de Voz

| Modo             | Descripcion                                              | Plataforma                     |
| ---------------- | -------------------------------------------------------- | ------------------------------ |
| Voice Wake       | Escucha siempre activa con palabra de activacion configurable | macOS, iOS, Android       |
| Push-to-Talk     | Activacion manual via boton o atajo de teclado           | macOS (barra de menu), iOS, Android |
| Talk Mode        | Conversacion continua por voz                            | Todas las plataformas          |

## Proveedores STT

Speech-to-text convierte su voz en texto para que el agente lo procese.

| Proveedor          | Tipo  | Notas                                                           |
| ------------------ | ----- | --------------------------------------------------------------- |
| Whisper            | Local | Predeterminado. Se ejecuta en el dispositivo, sin dependencia de la nube. Mejor para privacidad. |
| Deepgram           | Nube  | Transcripcion en streaming de baja latencia.                    |
| OpenAI Whisper API | Nube  | Alta precision, requiere API key.                               |

## Proveedores TTS

Text-to-speech convierte las respuestas del agente en audio hablado.

| Proveedor     | Tipo  | Notas                                                        |
| ------------- | ----- | ------------------------------------------------------------ |
| ElevenLabs    | Nube  | Predeterminado. Voces de sonido natural con opciones de clonacion de voz. |
| OpenAI TTS    | Nube  | Alta calidad, multiples opciones de voz.                     |
| System Voices | Local | Voces nativas del SO. Sin dependencia de la nube.            |

## Registro de Proveedores

Triggerfish usa un patron de registro de proveedores tanto para STT como para
TTS. Puede conectar cualquier proveedor compatible implementando la interfaz
correspondiente:

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## Configuracion

Configure los ajustes de voz en `triggerfish.yaml`:

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Tamano del modelo Whisper (tiny, base, small, medium, large)
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # Identificador de voz especifico del proveedor
  wake_word: "triggerfish" # Palabra de activacion personalizada
  push_to_talk:
    shortcut: "Ctrl+Space" # Atajo de teclado (macOS)
```

## Integracion de Seguridad

Los datos de voz siguen las mismas reglas de clasificacion que el texto:

- **La entrada de voz se clasifica igual que la entrada de texto.** El habla
  transcrita ingresa a la sesion y puede escalar el taint igual que un mensaje
  escrito.
- **La salida TTS pasa por el hook PRE_OUTPUT** antes de la sintesis. Si el
  motor de politicas bloquea la respuesta, nunca se reproduce.
- **Las sesiones de voz llevan taint** igual que las sesiones de texto. Cambiar
  a voz a mitad de sesion no reinicia el taint.
- **La deteccion de palabra de activacion se ejecuta localmente.** No se envia
  audio a la nube para la coincidencia de palabra de activacion.
- **Las grabaciones de audio** (si se retienen) se clasifican al nivel de taint
  de la sesion.

::: info El pipeline de voz se integrara con las apps companeras Buoy en iOS y
Android, habilitando pulsar para hablar y activacion por voz desde dispositivos
moviles. Buoy aun no esta disponible. :::
