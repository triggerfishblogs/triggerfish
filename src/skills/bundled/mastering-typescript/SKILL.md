---
name: mastering-typescript
description: >
  TypeScript development patterns for Deno 2.x and Triggerfish.
  Covers strict mode, Result types, branded types, factory functions,
  immutable interfaces, deno.json configuration, and @std/ library usage.
  Use when writing or reviewing TypeScript code in this project.
classification_ceiling: INTERNAL
requires_tools: []
network_domains: []
---

# Mastering TypeScript for Deno and Triggerfish

Strict mode, no exceptions, no `any`, no classes. Factory functions, Result types, branded IDs, immutable interfaces.

## Deno 2.x Basics

Deno replaces Node.js, npm, and bundlers with a single runtime. No `package.json`, no `node_modules`.

### Dependencies

Dependencies are declared in `deno.json` with import maps:

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@^1",
    "@std/yaml": "jsr:@std/yaml@^1",
    "@std/path": "jsr:@std/path@^1",
    "@db/sqlite": "jsr:@db/sqlite@^0.13",
    "@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@^0.39.0"
  }
}
```

Two specifier types:
- `jsr:` -- Deno standard library and Deno-native packages
- `npm:` -- Node.js packages (used for SDKs like Anthropic, grammy, Bolt)

Import in code using the mapped names:

```typescript
import { assertEquals } from "@std/assert";
import { parse as parseYaml } from "@std/yaml";
import { Database } from "@db/sqlite";
```

### Built-in Tooling

No external tools needed:

| Command | Purpose |
|---------|---------|
| `deno fmt` | Format code (replaces Prettier) |
| `deno lint` | Lint code (replaces ESLint) |
| `deno test` | Run tests (replaces Jest/Vitest) |
| `deno check` | Type check (replaces tsc) |
| `deno task <name>` | Run tasks from deno.json |

### Permissions

Deno is secure by default. Code needs explicit permissions:

```bash
deno test --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net --allow-sys
```

## Strict Mode

TypeScript strict mode is non-negotiable. In `deno.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This enables all strict checks: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.

### The `any` Ban

Never use `any`. Alternatives:

| Instead of `any` | Use |
|-------------------|-----|
| Unknown data from external sources | `unknown` and narrow with type guards |
| Flexible object | `Record<string, unknown>` |
| Callback with unknown signature | Proper typed function signature |
| Temporary "make it compile" | Fix the actual type issue |

## The Result Pattern

Triggerfish never throws exceptions for expected failures. Every fallible operation returns `Result<T, E>`:

```typescript
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

Defined in `src/core/types/classification.ts`. Used everywhere:

```typescript
export function parseClassification(
  input: string,
): Result<ClassificationLevel, string> {
  if (VALID_LEVELS.has(input)) {
    return { ok: true, value: input as ClassificationLevel };
  }
  return { ok: false, error: `Invalid classification level: "${input}"` };
}
```

Consumer narrows with `if`:

```typescript
const result = parseClassification(raw);
if (result.ok) {
  // result.value is ClassificationLevel here
  return result.value;
} else {
  // result.error is string here
  log.warn(result.error);
  return "PUBLIC";
}
```

### When to throw vs return Result

- **Return Result**: Expected failures (invalid input, missing data, permission denied)
- **Throw**: Programmer errors that should never happen (violated invariants, impossible states)

In practice, Triggerfish almost never throws.

## Branded Types

Branded types prevent mixing up IDs:

```typescript
export type SessionId = string & { readonly __brand: unique symbol };
export type UserId = string & { readonly __brand: unique symbol };
export type ChannelId = string & { readonly __brand: unique symbol };
```

This is a compile-time-only check. At runtime, branded types are plain strings. Create them with:

```typescript
const sessionId = crypto.randomUUID() as SessionId;
const userId = "user-123" as UserId;
```

TypeScript prevents accidentally passing a `UserId` where a `SessionId` is expected.

## Interface Over Type

Always use `interface` for object shapes. Use `type` only for unions and aliases:

```typescript
// Good: interface for object shapes
interface ChannelStatus {
  readonly connected: boolean;
  readonly channelType: string;
}

// Good: type for unions
type ClassificationLevel = "RESTRICTED" | "CONFIDENTIAL" | "INTERNAL" | "PUBLIC";

// Good: type for aliases
type MessageHandler = (message: ChannelMessage) => void;

// Bad: type for object shapes
type ChannelStatus = { connected: boolean; channelType: string };
```

### All Properties Readonly

Every property on every interface is `readonly`:

```typescript
interface LlmCompletionResult {
  readonly content: string;
  readonly toolCalls: readonly unknown[];
  readonly usage: LlmUsage;
}
```

For arrays, use `readonly T[]` or `ReadonlyArray<T>`.

## Factory Functions Over Classes

Triggerfish uses factory functions that return interface objects. Never use classes:

```typescript
export function createProviderRegistry(): LlmProviderRegistry {
  // Private state via closure -- not accessible from outside
  const providers = new Map<string, LlmProvider>();
  let defaultName: string | undefined;

  // Return an object satisfying the interface
  return {
    register(provider: LlmProvider): void {
      providers.set(provider.name, provider);
    },
    get(name: string): LlmProvider | undefined {
      return providers.get(name);
    },
    setDefault(name: string): void {
      defaultName = name;
    },
    getDefault(): LlmProvider | undefined {
      if (defaultName === undefined) return undefined;
      return providers.get(defaultName);
    },
  };
}
```

Why factory functions:
- Private state via closure (no `private` keyword gymnastics)
- No `this` binding issues
- No inheritance hierarchies
- The consumer only sees the interface, never the internals

## Immutable Data

Functions return new objects. Never mutate:

```typescript
// Good: return new object with spread
export function updateTaint(
  session: SessionState,
  level: ClassificationLevel,
  reason: string,
): SessionState {
  return {
    ...session,
    taint: maxClassification(session.taint, level),
    history: [...session.history, { level, reason, timestamp: new Date() }],
  };
}

// Bad: mutating in place
session.taint = level;
session.history.push(event);
```

## Module Organization

### One concept per file

Each file exports one primary concept:

```
src/core/types/classification.ts  -- ClassificationLevel, Result, comparison functions
src/core/storage/provider.ts      -- StorageProvider interface
src/core/storage/memory.ts        -- createMemoryStorage (in-memory implementation)
src/core/storage/sqlite.ts        -- createSqliteStorage (SQLite implementation)
```

### Barrel exports via mod.ts

Each module directory has a `mod.ts` that re-exports:

```typescript
// src/core/storage/mod.ts
export type { StorageProvider } from "./provider.ts";
export { createMemoryStorage } from "./memory.ts";
export { createSqliteStorage } from "./sqlite.ts";
```

Import from barrel, not from individual files:

```typescript
// Good
import { createMemoryStorage } from "../core/storage/mod.ts";

// Bad
import { createMemoryStorage } from "../core/storage/memory.ts";
```

### JSDoc module comments

Every file starts with a JSDoc module comment:

```typescript
/**
 * StorageProvider -- unified persistence abstraction.
 *
 * All stateful data flows through this interface.
 * Implementations include in-memory (tests) and SQLite (default).
 *
 * @module
 */
```

## @std/ Library Usage

| Package | Purpose | Import |
|---------|---------|--------|
| `@std/assert` | Test assertions | `import { assertEquals } from "@std/assert"` |
| `@std/yaml` | YAML parsing | `import { parse } from "@std/yaml"` |
| `@std/path` | Path manipulation | `import { join, resolve } from "@std/path"` |

Some files use the older URL-based imports (`https://deno.land/std@0.224.0/`). New code should use the mapped imports from `deno.json`.

## SQLite with @db/sqlite

The `@db/sqlite` package returns **objects**, not tuples:

```typescript
// Correct: use row.columnName
const row = stmt.get<{ value: string }>(key);
return row ? row.value : null;

// Wrong: positional access
const row = stmt.get(key);
return row[0]; // undefined!
```

The generic type parameter defines the row shape:

```typescript
interface KvRow {
  readonly key: string;
  readonly value: string;
}

const rows = stmt.all<KvRow>();
rows.map(r => r.key); // typed correctly
```

Requires `--allow-ffi` permission (native SQLite binding).

## Classification System

Four levels, strictly ordered:

```
RESTRICTED (4)  >  CONFIDENTIAL (3)  >  INTERNAL (2)  >  PUBLIC (1)
```

Data can only flow to equal or higher classification (no write-down rule):

```typescript
canFlowTo("CONFIDENTIAL", "RESTRICTED")  // true (up is ok)
canFlowTo("CONFIDENTIAL", "PUBLIC")      // false (write-down blocked)
canFlowTo("INTERNAL", "INTERNAL")        // true (same level ok)
```

## Common Mistakes

| Mistake | Rule |
|---------|------|
| Using `any` | Use `unknown` and narrow |
| Throwing exceptions | Return `Result<T, E>` |
| Mutating objects | Spread to create new objects |
| Using classes | Use factory functions |
| Using `type` for objects | Use `interface` |
| Missing `readonly` | Every property, every array |
| Cross-module relative imports | Import from `mod.ts` barrels |
| Positional SQLite access | Use named properties from row objects |
| Forgetting permissions | Deno is secure-by-default |
