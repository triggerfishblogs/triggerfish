/**
 * System Info — reference plugin for the dynamic plugin loader.
 *
 * Provides two tools:
 * - `system_info`: OS, hostname, runtime version, memory usage
 * - `system_time`: Current time with optional timezone parameter
 *
 * Declares `trust: "trusted"` because `Deno.hostname()` and
 * `Deno.memoryUsage()` require system-level access.
 *
 * Classification: PUBLIC (no sensitive data).
 *
 * @module
 */

import type { PluginContext } from "../../../src/plugin/types.ts";

/** Plugin manifest declaring identity and security properties. */
export const manifest = {
  name: "system-info",
  version: "0.1.0",
  description: "System information and time tools",
  classification: "PUBLIC" as const,
  trust: "trusted" as const,
  declaredEndpoints: [],
};

/** Tool definitions for the system-info plugin. */
export const toolDefinitions = [
  {
    name: "system_info",
    description:
      "Returns system information: OS, hostname, Deno runtime version, and memory usage.",
    parameters: {},
  },
  {
    name: "system_time",
    description:
      "Returns the current date and time, optionally in a specific timezone.",
    parameters: {
      timezone: {
        type: "string",
        description:
          'IANA timezone name (e.g. "America/New_York"). Defaults to the system timezone.',
        required: false,
      },
    },
  },
];

/** Optional system prompt providing usage guidance. */
export const systemPrompt =
  "## System Info Plugin\nUse `system_info` for OS/runtime details and `system_time` for the current time.";

/** Collect system information using Deno APIs. */
function collectSystemInfo(): Record<string, unknown> {
  const mem = Deno.memoryUsage();
  return {
    os: Deno.build.os,
    arch: Deno.build.arch,
    hostname: globalThis.Deno?.hostname?.() ?? "unknown",
    denoVersion: Deno.version.deno,
    v8Version: Deno.version.v8,
    typescriptVersion: Deno.version.typescript,
    memoryRss: mem.rss,
    memoryHeapUsed: mem.heapUsed,
    memoryHeapTotal: mem.heapTotal,
  };
}

/** Format current time with optional timezone. */
function formatCurrentTime(timezone?: string): Record<string, unknown> {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: timezone,
  };
  try {
    const formatted = new Intl.DateTimeFormat("en-US", options).format(now);
    return {
      iso: now.toISOString(),
      formatted,
      timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      epochMs: now.getTime(),
    };
  } catch {
    return {
      iso: now.toISOString(),
      error: `Invalid timezone: ${timezone}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      epochMs: now.getTime(),
    };
  }
}

/** Create the plugin's tool executor. */
export function createExecutor(
  context: PluginContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "system_info": {
        context.log.debug("Collecting system info");
        const info = collectSystemInfo();
        return JSON.stringify(info, null, 2);
      }
      case "system_time": {
        const tz = typeof input.timezone === "string"
          ? input.timezone
          : undefined;
        context.log.debug("Getting system time", { timezone: tz });
        const time = formatCurrentTime(tz);
        return JSON.stringify(time, null, 2);
      }
      default:
        return null;
    }
  };
}
