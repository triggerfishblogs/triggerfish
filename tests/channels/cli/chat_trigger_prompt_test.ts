/**
 * Tests for the CLI trigger prompt keypress handler.
 *
 * Validates that Y/Enter accepts, N/Esc dismisses, and other keys
 * are ignored. Also validates that the correct WebSocket messages
 * are sent and that the appropriate display is shown for
 * write-down vs safe scenarios.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import type { WsRouterState, TriggerPromptModeState } from "../../../src/channels/cli/chat_ws_types.ts";
import { routeTriggerPromptKeypress } from "../../../src/channels/cli/chat_trigger_prompt.ts";
import { createLogger } from "../../../src/core/logger/logger.ts";

const log = createLogger("test");

/** Captured WebSocket sends. */
interface FakeWs {
  readonly sent: string[];
  send(data: string): void;
  readonly readyState: number;
}

function createFakeWs(): FakeWs {
  const sent: string[] = [];
  return {
    sent,
    send(data: string) {
      sent.push(data);
    },
    readyState: WebSocket.OPEN,
  };
}

/** Minimal ScreenManager stub. */
function createFakeScreen() {
  const output: string[] = [];
  let status = "";
  let spinnerText = "";
  return {
    output,
    writeOutput(text: string) {
      output.push(text);
    },
    clearStatus() {
      status = "";
    },
    setStatus(text: string) {
      status = text;
    },
    getStatus() {
      return status;
    },
    startSpinner(text: string) {
      spinnerText = text;
    },
    stopSpinner() {
      spinnerText = "";
    },
    getSpinnerText() {
      return spinnerText;
    },
    redrawInput(_editor: unknown) {},
    getTaint() {
      return "PUBLIC";
    },
    setTaint(_level: unknown) {},
    init() {},
    cleanup() {},
    setMcpStatus(_c: number, _t: number) {},
  };
}

function createFakeEditor() {
  return {
    text: "",
    cursor: 0,
    insert(_char: string) {
      return this;
    },
    delete() {
      return this;
    },
    clear() {
      return this;
    },
  };
}

function createState(): WsRouterState {
  return {
    isProcessing: false,
    passwordMode: null,
    credentialMode: null,
    triggerPromptMode: null,
    pendingTriggerPrompt: null,
    providerName: "test",
  };
}

function createPrompt(
  overrides: Partial<TriggerPromptModeState> = {},
): TriggerPromptModeState {
  return {
    source: "trigger",
    classification: "PUBLIC",
    preview: "Test trigger output",
    ...overrides,
  };
}

// ─── Accept with Y key ──────────────────────────────────────────────

Deno.test("trigger prompt: Y key sends accepted response", () => {
  const ws = createFakeWs();
  const screen = createFakeScreen();
  const editor = createFakeEditor();
  const state = createState();
  const prompt = createPrompt();
  state.triggerPromptMode = prompt;

  routeTriggerPromptKeypress(
    { key: "y", char: "y" },
    prompt,
    state,
    ws as unknown as WebSocket,
    screen as unknown as import("../../../src/cli/terminal/screen.ts").ScreenManager,
    editor as unknown as import("../../../src/cli/terminal/terminal.ts").LineEditor,
    log,
  );

  assertEquals(ws.sent.length, 1);
  const msg = JSON.parse(ws.sent[0]);
  assertEquals(msg.type, "trigger_prompt_response");
  assertEquals(msg.source, "trigger");
  assertEquals(msg.accepted, true);
  assertEquals(state.triggerPromptMode, null);
  assertEquals(state.isProcessing, true);
});

// ─── Accept with Enter key ──────────────────────────────────────────

Deno.test("trigger prompt: Enter key sends accepted response", () => {
  const ws = createFakeWs();
  const screen = createFakeScreen();
  const editor = createFakeEditor();
  const state = createState();
  const prompt = createPrompt();

  routeTriggerPromptKeypress(
    { key: "enter", char: null },
    prompt,
    state,
    ws as unknown as WebSocket,
    screen as unknown as import("../../../src/cli/terminal/screen.ts").ScreenManager,
    editor as unknown as import("../../../src/cli/terminal/terminal.ts").LineEditor,
    log,
  );

  assertEquals(ws.sent.length, 1);
  const msg = JSON.parse(ws.sent[0]);
  assertEquals(msg.accepted, true);
  assertEquals(state.triggerPromptMode, null);
});

// ─── Dismiss with N key ─────────────────────────────────────────────

Deno.test("trigger prompt: N key sends declined response", () => {
  const ws = createFakeWs();
  const screen = createFakeScreen();
  const editor = createFakeEditor();
  const state = createState();
  const prompt = createPrompt();

  routeTriggerPromptKeypress(
    { key: "n", char: "n" },
    prompt,
    state,
    ws as unknown as WebSocket,
    screen as unknown as import("../../../src/cli/terminal/screen.ts").ScreenManager,
    editor as unknown as import("../../../src/cli/terminal/terminal.ts").LineEditor,
    log,
  );

  assertEquals(ws.sent.length, 1);
  const msg = JSON.parse(ws.sent[0]);
  assertEquals(msg.type, "trigger_prompt_response");
  assertEquals(msg.source, "trigger");
  assertEquals(msg.accepted, false);
  assertEquals(state.triggerPromptMode, null);
  assertStringIncludes(screen.output[0], "dismissed");
});

// ─── Dismiss with Esc key ───────────────────────────────────────────

Deno.test("trigger prompt: Esc key dismisses", () => {
  const ws = createFakeWs();
  const screen = createFakeScreen();
  const editor = createFakeEditor();
  const state = createState();
  const prompt = createPrompt();

  routeTriggerPromptKeypress(
    { key: "esc", char: null },
    prompt,
    state,
    ws as unknown as WebSocket,
    screen as unknown as import("../../../src/cli/terminal/screen.ts").ScreenManager,
    editor as unknown as import("../../../src/cli/terminal/terminal.ts").LineEditor,
    log,
  );

  assertEquals(ws.sent.length, 1);
  const msg = JSON.parse(ws.sent[0]);
  assertEquals(msg.accepted, false);
  assertEquals(state.triggerPromptMode, null);
});

// ─── Other keys are ignored ─────────────────────────────────────────

Deno.test("trigger prompt: other keys are ignored", () => {
  const ws = createFakeWs();
  const screen = createFakeScreen();
  const editor = createFakeEditor();
  const state = createState();
  const prompt = createPrompt();
  state.triggerPromptMode = prompt;

  routeTriggerPromptKeypress(
    { key: "a", char: "a" },
    prompt,
    state,
    ws as unknown as WebSocket,
    screen as unknown as import("../../../src/cli/terminal/screen.ts").ScreenManager,
    editor as unknown as import("../../../src/cli/terminal/terminal.ts").LineEditor,
    log,
  );

  assertEquals(ws.sent.length, 0);
  assertEquals(state.triggerPromptMode, prompt); // unchanged
});

// ─── Accept shows spinner ───────────────────────────────────────────

Deno.test("trigger prompt: accept starts spinner", () => {
  const ws = createFakeWs();
  const screen = createFakeScreen();
  const editor = createFakeEditor();
  const state = createState();
  const prompt = createPrompt();

  routeTriggerPromptKeypress(
    { key: "y", char: "y" },
    prompt,
    state,
    ws as unknown as WebSocket,
    screen as unknown as import("../../../src/cli/terminal/screen.ts").ScreenManager,
    editor as unknown as import("../../../src/cli/terminal/terminal.ts").LineEditor,
    log,
  );

  assertStringIncludes(screen.getSpinnerText(), "Loading trigger output");
});
