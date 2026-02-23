/**
 * Note store — CRUD, query, and vault traversal for Obsidian notes.
 *
 * @module
 */

export type { NoteStore } from "./notes.ts";
export { createNoteStore } from "./notes.ts";

export {
  readNoteFromVault,
  createNoteInVault,
  updateNoteInVault,
  ensureMdExtension,
  applyNoteContentUpdates,
} from "./note_crud.ts";

export {
  searchNotesInVault,
  listNotesInVault,
} from "./note_query.ts";

export { walkNotes } from "./note_walker.ts";
