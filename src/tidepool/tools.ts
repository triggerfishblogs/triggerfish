/**
 * Tide Pool tools exposed to the agent as tool calls.
 *
 * Provides two tool sets:
 * - TidepoolTools: legacy callback-based tools (push/eval/reset/snapshot)
 * - TidePoolTools: A2UI component-tree tools using Result pattern
 *
 * @module
 */

import type { TidepoolHost, A2UIHost } from "./host.ts";
import type { Result } from "../core/types/classification.ts";
import type { A2UIComponent, ComponentTree } from "./components.ts";
import type { ToolDefinition } from "../agent/orchestrator.ts";

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
// A2UI TidePoolTools (Result-based, component tree)
// ---------------------------------------------------------------------------

/** A2UI tools interface for agent interaction with the Tide Pool. */
export interface TidePoolTools {
  /** Render a complete component tree, broadcasting to all clients. */
  render(tree: ComponentTree): Result<void, string>;
  /** Update a single component's props by ID, broadcasting the patched tree. */
  update(
    componentId: string,
    props: Record<string, unknown>,
  ): Result<void, string>;
  /** Clear the current tree, broadcasting an empty state. */
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
 * rather than raw HTML. The host broadcasts tree updates to all
 * connected WebSocket clients.
 *
 * @param host The A2UI WebSocket host to broadcast through
 */
export function createTidePoolTools(host: A2UIHost): TidePoolTools {
  let currentTree: ComponentTree | null = null;

  return {
    render(tree: ComponentTree): Result<void, string> {
      currentTree = tree;
      host.broadcast(tree);
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
      host.broadcast(currentTree);
      return { ok: true, value: undefined };
    },

    clear(): Result<void, string> {
      const nextVersion = currentTree ? currentTree.version + 1 : 0;
      currentTree = null;
      const emptyTree: ComponentTree = {
        root: {
          type: "layout",
          id: "__empty",
          props: { direction: "column" },
          children: [],
        },
        version: nextVersion,
      };
      host.broadcast(emptyTree);
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
      name: "tidepool.render",
      description:
        "Render a visual component tree in the Tidepool workspace. " +
        "The tree is broadcast to all connected Tidepool clients.",
      parameters: {
        tree: {
          type: "object",
          description:
            "Component tree object: { root: { type, id, props, children? }, version }",
          required: true,
        },
      },
    },
    {
      name: "tidepool.update",
      description:
        "Update a single component's props by ID in the current Tidepool tree.",
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
      description: "Clear the Tidepool workspace, removing all rendered components.",
      parameters: {},
    },
  ];
}

/** System prompt section explaining Tidepool A2UI tools to the LLM. */
export const TIDEPOOL_SYSTEM_PROMPT = `## Tidepool Visual Workspace

You can render visual content in the Tidepool workspace using A2UI components.

- Use tidepool.render to display a component tree (cards, tables, markdown, layouts).
- Use tidepool.update to modify a single component's props by ID.
- Use tidepool.clear to reset the workspace.

Component types: card, table, chart, form, image, markdown, layout.
Each component has: type, id (unique), props (type-specific), and optional children.

Use Tidepool when the user asks for visual output, dashboards, tables, or structured displays.
If Tidepool is not connected, the tools will return an error — fall back to text output.`;

/**
 * Create a tool executor for Tidepool A2UI tools.
 *
 * Returns null for non-tidepool tool names (allowing chaining).
 * Returns an error string if Tidepool is not connected.
 *
 * @param tools - TidePoolTools instance, or undefined if Tidepool is not connected
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createTidepoolToolExecutor(
  tools: TidePoolTools | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("tidepool.")) return null;

    if (!tools) {
      return "Tidepool is not connected. Visual workspace is unavailable.";
    }

    switch (name) {
      case "tidepool.render": {
        const tree = input.tree;
        if (!tree || typeof tree !== "object") {
          return "Error: tidepool.render requires a 'tree' argument (object).";
        }
        const result = tools.render(tree as ComponentTree);
        if (!result.ok) return `Render error: ${result.error}`;
        return "Component tree rendered in Tidepool.";
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
        return "Tidepool workspace cleared.";
      }

      default:
        return null;
    }
  };
}
