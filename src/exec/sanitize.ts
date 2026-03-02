/**
 * Subprocess environment sanitization for the exec module.
 *
 * Provides safe environment builders and shell injection detection for all
 * Deno.Command usages in the exec module. This is the single source of
 * truth for subprocess PATH safety and env var allowlisting in agent
 * execution.
 *
 * @module
 */

/** Env vars that are safe to inherit from the parent for all subprocesses. */
const BASE_INHERIT_ALLOWLIST: ReadonlySet<string> = new Set([
  "PATH",
  "HOME",
  "USER",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TMPDIR",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "DENO_DIR",
  "DENO_NO_UPDATE_CHECK",
]);

/**
 * Additional env vars needed by the Claude CLI binary.
 * Extends the base allowlist with API authentication vars.
 */
const CLAUDE_INHERIT_ALLOWLIST: ReadonlySet<string> = new Set([
  ...BASE_INHERIT_ALLOWLIST,
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_REGION",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "VERTEX_REGION",
  "VERTEX_PROJECT_ID",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
]);

/** Options for building a safe subprocess environment. */
export interface SafeEnvOptions {
  /** Override HOME in the subprocess environment (e.g. workspace path). */
  readonly workspaceHome?: string;
  /** Additional env vars to merge after allowlist filtering. */
  readonly extraVars?: Record<string, string>;
}

/**
 * Build a sanitized environment for general subprocess execution.
 *
 * Only vars in the base allowlist (PATH, HOME, LANG, etc.) are inherited
 * from the parent. Caller may provide extra vars via options.extraVars.
 * LD_PRELOAD, LD_LIBRARY_PATH, secrets, and all other unlisted vars are
 * never passed to the child process.
 */
export function buildSafeEnv(options?: SafeEnvOptions): Record<string, string> {
  const parent = Deno.env.toObject();
  const env: Record<string, string> = {};

  for (const key of BASE_INHERIT_ALLOWLIST) {
    if (key in parent) env[key] = parent[key];
  }

  if (options?.workspaceHome !== undefined) {
    env["HOME"] = options.workspaceHome;
  }

  if (options?.extraVars) {
    for (const [k, v] of Object.entries(options.extraVars)) {
      env[k] = v;
    }
  }

  return env;
}

/**
 * Build a sanitized environment for spawning the Claude CLI binary.
 *
 * Extends buildSafeEnv with the Claude-specific allowlist (API auth vars).
 * CLAUDECODE is always excluded to avoid the nesting guard in the Claude CLI.
 */
export function buildClaudeEnv(
  options?: SafeEnvOptions,
): Record<string, string> {
  const parent = Deno.env.toObject();
  const env: Record<string, string> = {};

  for (const key of CLAUDE_INHERIT_ALLOWLIST) {
    if (key in parent) env[key] = parent[key];
  }

  if (options?.extraVars) {
    for (const [k, v] of Object.entries(options.extraVars)) {
      env[k] = v;
    }
  }

  // Never pass CLAUDECODE — triggers the nesting guard in Claude CLI.
  delete env["CLAUDECODE"];

  return env;
}

/** Result of a shell injection check. */
export interface InjectionCheckResult {
  /** Whether the command appears safe from the checked patterns. */
  readonly safe: boolean;
  /** Human-readable reason when safe is false. */
  readonly reason?: string;
}

/**
 * Detect obvious shell injection patterns in a command string.
 *
 * Checks for null bytes and embedded newlines — the most reliably
 * detectable injection primitives when commands are passed to sh -c.
 * This is a defence-in-depth layer that complements the denylist in
 * ExecRunner; it does not replace it.
 */
export function detectShellInjection(command: string): InjectionCheckResult {
  if (command.includes("\0")) {
    return { safe: false, reason: "null byte in command" };
  }
  if (command.includes("\n") || command.includes("\r")) {
    return { safe: false, reason: "embedded newline in command" };
  }
  return { safe: true };
}
