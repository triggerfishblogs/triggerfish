# Code Style & Conventions

## TypeScript Style

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

## Commit Messages

Format: `[Phase N] <type>: <description>` (use `[Phase A1]`, `[Phase A2]`, `[Phase A3]` for Phase A work)
Types: feat, fix, test, refactor, docs
Example: `[Phase A1] feat: implement Brave SearchProvider`

## Git Rules

- Only push a commit if you are EXPLICITLY asked to. Never push unless the user specifically says to push.
- When asked to stash files, stash ALL FILES THAT HAVE CHANGED. Not just ones you think you changed. Always use `git stash push -u` to catch everything including untracked files.
