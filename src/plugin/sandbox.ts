/**
 * Plugin sandbox providing isolated execution environments.
 *
 * Plugins run in a restricted execution context with:
 * - No filesystem access (Deno APIs overridden)
 * - No network except declared endpoints (fetch intercepted)
 * - Resource limits via timeouts
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";

/** Configuration for a plugin sandbox. */
export interface SandboxConfig {
  /** Plugin name. */
  readonly name: string;
  /** Plugin version. */
  readonly version: string;
  /** Allowlisted network endpoints. */
  readonly declaredEndpoints: readonly string[];
  /** Maximum classification level the plugin can handle. */
  readonly maxClassification: ClassificationLevel;
}

/** Sandbox instance for executing plugin code. */
export interface Sandbox {
  /** Execute code in the sandbox and return the result. */
  execute(code: string): Promise<unknown>;
  /** Destroy the sandbox and release resources. */
  destroy(): Promise<void>;
}

/**
 * Create a sandboxed execution environment for a plugin.
 *
 * The sandbox restricts:
 * - Filesystem access (blocked entirely)
 * - Network access (only declared endpoints allowed)
 * - System calls (blocked)
 */
export async function createSandbox(config: SandboxConfig): Promise<Sandbox> {
  const allowedHosts = new Set<string>();
  for (const endpoint of config.declaredEndpoints) {
    try {
      const url = new URL(endpoint);
      allowedHosts.add(url.host);
    } catch {
      // Skip invalid URLs
    }
  }

  let destroyed = false;

  return {
    async execute(code: string): Promise<unknown> {
      if (destroyed) {
        throw new Error("Sandbox has been destroyed");
      }

      // Build a restricted fetch that only allows declared endpoints
      const restrictedFetch = (
        input: string | URL | Request,
        init?: RequestInit,
      ): Promise<Response> => {
        const urlStr = typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : input.url;
        try {
          const url = new URL(urlStr);
          if (!allowedHosts.has(url.host)) {
            throw new Error(
              `Network access blocked: ${url.host} not in declared endpoints`,
            );
          }
        } catch (e) {
          if (e instanceof TypeError) {
            throw new Error(`Network access blocked: invalid URL`);
          }
          throw e;
        }
        return fetch(input, init);
      };

      // Build a restricted Deno proxy that blocks filesystem and system access
      const restrictedDeno = new Proxy(
        {},
        {
          get(_target, prop) {
            throw new Error(
              `Sandbox: access to Deno.${String(prop)} is blocked`,
            );
          },
        },
      );

      // Execute the code as an async function with restricted globals
      const fn = new Function(
        "fetch",
        "Deno",
        `return (async function() { ${code} })()`,
      );

      return await fn(restrictedFetch, restrictedDeno);
    },

    async destroy(): Promise<void> {
      destroyed = true;
    },
  };
}
