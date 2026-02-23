/**
 * A2UI Tide Pool canvas tools (Result-based).
 *
 * Provides the five-tool canvas API: renderComponent, renderHtml,
 * renderFile, update, and clear. Uses the Result pattern and
 * operates on component trees via canvas protocol messages.
 *
 * @module
 */

import type { A2UIHost } from "../host/host.ts";
import type { Result } from "../../../core/types/classification.ts";
import type { A2UIComponent, ComponentTree } from "../components.ts";
import type {
  CanvasClearMessage,
  CanvasRenderComponentMessage,
  CanvasRenderFileMessage,
  CanvasRenderHtmlMessage,
  CanvasUpdateMessage,
} from "../canvas_protocol.ts";
import { generateRenderId } from "../canvas_protocol.ts";

// ---------------------------------------------------------------------------
// Render-file options (avoids >3 positional params)
// ---------------------------------------------------------------------------

/** Options for the renderFile canvas method. */
export interface RenderFileOptions {
  /** File name for display and download. */
  readonly filename: string;
  /** MIME type of the file content. */
  readonly mime: string;
  /** Base64-encoded or raw file data. */
  readonly data: string;
}

// ---------------------------------------------------------------------------
// TidePoolTools interface
// ---------------------------------------------------------------------------

/** A2UI tools interface for agent interaction with the Tide Pool canvas. */
export interface TidePoolTools {
  /** Render a component tree in the canvas, broadcasting to all clients. */
  renderComponent(label: string, tree: ComponentTree): Result<void, string>;
  /** Render raw HTML/SVG in the canvas. */
  renderHtml(label: string, html: string): Result<void, string>;
  /** Render a file with preview and download in the canvas. */
  renderFile(label: string, options: RenderFileOptions): Result<void, string>;
  /** Update a single component's props by ID, broadcasting the patched tree. */
  update(
    componentId: string,
    props: Record<string, unknown>,
  ): Result<void, string>;
  /** Clear the canvas, removing all rendered content. */
  clear(): Result<void, string>;
}

// ─── Component Tree Helpers ─────────────────────────────────────────────────

function patchChildComponents(
  children: readonly A2UIComponent[],
  componentId: string,
  props: Record<string, unknown>,
): A2UIComponent[] | null {
  const patchedChildren: A2UIComponent[] = [];
  let found = false;
  for (const child of children) {
    const patched = patchComponent(child, componentId, props);
    if (patched) {
      patchedChildren.push(patched);
      found = true;
    } else {
      patchedChildren.push(child);
    }
  }
  return found ? patchedChildren : null;
}

/**
 * Recursively find a component by ID and return a new tree with patched props.
 *
 * Returns null if the component was not found.
 */
function patchComponent(
  node: A2UIComponent,
  componentId: string,
  props: Record<string, unknown>,
): A2UIComponent | null {
  if (node.id === componentId) {
    return { ...node, props: { ...node.props, ...props } };
  }
  if (!node.children) return null;

  const patched = patchChildComponents(node.children, componentId, props);
  return patched ? { ...node, children: patched } : null;
}

// ─── Canvas Send Helpers ────────────────────────────────────────────────────

function sendRenderComponent(
  host: A2UIHost,
  label: string,
  tree: ComponentTree,
): Result<void, string> {
  const msg: CanvasRenderComponentMessage = {
    type: "canvas_render_component",
    id: generateRenderId(),
    label,
    tree,
  };
  host.sendCanvas(msg);
  return { ok: true, value: undefined };
}

function sendRenderHtml(
  host: A2UIHost,
  label: string,
  html: string,
): Result<void, string> {
  const msg: CanvasRenderHtmlMessage = {
    type: "canvas_render_html",
    id: generateRenderId(),
    label,
    html,
  };
  host.sendCanvas(msg);
  return { ok: true, value: undefined };
}

function sendRenderFile(
  host: A2UIHost,
  label: string,
  options: RenderFileOptions,
): Result<void, string> {
  const msg: CanvasRenderFileMessage = {
    type: "canvas_render_file",
    id: generateRenderId(),
    label,
    filename: options.filename,
    mime: options.mime,
    data: options.data,
  };
  host.sendCanvas(msg);
  return { ok: true, value: undefined };
}

function sendCanvasClear(host: A2UIHost): Result<void, string> {
  const msg: CanvasClearMessage = { type: "canvas_clear" };
  host.sendCanvas(msg);
  return { ok: true, value: undefined };
}

/** Apply a component update to the current tree and broadcast the result. */
export function applyComponentUpdate(
  host: A2UIHost,
  currentTree: ComponentTree,
  componentId: string,
  props: Record<string, unknown>,
): { tree: ComponentTree; result: Result<void, string> } {
  const patchedRoot = patchComponent(currentTree.root, componentId, props);
  if (!patchedRoot) {
    return {
      tree: currentTree,
      result: { ok: false, error: `Component not found: ${componentId}` },
    };
  }
  const updated: ComponentTree = {
    root: patchedRoot,
    version: currentTree.version + 1,
  };
  const msg: CanvasUpdateMessage = { type: "canvas_update", tree: updated };
  host.sendCanvas(msg);
  return { tree: updated, result: { ok: true, value: undefined } };
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create A2UI Tide Pool tools backed by an A2UIHost.
 *
 * These tools use the Result pattern and operate on component trees
 * and canvas messages. The host sends typed canvas messages to all
 * connected WebSocket clients.
 *
 * @param host The A2UI WebSocket host to send canvas messages through
 */
export function createTidePoolTools(host: A2UIHost): TidePoolTools {
  let currentTree: ComponentTree | null = null;

  return {
    renderComponent(label, tree) {
      currentTree = tree;
      return sendRenderComponent(host, label, tree);
    },
    renderHtml(label, html) {
      return sendRenderHtml(host, label, html);
    },
    renderFile(label, options) {
      return sendRenderFile(host, label, options);
    },
    update(componentId, props) {
      if (!currentTree) {
        return { ok: false, error: "No tree rendered yet" };
      }
      const { tree, result } = applyComponentUpdate(
        host,
        currentTree,
        componentId,
        props,
      );
      currentTree = tree;
      return result;
    },
    clear() {
      currentTree = null;
      return sendCanvasClear(host);
    },
  };
}
