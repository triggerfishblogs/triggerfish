# Code Style & Conventions

## Types

- `interface` over `type` for object shapes; `readonly` for immutable properties
- `Result<T, E>` for fallible operations, never thrown exceptions; no `any`
- Branded types for all IDs (SessionId, UserId, ChannelId)
- Immutable data: return new objects, never mutate

## Files

- Max 300 lines per source file (excluding tests)
- Every source file starts with a `@module` JSDoc comment (not tests, not mod.ts)
- All public APIs have JSDoc comments
- One concept per file; export via `mod.ts` barrels; new files must be re-exported
- 8+ files in a directory → split into subdirectories (2-5 files each) with mod.ts barrels
- New directories under `src/` → check `.claude/rules/` paths frontmatter covers them

## Naming

- Exported functions: verb+domain-noun (`enforceClassificationPolicy`, `resolveSecretRefs`)
- Never vague verbs alone: `process`, `handle`, `run`, `execute`, `check`, `validate`, `do`, `perform`, `manage`
- Error messages: domain noun + what failed (`Session not found: ${id}`). Never just `"error"` or `"failed"`.

## Functions

- Under 25 lines; extract sections into named functions
- Orchestrate OR compute, never both
- No boolean params — use options objects; max 3 positional params
- No dead code, commented-out blocks, or stale TODO stubs

## Git

- Never push unless EXPLICITLY asked
- `git stash push -u` to catch all files including untracked
- Commits: `<type>: <description>` — types: feat, fix, test, refactor, docs
