/**
 * Configuration hot-reload via filesystem watching.
 *
 * Watches a config file (e.g. triggerfish.yaml) for changes and
 * invokes registered callbacks when the file is modified.
 * Uses Deno.watchFs() for efficient filesystem event monitoring.
 *
 * @module
 */

import { parse as parseYaml } from "@std/yaml";

/** Callback invoked when configuration changes. */
export type ConfigChangeCallback = (config: Record<string, unknown>) => void;

/** Configuration watcher interface. */
export interface ConfigWatcher {
  /** Start watching the config file. */
  start(): void;
  /** Stop watching. */
  stop(): void;
  /** Register a callback for config changes. Returns unsubscribe function. */
  onChange(callback: ConfigChangeCallback): () => void;
  /** Get the last loaded config, or undefined if not yet loaded. */
  getConfig(): Record<string, unknown> | undefined;
}

/**
 * Create a config file watcher.
 *
 * Watches the specified file path and re-parses it as YAML on modify events.
 * Registered callbacks are invoked with the parsed config object.
 * Includes a debounce to avoid rapid successive reloads.
 *
 * @param filePath - Path to the YAML config file
 * @param debounceMs - Debounce interval in ms. Default: 500
 * @returns A ConfigWatcher instance
 */
export function createConfigWatcher(
  filePath: string,
  debounceMs = 500,
): ConfigWatcher {
  const callbacks = new Set<ConfigChangeCallback>();
  let watcher: Deno.FsWatcher | undefined;
  let currentConfig: Record<string, unknown> | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let aborted = false;

  async function loadConfig(): Promise<Record<string, unknown> | undefined> {
    try {
      const content = await Deno.readTextFile(filePath);
      const parsed = parseYaml(content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  function notifyCallbacks(config: Record<string, unknown>): void {
    for (const cb of callbacks) {
      try {
        cb(config);
      } catch {
        // Callback errors should not break the watcher
      }
    }
  }

  async function handleChange(): Promise<void> {
    const config = await loadConfig();
    if (config) {
      currentConfig = config;
      notifyCallbacks(config);
    }
  }

  async function watchLoop(): Promise<void> {
    if (!watcher) return;
    try {
      for await (const event of watcher) {
        if (aborted) break;
        if (event.kind === "modify") {
          // Debounce rapid modifications (editors may do multiple writes)
          if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            handleChange();
          }, debounceMs);
        }
      }
    } catch {
      // Watcher closed or error — stop gracefully
    }
  }

  return {
    start(): void {
      if (watcher) return;
      aborted = false;

      // Load initial config synchronously before starting watch
      loadConfig().then((config) => {
        if (config) {
          currentConfig = config;
        }
      });

      try {
        watcher = Deno.watchFs(filePath);
        watchLoop();
      } catch {
        // File may not exist yet — that's OK
      }
    },

    stop(): void {
      aborted = true;
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
      if (watcher) {
        try {
          watcher.close();
        } catch {
          // already closed
        }
        watcher = undefined;
      }
    },

    onChange(callback: ConfigChangeCallback): () => void {
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
      };
    },

    getConfig(): Record<string, unknown> | undefined {
      return currentConfig;
    },
  };
}
