# Tool Behavior Prompts — DO NOT REMOVE

The file `src/agent/orchestrator/tool_behavior_prompt.ts` contains the agent's
tool behavior directives. These are injected into every agent system prompt and
are **critical infrastructure**.

## What they contain

1. **Anti-narration rules** — "Do not describe what you plan to do. Execute it."
2. **Few-shot examples** — Concrete user/assistant pairs showing correct tool usage
3. **Action-forcing directives** — "You must call at least one tool per response"
4. **Thinking-tag guidance** — Channel internal reasoning into `<think>` tags

## Why they exist

Open-source models (Kimi, Llama, Mistral, etc.) do not reliably use native
function calling without explicit behavioral guidance. Without these directives,
the model narrates its intent ("Let me check the file...") instead of actually
calling tools, or enters repetition loops.

## History

These were removed in commit b48d1fd (Mar 1 2026) under the rationale that
"tools in JSON schema are self-documenting." This caused 6 weeks of continuous
looping and narration bugs that consumed significant development time.

## Rules

- **NEVER remove, simplify, or "clean up" tool_behavior_prompt.ts**
- **NEVER claim these prompts are redundant** — they are the primary defense
- The detection/recovery layer (repetition detection, leaked intent, dense
  narration nudges) is a safety net, NOT the primary mechanism
- If the prompts need changes, discuss with the user first — do not unilaterally
  strip them
- Any commit that removes behavioral directives from the system prompt requires
  explicit user approval
