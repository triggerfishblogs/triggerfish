/**
 * POSIX path utilities for the sandboxed filesystem worker.
 *
 * **Self-contained** — no imports from @std/path or any other module.
 * These are duplicated intentionally so the Worker file can import them
 * without pulling in external dependencies that may not be available
 * in compiled binaries.
 *
 * @module
 */

/** Normalize an absolute POSIX path — resolves `.` and `..` segments. */
export function normalizePosixPath(path: string): string {
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
export function resolvePath(base: string, relative: string): string {
  if (relative.startsWith("/")) return normalizePosixPath(relative);
  return normalizePosixPath(base + "/" + relative);
}

/** Return the parent directory of an absolute path (POSIX only). */
export function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  if (i <= 0) return "/";
  return path.slice(0, i);
}

/** Check if resolved path is within the workspace (separator-aware). */
export function isWithinWorkspace(
  resolvedPath: string,
  workspaceRoot: string,
): boolean {
  return resolvedPath === workspaceRoot ||
    resolvedPath.startsWith(workspaceRoot + "/");
}

/** Resolve and validate a path argument. Returns absolute path or error. */
export function resolveSafePath(
  rawPath: string,
  workspaceRoot: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const abs = resolvePath(workspaceRoot, rawPath);
  if (!isWithinWorkspace(abs, workspaceRoot)) {
    return { ok: false, error: `No such file or directory: ${rawPath}` };
  }
  return { ok: true, path: abs };
}

/** Strip the workspaceRoot prefix from an absolute path, returning a workspace-relative path. */
export function toRelativePath(
  absPath: string,
  workspaceRoot: string,
): string {
  if (absPath.startsWith(workspaceRoot + "/")) {
    return absPath.slice(workspaceRoot.length + 1);
  }
  if (absPath === workspaceRoot) return ".";
  return absPath;
}
