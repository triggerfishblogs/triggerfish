/**
 * Daily note tests — create, read, append, recent listing.
 */

import { assertEquals, assert } from "@std/assert";
import { createVaultContext } from "../../../src/tools/obsidian/vault.ts";
import { createNoteStore } from "../../../src/tools/obsidian/notes.ts";
import { createDailyNoteManager } from "../../../src/tools/obsidian/daily.ts";
import type { ObsidianVaultConfig } from "../../../src/tools/obsidian/types.ts";
import type { VaultContext } from "../../../src/tools/obsidian/vault.ts";
import type { NoteStore } from "../../../src/tools/obsidian/notes.ts";

/** Create a temp vault context with daily notes config. */
async function makeDailyCtx(
  overrides?: Partial<ObsidianVaultConfig>,
): Promise<{ ctx: VaultContext; store: NoteStore; path: string }> {
  const dir = await Deno.makeTempDir({ prefix: "obsidian_daily_" });
  await Deno.mkdir(`${dir}/.obsidian`);
  const result = await createVaultContext({
    vaultPath: dir,
    classification: "INTERNAL",
    dailyNotes: {
      folder: "daily",
      dateFormat: "YYYY-MM-DD",
    },
    ...overrides,
  });
  if (!result.ok) throw new Error(result.error);
  const store = createNoteStore(result.value);
  return { ctx: result.value, store, path: dir };
}

Deno.test("DailyNoteManager.getOrCreate: creates note when missing", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.getOrCreate("2025-03-15");
    assert(result.ok);
    if (result.ok) {
      assertEquals(result.value.name, "2025-03-15");
      assert(result.value.content.includes("2025-03-15"));
    }
    // Verify file exists on disk
    const stat = await Deno.stat(`${path}/daily/2025-03-15.md`);
    assert(stat.isFile);
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.getOrCreate: reads existing note", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    await Deno.mkdir(`${path}/daily`, { recursive: true });
    await Deno.writeTextFile(`${path}/daily/2025-03-15.md`, "# Existing Daily\n\nHello!");
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.getOrCreate("2025-03-15");
    assert(result.ok);
    if (result.ok) {
      assertEquals(result.value.content, "# Existing Daily\n\nHello!");
    }
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.getOrCreate: uses custom date format", async () => {
  const { ctx: _, store: _s, path } = await makeDailyCtx({
    dailyNotes: {
      folder: "journal",
      dateFormat: "DD-MM-YYYY",
    },
  });
  try {
    const result2 = await createVaultContext({
      vaultPath: path,
      classification: "INTERNAL",
      dailyNotes: { folder: "journal", dateFormat: "DD-MM-YYYY" },
    });
    assert(result2.ok);
    if (!result2.ok) return;
    const store2 = createNoteStore(result2.value);
    const mgr = createDailyNoteManager(result2.value, store2);
    const result = await mgr.getOrCreate("2025-12-25");
    assert(result.ok);
    if (result.ok) {
      assertEquals(result.value.name, "25-12-2025");
    }
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.getOrCreate: applies template for new note", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    await Deno.mkdir(`${path}/templates`, { recursive: true });
    await Deno.writeTextFile(`${path}/templates/daily.md`, "---\ntype: daily\n---\n# Daily Template\n\n");
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.getOrCreate("2025-06-01", "templates/daily.md");
    assert(result.ok);
    if (result.ok) {
      assert(result.value.content.includes("type: daily"));
    }
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.append: appends to existing daily note", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    await Deno.mkdir(`${path}/daily`, { recursive: true });
    await Deno.writeTextFile(`${path}/daily/2025-03-15.md`, "# 2025-03-15\n\nFirst entry.");
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.append("Second entry.", "2025-03-15");
    assert(result.ok);
    if (result.ok) {
      assert(result.value.content.includes("First entry."));
      assert(result.value.content.includes("Second entry."));
    }
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.append: creates note if missing then appends", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.append("Appended text.", "2025-07-04");
    assert(result.ok);
    if (result.ok) {
      assert(result.value.content.includes("Appended text."));
    }
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.getRecent: returns recent daily notes", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    await Deno.mkdir(`${path}/daily`, { recursive: true });
    await Deno.writeTextFile(`${path}/daily/2025-03-13.md`, "# Day 1");
    await Deno.writeTextFile(`${path}/daily/2025-03-14.md`, "# Day 2");
    await Deno.writeTextFile(`${path}/daily/2025-03-15.md`, "# Day 3");
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.getRecent(2);
    assert(result.ok);
    if (result.ok) {
      assertEquals(result.value.length, 2);
    }
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});

Deno.test("DailyNoteManager.getOrCreate: rejects invalid date format", async () => {
  const { ctx, store, path } = await makeDailyCtx();
  try {
    const mgr = createDailyNoteManager(ctx, store);
    const result = await mgr.getOrCreate("not-a-date");
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(path, { recursive: true });
  }
});
