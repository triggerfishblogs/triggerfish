/**
 * Markdown rendering with marked + DOMPurify.
 */

import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked for synchronous rendering
marked.setOptions({
  async: false,
  gfm: true,
  breaks: true,
});

/** Render markdown to sanitized HTML. Strips <think> tags. */
export function renderMarkdown(text: string): string {
  // Strip think tags
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const html = marked.parse(cleaned) as string;
  return DOMPurify.sanitize(html);
}
