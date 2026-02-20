/**
 * Google Sheets service unit tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createSheetsService } from "../../../src/integrations/google/sheets.ts";
import type { GoogleApiClient, GoogleApiResult } from "../../../src/integrations/google/types.ts";

function createMockClient(
  responses: Record<string, GoogleApiResult<unknown>>,
): GoogleApiClient {
  function findResponse(url: string): GoogleApiResult<unknown> {
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) return value;
    }
    return { ok: false, error: { code: "NOT_FOUND", message: `No mock for: ${url}` } };
  }

  return {
    get<T>(url: string, _params?: Record<string, string>): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    post<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    patch<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    put<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
  };
}

Deno.test("SheetsService.read: returns cell values", async () => {
  const client = createMockClient({
    "/values/": {
      ok: true,
      value: {
        range: "Sheet1!A1:B2",
        values: [["Name", "Age"], ["Alice", "30"]],
      },
    },
  });
  const sheets = createSheetsService(client);

  const result = await sheets.read("spreadsheet_123", "Sheet1!A1:B2");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.range, "Sheet1!A1:B2");
    assertEquals(result.value.values.length, 2);
    assertEquals(result.value.values[0][0], "Name");
    assertEquals(result.value.values[1][1], "30");
  }
});

Deno.test("SheetsService.read: returns empty values when no data", async () => {
  const client = createMockClient({
    "/values/": {
      ok: true,
      value: { range: "Sheet1!A1:B2" },
    },
  });
  const sheets = createSheetsService(client);

  const result = await sheets.read("ss1", "Sheet1!A1:B2");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.values.length, 0);
  }
});

Deno.test("SheetsService.write: writes values and returns confirmation", async () => {
  const client = createMockClient({
    "/values/": {
      ok: true,
      value: {
        range: "Sheet1!A1:B1",
        values: [["Updated", "Data"]],
      },
    },
  });
  const sheets = createSheetsService(client);

  const result = await sheets.write({
    spreadsheetId: "ss1",
    range: "Sheet1!A1:B1",
    values: [["Updated", "Data"]],
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.range, "Sheet1!A1:B1");
  }
});

Deno.test("SheetsService.read: propagates API errors", async () => {
  const client = createMockClient({
    "/values/": {
      ok: false,
      error: { code: "HTTP_404", message: "Spreadsheet not found", status: 404 },
    },
  });
  const sheets = createSheetsService(client);

  const result = await sheets.read("nonexistent", "A1:B2");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.message, "Spreadsheet not found");
  }
});
