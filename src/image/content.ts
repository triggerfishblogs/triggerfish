/**
 * Shared content block types for multimodal messages.
 *
 * Follows the Anthropic content block format, which is already used by
 * `src/image/tools.ts` for vision requests. These types are the canonical
 * representation used across all layers: orchestrator, providers, gateway,
 * compactor, and UI.
 *
 * @module
 */

/** A text content block. */
export interface TextContentBlock {
  readonly type: "text";
  readonly text: string;
}

/** An image content block with base64-encoded data. */
export interface ImageContentBlock {
  readonly type: "image";
  readonly source: {
    readonly type: "base64";
    readonly media_type: string;
    readonly data: string;
  };
}

/** A content block in a message. */
export type ContentBlock = TextContentBlock | ImageContentBlock;

/** Message content: either a plain string or an array of content blocks. */
export type MessageContent = string | readonly ContentBlock[];

/**
 * Normalize message content to an array of content blocks.
 *
 * If content is a string, wraps it in a single TextContentBlock.
 * If already an array, returns it unchanged.
 *
 * @param content - Message content to normalize
 * @returns Array of content blocks
 */
export function normalizeContent(
  content: MessageContent,
): readonly ContentBlock[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return content;
}

/**
 * Extract all text from message content.
 *
 * For strings, returns the string directly. For content block arrays,
 * concatenates all text blocks separated by newlines.
 *
 * @param content - Message content to extract text from
 * @returns Plain text representation
 */
export function extractText(content: MessageContent): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((block): block is TextContentBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/**
 * Check whether message content contains any image blocks.
 *
 * @param content - Message content to check
 * @returns true if content contains at least one image block
 */
export function hasImages(content: MessageContent): boolean {
  if (typeof content === "string") {
    return false;
  }
  return content.some((block) => block.type === "image");
}

/**
 * Create an image content block from raw binary data.
 *
 * @param data - Raw image bytes
 * @param mimeType - MIME type (e.g. "image/png", "image/jpeg")
 * @returns An ImageContentBlock with base64-encoded data
 */
export function imageBlock(
  data: Uint8Array,
  mimeType: string,
): ImageContentBlock {
  // Encode in chunks to avoid call stack overflow on large images
  const CHUNK_SIZE = 8192;
  let base64 = "";
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.subarray(i, Math.min(i + CHUNK_SIZE, data.length));
    base64 += String.fromCharCode(...chunk);
  }
  base64 = btoa(base64);

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType,
      data: base64,
    },
  };
}
