/**
 * Phase 4: Storage Abstraction
 * Tests MUST FAIL until storage providers are implemented.
 * Tests both InMemory and SQLite backends against the same interface.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import type { StorageProvider } from "../../src/core/storage/provider.ts";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createSqliteStorage } from "../../src/core/storage/sqlite.ts";

// Run the same test suite against both backends
function storageTests(name: string, factory: () => Promise<StorageProvider> | StorageProvider) {
  Deno.test(`${name}: set and get a value`, async () => {
    const store = await factory();
    try {
      await store.set("key1", JSON.stringify({ data: "hello" }));
      const val = await store.get("key1");
      assertExists(val);
      assertEquals(JSON.parse(val!), { data: "hello" });
    } finally {
      await store.close();
    }
  });

  Deno.test(`${name}: get returns null for missing key`, async () => {
    const store = await factory();
    try {
      const val = await store.get("nonexistent");
      assertEquals(val, null);
    } finally {
      await store.close();
    }
  });

  Deno.test(`${name}: set overwrites existing value`, async () => {
    const store = await factory();
    try {
      await store.set("key1", "first");
      await store.set("key1", "second");
      assertEquals(await store.get("key1"), "second");
    } finally {
      await store.close();
    }
  });

  Deno.test(`${name}: delete removes value`, async () => {
    const store = await factory();
    try {
      await store.set("key1", "value");
      await store.delete("key1");
      assertEquals(await store.get("key1"), null);
    } finally {
      await store.close();
    }
  });

  Deno.test(`${name}: list returns all keys with prefix`, async () => {
    const store = await factory();
    try {
      await store.set("session:1", "a");
      await store.set("session:2", "b");
      await store.set("lineage:1", "c");
      const keys = await store.list("session:");
      assertEquals(keys.length, 2);
      assert(keys.includes("session:1"));
      assert(keys.includes("session:2"));
    } finally {
      await store.close();
    }
  });

  Deno.test(`${name}: list with no prefix returns all keys`, async () => {
    const store = await factory();
    try {
      await store.set("a", "1");
      await store.set("b", "2");
      const keys = await store.list();
      assert(keys.length >= 2);
    } finally {
      await store.close();
    }
  });
}

// Run against both backends
storageTests("InMemoryStorage", () => createMemoryStorage());
storageTests("SqliteStorage", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".db" });
  return createSqliteStorage(tmpFile);
});

// SQLite-specific: persistence across instances
Deno.test("SqliteStorage: data survives close and reopen", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".db" });
  const store1 = await createSqliteStorage(tmpFile);
  await store1.set("persist-key", "persist-value");
  await store1.close();

  const store2 = await createSqliteStorage(tmpFile);
  try {
    assertEquals(await store2.get("persist-key"), "persist-value");
  } finally {
    await store2.close();
    await Deno.remove(tmpFile);
  }
});
