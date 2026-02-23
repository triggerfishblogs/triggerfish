/**
 * Drive tool definitions.
 *
 * Defines the 2 Drive tool schemas: search, read.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Build the drive_search tool definition. */
export function buildDriveSearchDef(): ToolDefinition {
  return {
    name: "drive_search",
    description:
      "Search Google Drive for files and documents. Returns file names, types, and IDs.",
    parameters: {
      query: {
        type: "string",
        description:
          "Drive search query (e.g. \"name contains 'report'\" or \"mimeType='application/vnd.google-apps.spreadsheet'\")",
        required: true,
      },
      max_results: {
        type: "number",
        description: "Maximum files to return (default: 10)",
        required: false,
      },
    },
  };
}

/** Build the drive_read tool definition. */
export function buildDriveReadDef(): ToolDefinition {
  return {
    name: "drive_read",
    description:
      "Read the content of a Google Drive file. For Docs/Sheets, exports as plain text/CSV. For other text files, downloads the content.",
    parameters: {
      file_id: {
        type: "string",
        description: "The Drive file ID (from drive_search results)",
        required: true,
      },
    },
  };
}
