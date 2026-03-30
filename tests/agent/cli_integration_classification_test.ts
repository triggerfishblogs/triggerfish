/**
 * Tests for CLI integration recognition in run_command classification.
 *
 * When `run_command` invokes a CLI tool belonging to a configured integration
 * (e.g. `gh` → GitHub), the command should be classified using the integration's
 * classification level — not by treating API route segments as filesystem paths.
 */
import { assertEquals } from "@std/assert";
import { assembleSecurityContext } from "../../src/agent/dispatch/security_context.ts";
import { createPathClassifier } from "../../src/core/security/path_classification.ts";
import type {
  FilesystemSecurityConfig,
  WorkspacePaths,
} from "../../src/core/security/path_classification.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import { join } from "@std/path";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(
  defaultClassification: ClassificationLevel = "CONFIDENTIAL",
): FilesystemSecurityConfig {
  return {
    paths: new Map(),
    defaultClassification,
  };
}

function makeWorkspacePaths(basePath: string): WorkspacePaths {
  return {
    basePath,
    publicPath: join(basePath, "public"),
    internalPath: join(basePath, "internal"),
    confidentialPath: join(basePath, "confidential"),
    restrictedPath: join(basePath, "restricted"),
  };
}

function classifyRunCommand(
  command: string,
  opts?: {
    readonly integrationClassifications?: ReadonlyMap<
      string,
      ClassificationLevel
    >;
    readonly taint?: ClassificationLevel;
  },
): ClassificationLevel | null {
  const workspace = "/tmp/test-workspace";
  const workspacePaths = makeWorkspacePaths(workspace);
  const taint = opts?.taint ?? "PUBLIC";
  const taintDir = join(workspace, taint.toLowerCase());
  const classifier = createPathClassifier(makeConfig(), workspacePaths, {
    resolveCwd: () => taintDir,
  });

  const call = { name: "run_command", args: { command } };
  const { ctx } = assembleSecurityContext(call, {
    pathClassifier: classifier,
    getWorkspacePath: () => taintDir,
    integrationClassifications: opts?.integrationClassifications,
  });
  return ctx.resourceClassification;
}

const GITHUB_PUBLIC = new Map<string, ClassificationLevel>([
  ["github_", "PUBLIC"],
]);

const GITHUB_INTERNAL = new Map<string, ClassificationLevel>([
  ["github_", "INTERNAL"],
]);

// ─── gh CLI recognition ─────────────────────────────────────────────────────

Deno.test("run_command: gh api repos/owner/name classifies at GitHub integration level", () => {
  const result = classifyRunCommand("gh api repos/owner/name/releases", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(
    result,
    "PUBLIC",
    "gh command should use GitHub integration classification, not filesystem default",
  );
});

Deno.test("run_command: gh api with INTERNAL GitHub config classifies as INTERNAL", () => {
  const result = classifyRunCommand("gh api repos/owner/name/releases", {
    integrationClassifications: GITHUB_INTERNAL,
  });
  assertEquals(result, "INTERNAL");
});

Deno.test("run_command: gh release list classifies at GitHub integration level", () => {
  const result = classifyRunCommand("gh release list", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: gh pr view 123 classifies at GitHub integration level", () => {
  const result = classifyRunCommand("gh pr view 123", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(result, "PUBLIC");
});

// ─── Pipes use integration classification ───────────────────────────────────

Deno.test("run_command: gh api ... | jq classifies at GitHub integration level", () => {
  const result = classifyRunCommand(
    "gh api repos/greghavens/triggerfish/releases --paginate | jq '.[].assets'",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(
    result,
    "PUBLIC",
    "gh piped to jq should use GitHub integration classification",
  );
});

Deno.test("run_command: gh ... | jq | sort | awk still PUBLIC", () => {
  const result = classifyRunCommand(
    "gh api repos/owner/name/releases | jq '.[]' | sort_by(.tag) | awk '{print}'",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: gh ... | tee /etc/shadow escalates to CONFIDENTIAL", () => {
  const result = classifyRunCommand(
    "gh api repos/owner/name | tee /etc/shadow",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(
    result,
    "CONFIDENTIAL",
    "Pipe to tee with dangerous path must still escalate",
  );
});

// ─── Compound commands still escalate ───────────────────────────────────────

Deno.test("run_command: gh ... && cat /etc/passwd escalates to CONFIDENTIAL", () => {
  const result = classifyRunCommand(
    "gh api repos/owner/name && cat /etc/passwd",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(
    result,
    "CONFIDENTIAL",
    "Compound command with dangerous path must escalate despite gh prefix",
  );
});

Deno.test("run_command: gh ... ; rm -rf / escalates to CONFIDENTIAL", () => {
  const result = classifyRunCommand(
    "gh api repos/owner/name; rm -rf /",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(
    result,
    "CONFIDENTIAL",
    "Semicolon-chained command with / must escalate",
  );
});

// ─── GitHub URL recognition (any executable) ─────────────────────────────────

Deno.test("run_command: curl api.github.com/repos classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    'curl -s "https://api.github.com/repos/greghavens/triggerfish/releases?per_page=100"',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: curl api.github.com/repos piped to jq classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    'curl -s "https://api.github.com/repos/greghavens/triggerfish/releases?per_page=100" | jq \'.[].assets\'',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: curl api.github.com/repos piped to jq and head classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    'curl -s "https://api.github.com/repos/owner/name/releases" | jq \'.\' | head -200',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: wget api.github.com/repos classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    "wget -qO- https://api.github.com/repos/owner/name/tags",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: curl api.github.com without /repos classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    "curl https://api.github.com/users/greghavens",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: curl github.com URL classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    "curl -L https://github.com/greghavens/triggerfish/archive/refs/tags/v0.7.5.tar.gz",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: curl raw.githubusercontent.com classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    "curl https://raw.githubusercontent.com/greghavens/triggerfish/main/README.md",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

// ─── Env var prefixed commands ────────────────────────────────────────────────

Deno.test("run_command: GH_TOKEN='' gh api classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    'GH_TOKEN="" gh api /repos/greghavens/triggerfish/releases --paginate',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: GITHUB_TOKEN=xxx curl api.github.com classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    'GITHUB_TOKEN=abc123 curl -s "https://api.github.com/repos/owner/name/releases"',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: multiple env vars before gh classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    'GH_TOKEN="" NO_COLOR=1 gh api /repos/owner/name/releases',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});

// ─── Default GitHub classification (no integration configured) ────────────────

Deno.test("run_command: curl api.github.com without integrationClassifications defaults to PUBLIC", () => {
  const result = classifyRunCommand(
    'curl -s "https://api.github.com/repos/owner/name/releases"',
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: gh api without integrationClassifications defaults to PUBLIC", () => {
  const result = classifyRunCommand(
    "gh api /repos/owner/name/releases",
  );
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: GH_TOKEN gh api without integrationClassifications defaults to PUBLIC", () => {
  const result = classifyRunCommand(
    'GH_TOKEN="" gh api /repos/owner/name/releases',
  );
  assertEquals(result, "PUBLIC");
});

// ─── Compound commands with GitHub + dangerous paths still escalate ───────────

Deno.test("run_command: curl api.github.com && cat /etc/passwd escalates to CONFIDENTIAL", () => {
  const result = classifyRunCommand(
    'curl https://api.github.com/repos/owner/name && cat /etc/passwd',
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "CONFIDENTIAL");
});

Deno.test("run_command: gh api | tee /etc/shadow escalates", () => {
  const result = classifyRunCommand(
    "gh api repos/owner/name | tee /etc/shadow",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "CONFIDENTIAL");
});

// ─── Non-GitHub URLs should NOT match ─────────────────────────────────────────

Deno.test("run_command: curl to non-github API uses filesystem classification", () => {
  const result = classifyRunCommand(
    "curl https://api.example.com/repos/owner/name",
    { integrationClassifications: GITHUB_PUBLIC },
  );
  // /repos/owner/name resolved against CWD → inside publicPath → PUBLIC
  // (not CONFIDENTIAL because it resolves inside workspace)
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: cat /etc/passwd still classifies as CONFIDENTIAL", () => {
  const result = classifyRunCommand("cat /etc/passwd", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(result, "CONFIDENTIAL");
});

// ─── Non-gh commands with bare path tokens ────────────────────────────────────

Deno.test("run_command: non-gh command with slash token uses filesystem classification", () => {
  const result = classifyRunCommand("curl repos/owner/name", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  // repos/owner/name resolved against CWD (/tmp/test-workspace/public/)
  // → /tmp/test-workspace/public/repos/owner/name → inside publicPath → PUBLIC
  assertEquals(result, "PUBLIC");
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

Deno.test("run_command: /usr/bin/gh recognized as gh", () => {
  const result = classifyRunCommand("/usr/bin/gh api repos/owner/name", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: command gh recognized as gh", () => {
  const result = classifyRunCommand("command gh api repos/owner/name", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: env gh recognized as gh", () => {
  const result = classifyRunCommand("env gh api repos/owner/name", {
    integrationClassifications: GITHUB_PUBLIC,
  });
  assertEquals(result, "PUBLIC");
});

Deno.test("run_command: gh with --jq flag and complex expression classifies as PUBLIC", () => {
  const result = classifyRunCommand(
    `gh api /repos/greghavens/triggerfish/releases --paginate --jq '.[] | {tag_name, assets: [.assets[] | {name, download_count}]}'`,
    { integrationClassifications: GITHUB_PUBLIC },
  );
  assertEquals(result, "PUBLIC");
});
