/**
 * Domain glob pattern matching — converts domain patterns to RegExp.
 *
 * Supports `*` for single-label wildcards and `*.example.com` for
 * matching any subdomain(s).
 *
 * @module
 */

/**
 * Convert a domain glob pattern to a RegExp.
 *
 * Supports:
 * - `*` matches any single domain label (one or more non-dot chars)
 * - `*.example.com` matches `foo.example.com`, `bar.baz.example.com`
 * - Exact match: `example.com`
 */
export function globToRegex(pattern: string): RegExp {
  // Leading *. means "any subdomain(s) of"
  if (pattern.startsWith("*.")) {
    const rest = pattern.slice(2).replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^(?:[^.]+\\.)*${rest}$`, "i");
  }

  // Escape all regex special chars, then replace unescaped * with [^.]+
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const withWild = escaped.replace(/\*/g, "[^.]+");
  return new RegExp(`^${withWild}$`, "i");
}
