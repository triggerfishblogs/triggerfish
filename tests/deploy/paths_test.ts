/**
 * Tests for environment detection and path resolution.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { isDockerEnvironment } from "../../src/core/env.ts";
import {
  resolveBaseDir,
  resolveConfigPath,
} from "../../src/cli/config/paths.ts";

// Helper to temporarily set/unset env vars for testing
function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
): void {
  const originals: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    originals[key] = Deno.env.get(key);
    if (vars[key] === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, vars[key]!);
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originals[key]!);
      }
    }
  }
}

// --- isDockerEnvironment ---

Deno.test("isDockerEnvironment returns true when TRIGGERFISH_DOCKER=true", () => {
  withEnv({ TRIGGERFISH_DOCKER: "true" }, () => {
    assertEquals(isDockerEnvironment(), true);
  });
});

Deno.test("isDockerEnvironment returns true when TRIGGERFISH_DOCKER=1", () => {
  withEnv({ TRIGGERFISH_DOCKER: "1" }, () => {
    assertEquals(isDockerEnvironment(), true);
  });
});

Deno.test("isDockerEnvironment returns false when TRIGGERFISH_DOCKER is unset and no /.dockerenv", () => {
  withEnv({ TRIGGERFISH_DOCKER: undefined }, () => {
    // In a normal test environment, /.dockerenv should not exist
    assertEquals(isDockerEnvironment(), false);
  });
});

Deno.test("isDockerEnvironment returns false when TRIGGERFISH_DOCKER=false", () => {
  withEnv({ TRIGGERFISH_DOCKER: "false" }, () => {
    assertEquals(isDockerEnvironment(), false);
  });
});

// --- resolveBaseDir ---

Deno.test("resolveBaseDir returns $HOME/.triggerfish by default", () => {
  withEnv(
    { TRIGGERFISH_DATA_DIR: undefined, TRIGGERFISH_DOCKER: undefined },
    () => {
      const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
      assertEquals(resolveBaseDir(), `${home}/.triggerfish`);
    },
  );
});

Deno.test("resolveBaseDir uses TRIGGERFISH_DATA_DIR when set", () => {
  withEnv({
    TRIGGERFISH_DATA_DIR: "/custom/path",
    TRIGGERFISH_DOCKER: undefined,
  }, () => {
    assertEquals(resolveBaseDir(), "/custom/path");
  });
});

Deno.test("resolveBaseDir returns /data when TRIGGERFISH_DOCKER=true", () => {
  withEnv(
    { TRIGGERFISH_DATA_DIR: undefined, TRIGGERFISH_DOCKER: "true" },
    () => {
      assertEquals(resolveBaseDir(), "/data");
    },
  );
});

Deno.test("resolveBaseDir: TRIGGERFISH_DATA_DIR takes precedence over Docker", () => {
  withEnv(
    { TRIGGERFISH_DATA_DIR: "/override", TRIGGERFISH_DOCKER: "true" },
    () => {
      assertEquals(resolveBaseDir(), "/override");
    },
  );
});

// --- resolveConfigPath ---

Deno.test("resolveConfigPath appends /triggerfish.yaml", () => {
  assertEquals(resolveConfigPath("/some/dir"), "/some/dir/triggerfish.yaml");
});

Deno.test("resolveConfigPath defaults to resolveBaseDir()", () => {
  withEnv(
    { TRIGGERFISH_DATA_DIR: "/test/base", TRIGGERFISH_DOCKER: undefined },
    () => {
      assertEquals(resolveConfigPath(), "/test/base/triggerfish.yaml");
    },
  );
});
