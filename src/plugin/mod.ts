/**
 * Plugin SDK & Sandbox module.
 *
 * Provides sandboxed execution environments for plugins and a
 * permission-aware SDK for data access and emission.
 *
 * Includes Pyodide WASM support for Python plugin execution.
 *
 * @module
 */

export { createSandbox } from "./sandbox.ts";
export type {
  Sandbox,
  SandboxConfig,
  SandboxDnsChecker,
} from "./sandbox.ts";

export { createPythonSandbox } from "./python_sandbox.ts";
export type {
  PyodideInstance,
  PyodideLoader,
  PythonSandbox,
  PythonSandboxConfig,
} from "./python_sandbox.ts";

export { createPluginSdk } from "./sdk.ts";
export type {
  EmitDataPayload,
  PluginCapability,
  PluginSdk,
  PluginSdkConfig,
  QueryHandler,
  QueryResult,
} from "./sdk.ts";
