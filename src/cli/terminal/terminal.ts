/**
 * Raw terminal input system — re-exports from split modules.
 *
 * This barrel re-exports keypress parsing, keypress reader, line editor,
 * and suggestion engine from their dedicated files.
 *
 * @module
 */

export type { Keypress } from "./keypress.ts";
export { parseKeypresses } from "./keypress.ts";

export type { KeypressReader } from "./keypress_reader.ts";
export { createKeypressReader } from "./keypress_reader.ts";

export type { LineEditor } from "./line_editor.ts";
export { createLineEditor } from "./line_editor.ts";

export type { SuggestionEngine } from "./suggestion.ts";
export { createSuggestionEngine } from "./suggestion.ts";
