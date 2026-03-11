/**
 * WebSocket message types for Tidepool canvas events.
 *
 * Defines the typed envelope for all server-to-client canvas messages
 * so they can be dispatched in the browser's `handleEvent` switch.
 *
 * @module
 */

import type { ComponentTree } from "./components.ts";
import type { ScreenId } from "./shell/screens.ts";

/** Render a component tree in the canvas. */
export interface CanvasRenderComponentMessage {
  readonly type: "canvas_render_component";
  /** Unique render ID for history tracking. */
  readonly id: string;
  /** Label shown in the chat timeline. */
  readonly label: string;
  /** The component tree to render. */
  readonly tree: ComponentTree;
  /** Target screen for this push. Defaults to "chat" canvas. */
  readonly target?: ScreenId;
}

/** Render raw HTML/SVG in the canvas. */
export interface CanvasRenderHtmlMessage {
  readonly type: "canvas_render_html";
  /** Unique render ID for history tracking. */
  readonly id: string;
  /** Label shown in the chat timeline. */
  readonly label: string;
  /** Raw HTML string to render in the iframe. */
  readonly html: string;
  /** Target screen for this push. Defaults to "chat" canvas. */
  readonly target?: ScreenId;
}

/** Render a file with preview and download in the canvas. */
export interface CanvasRenderFileMessage {
  readonly type: "canvas_render_file";
  /** Unique render ID for history tracking. */
  readonly id: string;
  /** Label shown in the chat timeline. */
  readonly label: string;
  /** Original filename. */
  readonly filename: string;
  /** MIME type of the file. */
  readonly mime: string;
  /** Base64-encoded file data. */
  readonly data: string;
  /** Target screen for this push. Defaults to "chat" canvas. */
  readonly target?: ScreenId;
}

/** Update an existing component tree in the canvas (full patched tree). */
export interface CanvasUpdateMessage {
  readonly type: "canvas_update";
  /** The full patched component tree. */
  readonly tree: ComponentTree;
}

/** Clear the canvas, removing all rendered content. */
export interface CanvasClearMessage {
  readonly type: "canvas_clear";
}

/** Union of all canvas message types. */
export type CanvasMessage =
  | CanvasRenderComponentMessage
  | CanvasRenderHtmlMessage
  | CanvasRenderFileMessage
  | CanvasUpdateMessage
  | CanvasClearMessage;

/**
 * Generate a unique render ID for canvas history tracking.
 *
 * @returns A UUID string
 */
export function generateRenderId(): string {
  return crypto.randomUUID();
}
