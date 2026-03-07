/**
 * Secret classifier tests — path-to-classification mapping.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createSecretClassifier } from "../../../../src/core/secrets/classification/secret_classifier.ts";

Deno.test("classifier: matches exact path", () => {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "secret/data/triggerfish/restricted/db", level: "RESTRICTED" },
    ],
    defaultLevel: "INTERNAL",
  });

  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/restricted/db"),
    "RESTRICTED",
  );
});

Deno.test("classifier: matches wildcard pattern", () => {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "secret/data/triggerfish/restricted/*", level: "RESTRICTED" },
    ],
    defaultLevel: "INTERNAL",
  });

  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/restricted/db-creds"),
    "RESTRICTED",
  );
});

Deno.test("classifier: double-star matches nested paths", () => {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "secret/data/triggerfish/**", level: "CONFIDENTIAL" },
    ],
    defaultLevel: "PUBLIC",
  });

  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/deep/nested/path"),
    "CONFIDENTIAL",
  );
});

Deno.test("classifier: first match wins", () => {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "secret/data/triggerfish/restricted/*", level: "RESTRICTED" },
      { path: "secret/data/triggerfish/*", level: "INTERNAL" },
    ],
    defaultLevel: "PUBLIC",
  });

  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/restricted/key"),
    "RESTRICTED",
  );
  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/general"),
    "INTERNAL",
  );
});

Deno.test("classifier: returns default level when no mapping matches", () => {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "secret/data/specific/*", level: "RESTRICTED" },
    ],
    defaultLevel: "INTERNAL",
  });

  assertEquals(classifier.classifyPath("unmatched/path"), "INTERNAL");
});

Deno.test("classifier: empty mappings always returns default", () => {
  const classifier = createSecretClassifier({
    mappings: [],
    defaultLevel: "CONFIDENTIAL",
  });

  assertEquals(classifier.classifyPath("any/path"), "CONFIDENTIAL");
});

Deno.test("classifier: production-style multi-level mapping", () => {
  const classifier = createSecretClassifier({
    mappings: [
      {
        path: "secret/data/triggerfish/restricted/*",
        level: "RESTRICTED",
      },
      {
        path: "secret/data/triggerfish/confidential/*",
        level: "CONFIDENTIAL",
      },
      {
        path: "secret/data/triggerfish/internal/*",
        level: "INTERNAL",
      },
      { path: "secret/data/triggerfish/*", level: "INTERNAL" },
    ],
    defaultLevel: "INTERNAL",
  });

  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/restricted/master-key"),
    "RESTRICTED",
  );
  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/confidential/api-key"),
    "CONFIDENTIAL",
  );
  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/internal/config"),
    "INTERNAL",
  );
  assertEquals(
    classifier.classifyPath("secret/data/triggerfish/general"),
    "INTERNAL",
  );
});
