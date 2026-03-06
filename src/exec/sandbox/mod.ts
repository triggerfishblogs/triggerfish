/**
 * Filesystem sandbox — OS-level enforcement via Deno Worker permissions.
 *
 * Spawns a permission-restricted Deno Worker with `read: [workspace]`
 * and `write: [workspace]`. All filesystem tool operations
 * (read, write, list, search, edit) are routed through this Worker
 * via postMessage/onmessage.
 *
 * Works in both development mode (deno run) and compiled binaries
 * (deno compile) without requiring Deno to be installed on the host.
 *
 * @module
 */

export { createFilesystemSandbox } from "./client.ts";
export type { FilesystemSandbox, FilesystemSandboxOptions } from "./client.ts";
export type { SandboxOp, SandboxRequest, SandboxResponse } from "./protocol.ts";
