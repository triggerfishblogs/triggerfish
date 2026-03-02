/**
 * CalDAV credential resolution from OS keychain.
 *
 * Resolves CalDAV passwords and tokens via the SecretStore.
 * Returns `Result` with setup instructions on failure.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";
import type { CalDavConfig, CalDavCredentials } from "./types.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("caldav:auth");

/** Options for resolving CalDAV credentials. */
export interface ResolveCalDavCredentialsOptions {
  readonly secretStore: SecretStore;
  readonly config: CalDavConfig;
}

/**
 * Resolve CalDAV credentials from the OS keychain.
 *
 * Looks up the secret key specified by `config.credential_ref` (default: "caldav-password").
 * Returns the username from config and the password from the keychain.
 */
export async function resolveCalDavCredentials(
  options: ResolveCalDavCredentialsOptions,
): Promise<Result<CalDavCredentials, string>> {
  const { secretStore, config } = options;
  const secretKey = config.credential_ref ?? "caldav-password";
  const username = config.username;

  if (!username) {
    log.warn("CalDAV credential resolution failed: missing username", {
      operation: "resolveCalDavCredentials",
    });
    return {
      ok: false,
      error:
        "CalDAV username not configured. Add 'username' to your caldav config:\n" +
        "  integrations:\n" +
        "    caldav:\n" +
        "      username: user@example.com",
    };
  }

  const keychainResult = await secretStore.getSecret(secretKey);
  if (keychainResult.ok) {
    log.info("CalDAV credentials resolved from keychain", {
      operation: "resolveCalDavCredentials",
      username,
    });
    return {
      ok: true,
      value: { method: "basic", username, password: keychainResult.value },
    };
  }

  log.warn("CalDAV credential resolution failed: secret not found", {
    operation: "resolveCalDavCredentials",
    secretKey,
  });
  return {
    ok: false,
    error:
      `CalDAV password not found in keychain (key: "${secretKey}"). Run:\n` +
      "  triggerfish connect caldav",
  };
}

/**
 * Build HTTP Authorization headers from CalDAV credentials.
 *
 * Returns `{ Authorization: "Basic ..." }` for basic auth,
 * or `{ Authorization: "Bearer ..." }` for OAuth2.
 */
export function buildAuthHeaders(
  credentials: CalDavCredentials,
): Readonly<Record<string, string>> {
  switch (credentials.method) {
    case "basic": {
      const encoded = btoa(`${credentials.username}:${credentials.password}`);
      return { Authorization: `Basic ${encoded}` };
    }
    case "oauth2":
      return { Authorization: `Bearer ${credentials.accessToken}` };
  }
}
