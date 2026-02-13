/**
 * Tests for raw terminal input: keypress parsing, line editor, suggestion engine.
 *
 * All tests use pure logic — no TTY or raw mode required.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  parseKeypresses,
  createLineEditor,
  createSuggestionEngine,
} from "../../src/cli/terminal.ts";

// ─── Keypress parsing ──────────────────────────────────────────

Deno.test("parseKeypresses: printable ASCII characters", () => {
  const bytes = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 3);
  assertEquals(keys[0].key, "a");
  assertEquals(keys[0].char, "a");
  assertEquals(keys[0].ctrl, false);
  assertEquals(keys[1].key, "b");
  assertEquals(keys[2].key, "c");
});

Deno.test("parseKeypresses: enter key", () => {
  const bytes = new Uint8Array([0x0D]); // CR
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "enter");
  assertEquals(keys[0].char, null);
});

Deno.test("parseKeypresses: tab key", () => {
  const bytes = new Uint8Array([0x09]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "tab");
  assertEquals(keys[0].char, null);
});

Deno.test("parseKeypresses: backspace (0x7F)", () => {
  const bytes = new Uint8Array([0x7F]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "backspace");
});

Deno.test("parseKeypresses: backspace (0x08)", () => {
  const bytes = new Uint8Array([0x08]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "backspace");
});

Deno.test("parseKeypresses: ctrl+c", () => {
  const bytes = new Uint8Array([0x03]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "ctrl+c");
  assertEquals(keys[0].ctrl, true);
});

Deno.test("parseKeypresses: ctrl+d", () => {
  const bytes = new Uint8Array([0x04]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "ctrl+d");
  assertEquals(keys[0].ctrl, true);
});

Deno.test("parseKeypresses: ctrl+o", () => {
  const bytes = new Uint8Array([0x0F]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "ctrl+o");
  assertEquals(keys[0].ctrl, true);
});

Deno.test("parseKeypresses: up arrow", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x41]); // ESC [ A
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "up");
  assertEquals(keys[0].char, null);
});

Deno.test("parseKeypresses: down arrow", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x42]); // ESC [ B
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "down");
});

Deno.test("parseKeypresses: right arrow", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x43]); // ESC [ C
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "right");
});

Deno.test("parseKeypresses: left arrow", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x44]); // ESC [ D
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "left");
});

Deno.test("parseKeypresses: home key (ESC [ H)", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x48]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "home");
});

Deno.test("parseKeypresses: end key (ESC [ F)", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x46]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "end");
});

Deno.test("parseKeypresses: delete key (ESC [ 3 ~)", () => {
  const bytes = new Uint8Array([0x1B, 0x5B, 0x33, 0x7E]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "delete");
});

Deno.test("parseKeypresses: standalone ESC (no follow-up)", () => {
  // Standalone ESC is detected when the sequence buffer has only 0x1B
  const bytes = new Uint8Array([0x1B]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "esc");
});

Deno.test("parseKeypresses: mixed sequence", () => {
  // Type "hi", then press up arrow
  const bytes = new Uint8Array([0x68, 0x69, 0x1B, 0x5B, 0x41]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 3);
  assertEquals(keys[0].key, "h");
  assertEquals(keys[1].key, "i");
  assertEquals(keys[2].key, "up");
});

Deno.test("parseKeypresses: newline (0x0A) treated as enter", () => {
  const bytes = new Uint8Array([0x0A]);
  const keys = parseKeypresses(bytes);
  assertEquals(keys.length, 1);
  assertEquals(keys[0].key, "enter");
});

// ─── Line editor ────────────────────────────────────────────────

Deno.test("LineEditor: starts empty", () => {
  const editor = createLineEditor();
  assertEquals(editor.text, "");
  assertEquals(editor.cursor, 0);
  assertEquals(editor.suggestion, "");
});

Deno.test("LineEditor: insert characters", () => {
  let editor = createLineEditor();
  editor = editor.insert("h");
  editor = editor.insert("i");
  assertEquals(editor.text, "hi");
  assertEquals(editor.cursor, 2);
});

Deno.test("LineEditor: backspace removes character before cursor", () => {
  let editor = createLineEditor();
  editor = editor.insert("a");
  editor = editor.insert("b");
  editor = editor.insert("c");
  editor = editor.backspace();
  assertEquals(editor.text, "ab");
  assertEquals(editor.cursor, 2);
});

Deno.test("LineEditor: backspace at start does nothing", () => {
  const editor = createLineEditor();
  const result = editor.backspace();
  assertEquals(result.text, "");
  assertEquals(result.cursor, 0);
});

Deno.test("LineEditor: deleteChar removes character at cursor", () => {
  let editor = createLineEditor();
  editor = editor.insert("a");
  editor = editor.insert("b");
  editor = editor.insert("c");
  editor = editor.moveCursor("home");
  editor = editor.deleteChar();
  assertEquals(editor.text, "bc");
  assertEquals(editor.cursor, 0);
});

Deno.test("LineEditor: deleteChar at end does nothing", () => {
  let editor = createLineEditor();
  editor = editor.insert("abc");
  const result = editor.deleteChar();
  assertEquals(result.text, "abc");
});

Deno.test("LineEditor: moveCursor left and right", () => {
  let editor = createLineEditor();
  editor = editor.insert("hello");
  assertEquals(editor.cursor, 5);
  editor = editor.moveCursor("left");
  assertEquals(editor.cursor, 4);
  editor = editor.moveCursor("left");
  assertEquals(editor.cursor, 3);
  editor = editor.moveCursor("right");
  assertEquals(editor.cursor, 4);
});

Deno.test("LineEditor: moveCursor left at start stays at 0", () => {
  const editor = createLineEditor();
  const result = editor.moveCursor("left");
  assertEquals(result.cursor, 0);
});

Deno.test("LineEditor: moveCursor right at end stays at end", () => {
  let editor = createLineEditor();
  editor = editor.insert("hi");
  const result = editor.moveCursor("right");
  assertEquals(result.cursor, 2);
});

Deno.test("LineEditor: moveCursor home and end", () => {
  let editor = createLineEditor();
  editor = editor.insert("hello world");
  editor = editor.moveCursor("home");
  assertEquals(editor.cursor, 0);
  editor = editor.moveCursor("end");
  assertEquals(editor.cursor, 11);
});

Deno.test("LineEditor: insert at cursor position (mid-string)", () => {
  let editor = createLineEditor();
  editor = editor.insert("hllo");
  editor = editor.moveCursor("home");
  editor = editor.moveCursor("right");
  editor = editor.insert("e");
  assertEquals(editor.text, "hello");
  assertEquals(editor.cursor, 2);
});

Deno.test("LineEditor: setText replaces content", () => {
  let editor = createLineEditor();
  editor = editor.insert("hello");
  editor = editor.setText("goodbye");
  assertEquals(editor.text, "goodbye");
  assertEquals(editor.cursor, 7);
});

Deno.test("LineEditor: suggestion and acceptSuggestion", () => {
  let editor = createLineEditor();
  editor = editor.insert("/cle");
  editor = editor.setSuggestion("ar");
  assertEquals(editor.suggestion, "ar");
  editor = editor.acceptSuggestion();
  assertEquals(editor.text, "/clear");
  assertEquals(editor.cursor, 6);
  assertEquals(editor.suggestion, "");
});

Deno.test("LineEditor: acceptSuggestion with no suggestion does nothing", () => {
  let editor = createLineEditor();
  editor = editor.insert("hello");
  const result = editor.acceptSuggestion();
  assertEquals(result.text, "hello");
});

Deno.test("LineEditor: clear resets everything", () => {
  let editor = createLineEditor();
  editor = editor.insert("hello");
  editor = editor.setSuggestion("world");
  editor = editor.clear();
  assertEquals(editor.text, "");
  assertEquals(editor.cursor, 0);
  assertEquals(editor.suggestion, "");
});

Deno.test("LineEditor: insert clears suggestion", () => {
  let editor = createLineEditor();
  editor = editor.insert("/cle");
  editor = editor.setSuggestion("ar");
  editor = editor.insert("x");
  assertEquals(editor.suggestion, "");
  assertEquals(editor.text, "/clex");
});

// ─── Suggestion engine ──────────────────────────────────────────

Deno.test("SuggestionEngine: suggests slash commands", () => {
  const engine = createSuggestionEngine();
  const result = engine.suggest("/cle", []);
  assertEquals(result, "/clear");
});

Deno.test("SuggestionEngine: suggests /quit from /q", () => {
  const engine = createSuggestionEngine();
  const result = engine.suggest("/q", []);
  assertEquals(result, "/quit");
});

Deno.test("SuggestionEngine: suggests /help", () => {
  const engine = createSuggestionEngine();
  const result = engine.suggest("/h", []);
  assertEquals(result, "/help");
});

Deno.test("SuggestionEngine: suggests /compact", () => {
  const engine = createSuggestionEngine();
  const result = engine.suggest("/com", []);
  assertEquals(result, "/compact");
});

Deno.test("SuggestionEngine: returns null for no match", () => {
  const engine = createSuggestionEngine();
  const result = engine.suggest("/xyz", []);
  assertEquals(result, null);
});

Deno.test("SuggestionEngine: suggests from history", () => {
  const engine = createSuggestionEngine();
  const history = ["How is the weather?", "What time is it?"];
  const result = engine.suggest("How", history);
  assertEquals(result, "How is the weather?");
});

Deno.test("SuggestionEngine: slash commands take priority over history", () => {
  const engine = createSuggestionEngine();
  const history = ["/clearance sale"];
  const result = engine.suggest("/cle", history);
  assertEquals(result, "/clear");
});

Deno.test("SuggestionEngine: returns null for empty input", () => {
  const engine = createSuggestionEngine();
  const result = engine.suggest("", []);
  assertEquals(result, null);
});

Deno.test("SuggestionEngine: case-sensitive history match", () => {
  const engine = createSuggestionEngine();
  const history = ["Hello world"];
  assertEquals(engine.suggest("Hello", history), "Hello world");
  assertEquals(engine.suggest("hello", history), null);
});
