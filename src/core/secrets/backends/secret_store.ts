/**
 * Secret storage interface.
 *
 * Defines the contract all secret backends must implement.
 * Methods return Result types rather than throwing exceptions.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";

/** Service name used for all keychain entries. */
export const SECRET_SERVICE_NAME = "triggerfish";

/**
 * Controls how file permission violations are handled.
 *
 * - `"warn"`: Log a warning and continue operating (default).
 * - `"error"`: Return an error, refuse to operate with overly permissive files.
 * - `"ignore"`: Silent operation (for container/CI environments).
 */
export type PermissionStrictness = "warn" | "error" | "ignore";

/**
 * Read the permission strictness setting from the environment or an explicit value.
 *
 * Checks `TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS` for one of
 * `"warn"`, `"error"`, or `"ignore"`. Defaults to `"warn"`.
 */
export function resolvePermissionStrictness(
  explicit?: PermissionStrictness,
): PermissionStrictness {
  if (explicit !== undefined) return explicit;
  const env = Deno.env.get("TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS");
  if (env === "error" || env === "ignore" || env === "warn") return env;
  return "warn";
}

/**
 * Interface for secret storage backends.
 *
 * All implementations store secrets under the "triggerfish" service name.
 * Methods return Result types rather than throwing exceptions.
 */
export interface SecretStore {
  /**
   * Retrieve a secret by name.
   *
   * @param name - The secret key/attribute name
   * @returns The secret value, or an error if not found
   */
  readonly getSecret: (name: string) => Promise<Result<string, string>>;

  /**
   * Store a secret with the given name and value.
   *
   * @param name - The secret key/attribute name
   * @param value - The secret value to store
   * @returns true on success, or an error message
   */
  readonly setSecret: (
    name: string,
    value: string,
  ) => Promise<Result<true, string>>;

  /**
   * Delete a secret by name.
   *
   * @param name - The secret key/attribute name
   * @returns true on success, or an error if the secret does not exist
   */
  readonly deleteSecret: (name: string) => Promise<Result<true, string>>;

  /**
   * List all secret names stored under the triggerfish service.
   *
   * @returns Array of secret names, or an error message
   */
  readonly listSecrets: () => Promise<Result<string[], string>>;
}
