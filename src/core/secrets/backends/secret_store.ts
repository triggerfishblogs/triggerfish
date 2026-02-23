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
