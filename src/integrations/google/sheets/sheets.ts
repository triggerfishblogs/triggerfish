/**
 * Google Sheets service — read and write cell ranges.
 *
 * @module
 */

import type {
  GoogleApiClient,
  GoogleApiResult,
  SheetRange,
  SheetsService,
  SheetWriteOptions,
} from "../types.ts";

/** Sheets API base URL. */
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** Raw Sheets API values response. */
interface SheetsApiValues {
  readonly range: string;
  readonly values?: readonly (readonly string[])[];
}

/** Read a range of values from a Google Sheet. */
async function readSheetRange(
  client: GoogleApiClient,
  spreadsheetId: string,
  range: string,
): Promise<GoogleApiResult<SheetRange>> {
  const result = await client.get<SheetsApiValues>(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      range: result.value.range,
      values: result.value.values ?? [],
    },
  };
}

/** Write values to a range in a Google Sheet. */
async function writeSheetRange(
  client: GoogleApiClient,
  options: SheetWriteOptions,
): Promise<GoogleApiResult<SheetRange>> {
  const url = `${SHEETS_BASE}/${options.spreadsheetId}/values/${
    encodeURIComponent(options.range)
  }`;
  const params = { valueInputOption: "USER_ENTERED" };
  const fullUrl = `${url}?${new URLSearchParams(params).toString()}`;
  const result = await client.put<SheetsApiValues>(fullUrl, {
    range: options.range,
    values: options.values,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      range: result.value.range,
      values: result.value.values ?? options.values,
    },
  };
}

/**
 * Create a Google Sheets service.
 *
 * @param client - Authenticated Google API client
 */
export function createSheetsService(client: GoogleApiClient): SheetsService {
  return {
    read: (spreadsheetId, range) =>
      readSheetRange(client, spreadsheetId, range),
    write: (options) => writeSheetRange(client, options),
  };
}
