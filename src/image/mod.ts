/**
 * Image analysis module.
 *
 * Provides image analysis tools that read image files, base64-encode them,
 * and send to vision-capable LLM providers for analysis.
 *
 * @module
 */

export {
  getImageToolDefinitions,
  createImageToolExecutor,
  IMAGE_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";
