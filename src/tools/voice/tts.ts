/**
 * Text-to-Speech provider abstraction.
 *
 * Supports multiple TTS backends (ElevenLabs, OpenAI TTS, system voices).
 * Output passes through PRE_OUTPUT hook before synthesis.
 * @module
 */

/** Options for speech synthesis. */
export interface SynthesizeOptions {
  readonly voice?: string;
  readonly speed?: number;
  readonly format?: "mp3" | "wav" | "opus" | "pcm";
}

/** Result of a synthesis operation. */
export interface SynthesisResult {
  readonly audio: Uint8Array;
  readonly format: string;
  readonly durationMs?: number;
}

/** Text-to-Speech provider interface. */
export interface TtsProvider {
  /** Provider name (e.g. "elevenlabs", "openai", "system"). */
  readonly name: string;
  /** Synthesize text to audio. */
  synthesize(
    text: string,
    options?: SynthesizeOptions,
  ): Promise<SynthesisResult>;
  /** List available voices for this provider. */
  listVoices?(): Promise<readonly string[]>;
}

/** Registry for managing TTS providers. */
export interface TtsProviderRegistry {
  /** Register a provider by name. */
  register(name: string, provider: TtsProvider): void;
  /** Get a provider by name, or undefined if not registered. */
  get(name: string): TtsProvider | undefined;
  /** List all registered provider names. */
  list(): readonly string[];
}

/** Create a new TTS provider registry. */
export function createTtsProviderRegistry(): TtsProviderRegistry {
  const providers = new Map<string, TtsProvider>();

  return {
    register(name: string, provider: TtsProvider): void {
      providers.set(name, provider);
    },
    get(name: string): TtsProvider | undefined {
      return providers.get(name);
    },
    list(): readonly string[] {
      return [...providers.keys()];
    },
  };
}
