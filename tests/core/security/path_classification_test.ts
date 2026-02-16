/**
 * Tests for filesystem path classification resolver.
 * Covers spec §10.3 (protected paths), §10.4 (configured mappings),
 * §10.5 (default classification), and resolution order precedence.
 */
import { assertEquals } from "@std/assert";
import {
  createPathClassifier,
  expandTilde,
  resolveHome,
} from "../../../src/core/security/path_classification.ts";
import type {
  FilesystemSecurityConfig,
  WorkspacePaths,
} from "../../../src/core/security/path_classification.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";
import { join, resolve } from "@std/path";

// --- Helpers ---

function makeConfig(
  paths: Record<string, ClassificationLevel> = {},
  defaultClassification: ClassificationLevel = "CONFIDENTIAL",
): FilesystemSecurityConfig {
  return {
    paths: new Map(Object.entries(paths)),
    defaultClassification,
  };
}

function makeWorkspacePaths(basePath: string): WorkspacePaths {
  return {
    basePath,
    internalPath: join(basePath, "internal"),
    confidentialPath: join(basePath, "confidential"),
    restrictedPath: join(basePath, "restricted"),
  };
}

// --- Hardcoded protected paths (spec §10.3, scenarios 13-17) ---

Deno.test("path classification: triggerfish.yaml is RESTRICTED (hardcoded)", () => {
  const classifier = createPathClassifier(makeConfig());
  const home = resolveHome();
  const result = classifier.classify(join(home, ".triggerfish", "config", "triggerfish.yaml"));
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

Deno.test("path classification: SPINE.md is RESTRICTED regardless of location", () => {
  const classifier = createPathClassifier(makeConfig());
  const result = classifier.classify("/some/random/path/SPINE.md");
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

Deno.test("path classification: TRIGGER.md is RESTRICTED regardless of location", () => {
  const classifier = createPathClassifier(makeConfig());
  const result = classifier.classify("/tmp/workspace/TRIGGER.md");
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

Deno.test("path classification: ~/.triggerfish/config/ dir is RESTRICTED", () => {
  const classifier = createPathClassifier(makeConfig());
  const home = resolveHome();
  const result = classifier.classify(join(home, ".triggerfish", "config", "some-file.json"));
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

Deno.test("path classification: ~/.triggerfish/data/ is RESTRICTED", () => {
  const classifier = createPathClassifier(makeConfig());
  const home = resolveHome();
  const result = classifier.classify(join(home, ".triggerfish", "data", "triggerfish.db"));
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

Deno.test("path classification: ~/.triggerfish/logs/ is RESTRICTED", () => {
  const classifier = createPathClassifier(makeConfig());
  const home = resolveHome();
  const result = classifier.classify(join(home, ".triggerfish", "logs", "audit.log"));
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

Deno.test("path classification: hardcoded paths override configured mappings", () => {
  // Even if someone configures SPINE.md as PUBLIC, hardcoded wins
  const home = resolveHome();
  const spinePath = join(home, "workspace", "SPINE.md");
  const classifier = createPathClassifier(
    makeConfig({ [`${home}/workspace/*`]: "PUBLIC" }),
  );
  const result = classifier.classify(spinePath);
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "hardcoded");
});

// --- Workspace classification (spec §10.2, scenarios 8-12) ---

Deno.test("path classification: workspace internal/ returns INTERNAL", () => {
  const basePath = "/tmp/workspaces/agent-1";
  const ws = makeWorkspacePaths(basePath);
  const classifier = createPathClassifier(makeConfig(), ws);
  const result = classifier.classify(join(basePath, "internal", "notes.txt"));
  assertEquals(result.classification, "INTERNAL");
  assertEquals(result.source, "workspace");
});

Deno.test("path classification: workspace confidential/ returns CONFIDENTIAL", () => {
  const basePath = "/tmp/workspaces/agent-1";
  const ws = makeWorkspacePaths(basePath);
  const classifier = createPathClassifier(makeConfig(), ws);
  const result = classifier.classify(join(basePath, "confidential", "report.txt"));
  assertEquals(result.classification, "CONFIDENTIAL");
  assertEquals(result.source, "workspace");
});

Deno.test("path classification: workspace restricted/ returns RESTRICTED", () => {
  const basePath = "/tmp/workspaces/agent-1";
  const ws = makeWorkspacePaths(basePath);
  const classifier = createPathClassifier(makeConfig(), ws);
  const result = classifier.classify(join(basePath, "restricted", "secrets.txt"));
  assertEquals(result.classification, "RESTRICTED");
  assertEquals(result.source, "workspace");
});

Deno.test("path classification: workspace path takes precedence over configured", () => {
  const basePath = "/tmp/workspaces/agent-1";
  const ws = makeWorkspacePaths(basePath);
  // Configure basePath as PUBLIC, but workspace detection should win
  const classifier = createPathClassifier(
    makeConfig({ "/tmp/workspaces/*": "PUBLIC" }),
    ws,
  );
  const result = classifier.classify(join(basePath, "confidential", "file.txt"));
  assertEquals(result.classification, "CONFIDENTIAL");
  assertEquals(result.source, "workspace");
});

// --- Configured path mappings (spec §10.4, scenarios 18-20) ---

Deno.test("path classification: configured path mapping matches", () => {
  const home = resolveHome();
  const classifier = createPathClassifier(
    makeConfig({ "~/Documents/finance/*": "CONFIDENTIAL" }),
  );
  const result = classifier.classify(join(home, "Documents", "finance", "q4.xlsx"));
  assertEquals(result.classification, "CONFIDENTIAL");
  assertEquals(result.source, "configured");
  assertEquals(result.matchedPattern, "~/Documents/finance/*");
});

Deno.test("path classification: first configured match wins", () => {
  const home = resolveHome();
  const classifier = createPathClassifier(
    makeConfig({
      "~/Documents/*": "INTERNAL",
      "~/Documents/finance/*": "CONFIDENTIAL",
    }),
  );
  // The first pattern "~/Documents/*" matches first
  const result = classifier.classify(join(home, "Documents", "finance", "q4.xlsx"));
  assertEquals(result.classification, "INTERNAL");
  assertEquals(result.source, "configured");
});

Deno.test("path classification: configured PUBLIC mapping allows low classification", () => {
  const home = resolveHome();
  const classifier = createPathClassifier(
    makeConfig({ "~/Projects/public-oss/*": "PUBLIC" }),
  );
  const result = classifier.classify(join(home, "Projects", "public-oss", "README.md"));
  assertEquals(result.classification, "PUBLIC");
  assertEquals(result.source, "configured");
});

// --- Default classification (spec §10.5, scenarios 21-23) ---

Deno.test("path classification: unmapped path gets default CONFIDENTIAL", () => {
  const classifier = createPathClassifier(makeConfig());
  const result = classifier.classify("/some/random/unmapped/file.txt");
  assertEquals(result.classification, "CONFIDENTIAL");
  assertEquals(result.source, "default");
});

Deno.test("path classification: admin can change default to INTERNAL", () => {
  const classifier = createPathClassifier(makeConfig({}, "INTERNAL"));
  const result = classifier.classify("/some/random/unmapped/file.txt");
  assertEquals(result.classification, "INTERNAL");
  assertEquals(result.source, "default");
});

Deno.test("path classification: admin can set default to PUBLIC", () => {
  const classifier = createPathClassifier(makeConfig({}, "PUBLIC"));
  const result = classifier.classify("/some/random/unmapped/file.txt");
  assertEquals(result.classification, "PUBLIC");
  assertEquals(result.source, "default");
});

// --- Path traversal ---

Deno.test("path classification: path traversal in resolved path doesn't escape checks", () => {
  const classifier = createPathClassifier(makeConfig());
  // ../../../etc/passwd after resolution should still be classified
  const result = classifier.classify("/tmp/workspace/../../../etc/passwd");
  // Resolves to /etc/passwd — gets default classification
  assertEquals(result.source, "default");
});

// --- Tilde expansion ---

Deno.test("path classification: tilde expansion works correctly", () => {
  const home = resolveHome();
  const expanded = expandTilde("~/Documents/file.txt");
  assertEquals(expanded, join(home, "Documents", "file.txt"));
});

Deno.test("path classification: non-tilde path is unchanged", () => {
  const expanded = expandTilde("/absolute/path/file.txt");
  assertEquals(expanded, "/absolute/path/file.txt");
});

// --- Resolution order precedence ---

Deno.test("path classification: hardcoded > workspace > configured > default", () => {
  const basePath = "/tmp/workspaces/agent-1";
  const ws = makeWorkspacePaths(basePath);

  // Configure a mapping for workspace internal dir as PUBLIC
  // and a mapping for triggerfish.yaml as PUBLIC
  const classifier = createPathClassifier(
    makeConfig({
      "/tmp/workspaces/agent-1/internal/*": "PUBLIC",
      "/tmp/workspaces/agent-1/internal/triggerfish.yaml": "PUBLIC",
    }),
    ws,
  );

  // triggerfish.yaml in workspace → hardcoded RESTRICTED (basename match)
  const r1 = classifier.classify(join(basePath, "internal", "triggerfish.yaml"));
  assertEquals(r1.classification, "RESTRICTED");
  assertEquals(r1.source, "hardcoded");

  // Regular file in workspace internal dir → workspace INTERNAL (not configured PUBLIC)
  const r2 = classifier.classify(join(basePath, "internal", "notes.txt"));
  assertEquals(r2.classification, "INTERNAL");
  assertEquals(r2.source, "workspace");
});
