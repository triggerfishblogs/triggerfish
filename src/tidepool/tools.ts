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
    async push(html: string): Promise<void> {
      host.push(html);
    },
    async eval(js: string): Promise<void> {
      host.eval(js);
    },
    async reset(): Promise<void> {
      host.reset();
    },
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
