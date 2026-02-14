/**
 * Single source of truth for the Triggerfish version.
 *
 * Reads from deno.json so the version is defined in exactly one place.
 * JSON imports are bundled into `deno compile` output, so this works
 * in both development and compiled binary contexts.
 *
 * @module
 */

import denoConfig from "../deno.json" with { type: "json" };

/** Current Triggerfish version string (e.g. "0.1.27"). */
export const VERSION: string = denoConfig.version;
