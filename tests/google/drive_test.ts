/**
 * Google Drive service unit tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createDriveService } from "../../src/google/drive.ts";
import type { GoogleApiClient, GoogleApiResult } from "../../src/google/types.ts";

function createMockClient(
  responses: Record<string, GoogleApiResult<unknown>>,
): GoogleApiClient {
  function findResponse(url: string): GoogleApiResult<unknown> {
    // Sort by key length descending to match most specific path first
    const sorted = Object.entries(responses).sort(
      ([a], [b]) => b.length - a.length,
    );
    for (const [key, value] of sorted) {
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

Deno.test("DriveService.search: returns files", async () => {
  const client = createMockClient({
    "/files": {
      ok: true,
      value: {
        files: [
          {
            id: "f1",
            name: "Project Plan",
            mimeType: "application/vnd.google-apps.document",
            modifiedTime: "2025-01-15T10:00:00Z",
          },
          {
            id: "f2",
            name: "Budget.xlsx",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size: "15000",
          },
        ],
      },
    },
  });
  const drive = createDriveService(client);

  const result = await drive.search({ query: "name contains 'plan'" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 2);
    assertEquals(result.value[0].name, "Project Plan");
    assertEquals(result.value[1].name, "Budget.xlsx");
  }
});

Deno.test("DriveService.search: returns empty when no files", async () => {
  const client = createMockClient({
    "/files": { ok: true, value: { files: [] } },
  });
  const drive = createDriveService(client);

  const result = await drive.search({ query: "nonexistent" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("DriveService.read: reads Google Docs via export", async () => {
  const client = createMockClient({
    "/files/doc1/export": {
      ok: true,
      value: "Exported document content as plain text",
    },
    "/files/doc1": {
      ok: true,
      value: {
        id: "doc1",
        name: "My Document",
        mimeType: "application/vnd.google-apps.document",
      },
    },
  });
  const drive = createDriveService(client);

  const result = await drive.read("doc1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "Exported document content as plain text");
  }
});

Deno.test("DriveService.read: reads regular files via media download", async () => {
  const client = createMockClient({
    "/files/txt1": {
      ok: true,
      value: {
        id: "txt1",
        name: "readme.txt",
        mimeType: "text/plain",
      },
    },
  });
  // The second call (media download) also matches /files/txt1
  const drive = createDriveService(client);

  const result = await drive.read("txt1");
  assertEquals(result.ok, true);
});

Deno.test("DriveService.search: propagates API errors", async () => {
  const client = createMockClient({
    "/files": {
      ok: false,
      error: { code: "HTTP_403", message: "Forbidden", status: 403 },
    },
  });
  const drive = createDriveService(client);

  const result = await drive.search({ query: "test" });
  assertEquals(result.ok, false);
});
