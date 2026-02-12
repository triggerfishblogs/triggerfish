/**
 * Google Sheets service — read and write cell ranges.
 *
 * @module
 */

import type {
  GoogleApiClient,
  GoogleApiResult,
  SheetRange,
  SheetWriteOptions,
  SheetsService,
} from "./types.ts";

/** Sheets API base URL. */
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** Raw Sheets API values response. */
interface SheetsApiValues {
  readonly range: string;
  readonly values?: readonly (readonly string[])[];
}

/**
 * Create a Google Sheets service.
 *
 * @param client - Authenticated Google API client
 */
export function createSheetsService(client: GoogleApiClient): SheetsService {
  return {
    async read(
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
    },

    async write(
      options: SheetWriteOptions,
    ): Promise<GoogleApiResult<SheetRange>> {
      const url =
        `${SHEETS_BASE}/${options.spreadsheetId}/values/${encodeURIComponent(options.range)}`;
      const params = { valueInputOption: "USER_ENTERED" };

      // Use PUT for values update (Sheets API requires PUT for ValueRange)
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
    },
  };
}
