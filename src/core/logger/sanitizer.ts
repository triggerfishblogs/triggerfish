/**
 * Log input sanitization — truncation, escaping, and provenance tagging.
 *
 * Pure functions for sanitizing external (untrusted) data before it enters
 * log files. Provenance delimiters «» (U+00AB/U+00BB) mark attacker-controlled
 * content throughout the log lifecycle so log_reader.ts can scope injection
 * scanning to those regions without touching trusted log content.
 *
 * @module
 */

/** Maximum bytes allowed for a sanitized external field value. */
export const MAX_EXTERNAL_BYTES = 256;

/**
 * Sanitize a string from an external (untrusted) origin for safe log writing.
 *
 * Operations applied in order:
 * 1. Byte-truncate to MAX_EXTERNAL_BYTES (UTF-8 boundary-safe via TextDecoder)
 * 2. Replace \r\n, \r, \n with a single space
 * 3. Strip null byte and ASCII control characters U+0001–U+001F
 *    (tab U+0009 is preserved) and U+007F
 * 4. Escape provenance delimiters: « (U+00AB) → ‹ (U+2039),  » (U+00BB) → › (U+203A)
 */
export function sanitizeExternal(value: string): string {
  // 1. Byte-truncate with UTF-8 boundary safety.
  //    fatal: false replaces any incomplete multibyte sequence at the cut with U+FFFD.
  const encoded = new TextEncoder().encode(value);
  const truncated = encoded.slice(0, MAX_EXTERNAL_BYTES);
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(truncated);

  // 2. Normalize line endings to a single space.
  let result = decoded.replace(/\r\n|\r|\n/g, " ");

  // 3. Strip null byte and control characters U+0000–U+0008, U+000B–U+001F, U+007F.
  //    Preserves tab (U+0009). \n and \r were already replaced above.
  // deno-lint-ignore no-control-regex
  result = result.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "");

  // 4. Escape provenance delimiters to prevent injection via nested delimiters.
  result = result.replace(/\u00AB/g, "\u2039"); // « → ‹
  result = result.replace(/\u00BB/g, "\u203A"); // » → ›

  return result;
}

/**
 * Wrap an external value in provenance delimiters «» after sanitizing.
 *
 * The delimiters (U+00AB / U+00BB) mark attacker-controlled content in log
 * lines so log_reader.ts can scope injection scanning to those regions only.
 */
export function tagExternal(value: string): string {
  return `\u00AB${sanitizeExternal(value)}\u00BB`;
}

/**
 * Format a log message with provenance-tagged external fields.
 *
 * The trusted `message` string is left unchanged. Each entry in
 * `externalFields` is sanitized and wrapped in «» delimiters so that
 * log_reader.ts can identify and scan only attacker-controlled content.
 *
 * @example
 * formatTaggedEntry("WS upgrade", { origin: "http://evil.com", ua: "curl" })
 * // → "WS upgrade origin=«http://evil.com» ua=«curl»"
 */
export function formatTaggedEntry(
  message: string,
  externalFields: Record<string, string>,
): string {
  const fieldPairs = Object.entries(externalFields);
  if (fieldPairs.length === 0) return message;
  const tagged = fieldPairs
    .map(([k, v]) => `${k}=${tagExternal(v)}`)
    .join(" ");
  return `${message} ${tagged}`;
}
