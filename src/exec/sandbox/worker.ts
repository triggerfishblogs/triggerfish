/**
 * Sandboxed filesystem worker — runs inside a permission-restricted Deno Worker.
 *
 * **IMPORTANT:** This file must be completely self-contained (zero imports)
 * because it runs as an isolated Worker with its own module scope. Any
 * `import` from adjacent modules may fail in compiled binaries if the
 * import target is not explicitly included.
 *
 * Permissions are restricted at the Worker level by the parent:
 *   read: [workspacePath], write: [workspacePath], run: ["grep", "find"]
 *   net: false, env: false, ffi: false
 *
 * Receives SandboxRequest messages via postMessage, dispatches by operation,
 * returns SandboxResponse messages via postMessage.
 *
 * @module
 */

// ─── Inline types (must match protocol.ts) ──────────────────────────────────

interface SandboxRequest {
  readonly id: string;
  readonly op: "read" | "write" | "list" | "search" | "edit";
  readonly args: Readonly<Record<string, unknown>>;
}

interface SandboxResponse {
  readonly id: string;
  readonly ok: boolean;
  readonly result?: string;
  readonly error?: string;
}

// ─── Inline path utilities (POSIX only — no @std/path import) ───────────────

/** Normalize an absolute POSIX path — resolves `.` and `..` segments. */
function normalizePosixPath(path: string): string {
  const segments = path.split("/");
  const stack: string[] = [];
  for (const seg of segments) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      stack.pop();
    } else {
      stack.push(seg);
    }
  }
  return "/" + stack.join("/");
}

/** Resolve a path relative to a base directory (POSIX only). */
function resolvePath(base: string, relative: string): string {
  if (relative.startsWith("/")) return normalizePosixPath(relative);
  return normalizePosixPath(base + "/" + relative);
}

/** Return the parent directory of an absolute path (POSIX only). */
function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i);
}

// ─── Workspace root ─────────────────────────────────────────────────────────

let workspaceRoot = "";

// ─── Path validation (defense-in-depth) ─────────────────────────────────────

/** Check if resolved path is within the workspace (separator-aware). */
function isWithinWorkspace(resolvedPath: string): boolean {
  return resolvedPath === workspaceRoot ||
    resolvedPath.startsWith(workspaceRoot + "/");
}

/** Resolve and validate a path argument. Returns absolute path or error. */
function resolveSafePath(
  rawPath: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const abs = resolvePath(workspaceRoot, rawPath);
  if (!isWithinWorkspace(abs)) {
    return { ok: false, error: `No such file or directory: ${rawPath}` };
  }
  return { ok: true, path: abs };
}

/** Strip the workspaceRoot prefix from an absolute path, returning a workspace-relative path. */
function toRelativePath(absPath: string): string {
  if (absPath.startsWith(workspaceRoot + "/")) {
    return absPath.slice(workspaceRoot.length + 1);
  }
  if (absPath === workspaceRoot) return ".";
  return absPath;
}

// ─── Operation handlers ─────────────────────────────────────────────────────

async function handleRead(
  args: Readonly<Record<string, unknown>>,
): Promise<string> {
  const path = args.path;
  if (typeof path !== "string" || path.length === 0) {
    return formatError("read_file requires a 'path' argument (string)");
  }
  const resolved = resolveSafePath(path);
  if (!resolved.ok) return formatError(resolved.error);
  return await Deno.readTextFile(resolved.path);
}

async function handleWrite(
  args: Readonly<Record<string, unknown>>,
): Promise<string> {
  const path = args.path;
  const content = args.content;
  if (typeof path !== "string" || path.length === 0) {
    return formatError("write_file requires a 'path' argument (string)");
  }
  if (typeof content !== "string") {
    return formatError("write_file requires a 'content' argument (string)");
  }
  const resolved = resolveSafePath(path);
  if (!resolved.ok) return formatError(resolved.error);

  await Deno.mkdir(parentDir(resolved.path), { recursive: true });
  await Deno.writeTextFile(resolved.path, content);
  const info = await Deno.stat(resolved.path);
  return `Wrote ${info.size} bytes to ${toRelativePath(resolved.path)}`;
}

async function handleList(
  args: Readonly<Record<string, unknown>>,
): Promise<string> {
  const path = args.path;
  if (typeof path !== "string" || path.length === 0) {
    return formatError("list_directory requires a 'path' argument (string)");
  }
  const resolved = resolveSafePath(path);
  if (!resolved.ok) return formatError(resolved.error);

  const relDir = toRelativePath(resolved.path);
  const prefix = relDir === "." ? "" : relDir.replace(/\/?$/, "/");
  const entries: string[] = [];
  for await (const entry of Deno.readDir(resolved.path)) {
    const suffix = entry.isDirectory ? "/" : "";
    entries.push(`${prefix}${entry.name}${suffix}`);
  }
  return entries.length > 0 ? entries.join("\n") : "(empty directory)";
}

async function handleSearch(
  args: Readonly<Record<string, unknown>>,
): Promise<string> {
  const path = args.path;
  const pattern = args.pattern;
  if (typeof path !== "string" || path.length === 0) {
    return formatError("search_files requires a 'path' argument (string)");
  }
  if (typeof pattern !== "string" || pattern.length === 0) {
    return formatError("search_files requires a 'pattern' argument (string)");
  }
  const resolved = resolveSafePath(path);
  if (!resolved.ok) return formatError(resolved.error);

  const isContentSearch = args.content_search === true;
  const cmd = isContentSearch ? "grep" : "find";
  const cmdArgs = isContentSearch
    ? ["-rl", pattern, resolved.path]
    : [resolved.path, "-name", pattern, "-type", "f"];

  const proc = new Deno.Command(cmd, {
    args: cmdArgs,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await proc.output();
  const stdout = new TextDecoder().decode(output.stdout).trim();
  if (stdout.length === 0) {
    return isContentSearch
      ? "No matches found."
      : "No files found matching pattern.";
  }
  // Strip workspace prefix from all paths in grep/find output
  return stdout.split("\n").map((line) => toRelativePath(line)).join("\n");
}

async function handleEdit(
  args: Readonly<Record<string, unknown>>,
): Promise<string> {
  const path = args.path;
  const oldText = args.old_text;
  const newText = args.new_text;
  if (typeof path !== "string" || path.length === 0) {
    return formatError("edit_file requires a 'path' argument (string)");
  }
  if (typeof oldText !== "string" || oldText.length === 0) {
    return formatError(
      "edit_file requires a non-empty 'old_text' argument (string)",
    );
  }
  if (typeof newText !== "string") {
    return formatError("edit_file requires a 'new_text' argument (string)");
  }
  const resolved = resolveSafePath(path);
  if (!resolved.ok) return formatError(resolved.error);

  const content = await Deno.readTextFile(resolved.path);
  const count = content.split(oldText).length - 1;
  if (count === 0) {
    return formatError("old_text not found in file");
  }
  if (count > 1) {
    return formatError(
      `old_text appears ${count} times (must be exactly 1). Provide a larger unique snippet.`,
    );
  }
  const updated = content.replace(oldText, newText);
  await Deno.writeTextFile(resolved.path, updated);
  return `Edited ${
    toRelativePath(resolved.path)
  } (${updated.length} bytes written)`;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

function formatError(msg: string): string {
  return `Error: ${msg}`;
}

async function dispatch(
  req: SandboxRequest,
): Promise<SandboxResponse> {
  try {
    let result: string;
    switch (req.op) {
      case "read":
        result = await handleRead(req.args);
        break;
      case "write":
        result = await handleWrite(req.args);
        break;
      case "list":
        result = await handleList(req.args);
        break;
      case "search":
        result = await handleSearch(req.args);
        break;
      case "edit":
        result = await handleEdit(req.args);
        break;
      default:
        return { id: req.id, ok: false, error: `Unknown operation: ${req.op}` };
    }
    const isError = result.startsWith("Error: ");
    return isError
      ? { id: req.id, ok: false, error: result }
      : { id: req.id, ok: true, result };
  } catch (err) {
    if (err instanceof Deno.errors.PermissionDenied) {
      return {
        id: req.id,
        ok: false,
        error: `Permission denied: ${err.message}`,
      };
    }
    return {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Worker scope (typed for compile-time checking) ─────────────────────────

// This file runs exclusively as a Deno Worker. The `self` global is typed as
// Window in the main-thread context checked by `deno compile`, so we cast to
// the Worker-specific interface once here.
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(data: unknown): void;
};

// ─── Message handler ────────────────────────────────────────────────────────

workerScope.onmessage = async (event: MessageEvent) => {
  const data = event.data;

  // Initialization message — sets workspace root (once only)
  if (data?.type === "init") {
    if (!workspaceRoot) {
      if (
        typeof data.workspacePath !== "string" ||
        data.workspacePath.length === 0
      ) {
        workerScope.postMessage({
          id: "unknown",
          ok: false,
          error:
            "Sandbox init failed: workspacePath must be a non-empty string",
        });
        return;
      }
      workspaceRoot = data.workspacePath;
    }
    workerScope.postMessage({ type: "ready" });
    return;
  }

  // Reject requests before initialization
  if (!workspaceRoot) {
    workerScope.postMessage({
      id: data?.id ?? "unknown",
      ok: false,
      error: "Sandbox worker not initialized (missing init message)",
    });
    return;
  }

  const req = data as SandboxRequest;
  const resp = await dispatch(req);
  workerScope.postMessage(resp);
};
