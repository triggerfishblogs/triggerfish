#!/bin/bash
# Phase C: Create git worktrees for parallel development
# Run from your main triggerfish repo root
#
# 4 fully independent worktrees — zero cross-dependencies:
#   C1: Notion integration (src/notion/)
#   C2: Signal channel adapter (src/channels/signal/)
#   C3: Utility skills & tools (skills/bundled/ + src/tools/)
#   C4: iMessage channel adapter (src/channels/imessage/)
#
# Each worktree gets PLAN_PROMPT.md, BUILD_PROMPT.md, and ralph.sh.
# Run the plan first, review, then start the ralph loop.

set -e

SPECS_DIR="$HOME/Downloads"
REPO_ROOT="$(pwd)"

if [ ! -f "CLAUDE.md" ]; then
  echo "ERROR: Run this from the triggerfish repo root (where CLAUDE.md lives)"
  exit 1
fi

for spec in SPEC-C1-NOTION SPEC-C2-SIGNAL SPEC-C3-UTILITY-SKILLS-AND-TOOLS SPEC-C4-IMESSAGE; do
  if [ ! -f "$SPECS_DIR/${spec}.md" ]; then
    echo "ERROR: Missing $SPECS_DIR/${spec}.md"
    exit 1
  fi
done

echo "Creating Phase C worktrees..."

git worktree add ../tf-c1 -b phase-c1/notion
git worktree add ../tf-c2 -b phase-c2/signal
git worktree add ../tf-c3 -b phase-c3/utility
git worktree add ../tf-c4 -b phase-c4/imessage

cp "$SPECS_DIR/SPEC-C1-NOTION.md" ../tf-c1/
cp "$SPECS_DIR/SPEC-C2-SIGNAL.md" ../tf-c2/
cp "$SPECS_DIR/SPEC-C3-UTILITY-SKILLS-AND-TOOLS.md" ../tf-c3/
cp "$SPECS_DIR/SPEC-C4-IMESSAGE.md" ../tf-c4/

# --- C1: Notion ---

cat > ../tf-c1/PLAN_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C1-NOTION.md @ARCHITECTURE_REFERENCE.md @TOOLS-IMPLEMENTATION-GUIDE.md

# Phase C1: Notion Integration — PLANNING

This is an INTEGRATION in src/notion/. Same pattern as src/google/.
NOT a plugin, NOT a skill, NOT an LLM tool.

Read SPEC-C1-NOTION.md for the full specification.
Read ARCHITECTURE_REFERENCE.md for type definitions and interfaces.
Read TOOLS-IMPLEMENTATION-GUIDE.md for tool registration patterns.
Explore the codebase — especially src/google/, src/web/, src/memory/ — to understand existing patterns.

## CRITICAL BOUNDARIES

- ALL Notion code in src/notion/. Nothing in src/cli/, src/tools/, skills/.
- api.notion.com MUST NOT appear outside src/notion/.
- Tool defs exported from src/notion/tools.ts, wired into orchestrator.
- Every tool call fires PRE_TOOL_CALL and POST_TOOL_RESPONSE hooks.
- No business logic in src/cli/main.ts — only import and wire.
- Result<T, E> for all errors, never throw.

## Deliverable

Generate IMPLEMENTATION_PLAN.md with numbered, ordered tasks. Each task must be:
- Atomic (completable in one iteration)
- Verifiable (has a test command or check)
- Ordered (respects dependencies)

Start with tests, then implementation, then wiring.
EOF

cat > ../tf-c1/BUILD_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C1-NOTION.md @ARCHITECTURE_REFERENCE.md @TOOLS-IMPLEMENTATION-GUIDE.md @IMPLEMENTATION_PLAN.md

# Phase C1: Notion Integration — BUILD

Read IMPLEMENTATION_PLAN.md. Find the first task where passes is NOT true.
Work on exactly ONE task:
1. Write or check the failing test
2. Implement until the test passes
3. Run `deno task test tests/notion/` to verify
4. Mark the task as complete in IMPLEMENTATION_PLAN.md
5. Commit: `[C1] feat: <description>`

If stuck after 3 attempts on one task, document the blocker in IMPLEMENTATION_PLAN.md and move on.

Output <promise>PHASE_C1_COMPLETE</promise> when ALL tasks pass.
EOF

# --- C2: Signal ---

cat > ../tf-c2/PLAN_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C2-SIGNAL.md @ARCHITECTURE_REFERENCE.md

# Phase C2: Signal Channel Adapter — PLANNING

This is a CHANNEL ADAPTER in src/channels/signal/.
Implements ChannelAdapter interface. Same pattern as src/channels/whatsapp/, telegram/, etc.

Read SPEC-C2-SIGNAL.md for the full specification.
Explore existing channel adapters to understand the ChannelAdapter interface and wiring patterns.

## CRITICAL BOUNDARIES

- ALL Signal code in src/channels/signal/. Nothing elsewhere.
- Implements ChannelAdapter (connect, disconnect, send, onMessage, status).
- Channel router treats it identically to every other adapter.
- Classification/taint/hooks handled by channel router, NOT by adapter.
- No business logic in src/cli/main.ts — only import and wire.

## Deliverable

Generate IMPLEMENTATION_PLAN.md with numbered, ordered tasks. Each task must be:
- Atomic (completable in one iteration)
- Verifiable (has a test command or check)
- Ordered (respects dependencies)

Start with types, then client, then adapter, then wiring.
EOF

cat > ../tf-c2/BUILD_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C2-SIGNAL.md @ARCHITECTURE_REFERENCE.md @IMPLEMENTATION_PLAN.md

# Phase C2: Signal Channel Adapter — BUILD

Read IMPLEMENTATION_PLAN.md. Find the first task where passes is NOT true.
Work on exactly ONE task:
1. Write or check the failing test
2. Implement until the test passes
3. Run `deno task test tests/channels/signal/` to verify
4. Mark the task as complete in IMPLEMENTATION_PLAN.md
5. Commit: `[C2] feat: <description>`

If stuck after 3 attempts on one task, document the blocker in IMPLEMENTATION_PLAN.md and move on.

Output <promise>PHASE_C2_COMPLETE</promise> when ALL tasks pass.
EOF

# --- C3: Utility Skills & Tools ---

cat > ../tf-c3/PLAN_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C3-UTILITY-SKILLS-AND-TOOLS.md @ARCHITECTURE_REFERENCE.md @TOOLS-IMPLEMENTATION-GUIDE.md

# Phase C3: Utility Skills & Tools — PLANNING

Two categories:

SKILLS (pure SKILL.md, NO code, NO tool registration):
- skills/bundled/deep-research/SKILL.md
- skills/bundled/weather/SKILL.md
- skills/bundled/maps/SKILL.md
- skills/bundled/pdf/SKILL.md

TOOLS (new code in src/tools/):
- src/tools/llm-task.ts (llm_task)
- src/tools/summarize.ts (wraps llm_task)
- src/tools/healthcheck.ts (platform introspection)

Read SPEC-C3-UTILITY-SKILLS-AND-TOOLS.md for the full specification.
Explore src/tools/, skills/bundled/, and the skill loader to understand existing patterns.

## CRITICAL BOUNDARIES

- Skills are ONLY SKILL.md files. No TypeScript. No tool registration. No Plugin SDK.
- Tools go in src/tools/ and register in the orchestrator.
- No src/weather/, src/maps/, src/pdf/ directories.
- No business logic in src/cli/ beyond wiring.

## Deliverable

Generate IMPLEMENTATION_PLAN.md with numbered, ordered tasks. Each task must be:
- Atomic (completable in one iteration)
- Verifiable (has a test command or check)
- Ordered (respects dependencies)

Skills first (no tests needed — just markdown), then llm_task, then summarize, then healthcheck.
EOF

cat > ../tf-c3/BUILD_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C3-UTILITY-SKILLS-AND-TOOLS.md @ARCHITECTURE_REFERENCE.md @TOOLS-IMPLEMENTATION-GUIDE.md @IMPLEMENTATION_PLAN.md

# Phase C3: Utility Skills & Tools — BUILD

Read IMPLEMENTATION_PLAN.md. Find the first task where passes is NOT true.
Work on exactly ONE task:
1. Write or check the failing test (skip for SKILL.md tasks)
2. Implement until the test passes
3. Run `deno task test tests/tools/` to verify
4. Mark the task as complete in IMPLEMENTATION_PLAN.md
5. Commit: `[C3] feat: <description>`

If stuck after 3 attempts on one task, document the blocker in IMPLEMENTATION_PLAN.md and move on.

Output <promise>PHASE_C3_COMPLETE</promise> when ALL tasks pass.
EOF

# --- C4: iMessage ---

cat > ../tf-c4/PLAN_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C4-IMESSAGE.md @ARCHITECTURE_REFERENCE.md

# Phase C4: iMessage Channel Adapter (BlueBubbles) — PLANNING

This is a CHANNEL ADAPTER in src/channels/imessage/.
Implements ChannelAdapter interface. Same pattern as src/channels/whatsapp/, telegram/, etc.

Read SPEC-C4-IMESSAGE.md for the full specification.
Explore existing channel adapters to understand the ChannelAdapter interface and wiring patterns.

## CRITICAL BOUNDARIES

- ALL iMessage/BlueBubbles code in src/channels/imessage/. Nothing elsewhere.
- Implements ChannelAdapter (connect, disconnect, send, onMessage, status).
- Webhook handler registers a route on the gateway.
- Channel router treats it identically to every other adapter.
- Classification/taint/hooks handled by channel router, NOT by adapter.
- No business logic in src/cli/main.ts — only import and wire.

## Deliverable

Generate IMPLEMENTATION_PLAN.md with numbered, ordered tasks. Each task must be:
- Atomic (completable in one iteration)
- Verifiable (has a test command or check)
- Ordered (respects dependencies)

Start with types, then client, then webhooks, then adapter, then wiring.
EOF

cat > ../tf-c4/BUILD_PROMPT.md << 'EOF'
@CLAUDE.md @SPEC-C4-IMESSAGE.md @ARCHITECTURE_REFERENCE.md @IMPLEMENTATION_PLAN.md

# Phase C4: iMessage Channel Adapter (BlueBubbles) — BUILD

Read IMPLEMENTATION_PLAN.md. Find the first task where passes is NOT true.
Work on exactly ONE task:
1. Write or check the failing test
2. Implement until the test passes
3. Run `deno task test tests/channels/imessage/` to verify
4. Mark the task as complete in IMPLEMENTATION_PLAN.md
5. Commit: `[C4] feat: <description>`

If stuck after 3 attempts on one task, document the blocker in IMPLEMENTATION_PLAN.md and move on.

Output <promise>PHASE_C4_COMPLETE</promise> when ALL tasks pass.
EOF

# --- Create the ralph loop runner (shared across all worktrees) ---

for wt in ../tf-c1 ../tf-c2 ../tf-c3 ../tf-c4; do
cat > "$wt/ralph.sh" << 'RALPH'
#!/bin/bash
# Ralph Wiggum loop runner
# Usage: ./ralph.sh plan    (one-shot plan generation — review before building)
#        ./ralph.sh build   (iterative build loop until complete)
set -e

MODE="${1:-build}"

if [ "$MODE" = "plan" ]; then
  echo "🧠 Running plan pass..."
  cat PLAN_PROMPT.md | claude --dangerously-skip-permissions
  echo ""
  echo "✅ Plan generated. Review IMPLEMENTATION_PLAN.md, then run: ./ralph.sh build"

elif [ "$MODE" = "build" ]; then
  if [ ! -f "IMPLEMENTATION_PLAN.md" ]; then
    echo "ERROR: No IMPLEMENTATION_PLAN.md found. Run ./ralph.sh plan first."
    exit 1
  fi
  echo "🔨 Starting ralph loop..."
  while true; do
    cat BUILD_PROMPT.md | claude --dangerously-skip-permissions
    echo "🔄 Iteration complete. Restarting with fresh context..."
    sleep 2
  done

else
  echo "Usage: ./ralph.sh plan|build"
  exit 1
fi
RALPH
chmod +x "$wt/ralph.sh"
done

echo ""
echo "✅ Phase C worktrees created:"
echo "  ../tf-c1  (Notion integration)       branch: phase-c1/notion"
echo "  ../tf-c2  (Signal adapter)           branch: phase-c2/signal"
echo "  ../tf-c3  (Utility skills & tools)   branch: phase-c3/utility"
echo "  ../tf-c4  (iMessage adapter)         branch: phase-c4/imessage"
echo ""
echo "All 4 are fully independent — run them all in parallel."
echo ""
echo "Step 1 — Generate plans (review each before proceeding):"
echo "  cd ../tf-c1 && ./ralph.sh plan"
echo "  cd ../tf-c2 && ./ralph.sh plan"
echo "  cd ../tf-c3 && ./ralph.sh plan"
echo "  cd ../tf-c4 && ./ralph.sh plan"
echo ""
echo "Step 2 — Review IMPLEMENTATION_PLAN.md in each worktree"
echo ""
echo "Step 3 — Start ralph loops (4 terminals):"
echo "  cd ../tf-c1 && ./ralph.sh build"
echo "  cd ../tf-c2 && ./ralph.sh build"
echo "  cd ../tf-c3 && ./ralph.sh build"
echo "  cd ../tf-c4 && ./ralph.sh build"
echo ""
echo "To clean up after merge:"
echo "  git worktree remove ../tf-c1"
echo "  git worktree remove ../tf-c2"
echo "  git worktree remove ../tf-c3"
echo "  git worktree remove ../tf-c4"
