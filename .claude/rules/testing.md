# Testing Requirements & Test Paths

## Testing Requirements

- Unit tests for all public functions
- Integration tests for hook chains
- Property-based tests for classification logic
- All tests must be deterministic (no flaky tests)
- TDD: write tests before implementation when possible
- Each phase has a specific test path (see table below)
- Phase A2 has 10 critical classification boundary tests — these are the most important tests in the entire Phase A

## Test Paths by Phase

| Phase | Test Command |
|-------|-------------|
| 0 | `deno task test tests/setup_test.ts` |
| 1 | `deno task test tests/core/types/` |
| 2–3 | `deno task test tests/core/policy/` |
| 4 | `deno task test tests/core/session/ tests/core/storage/` |
| 5 | `deno task test tests/core/session/lineage_test.ts` |
| 6 | `deno task test tests/mcp/client/` |
| 7 | `deno task test tests/mcp/gateway/` |
| 8 | `deno task test tests/plugin/` |
| 9 | `deno task test tests/channels/cli/` |
| 10 | `deno task test tests/agent/` |
| 11 | `deno task test tests/exec/` |
| 12 | `deno task test tests/e2e/` |
| 13 | `deno task test tests/cli/` |
| A1 | `deno task test tests/tools/web/` |
| A2 | `deno task test tests/tools/memory/` |
| A3 | `deno task test tests/tools/browser/` |
| 14 | `deno task test tests/gateway/` (includes `notifications_test.ts`) |
| 15 | `deno task test tests/channels/` |
| 16 | `deno task test tests/channels/ripple_test.ts tests/channels/groups_test.ts` |
| 17 | `deno task test tests/scheduler/` |
| ~~18~~ | SUPERSEDED by Phase A3 |
| 19 | `deno task test tests/voice/ tests/tidepool/` |
| 20 | `deno task test tests/tools/skills/` |
| 21 | `deno task test tests/routing/ tests/models/ tests/dive/` |
| B1 | `deno task test tests/integrations/google/` |
| B3 | `deno task test tests/tools/obsidian/` |
