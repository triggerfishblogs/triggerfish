/**
 * Config RPC handler for the settings screen.
 *
 * Wraps config YAML read/write operations for Tidepool.
 *
 * @module
 */

import type { SettingsSection } from "../screens/settings.ts";

/** Section-to-config-key mapping. */
const SECTION_KEYS: Record<SettingsSection, string | string[]> = {
  general: ["logging", "mcp_servers"],
  providers: "models",
  channels: "channels",
  classification: ["classification", "secrets", "filesystem", "tools"],
  scheduler: "scheduler",
  integrations: ["web", "github", "google", "notion", "caldav", "plugins"],
  advanced: "_raw",
};

/** Config validation result. */
export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ConfigFieldError[];
}

/** Per-field validation error. */
export interface ConfigFieldError {
  readonly field: string;
  readonly message: string;
}

/** Tidepool config handler interface. */
export interface TidepoolConfigHandler {
  /** Get the full configuration as a record. */
  readonly getConfig: () => Promise<Record<string, unknown>>;
  /** Get a specific section. */
  readonly getSection: (
    section: SettingsSection,
  ) => Promise<Record<string, unknown>>;
  /** Update a section with new values. */
  readonly updateSection: (
    section: SettingsSection,
    values: Record<string, unknown>,
  ) => Promise<ConfigValidationResult>;
  /** Set a secret value (stored securely, not in YAML). */
  readonly setSecret: (
    key: string,
    value: string,
  ) => Promise<boolean>;
  /** Validate a section's values without saving. */
  readonly validateSection: (
    section: SettingsSection,
    values: Record<string, unknown>,
  ) => Promise<ConfigValidationResult>;
}

/**
 * Create a read-only config handler backed by an in-memory config object.
 *
 * The config parameter is the parsed TriggerFishConfig. Updates are not
 * yet supported — sections are served read-only from the snapshot.
 */
export function createTidepoolConfigHandler(
  config: Record<string, unknown>,
): TidepoolConfigHandler {
  return {
    // deno-lint-ignore require-await
    async getConfig(): Promise<Record<string, unknown>> {
      return maskSecrets(config);
    },

    // deno-lint-ignore require-await
    async getSection(
      section: SettingsSection,
    ): Promise<Record<string, unknown>> {
      const keys = SECTION_KEYS[section];
      if (keys === "_raw") {
        return maskSecrets(config);
      }
      if (Array.isArray(keys)) {
        return maskSecrets(gatherMultipleKeys(config, keys));
      }
      const value = (config as Record<string, unknown>)[keys];
      return maskSecrets(
        (value as Record<string, unknown>) ?? {},
      );
    },

    // deno-lint-ignore require-await
    async updateSection(
      _section: SettingsSection,
      _values: Record<string, unknown>,
    ): Promise<ConfigValidationResult> {
      return {
        valid: false,
        errors: [
          { field: "_", message: "Config updates not yet supported via Tidepool" },
        ],
      };
    },

    // deno-lint-ignore require-await
    async setSecret(
      _key: string,
      _value: string,
    ): Promise<boolean> {
      return false;
    },

    // deno-lint-ignore require-await
    async validateSection(
      _section: SettingsSection,
      _values: Record<string, unknown>,
    ): Promise<ConfigValidationResult> {
      return { valid: true, errors: [] };
    },
  };
}

/** Gather values from multiple top-level keys into one object. */
function gatherMultipleKeys(
  config: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const value = (config as Record<string, unknown>)[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/** Mask API key values in a config object (shallow clone). */
function maskSecrets(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      k.toLowerCase().includes("apikey") ||
      k.toLowerCase().includes("api_key") ||
      k.toLowerCase().includes("token") ||
      k.toLowerCase().includes("secret") ||
      k.toLowerCase().includes("password")
    ) {
      result[k] = typeof v === "string" && v.length > 0
        ? "••••••••"
        : v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      result[k] = maskSecrets(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}
