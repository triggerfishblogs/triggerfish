/**
 * Sheets tool definitions.
 *
 * Defines the 2 Sheets tool schemas: read, write.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the sheets_read tool definition. */
export function buildSheetsReadDef(): ToolDefinition {
  return {
    name: "sheets_read",
    description:
      "Read a range of cells from a Google Sheet. Returns values as a 2D array.",
    parameters: {
      spreadsheet_id: {
        type: "string",
        description:
          "The spreadsheet ID (from the Google Sheets URL or drive_search)",
        required: true,
      },
      range: {
        type: "string",
        description: "Cell range in A1 notation (e.g. 'Sheet1!A1:D10')",
        required: true,
      },
    },
  };
}

/** Build the sheets_write tool definition. */
export function buildSheetsWriteDef(): ToolDefinition {
  return {
    name: "sheets_write",
    description: "Write values to a range of cells in a Google Sheet.",
    parameters: {
      spreadsheet_id: {
        type: "string",
        description: "The spreadsheet ID",
        required: true,
      },
      range: {
        type: "string",
        description: "Cell range in A1 notation (e.g. 'Sheet1!A1:B2')",
        required: true,
      },
      values: {
        type: "string",
        description:
          'JSON-encoded 2D array of values (e.g. \'[["Name","Age"],["Alice","30"]]\')',
        required: true,
      },
    },
  };
}
