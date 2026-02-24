/**
 * Path sanitization for LLM prompt embedding.
 *
 * Strips Unicode control characters, bidi override markers, zero-width
 * characters, and line separators that could break prompt structure when
 * filesystem paths are embedded in LLM context.
 *
 * @module
 */

/**
 * Strip characters that could break prompt structure when a filesystem
 * path is embedded in an LLM system prompt or tool description.
 *
 * Removes:
 * - C0 control chars (U+0000–U+001F): NUL, newline, carriage return, tab, etc.
 * - DEL and C1 control chars (U+007F–U+009F)
 * - Zero-width chars (U+200B–U+200F)
 * - Line/paragraph separators (U+2028–U+2029)
 * - Bidi direction overrides (U+202A–U+202E, U+2066–U+2069)
 * - BOM / zero-width no-break space (U+FEFF)
 */
export function sanitizePathForPrompt(path: string): string {
  // deno-lint-ignore no-control-regex
  const unsafeCharsPattern = /[\x00-\x1F\x7F-\x9F\u200B-\u200F\u2028-\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  return path.replace(unsafeCharsPattern, "");
}
