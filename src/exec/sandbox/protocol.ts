/**
 * Shared NDJSON protocol types for the filesystem sandbox.
 *
 * Imported by both the sandboxed worker subprocess and the
 * parent-side client. Each message is a single JSON line on
 * stdin (requests) or stdout (responses).
 *
 * @module
 */

/** Operation types the sandbox worker supports. */
export type SandboxOp = "read" | "write" | "list" | "search" | "edit";

/** Request sent from parent to sandbox worker over stdin. */
export interface SandboxRequest {
  readonly id: string;
  readonly op: SandboxOp;
  readonly args: Readonly<Record<string, unknown>>;
}

/** Response sent from sandbox worker to parent over stdout. */
export interface SandboxResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly result?: string;
  readonly error?: string;
}
