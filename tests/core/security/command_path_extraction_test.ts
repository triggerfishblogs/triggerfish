/**
 * Tests for shell command path extraction and classification.
 *
 * Validates extractCommandPaths tokenization (quotes, pipes, redirects,
 * operators) and classifyCommandPaths integration with PathClassifier.
 */
import { assertEquals } from "@std/assert";
import {
  classifyCommandPaths,
  extractCommandPaths,
} from "../../../src/core/security/command_path_extraction.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";
import {
  createPathClassifier,
} from "../../../src/core/security/path_classification.ts";
import type {
  FilesystemSecurityConfig,
  WorkspacePaths,
} from "../../../src/core/security/path_classification.ts";
import { join } from "@std/path";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    publicPath: basePath,
    internalPath: join(basePath, "internal"),
    confidentialPath: join(basePath, "confidential"),
    restrictedPath: join(basePath, "restricted"),
  };
}

// ─── extractCommandPaths ─────────────────────────────────────────────────────

Deno.test("extractCommandPaths: absolute path", () => {
  const paths = extractCommandPaths("cat /etc/passwd");
  assertEquals(paths, ["/etc/passwd"]);
});

Deno.test("extractCommandPaths: multiple paths", () => {
  const paths = extractCommandPaths("cp /a.txt /b.txt");
  assertEquals(paths.includes("/a.txt"), true);
  assertEquals(paths.includes("/b.txt"), true);
  assertEquals(paths.length, 2);
});

Deno.test("extractCommandPaths: relative ./ path", () => {
  const paths = extractCommandPaths("cat ./local/file.txt");
  assertEquals(paths, ["./local/file.txt"]);
});

Deno.test("extractCommandPaths: relative ../ path", () => {
  const paths = extractCommandPaths("cat ../parent/file.txt");
  assertEquals(paths, ["../parent/file.txt"]);
});

Deno.test("extractCommandPaths: tilde path", () => {
  const paths = extractCommandPaths("cat ~/file");
  assertEquals(paths, ["~/file"]);
});

Deno.test("extractCommandPaths: pipes extract paths from both sides", () => {
  const paths = extractCommandPaths("cat /etc/hosts | grep pattern /var/log");
  assertEquals(paths.includes("/etc/hosts"), true);
  assertEquals(paths.includes("/var/log"), true);
});

Deno.test("extractCommandPaths: redirect target extracted", () => {
  const paths = extractCommandPaths("echo hello > output.txt");
  assertEquals(paths, ["output.txt"]);
});

Deno.test("extractCommandPaths: append redirect target", () => {
  const paths = extractCommandPaths("echo data >> /tmp/log.txt");
  assertEquals(paths, ["/tmp/log.txt"]);
});

Deno.test("extractCommandPaths: input redirect", () => {
  const paths = extractCommandPaths("sort < /tmp/input.txt");
  assertEquals(paths, ["/tmp/input.txt"]);
});

Deno.test("extractCommandPaths: stderr redirect", () => {
  const paths = extractCommandPaths("cmd 2> /tmp/err.log");
  assertEquals(paths, ["/tmp/err.log"]);
});

Deno.test("extractCommandPaths: && chain extracts from both sides", () => {
  const paths = extractCommandPaths("cat /a.txt && cat /b.txt");
  assertEquals(paths.includes("/a.txt"), true);
  assertEquals(paths.includes("/b.txt"), true);
});

Deno.test("extractCommandPaths: semicolon chain", () => {
  const paths = extractCommandPaths("cat /a.txt; cat /b.txt");
  assertEquals(paths.includes("/a.txt"), true);
  assertEquals(paths.includes("/b.txt"), true);
});

Deno.test("extractCommandPaths: || chain", () => {
  const paths = extractCommandPaths("cat /a.txt || cat /b.txt");
  assertEquals(paths.includes("/a.txt"), true);
  assertEquals(paths.includes("/b.txt"), true);
});

Deno.test("extractCommandPaths: single-quoted path with spaces", () => {
  const paths = extractCommandPaths("cat '/path/with spaces/file'");
  assertEquals(paths, ["/path/with spaces/file"]);
});

Deno.test("extractCommandPaths: double-quoted path with spaces", () => {
  const paths = extractCommandPaths('cat "/path/with spaces/file"');
  assertEquals(paths, ["/path/with spaces/file"]);
});

Deno.test("extractCommandPaths: flags ignored", () => {
  const paths = extractCommandPaths("grep -r --include='*.ts' /src");
  assertEquals(paths, ["/src"]);
});

Deno.test("extractCommandPaths: no paths returns empty", () => {
  const paths = extractCommandPaths("echo hello");
  assertEquals(paths, []);
});

Deno.test("extractCommandPaths: Windows drive letter extracted (quoted)", () => {
  const paths = extractCommandPaths("type 'C:\\Users\\file.txt'");
  assertEquals(paths, ["C:\\Users\\file.txt"]);
});

Deno.test("extractCommandPaths: URLs ignored", () => {
  const paths = extractCommandPaths("curl https://example.com");
  assertEquals(paths, []);
});

Deno.test("extractCommandPaths: deduplication", () => {
  const paths = extractCommandPaths("cat /same/file.txt /same/file.txt");
  assertEquals(paths, ["/same/file.txt"]);
});

Deno.test("extractCommandPaths: backslash-escaped space in path", () => {
  const paths = extractCommandPaths("cat /path/with\\ spaces/file");
  assertEquals(paths, ["/path/with spaces/file"]);
});

Deno.test("extractCommandPaths: path with subdirectories but no leading slash", () => {
  const paths = extractCommandPaths("cat src/core/types.ts");
  assertEquals(paths, ["src/core/types.ts"]);
});

Deno.test("extractCommandPaths: mixed flags, paths, and URLs", () => {
  const paths = extractCommandPaths(
    "wget -O /tmp/out.html https://example.com --quiet",
  );
  assertEquals(paths.includes("/tmp/out.html"), true);
  assertEquals(paths.includes("https://example.com"), false);
});

// ─── classifyCommandPaths ────────────────────────────────────────────────────

Deno.test("classifyCommandPaths: restricted workspace path yields RESTRICTED", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(makeConfig(), workspacePaths);

  const result = classifyCommandPaths({
    paths: [join(workspace, "restricted", "secret.txt")],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(result.classification, "RESTRICTED");
});

Deno.test("classifyCommandPaths: max classification wins across multiple paths", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(makeConfig(), workspacePaths);

  const result = classifyCommandPaths({
    paths: [
      join(workspace, "file.txt"),
      join(workspace, "restricted", "secret.txt"),
    ],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(result.classification, "RESTRICTED");
});

Deno.test("classifyCommandPaths: relative path resolved against workspaceCwd", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(makeConfig(), workspacePaths);

  const result = classifyCommandPaths({
    paths: ["./restricted/secret.txt"],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(result.classification, "RESTRICTED");
});

Deno.test("classifyCommandPaths: SPINE.md triggers RESTRICTED via hardcoded basenames", () => {
  const workspace = "/tmp/test-workspace";
  const classifier = createPathClassifier(makeConfig());

  const result = classifyCommandPaths({
    paths: [join(workspace, "SPINE.md")],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(result.classification, "RESTRICTED");
});

Deno.test("classifyCommandPaths: resolvedPaths contains absolute paths", () => {
  const workspace = "/tmp/test-workspace";
  const classifier = createPathClassifier(makeConfig());

  const result = classifyCommandPaths({
    paths: ["./relative.txt", "/absolute.txt"],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(result.resolvedPaths.length, 2);
  for (const p of result.resolvedPaths) {
    assertEquals(p.startsWith("/"), true, `Expected absolute path, got: ${p}`);
  }
});

Deno.test("classifyCommandPaths: empty paths returns PUBLIC", () => {
  const classifier = createPathClassifier(makeConfig());

  const result = classifyCommandPaths({
    paths: [],
    classifier,
    workspaceCwd: "/tmp",
  });
  assertEquals(result.classification, "PUBLIC");
  assertEquals(result.resolvedPaths.length, 0);
});

// ─── CRITICAL REGRESSION: run_command must NOT bypass taint escalation ───────
//
// These tests use a classifier WITH resolveCwd (sandbox-aware), which is the
// exact configuration used in production. The bug: remapSandboxPath maps "/"
// to workspacePaths.basePath → PUBLIC, so "ls -al /" succeeds in a PUBLIC
// session without escalation. classifyCommandPaths must use classifyRealPath
// to bypass sandbox remapping.

Deno.test("classifyCommandPaths: root '/' classifies as CONFIDENTIAL (default), NOT PUBLIC — even with sandbox-aware classifier", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  // Create classifier WITH resolveCwd — same as production
  const classifier = createPathClassifier(
    makeConfig(),
    workspacePaths,
    { resolveCwd: () => workspace },
  );

  const result = classifyCommandPaths({
    paths: ["/"],
    classifier,
    workspaceCwd: workspace,
  });
  // "/" is the REAL filesystem root, not the sandbox workspace.
  // It must NOT classify as PUBLIC. Default is CONFIDENTIAL.
  assertEquals(
    result.classification,
    "CONFIDENTIAL",
    "REGRESSION: '/' was remapped to workspace basePath via sandbox remapping. " +
      "classifyCommandPaths must use classifyRealPath, not classify.",
  );
});

Deno.test("classifyCommandPaths: /etc/passwd classifies as CONFIDENTIAL with sandbox-aware classifier", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(
    makeConfig(),
    workspacePaths,
    { resolveCwd: () => workspace },
  );

  const result = classifyCommandPaths({
    paths: ["/etc/passwd"],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(
    result.classification,
    "CONFIDENTIAL",
    "Real filesystem paths outside workspace must classify at default level, not PUBLIC",
  );
});

Deno.test("classifyCommandPaths: workspace paths still classify correctly with sandbox-aware classifier", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(
    makeConfig(),
    workspacePaths,
    { resolveCwd: () => workspace },
  );

  const result = classifyCommandPaths({
    paths: [join(workspace, "restricted", "secret.txt")],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(result.classification, "RESTRICTED");
});

Deno.test("classifyCommandPaths: workspace public dir classifies as PUBLIC (commands CAN run in workspace root)", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(
    makeConfig(),
    workspacePaths,
    { resolveCwd: () => workspace },
  );

  // Simulates no-path command fallback: targetPaths = [workspacePath]
  // where workspacePath is the taint-aware public/ subdir
  const result = classifyCommandPaths({
    paths: [workspacePaths.publicPath],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(
    result.classification,
    "PUBLIC",
    "Workspace public path must classify as PUBLIC — commands must run freely in the workspace",
  );
});

Deno.test("classifyCommandPaths: relative path in workspace classifies at workspace level, not default", () => {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const classifier = createPathClassifier(
    makeConfig(),
    workspacePaths,
    { resolveCwd: () => workspace },
  );

  // "./myfile.txt" resolved against workspaceCwd → /tmp/test-workspace/myfile.txt
  // workspace basePath is /tmp/test-workspace → classified as PUBLIC (workspace root)
  const result = classifyCommandPaths({
    paths: ["./myfile.txt"],
    classifier,
    workspaceCwd: workspace,
  });
  assertEquals(
    result.classification,
    "PUBLIC",
    "Relative paths within workspace must classify at workspace level",
  );
});
