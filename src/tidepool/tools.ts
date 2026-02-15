/**
 * Tide Pool tools exposed to the agent as tool calls.
 *
 * Provides two tool sets:
 * - TidepoolTools: legacy callback-based tools (push/eval/reset/snapshot)
 * - TidePoolTools: A2UI canvas tools using Result pattern (5-tool API)
 *
 * @module
 */

import type { TidepoolHost, A2UIHost } from "./host.ts";
import type { Result } from "../core/types/classification.ts";
import type { A2UIComponent, ComponentTree } from "./components.ts";
import type { ToolDefinition } from "../agent/orchestrator.ts";
import type {
  CanvasRenderComponentMessage,
  CanvasRenderHtmlMessage,
  CanvasRenderFileMessage,
  CanvasUpdateMessage,
  CanvasClearMessage,
} from "./canvas_protocol.ts";
import { generateRenderId } from "./canvas_protocol.ts";

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
  renderFile(label: string, filename: string, mime: string, data: string): Result<void, string>;
  /** Update a single component's props by ID, broadcasting the patched tree. */
  update(
    componentId: string,
    props: Record<string, unknown>,
  ): Result<void, string>;
  /** Clear the canvas, removing all rendered content. */
  clear(): Result<void, string>;
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
    return {
      ...node,
      props: { ...node.props, ...props },
    };
  }

  if (node.children) {
    const patchedChildren: A2UIComponent[] = [];
    let found = false;
    for (const child of node.children) {
      const patched = patchComponent(child, componentId, props);
      if (patched) {
        patchedChildren.push(patched);
        found = true;
      } else {
        patchedChildren.push(child);
      }
    }
    if (found) {
      return {
        ...node,
        children: patchedChildren,
      };
    }
  }

  return null;
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
    renderComponent(label: string, tree: ComponentTree): Result<void, string> {
      currentTree = tree;
      const msg: CanvasRenderComponentMessage = {
        type: "canvas_render_component",
        id: generateRenderId(),
        label,
        tree,
      };
      host.sendCanvas(msg);
      return { ok: true, value: undefined };
    },

    renderHtml(label: string, html: string): Result<void, string> {
      const msg: CanvasRenderHtmlMessage = {
        type: "canvas_render_html",
        id: generateRenderId(),
        label,
        html,
      };
      host.sendCanvas(msg);
      return { ok: true, value: undefined };
    },

    renderFile(label: string, filename: string, mime: string, data: string): Result<void, string> {
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
    },

    update(
      componentId: string,
      props: Record<string, unknown>,
    ): Result<void, string> {
      if (!currentTree) {
        return { ok: false, error: "No tree rendered yet" };
      }

      const patchedRoot = patchComponent(
        currentTree.root,
        componentId,
        props,
      );

      if (!patchedRoot) {
        return {
          ok: false,
          error: `Component not found: ${componentId}`,
        };
      }

      currentTree = {
        root: patchedRoot,
        version: currentTree.version + 1,
      };
      const msg: CanvasUpdateMessage = {
        type: "canvas_update",
        tree: currentTree,
      };
      host.sendCanvas(msg);
      return { ok: true, value: undefined };
    },

    clear(): Result<void, string> {
      currentTree = null;
      const msg: CanvasClearMessage = {
        type: "canvas_clear",
      };
      host.sendCanvas(msg);
      return { ok: true, value: undefined };
    },
  };
}

// ---------------------------------------------------------------------------
// Tool definitions, system prompt, and executor for orchestrator wiring
// ---------------------------------------------------------------------------

/** Get Tidepool A2UI tool definitions for the agent orchestrator. */
export function getTidepoolToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "tidepool.render_component",
      description:
        "Render a visual component tree in the Tidepool canvas. " +
        "The tree is broadcast to all connected Tidepool clients and displayed in the canvas panel.",
      parameters: {
        label: {
          type: "string",
          description: "Short label shown in the chat timeline (e.g. 'Dashboard', 'Results')",
          required: true,
        },
        tree: {
          type: "object",
          description:
            "Component tree object: { root: { type, id, props, children? }, version }",
          required: true,
        },
      },
    },
    {
      name: "tidepool.render_html",
      description:
        "Render raw HTML or SVG in the Tidepool canvas. " +
        "The content is displayed in a sandboxed iframe.",
      parameters: {
        label: {
          type: "string",
          description: "Short label shown in the chat timeline",
          required: true,
        },
        html: {
          type: "string",
          description: "Raw HTML or SVG string to render",
          required: true,
        },
      },
    },
    {
      name: "tidepool.render_file",
      description:
        "Render a file with preview and download in the Tidepool canvas. " +
        "Supports images, PDFs, text/code files, and archives.",
      parameters: {
        label: {
          type: "string",
          description: "Short label shown in the chat timeline",
          required: true,
        },
        filename: {
          type: "string",
          description: "Original filename (e.g. 'report.pdf', 'chart.png')",
          required: true,
        },
        mime: {
          type: "string",
          description: "MIME type (e.g. 'image/png', 'application/pdf', 'text/plain')",
          required: true,
        },
        data: {
          type: "string",
          description: "Base64-encoded file data",
          required: true,
        },
      },
    },
    {
      name: "tidepool.update",
      description:
        "Update a single component's props by ID in the current Tidepool canvas tree.",
      parameters: {
        component_id: {
          type: "string",
          description: "The unique ID of the component to update",
          required: true,
        },
        props: {
          type: "object",
          description: "New props to merge into the component",
          required: true,
        },
      },
    },
    {
      name: "tidepool.clear",
      description: "Clear the Tidepool canvas, removing all rendered content.",
      parameters: {},
    },
  ];
}

/** System prompt section explaining Tidepool canvas tools to the LLM. */
export const TIDEPOOL_SYSTEM_PROMPT = `## Tidepool Canvas

You have a visual canvas panel. Render content ONCE per user request — do not re-render or iterate.

### Tools
- **tidepool.render_component** — Structured UI (cards, tables, charts, forms, images, markdown, layouts)
- **tidepool.render_html** — Raw HTML/SVG
- **tidepool.render_file** — File preview + download (base64 data)
- **tidepool.update** — Patch a component's props by ID
- **tidepool.clear** — Clear the canvas

### Component props
- card: { title, content } | table: { headers: string[], rows: string[][] }
- chart: { type: "bar"|"line"|"pie", labels, values } or { svg } | form: { fields: [{ name, type, label }] }
- image: { src, alt? } | markdown: { content } | layout: { direction: "row"|"column" } + children

### Rules
- Call ONE render tool per request, then respond to the user. Never call render tools multiple times for the same content.
- The canvas iframe has its own dark theme styling — do not include background colors or font styles in your HTML.
- If Tidepool is not connected, fall back to text output.`;

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
    if (!name.startsWith("tidepool.")) return null;

    const tools = getTools();
    if (!tools) {
      return "Tidepool is not connected. Visual workspace is unavailable.";
    }

    switch (name) {
      case "tidepool.render_component": {
        const label = input.label;
        const tree = input.tree;
        if (typeof label !== "string" || label.length === 0) {
          return "Error: tidepool.render_component requires a non-empty 'label' argument.";
        }
        if (!tree || typeof tree !== "object") {
          return "Error: tidepool.render_component requires a 'tree' argument (object).";
        }
        const result = tools.renderComponent(label, tree as ComponentTree);
        if (!result.ok) return `Render error: ${result.error}`;
        const treeJson = JSON.stringify(tree);
        return `Rendered component tree "${label}" (${treeJson.length} chars) in canvas. The user can see it now.`;
      }

      case "tidepool.render_html": {
        const label = input.label;
        const html = input.html;
        if (typeof label !== "string" || label.length === 0) {
          return "Error: tidepool.render_html requires a non-empty 'label' argument.";
        }
        if (typeof html !== "string" || html.length === 0) {
          return "Error: tidepool.render_html requires a non-empty 'html' argument.";
        }
        const result = tools.renderHtml(label, html);
        if (!result.ok) return `Render error: ${result.error}`;
        return `Rendered HTML "${label}" (${html.length} chars) in canvas. The user can see it now.`;
      }

      case "tidepool.render_file": {
        const label = input.label;
        const filename = input.filename;
        const mime = input.mime;
        const data = input.data;
        if (typeof label !== "string" || label.length === 0) {
          return "Error: tidepool.render_file requires a non-empty 'label' argument.";
        }
        if (typeof filename !== "string" || filename.length === 0) {
          return "Error: tidepool.render_file requires a non-empty 'filename' argument.";
        }
        if (typeof mime !== "string" || mime.length === 0) {
          return "Error: tidepool.render_file requires a non-empty 'mime' argument.";
        }
        if (typeof data !== "string" || data.length === 0) {
          return "Error: tidepool.render_file requires a non-empty 'data' argument.";
        }
        const result = tools.renderFile(label, filename, mime, data);
        if (!result.ok) return `Render error: ${result.error}`;
        return `Rendered file "${filename}" (${mime}, ${data.length} bytes) in canvas as "${label}". The user can see it now.`;
      }

      case "tidepool.update": {
        const componentId = input.component_id;
        const props = input.props;
        if (typeof componentId !== "string" || componentId.length === 0) {
          return "Error: tidepool.update requires a non-empty 'component_id' argument.";
        }
        if (!props || typeof props !== "object") {
          return "Error: tidepool.update requires a 'props' argument (object).";
        }
        const result = tools.update(componentId, props as Record<string, unknown>);
        if (!result.ok) return `Update error: ${result.error}`;
        return `Component ${componentId} updated.`;
      }

      case "tidepool.clear": {
        const result = tools.clear();
        if (!result.ok) return `Clear error: ${result.error}`;
        return "Tidepool canvas cleared.";
      }

      default:
        return null;
    }
  };
}
