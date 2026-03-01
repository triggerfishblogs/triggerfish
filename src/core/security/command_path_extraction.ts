/**
 * Shell command path extraction and classification.
 *
 * Parses file/directory paths from opaque shell command strings so that
 * `run_command` can participate in resource classification, taint
 * escalation, and write-down prevention.
 *
 * @module
 */

import { resolve } from "@std/path";
import type { ClassificationLevel } from "../types/classification.ts";
import { maxClassification } from "../types/classification.ts";
import type { PathClassifier } from "./path_classification.ts";
import { expandTilde } from "./path_classification.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Result of classifying paths extracted from a shell command. */
export interface CommandClassificationResult {
  readonly classification: ClassificationLevel;
  readonly resolvedPaths: readonly string[];
}

// ─── Shell operator splitting ────────────────────────────────────────────────

/**
 * Split a command string on shell operators (`|`, `;`, `&&`, `||`),
 * respecting single and double quoted regions.
 */
function splitOnShellOperators(command: string): readonly string[] {
  const segments: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < command.length) {
    const ch = command[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      i++;
      continue;
    }
    if (ch === "\\" && !inSingle && i + 1 < command.length) {
      current += ch + command[i + 1];
      i += 2;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (isTwoCharOperator(command, i)) {
        segments.push(current);
        current = "";
        i += 2;
        continue;
      }
      if (isSingleCharOperator(ch)) {
        segments.push(current);
        current = "";
        i++;
        continue;
      }
    }

    current += ch;
    i++;
  }

  segments.push(current);
  return segments;
}

/** Check for `&&` or `||` at position i. */
function isTwoCharOperator(command: string, i: number): boolean {
  const pair = command.slice(i, i + 2);
  return pair === "&&" || pair === "||";
}

/** Check for `|` or `;` (single-char operators). */
function isSingleCharOperator(ch: string): boolean {
  return ch === "|" || ch === ";";
}

// ─── Token-level parsing ─────────────────────────────────────────────────────

/** Redirect operator prefixes that indicate the next token is a file path. */
const REDIRECT_OPERATORS: ReadonlySet<string> = new Set([
  ">",
  ">>",
  "<",
  "2>",
  "2>>",
  "&>",
]);

/**
 * Tokenize a subcommand on whitespace, respecting single/double quotes
 * and backslash escapes. Strips surrounding quotes from tokens.
 */
function tokenizeRespectingQuotes(segment: string): readonly string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < segment.length) {
    const ch = segment[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      i++;
      continue;
    }
    if (ch === "\\" && !inSingle && i + 1 < segment.length) {
      current += segment[i + 1];
      i += 2;
      continue;
    }

    if (!inSingle && !inDouble && isWhitespace(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/** Whitespace test for ASCII space and tab. */
function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t";
}

// ─── Path detection ──────────────────────────────────────────────────────────

/** Windows drive letter prefix pattern: `C:\`, `D:/`, etc. */
const WINDOWS_DRIVE_RE = /^[A-Za-z]:[/\\]/;

/**
 * Determine whether a token looks like a filesystem path.
 *
 * YES:
 * - Starts with `/` (absolute Unix)
 * - Starts with `./`, `../`, or `~`
 * - Starts with a Windows drive letter (`C:\`, `D:/`)
 * - Contains `/` or `\`, does not start with `-`, does not contain `://`
 *
 * NO:
 * - Starts with `-` (flags)
 * - Contains `://` (URLs)
 * - Pure word with no path separators
 */
function isPathLikeToken(token: string): boolean {
  if (token.length === 0) return false;
  if (token.startsWith("-")) return false;
  if (token.includes("://")) return false;
  if (token.startsWith("/")) return true;
  if (token.startsWith("./") || token.startsWith("../")) return true;
  if (token === "~" || token.startsWith("~/") || token.startsWith("~\\")) {
    return true;
  }
  if (WINDOWS_DRIVE_RE.test(token)) return true;
  if (
    (token.includes("/") || token.includes("\\")) && !token.startsWith("-")
  ) {
    return true;
  }
  return false;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract filesystem paths from a shell command string.
 *
 * Splits on shell operators, tokenizes each subcommand respecting quotes,
 * identifies redirect targets and path-like tokens, and returns a
 * deduplicated list.
 */
export function extractCommandPaths(command: string): readonly string[] {
  const segments = splitOnShellOperators(command);
  const paths = new Set<string>();

  for (const segment of segments) {
    const tokens = tokenizeRespectingQuotes(segment);
    collectPathsFromTokens(tokens, paths);
  }

  return [...paths];
}

/** Walk tokens, marking redirect targets and filtering path-like tokens. */
function collectPathsFromTokens(
  tokens: readonly string[],
  paths: Set<string>,
): void {
  let expectRedirectTarget = false;

  for (const token of tokens) {
    if (expectRedirectTarget) {
      paths.add(token);
      expectRedirectTarget = false;
      continue;
    }
    if (REDIRECT_OPERATORS.has(token)) {
      expectRedirectTarget = true;
      continue;
    }
    // Handle attached redirect: `>output.txt` or `2>/dev/null`
    const attached = extractAttachedRedirectTarget(token);
    if (attached !== null) {
      paths.add(attached);
      continue;
    }
    if (isPathLikeToken(token)) {
      paths.add(token);
    }
  }
}

/** Extract a path from a token like `>output.txt` or `2>/dev/null`. */
function extractAttachedRedirectTarget(token: string): string | null {
  for (const op of REDIRECT_OPERATORS) {
    if (token.startsWith(op) && token.length > op.length) {
      return token.slice(op.length);
    }
  }
  return null;
}

/**
 * Classify paths extracted from a shell command.
 *
 * Resolves each path (expanding `~` and resolving relative paths against
 * `workspaceCwd`), classifies via the provided `PathClassifier`, and
 * returns the highest classification found.
 */
export function classifyCommandPaths(opts: {
  readonly paths: readonly string[];
  readonly classifier: PathClassifier;
  readonly workspaceCwd: string;
}): CommandClassificationResult {
  const { paths, classifier, workspaceCwd } = opts;
  let highest: ClassificationLevel = "PUBLIC";
  const resolvedPaths: string[] = [];

  for (const raw of paths) {
    const expanded = expandTilde(raw);
    const absolute = expanded.startsWith("/")
      ? expanded
      : resolve(workspaceCwd, expanded);
    resolvedPaths.push(absolute);
    const result = classifier.classify(absolute);
    highest = maxClassification(highest, result.classification);
  }

  return { classification: highest, resolvedPaths };
}
