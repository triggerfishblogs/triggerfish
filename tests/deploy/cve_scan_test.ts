/**
 * Static analysis tests for CVE scanning CI workflows.
 *
 * Validates that release.yml includes Trivy container scanning and that
 * a weekly CVE scan workflow exists. No Docker daemon required.
 *
 * @module
 */

import { assertStringIncludes } from "@std/assert";

const RELEASE_WORKFLOW_PATH = ".github/workflows/release.yml";
const CVE_SCAN_WORKFLOW_PATH = ".github/workflows/cve-scan.yml";

// --- release.yml — Trivy integration ---

Deno.test("release.yml has Trivy scan step", async () => {
  const content = await Deno.readTextFile(RELEASE_WORKFLOW_PATH);
  assertStringIncludes(content, "aquasecurity/trivy-action");
});

Deno.test("release.yml Trivy fails on HIGH/CRITICAL", async () => {
  const content = await Deno.readTextFile(RELEASE_WORKFLOW_PATH);
  assertStringIncludes(content, "HIGH,CRITICAL");
  assertStringIncludes(content, "exit-code:");
});

Deno.test("release.yml uploads SARIF results", async () => {
  const content = await Deno.readTextFile(RELEASE_WORKFLOW_PATH);
  assertStringIncludes(content, "codeql-action/upload-sarif");
  assertStringIncludes(content, "trivy-results.sarif");
});

Deno.test("release.yml builds debug image target", async () => {
  const content = await Deno.readTextFile(RELEASE_WORKFLOW_PATH);
  assertStringIncludes(content, "debug");
});

// --- cve-scan.yml — Weekly scan ---

Deno.test("cve-scan.yml exists with weekly schedule", async () => {
  const content = await Deno.readTextFile(CVE_SCAN_WORKFLOW_PATH);
  assertStringIncludes(content, "schedule");
  assertStringIncludes(content, "cron:");
});

Deno.test("cve-scan.yml uses Trivy", async () => {
  const content = await Deno.readTextFile(CVE_SCAN_WORKFLOW_PATH);
  assertStringIncludes(content, "aquasecurity/trivy-action");
});
