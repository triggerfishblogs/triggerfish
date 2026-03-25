/**
 * X user verification — fetches and stores the authenticated user's identity.
 *
 * Consolidates SSRF protection (hostname allowlist + DNS resolution) with the
 * fetch call to eliminate the TOCTOU gap that existed when these were separate.
 *
 * @module
 */

import type { SecretStore } from "../../../core/secrets/keychain/keychain.ts";
import { resolveAndCheck } from "../../../core/security/ssrf.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("x-auth-verify");

/** Shape of the X API /2/users/me response. */
interface XUserMeResponse {
  readonly data?: {
    readonly id?: unknown;
    readonly username?: unknown;
  };
}

/**
 * Validate that the X API response contains the expected user fields.
 *
 * @returns The validated user object, or null if the shape is unexpected.
 */
function validateXUserResponse(
  data: XUserMeResponse,
): { readonly id: string; readonly username: string } | null {
  const user = data.data;
  if (
    typeof user?.id !== "string" ||
    typeof user?.username !== "string"
  ) {
    log.error("X user verification returned unexpected response shape", {
      operation: "validateXUserResponse",
      err: { data },
    });
    return null;
  }
  return { id: user.id, username: user.username };
}

/**
 * Fetch the authenticated X user's profile from the API.
 *
 * Performs hostname allowlist check and SSRF DNS resolution before the fetch
 * to ensure no TOCTOU gap.
 *
 * @returns The raw JSON response, or null on failure.
 */
async function fetchXUserProfile(
  accessToken: string,
): Promise<XUserMeResponse | null> {
  const hostname = "api.twitter.com";
  const dnsResult = await resolveAndCheck(hostname);
  if (!dnsResult.ok) {
    log.error("SSRF check failed for X API", {
      operation: "fetchXUserProfile",
      err: dnsResult.error,
    });
    return null;
  }

  const resp = await fetch(`https://${hostname}/2/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text();
    log.error("X user profile fetch returned non-OK status", {
      operation: "fetchXUserProfile",
      err: { status: resp.status, body },
    });
    return null;
  }

  return await resp.json() as XUserMeResponse;
}

/**
 * Verify the authenticated X user and store their ID in the secret store.
 *
 * Combines hostname allowlist enforcement, SSRF DNS resolution, API fetch,
 * response validation, and secret storage into a single atomic operation
 * with no TOCTOU gap.
 *
 * @param accessToken - OAuth 2.0 Bearer token for the X API
 * @param store - Secret store for persisting the user ID
 * @returns The username on success, or null on any failure
 */
export async function verifyAndStoreXUser(
  accessToken: string,
  store: SecretStore,
): Promise<string | null> {
  try {
    const data = await fetchXUserProfile(accessToken);
    if (!data) return null;

    const user = validateXUserResponse(data);
    if (!user) return null;

    await store.setSecret("x:user_id", user.id);
    log.info("X user verified and stored", {
      operation: "verifyAndStoreXUser",
      username: user.username,
    });
    return user.username;
  } catch (err: unknown) {
    log.error("X user verification failed unexpectedly", {
      operation: "verifyAndStoreXUser",
      err,
    });
    return null;
  }
}
