#!/usr/bin/env bash
# Ralph Wiggum Loop — iterates Claude Code with a phase prompt,
# checks for PHASE_COMPLETE or NEEDS_HUMAN tokens.
set -euo pipefail

PHASE="${1:?Usage: ralph-loop.sh <phase-number>}"
PROMPT_FILE="phases/PROMPT_$(printf '%02d' "$PHASE").md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Error: prompt file not found: $PROMPT_FILE"
  exit 1
fi

MAX_ITERATIONS="${MAX_ITERATIONS:-10}"
iteration=0

while (( iteration < MAX_ITERATIONS )); do
  iteration=$((iteration + 1))
  echo "=== Ralph Wiggum Loop — Phase $PHASE — Iteration $iteration ==="

  output=$(claude --print "$PROMPT_FILE" 2>&1) || true

  if echo "$output" | grep -q "PHASE_${PHASE}_COMPLETE"; then
    echo "Phase $PHASE complete after $iteration iteration(s)."
    exit 0
  fi

  if echo "$output" | grep -q "NEEDS_HUMAN"; then
    echo "Phase $PHASE needs human intervention. See BLOCKERS.md."
    exit 1
  fi

  echo "Iteration $iteration did not complete. Retrying..."
done

echo "Phase $PHASE did not complete after $MAX_ITERATIONS iterations."
exit 1
