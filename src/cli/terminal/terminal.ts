/**
 * Raw terminal input system — re-exports from split modules.
 *
 * This barrel re-exports keypress parsing, keypress reader, line editor,
 * and suggestion engine from their dedicated files.
 *
 * @module
 */

export type { Keypress } from "./input/keypress.ts";
export { parseKeypresses } from "./input/keypress.ts";

export type { KeypressReader } from "./input/keypress_reader.ts";
export { createKeypressReader } from "./input/keypress_reader.ts";

export type { LineEditor } from "./input/line_editor.ts";
export { createLineEditor } from "./input/line_editor.ts";

export type { SuggestionEngine } from "./input/suggestion.ts";
export { createSuggestionEngine } from "./input/suggestion.ts";
