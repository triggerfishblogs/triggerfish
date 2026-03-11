/**
 * Tidepool browser HTML compositor.
 *
 * Lazily reads the compiled Svelte output on first call to
 * `buildTidepoolHtml()`. The file is resolved relative to this module
 * via import.meta.url, which Deno compile handles automatically when
 * the file is in --include.
 *
 * @module
 */

import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("tidepool-ui");

/** Cached HTML string, loaded on first access. */
let cachedHtml: string | null = null;

/** Resolve the path to the compiled dist/index.html. */
const DIST_URL = new URL("./dist/index.html", import.meta.url);

/** Error page shown when the compiled UI bundle is missing. */
const MISSING_UI_HTML = `<!DOCTYPE html>
<html><head><title>Tidepool — Build Required</title></head>
<body style="font-family:system-ui;padding:2rem">
<h1>Tidepool UI not built</h1>
<p>Run <code>cd tidepool-ui &amp;&amp; npm run build</code> to compile the UI.</p>
</body></html>`;

/**
 * Build the complete Tidepool HTML.
 *
 * Lazily reads the pre-compiled Svelte output on first call. Returns
 * a helpful error page if the compiled file does not exist.
 *
 * @returns The complete HTML string ready to serve
 */
export function buildTidepoolHtml(): string {
  if (cachedHtml !== null) return cachedHtml;

  try {
    cachedHtml = Deno.readTextFileSync(DIST_URL);
  } catch (err: unknown) {
    log.warn("Tidepool compiled UI not found, serving fallback page", {
      operation: "buildTidepoolHtml",
      path: DIST_URL.pathname,
      err,
    });
    cachedHtml = MISSING_UI_HTML;
  }

  return cachedHtml;
}
