/**
 * Image analysis module.
 *
 * Provides image analysis tools that read image files, base64-encode them,
 * and send to vision-capable LLM providers for analysis. Also provides
 * shared content block types for multimodal messages and clipboard reading.
 *
 * @module
 */

export {
  getImageToolDefinitions,
  createImageToolExecutor,
  IMAGE_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";

export type {
  TextContentBlock,
  ImageContentBlock,
  ContentBlock,
  MessageContent,
} from "./content.ts";

export {
  normalizeContent,
  extractText,
  hasImages,
  imageBlock,
} from "./content.ts";

export type { ClipboardImage } from "./clipboard.ts";

export {
  readClipboardImage,
  detectImageType,
} from "./clipboard.ts";
