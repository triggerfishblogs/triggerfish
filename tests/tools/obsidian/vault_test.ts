/**
 * Vault security tests — path confinement, symlink escapes, exclusions,
 * classification mapping, vault discovery.
 */

import { assertEquals, assert } from "@std/assert";
import {
  createVaultContext,
  resolveVaultPath,
  isExcluded,
  getClassificationForPath,
} from "../../../src/tools/obsidian/vault.ts";
import type { ObsidianVaultConfig } from "../../../src/tools/obsidian/types.ts";

/** Create a temp vault with .obsidian marker. */
async function makeTempVault(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "obsidian_test_" });
  await Deno.mkdir(`${dir}/.obsidian`);
  return dir;
}

/** Create a basic config for a vault path. */
function makeConfig(vaultPath: string, overrides?: Partial<ObsidianVaultConfig>): ObsidianVaultConfig {
  return {
    vaultPath,
    classification: "INTERNAL",
    ...overrides,
  };
}

// --- Vault discovery ---

Deno.test("createVaultContext: succeeds for valid vault with .obsidian marker", async () => {
  const vaultPath = await makeTempVault();
  try {
    const result = await createVaultContext(makeConfig(vaultPath));
    assert(result.ok);
    if (result.ok) {
      assertEquals(result.value.config.classification, "INTERNAL");
    }
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("createVaultContext: fails when path does not exist", async () => {
  const result = await createVaultContext(makeConfig("/nonexistent/vault/path"));
  assertEquals(result.ok, false);
});

Deno.test("createVaultContext: fails when .obsidian marker is missing", async () => {
  const dir = await Deno.makeTempDir({ prefix: "obsidian_test_" });
  try {
    const result = await createVaultContext(makeConfig(dir));
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

// --- Path traversal rejection ---

Deno.test("resolveVaultPath: rejects .. traversal", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    const result = await resolveVaultPath(ctx.value, "../etc/passwd");
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("resolveVaultPath: rejects embedded .. components", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    const result = await resolveVaultPath(ctx.value, "folder/../../../etc/passwd");
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("resolveVaultPath: rejects absolute paths", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    const result = await resolveVaultPath(ctx.value, "/etc/passwd");
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("resolveVaultPath: accepts valid relative paths", async () => {
  const vaultPath = await makeTempVault();
  await Deno.writeTextFile(`${vaultPath}/note.md`, "hello");
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    const result = await resolveVaultPath(ctx.value, "note.md");
    assert(result.ok);
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("resolveVaultPath: rejects symlinks escaping vault", async () => {
  const vaultPath = await makeTempVault();
  const outsideDir = await Deno.makeTempDir({ prefix: "outside_" });
  await Deno.writeTextFile(`${outsideDir}/secret.md`, "classified");

  try {
    await Deno.symlink(outsideDir, `${vaultPath}/escape`);
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    const result = await resolveVaultPath(ctx.value, "escape/secret.md");
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
    await Deno.remove(outsideDir, { recursive: true });
  }
});

// --- Exclusion logic ---

Deno.test("isExcluded: always excludes .obsidian", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    assert(isExcluded(ctx.value, ".obsidian"));
    assert(isExcluded(ctx.value, ".obsidian/config.json"));
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("isExcluded: always excludes .trash", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    assert(isExcluded(ctx.value, ".trash"));
    assert(isExcluded(ctx.value, ".trash/deleted-note.md"));
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("isExcluded: respects user-configured exclusions", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath, {
      excludeFolders: ["templates", "archive"],
    }));
    assert(ctx.ok);
    if (!ctx.ok) return;

    assert(isExcluded(ctx.value, "templates/daily.md"));
    assert(isExcluded(ctx.value, "archive/old-note.md"));
    assert(!isExcluded(ctx.value, "notes/my-note.md"));
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

// --- Classification mapping ---

Deno.test("getClassificationForPath: returns vault default for unmapped paths", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath));
    assert(ctx.ok);
    if (!ctx.ok) return;

    assertEquals(getClassificationForPath(ctx.value, "notes/general.md"), "INTERNAL");
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("getClassificationForPath: applies folder overrides", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath, {
      folderClassifications: {
        "private": "CONFIDENTIAL",
        "public": "PUBLIC",
      },
    }));
    assert(ctx.ok);
    if (!ctx.ok) return;

    assertEquals(getClassificationForPath(ctx.value, "private/secret.md"), "CONFIDENTIAL");
    assertEquals(getClassificationForPath(ctx.value, "public/readme.md"), "PUBLIC");
    assertEquals(getClassificationForPath(ctx.value, "notes/general.md"), "INTERNAL");
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});

Deno.test("getClassificationForPath: most specific path wins", async () => {
  const vaultPath = await makeTempVault();
  try {
    const ctx = await createVaultContext(makeConfig(vaultPath, {
      folderClassifications: {
        "work": "INTERNAL",
        "work/classified": "RESTRICTED",
      },
    }));
    assert(ctx.ok);
    if (!ctx.ok) return;

    assertEquals(getClassificationForPath(ctx.value, "work/notes.md"), "INTERNAL");
    assertEquals(getClassificationForPath(ctx.value, "work/classified/top-secret.md"), "RESTRICTED");
  } finally {
    await Deno.remove(vaultPath, { recursive: true });
  }
});
