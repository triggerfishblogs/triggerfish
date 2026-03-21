/**
 * SPINE.md management tool definition.
 *
 * Provides a `spine_manage` tool for viewing and appending to the agent's
 * identity file. SPINE.md defines the agent's persona, mission, and
 * behavioral guidelines.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the spine_manage tool definition. */
function buildSpineManageDef(): ToolDefinition {
  return {
    name: "spine_manage",
    description:
      "Manage the agent's SPINE.md identity file. Actions: view, append.\n" +
      "- view: read the current SPINE.md contents\n" +
      "- append: add a new section to SPINE.md. Params: content (required)",
    parameters: {
      action: {
        type: "string",
        description: "The operation: view, append",
        required: true,
      },
      content: {
        type: "string",
        description:
          "Content to append to SPINE.md (append only). Will be added as a new section at the end.",
        required: false,
      },
    },
  };
}

/** Get the SPINE.md management tool definitions. */
export function getSpineManageToolDefinitions(): readonly ToolDefinition[] {
  return [buildSpineManageDef()];
}

/** System prompt section explaining spine_manage to the LLM. */
export const SPINE_MANAGE_SYSTEM_PROMPT = `## SPINE.md Management

Use \`spine_manage\` to view or update the agent's SPINE.md identity file.

- \`action: "view"\` — read the current SPINE.md
- \`action: "append", content: "..."\` — add a section to the end of SPINE.md

SPINE.md defines your persona, mission, and behavioral guidelines. Use append to add capability descriptions for newly configured integrations or MCP servers.

**NEVER use read_file, write_file, or edit_file on SPINE.md.** Use spine_manage exclusively.`;
