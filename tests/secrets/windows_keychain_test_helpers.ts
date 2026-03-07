/**
 * @module
 * Shared test helpers for Windows DPAPI keychain tests.
 *
 * Provides mock DPAPI infrastructure (base64 encode/decode as
 * stand-ins for real DPAPI encryption) and an in-memory secret
 * store builder used across the split test files.
 */

// --- DPAPI secrets file format helpers (mirrors windows_keychain.ts internals) ---

export interface DpapiSecretsFile {
  readonly v: 1;
  readonly entries: Record<string, string>;
}

// --- Mock infrastructure ---

/** Simulated DPAPI: base64-encode to "protect", decode to "unprotect". */
export function mockProtect(plaintext: string): string {
  return btoa(plaintext);
}

export function mockUnprotect(base64: string): string {
  return atob(base64);
}

/**
 * Build an in-memory DPAPI-like secret store for testing.
 *
 * Uses base64 encoding as a stand-in for DPAPI encryption,
 * and an in-memory map instead of a JSON file on disk.
 */
export function createMockDpapiStore(): {
  readonly store: import("../../src/core/secrets/backends/secret_store.ts").SecretStore;
  readonly entries: Map<string, string>;
} {
  const entries = new Map<string, string>();

  const store: import("../../src/core/secrets/backends/secret_store.ts").SecretStore =
    {
      getSecret(
        name: string,
      ): Promise<
        import("../../src/core/types/classification.ts").Result<string, string>
      > {
        const entry = entries.get(name);
        if (entry === undefined) {
          return Promise.resolve({
            ok: false as const,
            error: `Secret '${name}' not found in DPAPI store`,
          });
        }
        return Promise.resolve({ ok: true as const, value: mockUnprotect(entry) });
      },

      setSecret(
        name: string,
        value: string,
      ): Promise<
        import("../../src/core/types/classification.ts").Result<true, string>
      > {
        entries.set(name, mockProtect(value));
        return Promise.resolve({ ok: true as const, value: true as const });
      },

      deleteSecret(
        name: string,
      ): Promise<
        import("../../src/core/types/classification.ts").Result<true, string>
      > {
        if (!entries.has(name)) {
          return Promise.resolve({
            ok: false as const,
            error: `Secret '${name}' not found in DPAPI store`,
          });
        }
        entries.delete(name);
        return Promise.resolve({ ok: true as const, value: true as const });
      },

      listSecrets(): Promise<
        import("../../src/core/types/classification.ts").Result<string[], string>
      > {
        return Promise.resolve({ ok: true as const, value: [...entries.keys()] });
      },
    };

  return { store, entries };
}
