/**
 * Browser page interaction helpers for snapshot and scroll operations.
 *
 * Provides screenshot capture with text extraction, chunked base64
 * encoding for large buffers, and scroll direction computation.
 *
 * @module
 */

import type { Page } from "puppeteer-core";
import type { Result } from "../../core/types/classification.ts";
import type { ScrollDirection, SnapshotResult } from "./tools_types.ts";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default scroll distance in pixels. */
export const DEFAULT_SCROLL_PX = 500;

// ─── Base64 Encoding ─────────────────────────────────────────────────────────

/** Chunked base64 encoding to avoid call stack overflow on large buffers. */
export function encodeBufferToBase64(buffer: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const slice = buffer.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(""));
}

// ─── Snapshot ────────────────────────────────────────────────────────────────

/** Capture screenshot and extract visible text from the page. */
export async function captureBrowserSnapshot(
  page: Page,
): Promise<Result<SnapshotResult, string>> {
  try {
    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
    }) as Uint8Array;

    const screenshot = encodeBufferToBase64(buffer);

    const textContent: string = await page.evaluate(
      // deno-lint-ignore no-explicit-any
      () => (globalThis as any).document?.body?.innerText ?? "",
    );

    return { ok: true, value: { screenshot, textContent } };
  } catch (err) {
    return {
      ok: false,
      error: `Snapshot failed: ${(err as Error).message}`,
    };
  }
}

// ─── Scroll ──────────────────────────────────────────────────────────────────

/** Convert scroll direction and amount to pixel deltas. */
export function computeScrollDeltas(
  direction: ScrollDirection,
  amount?: number,
): { readonly dx: number; readonly dy: number } {
  const px = amount ?? DEFAULT_SCROLL_PX;
  switch (direction) {
    case "down":
      return { dx: 0, dy: px };
    case "up":
      return { dx: 0, dy: -px };
    case "right":
      return { dx: px, dy: 0 };
    case "left":
      return { dx: -px, dy: 0 };
  }
}

/** Execute a page scroll by the given pixel deltas. */
export async function scrollBrowserPage(
  page: Page,
  direction: ScrollDirection,
  amount?: number,
): Promise<Result<void, string>> {
  const { dx, dy } = computeScrollDeltas(direction, amount);
  try {
    await page.evaluate(
      (scrollX: number, scrollY: number) =>
        // deno-lint-ignore no-explicit-any
        (globalThis as any).scrollBy(scrollX, scrollY),
      dx,
      dy,
    );
    return { ok: true, value: undefined };
  } catch (err) {
    return {
      ok: false,
      error: `Scroll failed: ${(err as Error).message}`,
    };
  }
}
