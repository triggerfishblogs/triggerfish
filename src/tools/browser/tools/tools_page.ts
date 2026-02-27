/**
 * Browser page interaction helpers for snapshot and scroll operations.
 *
 * Provides screenshot capture with text extraction, chunked base64
 * encoding for large buffers, and scroll direction computation.
 *
 * @module
 */

import type { Page } from "puppeteer-core";
import type { Result } from "../../../core/types/classification.ts";
import {
  MAX_SNAPSHOT_LINKS,
  type PageLink,
  type ScrollDirection,
  type SnapshotResult,
} from "./tools_types.ts";

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

/** Extract links (text + href) from the page, capped at MAX_SNAPSHOT_LINKS. */
async function extractPageLinks(
  page: Page,
): Promise<readonly PageLink[]> {
  const cap = MAX_SNAPSHOT_LINKS;
  try {
    const raw: Array<{ text: string; href: string }> = await page.evaluate(
      (limit: number) => {
        // deno-lint-ignore no-explicit-any
        const anchors = (globalThis as any).document?.querySelectorAll("a[href]") ?? [];
        const results: Array<{ text: string; href: string }> = [];
        for (const a of anchors) {
          if (results.length >= limit) break;
          const text = ((a.textContent ?? "").trim()).slice(0, 100);
          const href = a.href as string;
          if (
            text.length > 0 &&
            (href.startsWith("http://") || href.startsWith("https://"))
          ) {
            results.push({ text, href });
          }
        }
        return results;
      },
      cap,
    );
    return raw;
  } catch {
    return [];
  }
}

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

    const links = await extractPageLinks(page);

    return { ok: true, value: { screenshot, textContent, links } };
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
