/**
 * Sandboxed filesystem worker — runs inside a restricted Deno subprocess.
 *
 * **IMPORTANT:** This file must be completely self-contained (zero imports)
 * because it is extracted to a temp file at runtime when running from a
 * compiled binary. Any `import` statement would fail since there is no
 * import map or adjacent module available.
 *
 * Spawned with `--allow-read=<workspace> --allow-write=<workspace>`
 * so the kernel blocks any access outside the workspace, regardless
 * of application-level validation bugs.
 *
 * Receives SandboxRequest messages over stdin (NDJSON), dispatches
 * by operation, writes SandboxResponse messages to stdout.
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

const workspaceRoot = Deno.args[0];
if (!workspaceRoot) {
  Deno.stderr.writeSync(
    new TextEncoder().encode(
      "worker: workspace root required as first argument\n",
    ),
  );
  Deno.exit(1);
}

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
  return `Wrote ${info.size} bytes to ${resolved.path}`;
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

  const entries: string[] = [];
  for await (const entry of Deno.readDir(resolved.path)) {
    const suffix = entry.isDirectory ? "/" : "";
    entries.push(`${entry.name}${suffix}`);
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
  return stdout.length > 0
    ? stdout
    : isContentSearch
    ? "No matches found."
    : "No files found matching pattern.";
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
  return `Edited ${resolved.path} (${updated.length} bytes written)`;
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

// ─── Main loop ──────────────────────────────────────────────────────────────

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const reader = Deno.stdin.readable.getReader();
let buffer = "";

async function mainLoop(): Promise<void> {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      let req: SandboxRequest;
      try {
        req = JSON.parse(trimmed) as SandboxRequest;
      } catch {
        const errResp: SandboxResponse = {
          id: "unknown",
          ok: false,
          error: "Invalid JSON request",
        };
        await Deno.stdout.write(
          encoder.encode(JSON.stringify(errResp) + "\n"),
        );
        continue;
      }
      const resp = await dispatch(req);
      await Deno.stdout.write(
        encoder.encode(JSON.stringify(resp) + "\n"),
      );
    }
  }
}

await mainLoop();
