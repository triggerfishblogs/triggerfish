/**
 * Minimal HTTP client for HashiCorp Vault REST API.
 *
 * Targets KV v2 secret engine. No external SDK dependency —
 * uses Deno's built-in `fetch()` for all HTTP communication.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import type {
  KvReadResponse,
  KvWriteResponse,
  TokenInfo,
  VaultClientOptions,
  VaultHealth,
} from "./vault_types.ts";

/** Vault HTTP client interface. */
export interface VaultClient {
  readonly kvRead: (
    mount: string,
    path: string,
  ) => Promise<Result<KvReadResponse, string>>;
  readonly kvPut: (
    mount: string,
    path: string,
    data: Readonly<Record<string, string>>,
  ) => Promise<Result<KvWriteResponse, string>>;
  readonly kvDelete: (
    mount: string,
    path: string,
  ) => Promise<Result<true, string>>;
  readonly kvList: (
    mount: string,
    path: string,
  ) => Promise<Result<string[], string>>;
  readonly healthCheck: () => Promise<Result<VaultHealth, string>>;
  readonly tokenLookupSelf: () => Promise<Result<TokenInfo, string>>;
}

/** Internal helper to build full Vault API URL. */
function buildUrl(address: string, apiPath: string): string {
  const base = address.endsWith("/") ? address.slice(0, -1) : address;
  return `${base}/v1/${apiPath}`;
}

/** Build request headers including token and optional namespace. */
function buildHeaders(
  token: string,
  namespace?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Vault-Token": token,
    "Content-Type": "application/json",
  };
  if (namespace) {
    headers["X-Vault-Namespace"] = namespace;
  }
  return headers;
}

/** Parse a Vault API error response. */
async function parseVaultError(
  response: Response,
  operation: string,
): Promise<string> {
  try {
    const body = await response.json();
    const errors = body.errors as string[] | undefined;
    if (errors && errors.length > 0) {
      return `Vault ${operation} failed (${response.status}): ${errors.join(", ")}`;
    }
  } catch {
    // Response body not JSON
  }
  return `Vault ${operation} failed with status ${response.status}`;
}

/** Token accessor — provides the current token for requests. */
export type TokenAccessor = () => string;

/**
 * Create a Vault HTTP client.
 *
 * The `getToken` accessor is called on each request to support
 * token renewal without recreating the client.
 */
export function createVaultClient(
  options: VaultClientOptions,
  getToken: TokenAccessor,
): VaultClient {
  const { address, namespace, requestTimeoutMs } = options;

  async function vaultFetch(
    apiPath: string,
    fetchOptions: RequestInit,
  ): Promise<Result<Response, string>> {
    const url = buildUrl(address, apiPath);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...buildHeaders(getToken(), namespace),
          ...fetchOptions.headers,
        },
        signal: controller.signal,
      });
      return { ok: true, value: response };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Vault request to ${apiPath} failed: ${message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  const kvRead: VaultClient["kvRead"] = async (mount, path) => {
    const result = await vaultFetch(`${mount}/data/${path}`, {
      method: "GET",
    });
    if (!result.ok) return result;

    const response = result.value;
    if (response.status === 404) {
      return {
        ok: false,
        error: `Secret not found at ${mount}/${path}`,
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: await parseVaultError(response, "kvRead"),
      };
    }

    const body = await response.json();
    const data = body.data as KvReadResponse;
    return { ok: true, value: data };
  };

  const kvPut: VaultClient["kvPut"] = async (mount, path, data) => {
    const result = await vaultFetch(`${mount}/data/${path}`, {
      method: "POST",
      body: JSON.stringify({ data }),
    });
    if (!result.ok) return result;

    const response = result.value;
    if (!response.ok) {
      return {
        ok: false,
        error: await parseVaultError(response, "kvPut"),
      };
    }

    const body = await response.json();
    const metadata = body.data as KvWriteResponse;
    return { ok: true, value: metadata };
  };

  const kvDelete: VaultClient["kvDelete"] = async (mount, path) => {
    const result = await vaultFetch(`${mount}/data/${path}`, {
      method: "DELETE",
    });
    if (!result.ok) return result;

    const response = result.value;
    if (!response.ok) {
      return {
        ok: false,
        error: await parseVaultError(response, "kvDelete"),
      };
    }
    return { ok: true, value: true };
  };

  const kvList: VaultClient["kvList"] = async (mount, path) => {
    const result = await vaultFetch(`${mount}/metadata/${path}`, {
      method: "LIST",
    });
    if (!result.ok) return result;

    const response = result.value;
    if (response.status === 404) {
      return { ok: true, value: [] };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: await parseVaultError(response, "kvList"),
      };
    }

    const body = await response.json();
    const keys = body.data?.keys as string[] ?? [];
    return { ok: true, value: keys };
  };

  const healthCheck: VaultClient["healthCheck"] = async () => {
    const url = buildUrl(address, "sys/health");
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
      const body = await response.json();
      return { ok: true, value: body as VaultHealth };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Vault health check failed: ${message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  const tokenLookupSelf: VaultClient["tokenLookupSelf"] = async () => {
    const result = await vaultFetch("auth/token/lookup-self", {
      method: "GET",
    });
    if (!result.ok) return result;

    const response = result.value;
    if (!response.ok) {
      return {
        ok: false,
        error: await parseVaultError(response, "tokenLookupSelf"),
      };
    }

    const body = await response.json();
    return { ok: true, value: body.data as TokenInfo };
  };

  return { kvRead, kvPut, kvDelete, kvList, healthCheck, tokenLookupSelf };
}
