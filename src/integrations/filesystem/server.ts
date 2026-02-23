/**
 * Filesystem MCP Server — provides file operations within a sandboxed root directory.
 *
 * Tools: read_file, write_file, list_directory, search_files.
 * All paths are resolved relative to the root and path traversal is blocked.
 * Every result carries the server's classification level.
 *
 * @module
 */

import { resolve, normalize } from "@std/path";
import type { Result, ClassificationLevel } from "../../core/types/classification.ts";
import { isWithinJail } from "../../core/security/path_jail.ts";

/** A directory entry returned by list_directory. */
export interface DirectoryEntry {
  readonly name: string;
  readonly size: number;
  readonly isDirectory: boolean;
}

/** Result of a filesystem tool call. */
export interface FilesystemToolResult {
  readonly content: string;
  readonly classification: ClassificationLevel;
  readonly entries?: readonly DirectoryEntry[];
}

/** Options for creating a filesystem MCP server. */
export interface FilesystemServerOptions {
  readonly rootPath: string;
  readonly classification: ClassificationLevel;
}

/** Filesystem MCP server interface. */
export interface FilesystemServer {
  /** Call a filesystem tool by name. */
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Result<FilesystemToolResult, string>>;
}

/**
 * Resolve a relative path within the root and verify it doesn't escape.
 *
 * @returns The absolute resolved path, or an error string
 */
function safePath(
  rootPath: string,
  relative: string,
): Result<string, string> {
  const resolved = resolve(rootPath, normalize(relative));
  const normalizedRoot = resolve(rootPath);

  if (!isWithinJail(resolved, normalizedRoot)) {
    return { ok: false, error: "Path traversal blocked" };
  }
  return { ok: true, value: resolved };
}

/**
 * Create a filesystem MCP server rooted at the given directory.
 *
 * All file operations are sandboxed to rootPath. Path traversal attempts
 * (e.g. ../../etc/passwd) are rejected. Every result carries the configured
 * classification level.
 */
export function createFilesystemServer(
  options: FilesystemServerOptions,
): FilesystemServer {
  const { rootPath, classification } = options;

  return {
    async callTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<Result<FilesystemToolResult, string>> {
      switch (name) {
        case "read_file": {
          const path = args.path as string | undefined;
          if (path === undefined) {
            return { ok: false, error: "Missing required argument: path" };
          }

          const resolved = safePath(rootPath, path);
          if (!resolved.ok) return resolved;

          try {
            const content = await Deno.readTextFile(resolved.value);
            return {
              ok: true,
              value: { content, classification },
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `Failed to read file: ${msg}` };
          }
        }

        case "write_file": {
          const path = args.path as string | undefined;
          const content = args.content as string | undefined;
          if (path === undefined) {
            return { ok: false, error: "Missing required argument: path" };
          }
          if (content === undefined) {
            return { ok: false, error: "Missing required argument: content" };
          }

          const resolved = safePath(rootPath, path);
          if (!resolved.ok) return resolved;

          try {
            await Deno.writeTextFile(resolved.value, content);
            return {
              ok: true,
              value: {
                content: `Wrote ${content.length} bytes to ${path}`,
                classification,
              },
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `Failed to write file: ${msg}` };
          }
        }

        case "list_directory": {
          const path = args.path as string | undefined;
          if (path === undefined) {
            return { ok: false, error: "Missing required argument: path" };
          }

          const resolved = safePath(rootPath, path);
          if (!resolved.ok) return resolved;

          try {
            const entries: DirectoryEntry[] = [];
            for await (const entry of Deno.readDir(resolved.value)) {
              let size = 0;
              if (entry.isFile) {
                try {
                  const stat = await Deno.stat(
                    resolve(resolved.value, entry.name),
                  );
                  size = stat.size;
                } catch {
                  // If stat fails, leave size as 0
                }
              }
              entries.push({
                name: entry.name,
                size,
                isDirectory: entry.isDirectory,
              });
            }
            return {
              ok: true,
              value: {
                content: `Listed ${entries.length} entries`,
                classification,
                entries,
              },
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { ok: false, error: `Failed to list directory: ${msg}` };
          }
        }

        case "search_files": {
          return { ok: false, error: "search_files not yet implemented" };
        }

        default:
          return { ok: false, error: `Unknown tool: ${name}` };
      }
    },
  };
}
