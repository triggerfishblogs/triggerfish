/**
 * Gemini content and message conversion utilities.
 *
 * Converts LLM messages and content blocks into the Gemini parts format
 * used by the Google Generative AI SDK.
 *
 * @module
 */

import type { LlmMessage } from "../../llm.ts";
import type { ContentBlock } from "../../../core/image/content.ts";

/** Gemini parts union type. */
export type GeminiPart = { text: string } | {
  inlineData: { mimeType: string; data: string };
};

/** Convert a text content block to a Gemini text part. */
function convertTextBlock(block: ContentBlock): GeminiPart {
  return { text: (block as { type: "text"; text: string }).text };
}

/** Convert an image content block to a Gemini inline data part. */
function convertImageBlock(block: ContentBlock): GeminiPart {
  const img = block as {
    type: "image";
    source: { media_type: string; data: string };
  };
  return {
    inlineData: {
      mimeType: img.source.media_type,
      data: img.source.data,
    },
  };
}

/** Convert an array of content blocks to Gemini parts. */
function convertContentBlocks(blocks: ContentBlock[]): GeminiPart[] {
  const parts: GeminiPart[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      parts.push(convertTextBlock(block));
    } else if (block.type === "image") {
      parts.push(convertImageBlock(block));
    }
  }
  return parts.length > 0 ? parts : [{ text: "" }];
}

/** Convert message content to Gemini parts format. */
export function convertContentToGeminiParts(
  content: string | unknown,
): GeminiPart[] {
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: JSON.stringify(content) }];
  return convertContentBlocks(content as ContentBlock[]);
}

/** Extract system instruction string from messages. */
export function extractGeminiSystemInstruction(
  messages: readonly LlmMessage[],
): string | undefined {
  const systemMessage = messages.find((m) => m.role === "system");
  if (!systemMessage) return undefined;
  return typeof systemMessage.content === "string"
    ? systemMessage.content
    : JSON.stringify(systemMessage.content);
}

/** Build Gemini chat history and user parts from messages. */
export function buildGeminiChatParts(
  messages: readonly LlmMessage[],
): {
  history: { role: string; parts: GeminiPart[] }[];
  userParts: GeminiPart[];
} {
  const nonSystem = messages.filter((m) => m.role !== "system");
  const history = nonSystem
    .slice(0, -1)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: convertContentToGeminiParts(m.content),
    }));
  const lastMessage = nonSystem.at(-1);
  const userParts = lastMessage
    ? convertContentToGeminiParts(lastMessage.content)
    : [{ text: "" }];
  return { history, userParts };
}
