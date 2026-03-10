# Dependency Layers

Allowed import directions between top-level `src/` modules. Violations create
circular dependencies and layer breaches that are hard to unwind later.

## Layer Diagram

```
Layer 0 — Foundation (imports nothing in src/)
  core/

Layer 1 — Single-dependency modules (import only core/)
  agent/       → core/
  exec/        → core/
  models/      → core/
  tools/       → core/
  channels/    → core/
  scheduler/   → core/
  mcp/         → core/
  plugin/      → core/
  workflow/    → core/
  routing/     → (none — self-contained)

Layer 2 — Multi-dependency modules
  integrations/ → core/, mcp/
  gateway/      → core/, agent/, exec/, tools/, channels/, scheduler/,
                   workflow/, mcp/, integrations/, cli/ (paths/constants only)
  cli/          → core/, dive/, channels/ (cli/chat.ts only), gateway/ (startup only)
  dive/         → core/, cli/ (paths, config prompts)
```

## Rules

1. **core/ must NEVER import from any other src/ module.** It is the foundation layer. If something needs to be shared project-wide, define it in core/.

2. **Layer 1 modules import only from core/.** agent/, exec/, models/, tools/, channels/, scheduler/, mcp/, plugin/ must not import from each other. Cross-module wiring happens in gateway/ or cli/.

3. **gateway/ is the wiring layer.** It has broad import permissions because it assembles the full runtime (`startup/startup.ts`, `startup/factory.ts`, `tools/agent_tools.ts`). This is expected — the cost is that gateway/ is the hardest module to test in isolation.

4. **cli/ and dive/ are tightly coupled.** cli/main.ts dispatches to dive/wizard.ts and dive/patrol.ts. dive/wizard.ts imports cli/config/paths.ts and cli/config/config.ts. This bidirectional dependency is accepted but must not spread — no other module should import from cli/ or dive/ except gateway/ (for path constants).

5. **routing/ is self-contained.** No cross-module dependencies. Keep it that way.

6. **integrations/ may import core/ and mcp/.** It must not import from agent/, tools/, or gateway/.

## Thresholds

- **Fan-in > 8 importers** = hotspot. If 8+ files across different top-level modules import from the same file, consider moving it to core/ or splitting it.
- **Fan-out > 6 top-level modules from one file** = too much responsibility. Only gateway/startup/startup.ts and gateway/tools/agent_tools.ts should exceed this (they are wiring code). Any other file importing from 6+ top-level modules needs refactoring.

## Current Hotspots (Accepted)

- `core/types/classification.ts` — imported by nearly every module (foundation type)
- `core/types/session.ts` — imported by most modules (session is the unit of state)
- `gateway/startup/startup.ts` — imports from 10+ modules (wiring layer, expected)
- `gateway/tools/agent_tools.ts` — imports from tools/, agent/, core/ (tool registration hub)
