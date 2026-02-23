/**
 * Tidepool tool executor for orchestrator wiring.
 *
 * Dispatches tidepool_* tool calls to the appropriate TidePoolTools
 * method, validating inputs and formatting response strings.
 *
 * @module
 */

import type { TidePoolTools } from "./tools_canvas.ts";
import type { ComponentTree } from "../components.ts";

// ---------------------------------------------------------------------------
// Individual tool executors
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
  const result = tools.renderFile(label, { filename, mime, data });
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
// Tool executor factory
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
