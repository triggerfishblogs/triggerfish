/**
 * Canvas store — render history and visibility.
 */

import type { CanvasRender, ChatEvent } from "../types.js";
import { onTopic } from "./websocket.svelte.js";

/** Render history. */
let _renders: CanvasRender[] = $state([]);

/** Currently active render ID. */
let _activeRenderId: string = $state("");

/** Whether canvas panel is visible. */
let _canvasVisible: boolean = $state(false);

/** Current canvas event for rendering. */
let _currentPayload: ChatEvent | null = $state(null);

/** Get the render history. */
export function getRenders(): CanvasRender[] {
  return _renders;
}

/** Get the currently active render ID. */
export function getActiveRenderId(): string {
  return _activeRenderId;
}

/** Get whether canvas panel is visible. */
export function getCanvasVisible(): boolean {
  return _canvasVisible;
}

/** Get the current canvas payload. */
export function getCurrentPayload(): ChatEvent | null {
  return _currentPayload;
}

/** Show the canvas panel. */
export function showCanvas(): void {
  _canvasVisible = true;
}

/** Hide the canvas panel. */
export function hideCanvas(): void {
  _canvasVisible = false;
}

/** Toggle the canvas panel. */
export function toggleCanvas(): void {
  _canvasVisible = !_canvasVisible;
}

/** Show a specific render by ID. */
export function showRender(id: string): void {
  const render = _renders.find((r) => r.id === id);
  if (render) {
    _activeRenderId = id;
    _currentPayload = render.payload;
    _canvasVisible = true;
  }
}

/** Clear the canvas. */
export function clearCanvas(): void {
  _renders = [];
  _activeRenderId = "";
  _currentPayload = null;
  _canvasVisible = false;
}

/** Handle canvas events. */
function handleMessage(msg: Record<string, unknown>): void {
  const type = msg.type as string;

  switch (type) {
    case "canvas_render_component":
    case "canvas_render_html":
    case "canvas_render_file": {
      const id = msg.id as string;
      const label = msg.label as string;
      _renders.push({ id, label, payload: msg as ChatEvent });
      _activeRenderId = id;
      _currentPayload = msg as ChatEvent;
      _canvasVisible = true;
      break;
    }

    case "canvas_update":
      if (_currentPayload) {
        _currentPayload = { ..._currentPayload, tree: msg.tree };
      }
      break;

    case "canvas_clear":
      clearCanvas();
      break;
  }
}

onTopic("chat", handleMessage);
