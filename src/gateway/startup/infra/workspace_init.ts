/**
 * Workspace, path classification, and memory system initialization.
 *
 * Creates the main agent workspace, symlinks SPINE.md, builds the
 * filesystem path classifier, and initializes the FTS5 memory store.
 *
 * @module
 */

import { join } from "@std/path";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { createWorkspace } from "../../../exec/workspace.ts";
import { createPathClassifier } from "../../../core/security/path_classification.ts";
import { createSqliteStorage } from "../../../core/storage/sqlite.ts";
import type { createSession } from "../../../core/types/session.ts";
import {
  createFts5SearchProvider,
  createMemoryStore,
  createMemoryToolExecutor,
} from "../../../tools/memory/mod.ts";

/** Create main workspace and symlink SPINE.md into it. */
export async function initializeMainWorkspace(
  baseDir: string,
) {
  const spinePath = join(baseDir, "SPINE.md");
  const mainWorkspace = await createWorkspace({
    agentId: "main-session",
    basePath: join(baseDir, "workspaces"),
  });
  try {
    const workspaceSpine = join(mainWorkspace.path, "SPINE.md");
    try {
      await Deno.remove(workspaceSpine);
    } catch { /* doesn't exist yet */ }
    await Deno.symlink(spinePath, workspaceSpine);
  } catch { /* SPINE.md may not exist yet — not fatal */ }
  return { spinePath, mainWorkspace };
}

/** Build path classifier for a workspace with filesystem security config. */
export function buildMainPathClassifier(
  fsPathMap: Map<string, ClassificationLevel>,
  fsDefault: ClassificationLevel,
  mainWorkspace: Awaited<ReturnType<typeof createWorkspace>>,
) {
  return createPathClassifier(
    { paths: fsPathMap, defaultClassification: fsDefault },
    {
      basePath: mainWorkspace.path,
      publicPath: mainWorkspace.publicPath,
      internalPath: mainWorkspace.internalPath,
      confidentialPath: mainWorkspace.confidentialPath,
      restrictedPath: mainWorkspace.restrictedPath,
    },
  );
}

/** Initialize memory system with FTS5 search. */
export async function initializeMemorySystem(
  dataDir: string,
  storage: ReturnType<typeof createSqliteStorage>,
  session: ReturnType<typeof createSession>,
) {
  const { Database } = await import("@db/sqlite");
  const memoryDb = new Database(join(dataDir, "triggerfish.db"));
  memoryDb.exec("PRAGMA journal_mode=WAL");
  const memorySearchProvider = createFts5SearchProvider(memoryDb);
  const memoryStore = createMemoryStore({
    storage,
    searchProvider: memorySearchProvider,
  });
  const memoryExecutor = createMemoryToolExecutor({
    store: memoryStore,
    searchProvider: memorySearchProvider,
    agentId: "main-session",
    sessionTaint: session.taint,
    sourceSessionId: session.id,
  });
  return { memoryDb, memoryExecutor };
}
