/**
 * Tidepool browser HTML compositor.
 *
 * Embeds the 6 template fragments at module load time so the HTML is
 * available in all execution contexts (deno run, compiled binary, tests).
 * The templates are resolved relative to this module via import.meta.url,
 * which Deno compile handles automatically when the files are in --include.
 *
 * @module
 */

/** Read a sibling template file using URL resolution. */
function readTemplate(name: string): string {
  return Deno.readTextFileSync(new URL(name, import.meta.url));
}

// Eagerly load all templates at module init
const BASE = readTemplate("./tmpl_base.html");
const STYLES = readTemplate("./tmpl_styles.html");
const CHAT_HTML = readTemplate("./tmpl_chat.html");
const CANVAS_HTML = readTemplate("./tmpl_canvas.html");
const CHAT_SCRIPT = readTemplate("./tmpl_chat_script.html");
const CANVAS_SCRIPT = readTemplate("./tmpl_canvas_script.html");

/**
 * Build the complete Tidepool HTML by compositing embedded template fragments.
 *
 * All templates are loaded once at module init — this function is a pure
 * string operation with no I/O.
 *
 * @returns The complete HTML string ready to serve
 */
export function buildTidepoolHtml(): string {
  return BASE
    .replace("{{STYLES}}", STYLES)
    .replace("{{CHAT_HTML}}", CHAT_HTML)
    .replace("{{CANVAS_HTML}}", CANVAS_HTML)
    .replace("{{CHAT_SCRIPT}}", CHAT_SCRIPT)
    .replace("{{CANVAS_SCRIPT}}", CANVAS_SCRIPT);
}

/**
 * @deprecated Use `buildTidepoolHtml()` instead. Retained for backward compatibility.
 */
export const TIDEPOOL_HTML = "";
