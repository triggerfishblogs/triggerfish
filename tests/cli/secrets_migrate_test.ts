/**
 * Secret migration command tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { migrateSecrets } from "../../src/cli/commands/secrets_migrate.ts";
import { createMemorySecretStore } from "../../src/core/secrets/backends/memory_store.ts";

Deno.test("migrate: copies all secrets from source to target", async () => {
  const source = createMemorySecretStore();
  await source.setSecret("key-a", "value-a");
  await source.setSecret("key-b", "value-b");

  const target = createMemorySecretStore();

  const result = await migrateSecrets({ from: source, to: target });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.totalSecrets, 2);
    assertEquals(result.value.migrated, 2);
    assertEquals(result.value.verified, 2);
    assertEquals(result.value.failed.length, 0);
  }

  const aResult = await target.getSecret("key-a");
  assertEquals(aResult.ok, true);
  if (aResult.ok) assertEquals(aResult.value, "value-a");
});

Deno.test("migrate: applies path prefix to target names", async () => {
  const source = createMemorySecretStore();
  await source.setSecret("api-key", "secret123");

  const target = createMemorySecretStore();

  const result = await migrateSecrets({
    from: source,
    to: target,
    pathPrefix: "triggerfish/",
  });
  assertEquals(result.ok, true);

  const prefixed = await target.getSecret("triggerfish/api-key");
  assertEquals(prefixed.ok, true);
  if (prefixed.ok) assertEquals(prefixed.value, "secret123");
});

Deno.test("migrate: does not delete source secrets by default", async () => {
  const source = createMemorySecretStore();
  await source.setSecret("keep-me", "value");

  const target = createMemorySecretStore();

  await migrateSecrets({ from: source, to: target });

  const sourceResult = await source.getSecret("keep-me");
  assertEquals(sourceResult.ok, true);
});

Deno.test("migrate: deletes source secrets when deleteSource is true", async () => {
  const source = createMemorySecretStore();
  await source.setSecret("delete-me", "value");

  const target = createMemorySecretStore();

  await migrateSecrets({ from: source, to: target, deleteSource: true });

  const sourceResult = await source.getSecret("delete-me");
  assertEquals(sourceResult.ok, false);
});

Deno.test("migrate: calls onProgress for each secret", async () => {
  const source = createMemorySecretStore();
  await source.setSecret("key-1", "val-1");
  await source.setSecret("key-2", "val-2");

  const target = createMemorySecretStore();
  const progress: string[] = [];

  await migrateSecrets({
    from: source,
    to: target,
    onProgress: (name, status) => progress.push(`${name}:${status}`),
  });

  assertEquals(progress.length, 2);
  assertEquals(progress.every((p) => p.endsWith(":verified")), true);
});

Deno.test("migrate: empty source results in zero migrations", async () => {
  const source = createMemorySecretStore();
  const target = createMemorySecretStore();

  const result = await migrateSecrets({ from: source, to: target });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.totalSecrets, 0);
    assertEquals(result.value.migrated, 0);
  }
});
