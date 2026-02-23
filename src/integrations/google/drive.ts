/**
 * Google Drive service — search files and read content.
 *
 * For Google Docs and Sheets, exports as plain text.
 * For other text files, downloads media content.
 *
 * @module
 */

import type {
  DriveFile,
  DriveSearchOptions,
  DriveService,
  GoogleApiClient,
  GoogleApiResult,
} from "./types.ts";

/** Drive API base URL. */
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

/** MIME types that should be exported rather than downloaded. */
const EXPORT_MIME_TYPES: Readonly<Record<string, string>> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

/** Raw Drive API file shape. */
interface DriveApiFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly modifiedTime?: string;
  readonly size?: string;
  readonly webViewLink?: string;
}

/** Convert a raw API file to a DriveFile. */
function toDriveFile(file: DriveApiFile): DriveFile {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    size: file.size,
    webViewLink: file.webViewLink,
  };
}

/** Search Drive files by query and convert to DriveFile. */
async function searchDriveFiles(
  client: GoogleApiClient,
  options: DriveSearchOptions,
): Promise<GoogleApiResult<readonly DriveFile[]>> {
  const params: Record<string, string> = {
    q: options.query,
    pageSize: String(options.maxResults ?? 10),
    fields: "files(id,name,mimeType,modifiedTime,size,webViewLink)",
  };
  const result = await client.get<{
    readonly files?: readonly DriveApiFile[];
  }>(`${DRIVE_BASE}/files`, params);
  if (!result.ok) return result;
  const files = (result.value.files ?? []).map(toDriveFile);
  return { ok: true, value: files };
}

/** Download or export a single Drive file by ID. */
async function readDriveFileContent(
  client: GoogleApiClient,
  fileId: string,
): Promise<GoogleApiResult<string>> {
  const metaResult = await client.get<DriveApiFile>(
    `${DRIVE_BASE}/files/${fileId}`,
    { fields: "id,name,mimeType" },
  );
  if (!metaResult.ok) return metaResult;

  const exportMime = EXPORT_MIME_TYPES[metaResult.value.mimeType];
  if (exportMime) {
    return client.get<string>(
      `${DRIVE_BASE}/files/${fileId}/export`,
      { mimeType: exportMime },
    );
  }
  return client.get<string>(
    `${DRIVE_BASE}/files/${fileId}`,
    { alt: "media" },
  );
}

/**
 * Create a Google Drive service.
 *
 * @param client - Authenticated Google API client
 */
export function createDriveService(client: GoogleApiClient): DriveService {
  return {
    search: (options) => searchDriveFiles(client, options),
    read: (fileId) => readDriveFileContent(client, fileId),
  };
}
