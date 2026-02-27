/**
 * Gateway-level re-exports for skill registry and loader.
 *
 * Bridges CLI commands to the tools/skills module without violating
 * the dependency layer rules (cli/ cannot import from tools/ directly,
 * but cli/ can import from gateway/, and gateway/ can import from tools/).
 *
 * @module
 */

export { createReefRegistry } from "../tools/skills/registry.ts";
export type { ReefSkillListing } from "../tools/skills/registry.ts";

export { createSkillLoader } from "../tools/skills/loader.ts";
export type { SkillLoaderOptions } from "../tools/skills/loader.ts";
