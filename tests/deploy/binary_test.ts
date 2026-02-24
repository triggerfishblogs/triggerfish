/**
 * Static analysis tests for build tooling.
 *
 * Validates build.sh, Makefile, and deno.json have correct
 * compilation flags and targets.
 *
 * @module
 */

import { assertStringIncludes } from "@std/assert";

const BUILD_SH_PATH = "deploy/scripts/build.sh";
const INSTALL_FROM_SOURCE_PS1_PATH = "deploy/scripts/install-from-source.ps1";
const MAKEFILE_PATH = "Makefile";
const DENO_JSON_PATH = "deno.json";

// --- build.sh ---

Deno.test("build.sh includes config and skills in compile", async () => {
  const content = await Deno.readTextFile(BUILD_SH_PATH);
  assertStringIncludes(content, "--include config/");
  assertStringIncludes(content, "--include src/skills/");
});

Deno.test("build.sh compiles all 5 targets", async () => {
  const content = await Deno.readTextFile(BUILD_SH_PATH);
  assertStringIncludes(content, "x86_64-unknown-linux-gnu");
  assertStringIncludes(content, "aarch64-unknown-linux-gnu");
  assertStringIncludes(content, "x86_64-apple-darwin");
  assertStringIncludes(content, "aarch64-apple-darwin");
  assertStringIncludes(content, "x86_64-pc-windows-msvc");
});

Deno.test("build.sh generates SHA256SUMS.txt", async () => {
  const content = await Deno.readTextFile(BUILD_SH_PATH);
  assertStringIncludes(content, "SHA256SUMS.txt");
  assertStringIncludes(content, "sha256sum");
});

Deno.test("build.sh outputs to dist/ directory", async () => {
  const content = await Deno.readTextFile(BUILD_SH_PATH);
  assertStringIncludes(content, "dist");
});

// --- install-from-source.ps1 ---

Deno.test("install-from-source.ps1 includes config and skills in compile", async () => {
  const content = await Deno.readTextFile(INSTALL_FROM_SOURCE_PS1_PATH);
  assertStringIncludes(content, "--include config/");
  assertStringIncludes(content, "--include skills/");
});

// --- Makefile ---

Deno.test("Makefile has release target delegating to build.sh", async () => {
  const content = await Deno.readTextFile(MAKEFILE_PATH);
  assertStringIncludes(content, "release:");
  assertStringIncludes(content, "deploy/scripts/build.sh");
});

Deno.test("Makefile has clean target", async () => {
  const content = await Deno.readTextFile(MAKEFILE_PATH);
  assertStringIncludes(content, "clean:");
  assertStringIncludes(content, "rm -rf dist/");
});

Deno.test("Makefile has docker target", async () => {
  const content = await Deno.readTextFile(MAKEFILE_PATH);
  assertStringIncludes(content, "docker:");
  assertStringIncludes(content, "deploy/docker/Dockerfile");
});

// --- deno.json ---

Deno.test("deno.json compile task includes config and skills", async () => {
  const content = await Deno.readTextFile(DENO_JSON_PATH);
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const tasks = parsed.tasks as Record<string, string>;
  assertStringIncludes(tasks.compile, "--include config/");
  assertStringIncludes(tasks.compile, "--include src/skills/");
});
