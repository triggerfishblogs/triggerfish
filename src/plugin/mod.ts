/**
 * Plugin SDK & Sandbox module.
 *
 * Provides sandboxed execution environments for plugins and a
 * permission-aware SDK for data access and emission.
 *
 * @module
 */

export { createSandbox } from "./sandbox.ts";
export type { Sandbox, SandboxConfig } from "./sandbox.ts";

export { createPluginSdk } from "./sdk.ts";
export type { EmitDataPayload, PluginSdk, PluginSdkConfig, QueryResult } from "./sdk.ts";
