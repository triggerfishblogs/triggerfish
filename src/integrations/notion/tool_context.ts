/**
 * Notion tool executor context type.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { NotionPagesService } from "./pages.ts";
import type { NotionDatabasesService } from "./databases.ts";
import type { NotionBlocksService } from "./blocks.ts";

/** Context required by the Notion tool executor. */
export interface NotionToolContext {
  readonly pages: NotionPagesService;
  readonly databases: NotionDatabasesService;
  readonly blocks: NotionBlocksService;
  readonly sessionTaint: () => ClassificationLevel;
  readonly sourceSessionId: SessionId;
  readonly classificationFloor?: ClassificationLevel;
}
