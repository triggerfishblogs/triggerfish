/**
 * Python plugin sandbox via Pyodide WASM.
 *
 * Provides a Python execution environment with a triggerfish SDK bridge
 * available as `import triggerfish`. Classification enforcement is applied
 * to all data operations through the SDK.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { PluginSdk } from "./sdk.ts";
import type { Sandbox, SandboxConfig } from "./sandbox.ts";
import { createSandbox } from "./sandbox.ts";

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
