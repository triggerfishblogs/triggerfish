/**
 * Google tool executor context type.
 *
 * Aggregates all Google service interfaces with session classification
 * metadata for policy-enforced tool execution.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { SessionId } from "../../../core/types/session.ts";
import type { LineageStore } from "../../../core/session/lineage.ts";
import type { GmailService } from "../gmail/types_gmail.ts";
import type { CalendarService } from "../calendar/types_calendar.ts";
import type { TasksService } from "../tasks/types_tasks.ts";
import type { DriveService } from "../drive/types_drive.ts";
import type { SheetsService } from "../sheets/types_sheets.ts";

// ─── Tool Context ────────────────────────────────────────────────────────────

/** Context required by the Google tool executor. */
export interface GoogleToolContext {
  readonly gmail: GmailService;
  readonly calendar: CalendarService;
  readonly tasks: TasksService;
  readonly drive: DriveService;
  readonly sheets: SheetsService;
  /** Live getter for current session taint. Returns the taint at call time, not at creation time. */
  readonly sessionTaint: () => ClassificationLevel;
  readonly sourceSessionId: SessionId;
  readonly lineageStore?: LineageStore;
  readonly classificationFloors?: Readonly<
    Record<string, ClassificationLevel>
  >;
}
