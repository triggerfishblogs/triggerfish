/**
 * Tidepool browser HTML compositor.
 *
 * Reads the single compiled Svelte output file at module load time so
 * the HTML is available in all execution contexts (deno run, compiled
 * binary, tests). The file is resolved relative to this module via
 * import.meta.url, which Deno compile handles automatically when the
 * file is in --include.
 *
 * @module
 */

/** The compiled Tidepool UI as a single HTML string. */
const COMPILED_HTML = Deno.readTextFileSync(
  new URL("./dist/index.html", import.meta.url),
);

/**
 * Build the complete Tidepool HTML.
 *
 * Returns the pre-compiled Svelte output — a single self-contained
 * HTML file with all JS and CSS inlined.
 *
 * @returns The complete HTML string ready to serve
 */
export function buildTidepoolHtml(): string {
  return COMPILED_HTML;
}

/**
 * @deprecated Use `buildTidepoolHtml()` instead. Retained for backward compatibility.
 */
export const TIDEPOOL_HTML = "";
