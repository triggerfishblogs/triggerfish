---
name: tdd
version: 1.0.0
description: >
  Test-Driven Development methodology for Deno 2.x projects.
  Teaches the red-green-refactor cycle using Deno's built-in test runner
  and @std/assert. Use when writing new features, fixing bugs, or
  refactoring existing code in Triggerfish.
classification_ceiling: INTERNAL
requires_tools: []
network_domains: []
---

# Test-Driven Development with Deno

Write the test first. Watch it fail. Write the minimum code to pass. Refactor.

## The TDD Cycle

```
RED    Write a test for the behavior you want. Run it. It must fail.
GREEN  Write the simplest code that makes the test pass. Nothing more.
REFACTOR  Clean up duplication and improve structure. Tests stay green.
```

Never skip the red step. If the test passes before you write implementation code, either the test is wrong or the feature already exists.

## When to Use TDD

- Adding a new function, module, or integration
- Fixing a bug (write a test that reproduces it first)
- Refactoring existing code (ensure tests exist before changing)
- Implementing a spec from PHASE_BREAKDOWN.md

## Test Structure

Every test uses `Deno.test()`. Name tests as `"ComponentName: descriptive behavior"`:

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";

Deno.test("PolicyEngine: evaluates allow rule for matching input", () => {
  const engine = createPolicyEngine();
  engine.addRule(allowRule);
  const result = engine.evaluate(matchingInput);
  assertEquals(result.action, "ALLOW");
});
```

For async tests:

```typescript
Deno.test("SessionManager: create returns session with PUBLIC taint", async () => {
  const mgr = await makeManager();
  const session = await mgr.create({ userId: "u" as UserId, channelId: "c" as ChannelId });
  assertEquals(session.taint, "PUBLIC");
  assertExists(session.id);
});
```

## Assert Functions

Import from `jsr:@std/assert`:

```typescript
import {
  assert,              // boolean truthiness
  assertEquals,        // strict equality (most common)
  assertExists,        // not null/undefined
  assertMatch,         // regex match
  assertNotEquals,     // strict inequality
  assertRejects,       // async function throws
  assertStringIncludes, // substring match
} from "jsr:@std/assert";
```

| Function | Use When |
|----------|----------|
| `assertEquals(actual, expected)` | Comparing values, objects, arrays |
| `assertExists(value)` | Checking something is not null/undefined |
| `assert(condition)` | Simple boolean check |
| `assertStringIncludes(str, sub)` | Checking partial string content |
| `assertRejects(fn, ErrorType?)` | Testing async error paths |
| `assertMatch(str, regex)` | Pattern matching on strings |

## Testing the Result Pattern

Every Triggerfish function returns `Result<T, E>`, never throws. Test both paths:

```typescript
// Success path
Deno.test("parseClassification: valid input returns ok Result", () => {
  const result = parseClassification("RESTRICTED");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "RESTRICTED");
  }
});

// Error path
Deno.test("parseClassification: invalid input returns error Result", () => {
  const result = parseClassification("INVALID");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "Invalid classification");
  }
});
```

Always narrow with `if (result.ok)` before accessing `.value` or `.error`. TypeScript enforces this.

## Test Helpers

Write local helper functions at the bottom of each test file. Common patterns:

### Factory helper with overrideable defaults

```typescript
function makeSession(taint: ClassificationLevel = "PUBLIC") {
  let s = createSession({
    userId: "u" as UserId,
    channelId: "c" as ChannelId,
  });
  if (taint !== "PUBLIC") {
    s = updateTaint(s, taint, "test setup");
  }
  return s;
}
```

### Mock provider

```typescript
function createMockProvider(
  name: string,
  response = "mock response",
): LlmProvider {
  return {
    name,
    supportsStreaming: false,
    async complete(_messages, _tools, _options) {
      return {
        content: response,
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      };
    },
  };
}
```

### Partial override helper

```typescript
function makeAnswers(
  overrides: Partial<WizardAnswers> = {},
): WizardAnswers {
  return {
    provider: "anthropic",
    providerModel: "claude-sonnet-4-5",
    apiKey: "",
    agentName: "TestBot",
    mission: "A test agent.",
    ...overrides,
  };
}
```

## Branded Type Casting

Triggerfish uses branded types for IDs. In tests, cast string literals:

```typescript
const session = createSession({
  userId: "u" as UserId,
  channelId: "c" as ChannelId,
});
assertEquals(session.taint, "PUBLIC");
```

## Temp Directory Cleanup

For tests that create files, use `Deno.makeTempDir()` with try/finally:

```typescript
Deno.test("ExecTools: write creates file in workspace", async () => {
  const tmpDir = await Deno.makeTempDir();
  const ws = await createWorkspace({ agentId: "test", basePath: tmpDir });
  try {
    const result = await tools.write("hello.txt", "world");
    assertEquals(result.ok, true);
  } finally {
    await ws.destroy();
  }
});
```

Never leave temp directories behind. The `finally` block runs even when assertions fail.

## Environment-Gated Tests

For integration tests requiring live credentials:

```typescript
Deno.test({
  name: "AnthropicProvider: real API call (integration)",
  ignore: !Deno.env.get("ANTHROPIC_API_KEY"),
  async fn() {
    const provider = createAnthropicProvider({});
    const result = await provider.complete(
      [{ role: "user", content: "Say hello" }],
      [],
      {},
    );
    assertStringIncludes(result.content, "hello");
  },
});
```

The `ignore` flag skips the test when the env var is missing. It runs in CI where credentials are set.

## Sanitizer Flags

Some SDKs (Slack, Discord) leak async ops on import. Disable sanitizers for those tests only:

```typescript
Deno.test({
  name: "Slack adapter: factory creates adapter",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const adapter = createSlackChannel({ botToken: "xoxb-fake", ... });
    assertEquals(adapter.status().channelType, "slack");
  },
});
```

Only use these flags when you understand why the leak occurs. Never use them to hide real bugs.

## Running Tests

```bash
# Run all tests
deno task test

# Run tests for a specific module
deno task test tests/core/types/

# Run a single test file
deno task test tests/skills/skills_test.ts

# Watch mode (re-runs on file changes)
deno task test:watch
```

The test task includes all necessary permissions:
`--allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net --allow-sys --no-check`

## Step-by-Step Walkthrough

### Example: Adding a `maxClassification()` function

**Step 1: RED -- Write the failing test**

```typescript
// tests/core/types/classification_test.ts
Deno.test("maxClassification: returns higher of two levels", () => {
  assertEquals(maxClassification("PUBLIC", "CONFIDENTIAL"), "CONFIDENTIAL");
  assertEquals(maxClassification("RESTRICTED", "INTERNAL"), "RESTRICTED");
  assertEquals(maxClassification("PUBLIC", "PUBLIC"), "PUBLIC");
});
```

Run: `deno task test tests/core/types/classification_test.ts`
Result: **FAIL** -- `maxClassification` is not defined.

**Step 2: GREEN -- Write minimal implementation**

```typescript
// src/core/types/classification.ts
export function maxClassification(
  a: ClassificationLevel,
  b: ClassificationLevel,
): ClassificationLevel {
  return CLASSIFICATION_ORDER[a] >= CLASSIFICATION_ORDER[b] ? a : b;
}
```

Run the test again. Result: **PASS**.

**Step 3: REFACTOR**

The implementation is already minimal. Check if the function should be exported from `mod.ts`. Add it to the barrel. Run all tests to confirm nothing broke.

## Deterministic Tests

All tests must produce the same result every time. Rules:

- No randomness (use deterministic test data)
- No external services (mock them)
- No time-dependent logic (inject clocks)
- No shared mutable state between tests

```typescript
// Verify determinism explicitly
Deno.test("HookRunner: same input always produces same decision", async () => {
  const runner = createHookRunner(engine);
  const session = makeSession("CONFIDENTIAL");
  const input = { target_classification: "PUBLIC" };

  const r1 = await runner.run("PRE_OUTPUT", { session, input });
  const r2 = await runner.run("PRE_OUTPUT", { session, input });
  assertEquals(r1.allowed, r2.allowed);
  assertEquals(r1.action, r2.action);
});
```

## Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Writing code before the test | You don't know if your test actually catches failures | Write test, see it fail, then implement |
| Testing implementation details | Tests break when you refactor | Test behavior and outputs, not internals |
| Over-implementing in GREEN | Extra code has no test coverage | Write only what the current test requires |
| Using `any` in test helpers | Defeats TypeScript safety | Type your mocks with the real interfaces |
| Skipping the REFACTOR step | Technical debt accumulates | Always review after green; clean up |
| Ignoring failing tests | Broken tests erode trust | Fix immediately or delete if obsolete |
