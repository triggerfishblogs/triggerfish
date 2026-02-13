/**
 * Config hot-reload tests.
 *
 * Tests the config watcher's callback registration and config loading.
 * Filesystem watching is tested with a real temp file.
 */

import { assertEquals, assertExists } from "@std/assert";
import { createConfigWatcher } from "../../src/gateway/config_watcher.ts";

Deno.test("onChange: registers and invokes callback on file change", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });

  try {
    await Deno.writeTextFile(tmpFile, "key: value1\n");

    const watcher = createConfigWatcher(tmpFile, 50);
    const received: Record<string, unknown>[] = [];

    watcher.onChange((config) => {
      received.push(config);
    });

    watcher.start();

    // Wait for initial load
    await new Promise((r) => setTimeout(r, 100));

    // Modify the file
    await Deno.writeTextFile(tmpFile, "key: value2\nupdated: true\n");

    // Wait for debounce + reload
    await new Promise((r) => setTimeout(r, 800));

    watcher.stop();

    // Should have received at least one config change
    assertEquals(received.length >= 1, true);

    const lastConfig = received[received.length - 1];
    assertEquals(lastConfig.key, "value2");
    assertEquals(lastConfig.updated, true);
  } finally {
    try {
      await Deno.remove(tmpFile);
    } catch {
      // cleanup
    }
  }
});

Deno.test("onChange: unsubscribe stops callback", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });

  try {
    await Deno.writeTextFile(tmpFile, "initial: true\n");

    const watcher = createConfigWatcher(tmpFile, 50);
    let callCount = 0;

    const unsub = watcher.onChange(() => {
      callCount++;
    });

    watcher.start();
    await new Promise((r) => setTimeout(r, 100));

    // Unsubscribe
    unsub();

    // Modify file — callback should NOT fire
    await Deno.writeTextFile(tmpFile, "modified: true\n");
    await new Promise((r) => setTimeout(r, 400));

    watcher.stop();

    // callCount should be 0 (unsubscribed before any file change)
    assertEquals(callCount, 0);
  } finally {
    try {
      await Deno.remove(tmpFile);
    } catch {
      // cleanup
    }
  }
});

Deno.test("getConfig: returns loaded config after start", async () => {
  const tmpFile = await Deno.makeTempFile({ suffix: ".yaml" });

  try {
    await Deno.writeTextFile(tmpFile, "name: triggerfish\nport: 8080\n");

    const watcher = createConfigWatcher(tmpFile, 50);
    watcher.start();

    // Wait for initial load
    await new Promise((r) => setTimeout(r, 200));

    const config = watcher.getConfig();
    assertExists(config);
    assertEquals(config.name, "triggerfish");
    assertEquals(config.port, 8080);

    watcher.stop();
  } finally {
    try {
      await Deno.remove(tmpFile);
    } catch {
      // cleanup
    }
  }
});

Deno.test("getConfig: returns undefined before start", () => {
  const watcher = createConfigWatcher("/nonexistent/config.yaml");
  assertEquals(watcher.getConfig(), undefined);
});

Deno.test("stop: is idempotent", () => {
  const watcher = createConfigWatcher("/nonexistent/config.yaml");
  watcher.stop();
  watcher.stop(); // should not throw
});
