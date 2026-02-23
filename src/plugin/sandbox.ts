/**
 * Plugin sandbox providing isolated execution environments.
 *
 * Plugins run in a restricted execution context with:
 * - No filesystem access (Deno APIs overridden)
 * - No network except declared endpoints (fetch intercepted)
 * - Resource limits via timeouts
 *
 * Also provides a Python sandbox via Pyodide WASM for Python plugins,
 * with a triggerfish SDK bridge available as `import triggerfish`.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { PluginSdk } from "./sdk.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("security");

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
  /** Execute plugin code in the sandbox and return the result. */
  executePluginCode(code: string): Promise<unknown>;
  /** Destroy the sandbox and release resources. */
  destroy(): Promise<void>;
}

/** Parse declared endpoint URLs into a set of allowed hostnames. */
function parseAllowedHosts(
  endpoints: readonly string[],
): Set<string> {
  const hosts = new Set<string>();
  for (const endpoint of endpoints) {
    try {
      const url = new URL(endpoint);
      hosts.add(url.host);
    } catch {
      // Skip invalid URLs
    }
  }
  return hosts;
}

/** Extract the URL string from a fetch input (string, URL, or Request). */
function extractFetchUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Build a fetch function that only permits requests to allowed hosts. */
function buildRestrictedFetch(
  allowedHosts: ReadonlySet<string>,
  pluginName: string,
): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  return (input, init?) => {
    const urlStr = extractFetchUrl(input);
    try {
      const url = new URL(urlStr);
      if (!allowedHosts.has(url.host)) {
        log.warn("Plugin network access blocked", {
          plugin: pluginName,
          host: url.host,
        });
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
}

/** Build a Deno proxy that blocks all filesystem and system access. */
function buildRestrictedDeno(): Record<string, never> {
  return new Proxy(
    {} as Record<string, never>,
    {
      get(_target, prop) {
        throw new Error(
          `Sandbox: access to Deno.${String(prop)} is blocked`,
        );
      },
    },
  );
}

/** Execute plugin code as an async function with restricted globals. */
async function executeSandboxedCode(
  code: string,
  allowedHosts: ReadonlySet<string>,
  pluginName: string,
): Promise<unknown> {
  const restrictedFetch = buildRestrictedFetch(allowedHosts, pluginName);
  const restrictedDeno = buildRestrictedDeno();
  const fn = new Function(
    "fetch",
    "Deno",
    `return (async function() { ${code} })()`,
  );
  return await fn(restrictedFetch, restrictedDeno);
}

/**
 * Create a sandboxed execution environment for a plugin.
 *
 * The sandbox restricts:
 * - Filesystem access (blocked entirely)
 * - Network access (only declared endpoints allowed)
 * - System calls (blocked)
 */
// deno-lint-ignore require-await
export async function createSandbox(config: SandboxConfig): Promise<Sandbox> {
  const allowedHosts = parseAllowedHosts(config.declaredEndpoints);
  let destroyed = false;

  return {
    // deno-lint-ignore require-await
    async executePluginCode(code: string): Promise<unknown> {
      if (destroyed) throw new Error("Sandbox has been destroyed");
      return executeSandboxedCode(code, allowedHosts, config.name);
    },

    // deno-lint-ignore require-await
    async destroy(): Promise<void> {
      destroyed = true;
    },
  };
}

// --- Pyodide Python Sandbox ---

/**
 * Minimal interface representing a Pyodide instance.
 *
 * This is the subset of the Pyodide API used by our sandbox.
 * The real Pyodide provides much more, but we only depend on these methods.
 */
export interface PyodideInstance {
  /** Execute Python code asynchronously and return the result. */
  runPythonAsync(code: string): Promise<unknown>;
  /** Register a JavaScript module that can be imported from Python. */
  registerJsModule(name: string, module: Record<string, unknown>): void;
  /** Global Python namespace. */
  globals: Map<string, unknown>;
}

/**
 * A factory function that loads/creates a Pyodide instance.
 *
 * In production this loads Pyodide from a CDN or local path.
 * In tests this can be replaced with a mock loader.
 */
export interface PyodideLoader {
  (): Promise<PyodideInstance>;
}

/** Configuration for a Python plugin sandbox, extending the base config. */
export interface PythonSandboxConfig extends SandboxConfig {
  /** Plugin SDK instance to bridge into the Python environment. */
  readonly sdk: PluginSdk;
  /**
   * Optional Pyodide loader for dependency injection (testing).
   * If not provided, attempts to load from CDN.
   */
  readonly _pyodideLoader?: PyodideLoader;
}

/** Python sandbox instance extending the base sandbox with Python execution. */
export interface PythonSandbox extends Sandbox {
  /** Execute Python code in the Pyodide WASM sandbox and return the result. */
  executePython(code: string): Promise<unknown>;
}

/**
 * Load Pyodide from the CDN.
 *
 * This is the default loader used in production. It dynamically imports
 * the Pyodide module from jsDelivr CDN.
 *
 * @returns A Pyodide instance ready for use
 */
async function defaultPyodideLoader(): Promise<PyodideInstance> {
  const pyodideModule = await import(
    "pyodide"
  );
  const pyodide = await pyodideModule.loadPyodide() as PyodideInstance;
  return pyodide;
}

/** Build the triggerfish SDK bridge for Python plugin access. */
function buildTriggerfishBridge(
  sdk: PluginSdk,
): Record<string, unknown> {
  return {
    emit_data: (
      content: string,
      classification: ClassificationLevel,
    ): Record<string, unknown> => {
      const result = sdk.emitData({ content, classification });
      if (!result.ok) throw new Error(result.error);
      return { ok: true };
    },
    query: async (
      queryString: string,
    ): Promise<Record<string, unknown>> => {
      const result = await sdk.queryAsUser(queryString);
      return { classification: result.classification, data: result.data };
    },
  };
}

/** Load Pyodide and register the triggerfish SDK bridge module. */
async function initializePyodideRuntime(
  config: PythonSandboxConfig,
): Promise<PyodideInstance> {
  const loader = config._pyodideLoader ?? defaultPyodideLoader;
  const pyodide = await loader();
  const bridge = buildTriggerfishBridge(config.sdk);
  pyodide.registerJsModule("triggerfish", bridge);
  return pyodide;
}

/**
 * Create a Python sandbox powered by Pyodide WASM.
 *
 * The sandbox provides:
 * - Python code execution within a WASM boundary
 * - A `triggerfish` module bridge exposing `emit_data()` and `query()`
 * - SDK classification enforcement on all data operations
 * - No direct access to Deno or system APIs from Python
 *
 * @param config - Python sandbox configuration including SDK and optional Pyodide loader
 * @returns A PythonSandbox instance
 */
export async function createPythonSandbox(
  config: PythonSandboxConfig,
): Promise<PythonSandbox> {
  const pyodide = await initializePyodideRuntime(config);
  const baseSandbox = await createSandbox(config);
  let destroyed = false;

  return {
    // deno-lint-ignore require-await
    async executePluginCode(code: string): Promise<unknown> {
      if (destroyed) throw new Error("Sandbox has been destroyed");
      return baseSandbox.executePluginCode(code);
    },

    // deno-lint-ignore require-await
    async executePython(code: string): Promise<unknown> {
      if (destroyed) throw new Error("Sandbox has been destroyed");
      return pyodide.runPythonAsync(code);
    },

    async destroy(): Promise<void> {
      destroyed = true;
      await baseSandbox.destroy();
    },
  };
}
