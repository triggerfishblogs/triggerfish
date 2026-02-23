# Code Style & Conventions

## TypeScript Style

- Code must have zero lint errors.
- TypeScript strict mode, no exceptions
- Prefer `interface` over `type` for object shapes
- Use `readonly` for all immutable properties
- All public APIs must have JSDoc comments
- Error handling: use `Result<T, E>` pattern, not thrown exceptions
- No `any` types allowed anywhere
- Branded types for all IDs (SessionId, UserId, ChannelId)
- Immutable data structures: functions return new objects, never mutate

## File Organization

- One concept per file
- Export via `mod.ts` barrel files per module
- Tests adjacent to source: `foo.ts` → `foo_test.ts`
- Directories with fewer than 8 source files stay flat. Directories with 8+ files should be split into subdirectories grouped by domain concept (2-5 files each). Every subdirectory needs a mod.ts barrel.
- No relative path references across module boundaries — use barrel imports
- Exported public API functions use verb+domain-noun naming: `enforceClassificationPolicy`, `propagateSessionTaint`, `resolveSecretRefs`. Never vague verbs alone: `process`, `handle`, `run`, `execute`, `check`, `validate`, `do`, `perform`, `manage`, `get`, `set`, `update`.

## Function Design

- Functions should be under 25 lines. If a function needs a comment explaining a section, extract that section into a named function instead.
- One level of abstraction per function. A function either orchestrates calls to other functions OR does leaf-level computation, never both. If you see high-level calls (`initSession`, `routeMessage`) mixed with low-level details (`buffer.slice(0, 4)`) in the same function, split it.
- No boolean parameters. Use an options object with named fields, or split into separate functions. `createSession(config, true, false)` is unreadable — use `createSession(config, { streaming: true })`.
- Max 3 positional parameters. Beyond that, use a single options/config object.
- No dead code. No commented-out blocks, no unexported functions that aren't called, no TODO stubs older than the current phase. Dead code wastes context tokens every time Claude reads the file.
- Error messages start with the domain noun and describe what failed: `Session not found: ${id}`, `Policy evaluation timed out after ${ms}ms`, `Classification flow blocked: ${source} → ${target}`. Never just `"error"` or `"failed"` or `"invalid input"`.

## Commit Messages

Format: `[Phase N] <type>: <description>` (use `[Phase A1]`, `[Phase A2]`, `[Phase A3]` for Phase A work)
Types: feat, fix, test, refactor, docs
Example: `[Phase A1] feat: implement Brave SearchProvider`

## Git Rules

- Only push a commit if you are EXPLICITLY asked to. Never push unless the user specifically says to push.
- When asked to stash files, stash ALL FILES THAT HAVE CHANGED. Not just ones you think you changed. Always use `git stash push -u` to catch everything including untracked files.
