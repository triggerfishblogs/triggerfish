/**
 * Google Drive service types.
 *
 * File metadata, search options, and service interface for the Drive API.
 *
 * @module
 */

import type { GoogleApiResult } from "../auth/types_auth.ts";

// ─── Drive ───────────────────────────────────────────────────────────────────

/** A Google Drive file. */
export interface DriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly modifiedTime?: string;
  readonly size?: string;
  readonly webViewLink?: string;
}

/** Options for searching Drive files. */
export interface DriveSearchOptions {
  readonly query: string;
  readonly maxResults?: number;
}

/** Drive service interface. */
export interface DriveService {
  readonly search: (
    options: DriveSearchOptions,
  ) => Promise<GoogleApiResult<readonly DriveFile[]>>;
  readonly read: (fileId: string) => Promise<GoogleApiResult<string>>;
}
