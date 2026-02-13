/**
 * Static analysis tests for Docker deployment files.
 *
 * Validates Dockerfile, docker-compose.yml, and .dockerignore
 * conform to expected patterns without building anything.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";

const DOCKERFILE_PATH = "deploy/docker/Dockerfile";
const COMPOSE_PATH = "deploy/docker/docker-compose.yml";
const DOCKERIGNORE_PATH = "deploy/docker/.dockerignore";

// --- Dockerfile ---

Deno.test("Dockerfile exists and is readable", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertEquals(content.length > 0, true);
});

Deno.test("Dockerfile uses denoland/deno base image", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "denoland/deno:");
});

Deno.test("Dockerfile uses slim runtime (not alpine)", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "trixie-slim");
  assertEquals(content.includes("alpine"), false, "Should not use alpine");
});

Deno.test("Dockerfile exposes correct ports", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "EXPOSE 18789");
  assertStringIncludes(content, "18790");
});

Deno.test("Dockerfile has tini entrypoint", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "tini");
  assertStringIncludes(content, "ENTRYPOINT");
});

Deno.test("Dockerfile sets TRIGGERFISH_DOCKER=true", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "TRIGGERFISH_DOCKER=true");
});

Deno.test("Dockerfile runs as nonroot user", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "USER nonroot");
});

Deno.test("Dockerfile includes config and skills", async () => {
  const content = await Deno.readTextFile(DOCKERFILE_PATH);
  assertStringIncludes(content, "--include config/");
  assertStringIncludes(content, "--include skills/");
});

// --- docker-compose.yml ---

Deno.test("docker-compose.yml exists and has triggerfish service", async () => {
  const content = await Deno.readTextFile(COMPOSE_PATH);
  assertStringIncludes(content, "triggerfish:");
});

Deno.test("docker-compose.yml maps correct ports", async () => {
  const content = await Deno.readTextFile(COMPOSE_PATH);
  assertStringIncludes(content, "18789:18789");
  assertStringIncludes(content, "18790:18790");
});

Deno.test("docker-compose.yml has data volume", async () => {
  const content = await Deno.readTextFile(COMPOSE_PATH);
  assertStringIncludes(content, "triggerfish-data");
});

// --- .dockerignore ---

Deno.test(".dockerignore excludes tests and .git", async () => {
  const content = await Deno.readTextFile(DOCKERIGNORE_PATH);
  assertStringIncludes(content, ".git");
  assertStringIncludes(content, "tests");
});
