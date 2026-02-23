/**
 * Path jail utilities — enforce filesystem containment boundaries.
 *
 * Fixes the startsWith prefix-ambiguity bug present in both workspace.ts and
 * filesystem/server.ts: `path.startsWith("/jail/foo")` incorrectly accepts
 * "/jail/foomalicious". The separator-aware check ensures only true path
 * descendants are accepted.
 *
 * @module
 */

import { resolve } from "@std/path";
import type { Result } from "../types/classification.ts";

/**
 * Check whether resolvedPath is strictly within jailDir.
 *
 * Prevents prefix-ambiguity: "/workspaces/foomalicious" passes a naive
 * `startsWith("/workspaces/foo")` check but is NOT within that jail.
 * This function requires a path separator after the jail root or an exact match.
 *
 * @example
 * isWithinJail("/jail/child", "/jail")      → true
 * isWithinJail("/jail",       "/jail")      → true
 * isWithinJail("/jailbreak",  "/jail")      → false
 * isWithinJail("/other/path", "/jail")      → false
 */
export function isWithinJail(resolvedPath: string, jailDir: string): boolean {
  return resolvedPath === jailDir || resolvedPath.startsWith(jailDir + "/");
}

/**
 * Resolve a user-supplied relative path against base and assert it stays within jailDir.
 *
 * Handles `../` traversal and absolute path injection — both produce a resolved
 * path outside the jail, which is rejected.
 *
 * @param base     - Absolute base directory for resolution
 * @param relative - User-supplied path segment (may contain ../)
 * @param jailDir  - Absolute jail root (defaults to base)
 */
export function resolveWithinJail(
  base: string,
  relative: string,
  jailDir?: string,
): Result<string, string> {
  const jail = jailDir ?? base;
  const resolved = resolve(base, relative);
  if (!isWithinJail(resolved, jail)) {
    return {
      ok: false,
      error: `Path traversal blocked: "${relative}" escapes jail "${jail}"`,
    };
  }
  return { ok: true, value: resolved };
}
