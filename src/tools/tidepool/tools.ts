/**
 * Tide Pool tools exposed to the agent as tool calls.
 *
 * Provides two tool sets:
 * - TidepoolTools: legacy callback-based tools (push/eval/reset/snapshot)
 * - TidePoolTools: A2UI canvas tools using Result pattern (5-tool API)
 *
 * Tool definitions and system prompt live in `tools_defs.ts`.
 *
 * @module
 */

import type { A2UIHost, TidepoolHost } from "./host.ts";
import type { Result } from "../../core/types/classification.ts";
import type { A2UIComponent, ComponentTree } from "./components.ts";
import type {
  CanvasClearMessage,
  CanvasRenderComponentMessage,
  CanvasRenderFileMessage,
  CanvasRenderHtmlMessage,
  CanvasUpdateMessage,
} from "./canvas_protocol.ts";
import { generateRenderId } from "./canvas_protocol.ts";

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export {
  getTidepoolToolDefinitions,
  TIDEPOOL_SYSTEM_PROMPT,
} from "./tools_defs.ts";

// ---------------------------------------------------------------------------
// Legacy TidepoolTools (retained for backward compatibility)
// ---------------------------------------------------------------------------

/** Legacy tools interface for agent interaction with the Tide Pool. */
export interface TidepoolTools {
  /** Push HTML content to the tide pool. */
  push(html: string): Promise<void>;
  /** Evaluate JavaScript in the tide pool sandbox. */
  eval(js: string): Promise<void>;
  /** Reset the tide pool, clearing all content. */
  reset(): Promise<void>;
  /** Take a snapshot of the current tide pool state. */
  snapshot(): Promise<string | undefined>;
}

/** Create legacy Tide Pool tools backed by a TidepoolHost. */
export function createTidepoolTools(host: TidepoolHost): TidepoolTools {
  return {
    // deno-lint-ignore require-await
    async push(html: string): Promise<void> {
      host.push(html);
    },
    // deno-lint-ignore require-await
    async eval(js: string): Promise<void> {
      host.eval(js);
    },
    // deno-lint-ignore require-await
    async reset(): Promise<void> {
      host.reset();
    },
    // deno-lint-ignore require-await
    async snapshot(): Promise<string | undefined> {
      return host.snapshot();
    },
  };
}

// ---------------------------------------------------------------------------
// A2UI TidePoolTools (Result-based, canvas)
// ---------------------------------------------------------------------------

/** A2UI tools interface for agent interaction with the Tide Pool canvas. */
export interface TidePoolTools {
  /** Render a component tree in the canvas, broadcasting to all clients. */
  renderComponent(label: string, tree: ComponentTree): Result<void, string>;
  /** Render raw HTML/SVG in the canvas. */
  renderHtml(label: string, html: string): Result<void, string>;
  /** Render a file with preview and download in the canvas. */
  renderFile(
    label: string,
    filename: string,
    mime: string,
    data: string,
  ): Result<void, string>;
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

// ─── A2UI Canvas Methods ────────────────────────────────────────────────────

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
  filename: string,
  mime: string,
  data: string,
): Result<void, string> {
  const msg: CanvasRenderFileMessage = {
    type: "canvas_render_file",
    id: generateRenderId(),
    label,
    filename,
    mime,
    data,
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
function applyComponentUpdate(
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
    renderFile(label, filename, mime, data) {
      return sendRenderFile(host, label, filename, mime, data);
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

// ---------------------------------------------------------------------------
// Executor Helpers
// ---------------------------------------------------------------------------

function executeTidepoolRenderComponent(
  tools: TidePoolTools,
  input: Record<string, unknown>,
): string {
  const label = input.label;
  const tree = input.tree;
  if (typeof label !== "string" || label.length === 0) {
    return "Error: tidepool_render_component requires a non-empty 'label' argument.";
  }
  if (!tree || typeof tree !== "object") {
    return "Error: tidepool_render_component requires a 'tree' argument (object).";
  }
  const result = tools.renderComponent(label, tree as ComponentTree);
  if (!result.ok) return `Render error: ${result.error}`;
  const treeJson = JSON.stringify(tree);
  return `Rendered component tree "${label}" (${treeJson.length} chars) in canvas. The user can see it now.`;
}

function executeTidepoolRenderHtml(
  tools: TidePoolTools,
  input: Record<string, unknown>,
): string {
  const label = input.label;
  const html = input.html;
  if (typeof label !== "string" || label.length === 0) {
    return "Error: tidepool_render_html requires a non-empty 'label' argument.";
  }
  if (typeof html !== "string" || html.length === 0) {
    return "Error: tidepool_render_html requires a non-empty 'html' argument.";
  }
  const result = tools.renderHtml(label, html);
  if (!result.ok) return `Render error: ${result.error}`;
  return `Rendered HTML "${label}" (${html.length} chars) in canvas. The user can see it now.`;
}

function executeTidepoolRenderFile(
  tools: TidePoolTools,
  input: Record<string, unknown>,
): string {
  const label = input.label;
  const filename = input.filename;
  const mime = input.mime;
  const data = input.data;
  if (typeof label !== "string" || label.length === 0) {
    return "Error: tidepool_render_file requires a non-empty 'label' argument.";
  }
  if (typeof filename !== "string" || filename.length === 0) {
    return "Error: tidepool_render_file requires a non-empty 'filename' argument.";
  }
  if (typeof mime !== "string" || mime.length === 0) {
    return "Error: tidepool_render_file requires a non-empty 'mime' argument.";
  }
  if (typeof data !== "string" || data.length === 0) {
    return "Error: tidepool_render_file requires a non-empty 'data' argument.";
  }
  const result = tools.renderFile(label, filename, mime, data);
  if (!result.ok) return `Render error: ${result.error}`;
  return `Rendered file "${filename}" (${mime}, ${data.length} bytes) in canvas as "${label}". The user can see it now.`;
}

function executeTidepoolUpdate(
  tools: TidePoolTools,
  input: Record<string, unknown>,
): string {
  const componentId = input.component_id;
  const props = input.props;
  if (typeof componentId !== "string" || componentId.length === 0) {
    return "Error: tidepool_update requires a non-empty 'component_id' argument.";
  }
  if (!props || typeof props !== "object") {
    return "Error: tidepool_update requires a 'props' argument (object).";
  }
  const result = tools.update(componentId, props as Record<string, unknown>);
  if (!result.ok) return `Update error: ${result.error}`;
  return `Component ${componentId} updated.`;
}

// ---------------------------------------------------------------------------
// Tool executor for orchestrator wiring
// ---------------------------------------------------------------------------

/**
 * Create a tool executor for Tidepool canvas tools.
 *
 * Returns null for non-tidepool tool names (allowing chaining).
 * Returns an error string if Tidepool is not connected.
 *
 * @param getTools - Lazy getter returning TidePoolTools or undefined if not connected
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createTidepoolToolExecutor(
  getTools: () => TidePoolTools | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("tidepool_")) return null;

    const tools = getTools();
    if (!tools) {
      return "Tidepool is not connected. Visual workspace is unavailable.";
    }

    switch (name) {
      case "tidepool_render_component":
        return executeTidepoolRenderComponent(tools, input);
      case "tidepool_render_html":
        return executeTidepoolRenderHtml(tools, input);
      case "tidepool_render_file":
        return executeTidepoolRenderFile(tools, input);
      case "tidepool_update":
        return executeTidepoolUpdate(tools, input);
      case "tidepool_clear": {
        const result = tools.clear();
        if (!result.ok) return `Clear error: ${result.error}`;
        return "Tidepool canvas cleared.";
      }
      default:
        return null;
    }
  };
}
