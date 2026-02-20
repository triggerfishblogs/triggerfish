/**
 * Image analysis tools.
 *
 * Provides image analysis tools that read image files, base64-encode them,
 * and send to vision-capable LLM providers for analysis. Also provides
 * clipboard reading.
 *
 * @module
 */

export {
  getImageToolDefinitions,
  createImageToolExecutor,
  IMAGE_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";

export type { ClipboardImage } from "./clipboard.ts";

export {
  readClipboardImage,
  detectImageType,
} from "./clipboard.ts";
