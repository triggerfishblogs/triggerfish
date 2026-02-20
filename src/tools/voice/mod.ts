/**
 * Voice pipeline module.
 *
 * Provides STT (Speech-to-Text) and TTS (Text-to-Speech) provider
 * abstractions with registry-based management.
 * @module
 */

export type {
  SttProvider,
  SttProviderRegistry,
  TranscribeOptions,
  TranscriptionResult,
} from "./stt.ts";
export { createSttProviderRegistry } from "./stt.ts";

export type {
  SynthesisResult,
  SynthesizeOptions,
  TtsProvider,
  TtsProviderRegistry,
} from "./tts.ts";
export { createTtsProviderRegistry } from "./tts.ts";
