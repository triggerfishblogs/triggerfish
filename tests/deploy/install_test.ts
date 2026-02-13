/**
 * Static analysis tests for install scripts.
 *
 * Validates that install scripts download from GitHub Releases
 * (not git clone), verify checksums, and detect platforms correctly.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";

const INSTALL_SH_PATH = "scripts/install.sh";
const INSTALL_PS1_PATH = "scripts/install.ps1";
const ARCHIVED_SH_PATH = "deploy/scripts/install-from-source.sh";
const ARCHIVED_PS1_PATH = "deploy/scripts/install-from-source.ps1";

// --- install.sh ---

Deno.test("install.sh downloads from GitHub Releases (no git clone)", async () => {
  const content = await Deno.readTextFile(INSTALL_SH_PATH);
  assertStringIncludes(content, "github.com");
  assertStringIncludes(content, "releases/download");
  assertEquals(content.includes("git clone"), false, "Should not use git clone");
});

Deno.test("install.sh verifies SHA256 checksum", async () => {
  const content = await Deno.readTextFile(INSTALL_SH_PATH);
  assertStringIncludes(content, "sha256sum");
  assertStringIncludes(content, "SHA256SUMS");
});

Deno.test("install.sh detects OS via uname -s", async () => {
  const content = await Deno.readTextFile(INSTALL_SH_PATH);
  assertStringIncludes(content, "uname -s");
});

Deno.test("install.sh detects architecture via uname -m", async () => {
  const content = await Deno.readTextFile(INSTALL_SH_PATH);
  assertStringIncludes(content, "uname -m");
});

Deno.test("install.sh supports Linux and macOS", async () => {
  const content = await Deno.readTextFile(INSTALL_SH_PATH);
  assertStringIncludes(content, "Linux");
  assertStringIncludes(content, "Darwin");
});

// --- install.ps1 ---

Deno.test("install.ps1 downloads from GitHub Releases (no git clone)", async () => {
  const content = await Deno.readTextFile(INSTALL_PS1_PATH);
  assertStringIncludes(content, "github.com");
  assertStringIncludes(content, "releases");
  assertEquals(content.includes("git clone"), false, "Should not use git clone");
});

Deno.test("install.ps1 verifies checksum via Get-FileHash", async () => {
  const content = await Deno.readTextFile(INSTALL_PS1_PATH);
  assertStringIncludes(content, "Get-FileHash");
  assertStringIncludes(content, "SHA256");
});

Deno.test("install.ps1 detects architecture", async () => {
  const content = await Deno.readTextFile(INSTALL_PS1_PATH);
  assertStringIncludes(content, "OSArchitecture");
});

// --- Archived install scripts exist ---

Deno.test("archived install-from-source.sh exists", async () => {
  const content = await Deno.readTextFile(ARCHIVED_SH_PATH);
  assertStringIncludes(content, "git clone");
});

Deno.test("archived install-from-source.ps1 exists", async () => {
  const content = await Deno.readTextFile(ARCHIVED_PS1_PATH);
  assertStringIncludes(content, "git clone");
});
