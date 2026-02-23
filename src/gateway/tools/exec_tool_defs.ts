/**
 * Inline tool definitions for filesystem/workspace operations.
 *
 * These are defined inline (not imported from src/tools/) because
 * they are wired directly in the gateway executor, not through a
 * dedicated tool module.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

function buildReadFileDef(): ToolDefinition {
  return {
    name: "read_file",
    description: "Read the contents of a file at an absolute path.",
    parameters: {
      path: {
        type: "string",
        description: "Absolute file path to read",
        required: true,
      },
    },
  };
}

function buildWriteFileDef(): ToolDefinition {
  return {
    name: "write_file",
    description: "Write content to a file at a workspace-relative path.",
    parameters: {
      path: {
        type: "string",
        description: "Relative path in the workspace",
        required: true,
      },
      content: {
        type: "string",
        description: "File content to write",
        required: true,
      },
    },
  };
}

function buildListDirectoryDef(): ToolDefinition {
  return {
    name: "list_directory",
    description: "List files and directories at a given absolute path.",
    parameters: {
      path: {
        type: "string",
        description: "Absolute directory path to list",
        required: true,
      },
    },
  };
}

function buildRunCommandDef(): ToolDefinition {
  return {
    name: "run_command",
    description: "Run a shell command in the agent workspace directory.",
    parameters: {
      command: {
        type: "string",
        description: "Shell command to execute",
        required: true,
      },
    },
  };
}

function buildSearchFilesDef(): ToolDefinition {
  return {
    name: "search_files",
    description:
      "Search for files matching a glob pattern, or search file contents with grep.",
    parameters: {
      path: {
        type: "string",
        description: "Directory to search in",
        required: true,
      },
      pattern: {
        type: "string",
        description:
          "Glob pattern for file names, or text/regex to search within files",
        required: true,
      },
      content_search: {
        type: "boolean",
        description: "If true, search file contents instead of file names",
        required: false,
      },
    },
  };
}

function buildEditFileDef(): ToolDefinition {
  return {
    name: "edit_file",
    description:
      "Replace a unique string in a file. old_text must appear exactly once in the file.",
    parameters: {
      path: {
        type: "string",
        description: "Absolute file path to edit",
        required: true,
      },
      old_text: {
        type: "string",
        description: "Exact text to find (must be unique in file)",
        required: true,
      },
      new_text: {
        type: "string",
        description: "Replacement text",
        required: true,
      },
    },
  };
}

/** Filesystem tools: read_file, write_file, list_directory, run_command, search_files, edit_file. */
export function getExecInlineDefinitions(): readonly ToolDefinition[] {
  return [
    buildReadFileDef(),
    buildWriteFileDef(),
    buildListDirectoryDef(),
    buildRunCommandDef(),
    buildSearchFilesDef(),
    buildEditFileDef(),
  ];
}
