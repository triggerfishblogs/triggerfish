/**
 * CLI entry point and command router for Triggerfish.
 *
 * Parses command-line arguments, loads configuration from YAML,
 * and validates config structure.
 * @module
 */

import { parse as parseYaml } from "@std/yaml";

/** Known CLI commands. */
const KNOWN_COMMANDS = new Set([
  "run",
  "start",
  "stop",
  "status",
  "logs",
  "config",
  "dive",
  "patrol",
  "update",
  "help",
  "version",
]);

/** Options that influence default command selection. */
export interface ParseOptions {
  readonly configExists?: boolean;
}

/** Result of parsing CLI arguments. */
export interface ParsedCommand {
  readonly command: string;
  readonly subcommand?: string;
  readonly flags: Readonly<Record<string, boolean | string>>;
}

/** Triggerfish YAML configuration shape. */
export interface TriggerFishConfig {
  readonly models: {
    readonly primary: string;
    readonly providers: Readonly<Record<string, { readonly model: string }>>;
  };
  readonly channels: Readonly<Record<string, unknown>>;
  readonly classification: {
    readonly mode: string;
  };
}

/** Success result. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failure result. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union result type. */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Parse CLI arguments into a structured command object.
 *
 * @param args - Raw command-line argument array (without the binary name).
 * @param options - Optional context influencing defaults.
 * @returns Parsed command with optional subcommand and flags.
 */
export function parseCommand(
  args: readonly string[],
  options: ParseOptions = {},
): ParsedCommand {
  const flags: Record<string, boolean | string> = {};

  // Handle special flags first
  if (args.includes("--version")) {
    return { command: "version", flags };
  }

  // Extract flags from args
  const positional: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      flags[key] = true;
    } else {
      positional.push(arg);
    }
  }

  // No positional args
  if (positional.length === 0) {
    const configExists = options.configExists ?? true;
    return { command: configExists ? "help" : "dive", flags };
  }

  const command = positional[0];

  // Unknown command → help
  if (!KNOWN_COMMANDS.has(command)) {
    return { command: "help", flags };
  }

  // Commands with subcommands
  if (command === "config" && positional.length > 1) {
    return { command, subcommand: positional[1], flags };
  }

  return { command, flags };
}

/**
 * Load and parse a triggerfish YAML configuration file.
 *
 * @param path - Absolute path to the YAML file.
 * @returns Result with parsed config or error string.
 */
export function loadConfig(path: string): Result<TriggerFishConfig, string> {
  try {
    const raw = Deno.readTextFileSync(path);
    const parsed = parseYaml(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "Config file did not parse to an object" };
    }

    const validation = validateConfig(parsed as Record<string, unknown>);
    if (!validation.ok) {
      return validation as Err<string>;
    }

    return { ok: true, value: parsed as unknown as TriggerFishConfig };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to load config: ${message}` };
  }
}

/**
 * Validate a parsed config object has all required fields.
 *
 * @param obj - Parsed object to validate.
 * @returns Result indicating validity or the first validation error.
 */
export function validateConfig(
  obj: Record<string, unknown>,
): Result<void, string> {
  // models must exist and have a primary field
  if (typeof obj.models !== "object" || obj.models === null) {
    return { ok: false, error: "Missing required field: models" };
  }

  const models = obj.models as Record<string, unknown>;
  if (typeof models.primary !== "string" || models.primary.length === 0) {
    return { ok: false, error: "Missing required field: models.primary" };
  }

  return { ok: true, value: undefined };
}
