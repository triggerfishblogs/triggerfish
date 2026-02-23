/**
 * Obsidian vault integration — filesystem-based note access with classification gating.
 *
 * @module
 */

export type {
  ObsidianVaultConfig,
  DailyNotesConfig,
  ObsidianNote,
  Heading,
  NoteCreateOptions,
  NoteUpdateOptions,
  NoteSearchOptions,
  NoteListOptions,
  DailyNoteOptions,
  WikilinkTarget,
  Backlink,
} from "./types.ts";

export type { VaultContext } from "./vault.ts";
export {
  createVaultContext,
  resolveVaultPath,
  isExcluded,
  getClassificationForPath,
} from "./vault.ts";

export {
  parseFrontmatter,
  serializeFrontmatter,
  mergeFrontmatter,
  extractWikilinks,
  extractTags,
  extractHeadings,
  buildNote,
} from "./markdown.ts";
export type { FrontmatterResult } from "./markdown.ts";

export type { NoteStore } from "./notes/mod.ts";
export { createNoteStore } from "./notes/mod.ts";

export type { DailyNoteManager } from "./daily.ts";
export { createDailyNoteManager } from "./daily.ts";

export type { LinkResolver } from "./links.ts";
export { createLinkResolver } from "./links.ts";

export type { ObsidianToolContext } from "./tools/mod.ts";
export {
  getObsidianToolDefinitions,
  createObsidianToolExecutor,
  OBSIDIAN_SYSTEM_PROMPT,
} from "./tools/mod.ts";
