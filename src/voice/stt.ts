/**
 * Speech-to-Text provider abstraction.
 *
 * Supports multiple STT backends (Whisper local, Deepgram, OpenAI).
 * Transcribed text enters the session as a classified message.
 * @module
 */

/** Result of a transcription operation. */
export interface TranscriptionResult {
  readonly text: string;
  readonly language?: string;
  readonly confidence?: number;
  readonly durationMs?: number;
}

/** Options for transcription. */
export interface TranscribeOptions {
  readonly language?: string;
  readonly prompt?: string;
}

/** Speech-to-Text provider interface. */
export interface SttProvider {
  /** Provider name (e.g. "whisper", "deepgram", "openai"). */
  readonly name: string;
  /** Transcribe audio data to text. */
  transcribe(audio: Uint8Array, options?: TranscribeOptions): Promise<TranscriptionResult>;
}

/** Registry for managing STT providers. */
export interface SttProviderRegistry {
  /** Register a provider by name. */
  register(name: string, provider: SttProvider): void;
  /** Get a provider by name, or undefined if not registered. */
  get(name: string): SttProvider | undefined;
  /** List all registered provider names. */
  list(): readonly string[];
}

/** Create a new STT provider registry. */
export function createSttProviderRegistry(): SttProviderRegistry {
  const providers = new Map<string, SttProvider>();

  return {
    register(name: string, provider: SttProvider): void {
      providers.set(name, provider);
    },
    get(name: string): SttProvider | undefined {
      return providers.get(name);
    },
    list(): readonly string[] {
      return [...providers.keys()];
    },
  };
}
