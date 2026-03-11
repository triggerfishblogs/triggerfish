/**
 * Integrations module — MCP server implementations and external service adapters.
 *
 * @module
 */

export {
  createFilesystemServer,
  type DirectoryEntry,
  type FilesystemServer,
  type FilesystemServerOptions,
  type FilesystemToolResult,
} from "./filesystem/mod.ts";

export * from "./google/mod.ts";
export * from "./github/mod.ts";
export * from "./caldav/mod.ts";
export * from "./notion/mod.ts";
