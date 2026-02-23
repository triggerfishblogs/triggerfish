/**
 * Google Sheets service types.
 *
 * Sheet range, write options, and service interface for the Sheets API.
 *
 * @module
 */

import type { GoogleApiResult } from "../auth/types_auth.ts";

// ─── Sheets ──────────────────────────────────────────────────────────────────

/** A range of values in a Google Sheet. */
export interface SheetRange {
  readonly range: string;
  readonly values: readonly (readonly string[])[];
}

/** Options for writing to a sheet range. */
export interface SheetWriteOptions {
  readonly spreadsheetId: string;
  readonly range: string;
  readonly values: readonly (readonly string[])[];
}

/** Sheets service interface. */
export interface SheetsService {
  readonly read: (
    spreadsheetId: string,
    range: string,
  ) => Promise<GoogleApiResult<SheetRange>>;
  readonly write: (
    options: SheetWriteOptions,
  ) => Promise<GoogleApiResult<SheetRange>>;
}
