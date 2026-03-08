# Sub-Agents and LLM Tasks

Triggerfish agents can delegate work to sub-agents and run isolated LLM prompts.
This enables parallel work, focused reasoning, and multi-agent task
decomposition.

## Tools

### `subagent`

Spawn a sub-agent for an autonomous multi-step task. The sub-agent gets its own
conversation context and can use tools independently. Returns the final result
when complete.

| Parameter | Type   | Required | Description                                               |
| --------- | ------ | -------- | --------------------------------------------------------- |
| `task`    | string | yes      | What the sub-agent should accomplish                      |
| `tools`   | string | no       | Comma-separated tool whitelist (default: read-only tools) |

**Default tools:** Sub-agents start with read-only tools (`read_file`,
`list_directory`, `search_files`, `run_command`). Specify additional tools
explicitly if the sub-agent needs write access.

**Example uses:**

- Research a topic while the main agent continues other work
- Explore a codebase in parallel from multiple angles (this is what the
  `explore` tool does internally)
- Delegate a self-contained implementation task

### `llm_task`

Run a one-shot LLM prompt for isolated reasoning. The prompt runs in a separate
context and does not pollute the main conversation history.

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `prompt`  | string | yes      | The prompt to send                    |
| `system`  | string | no       | Optional system prompt                |
| `model`   | string | no       | Optional model/provider name override |

**Example uses:**

- Summarize a long document without filling the main context
- Classify or extract data from structured text
- Get a second opinion on an approach
- Run a prompt against a different model than the primary

### `agents_list`

List configured LLM providers and agents. Takes no parameters.

Returns information about available providers, their models, and configuration
status.

## How Sub-Agents Work

When the agent calls `subagent`, Triggerfish:

1. Creates a new orchestrator instance with its own conversation context
2. Provides the sub-agent with the specified tools (defaulting to read-only)
3. Sends the task as the initial user message
4. The sub-agent runs autonomously -- calling tools, processing results,
   iterating
5. When the sub-agent produces a final response, it is returned to the parent
   agent

Sub-agents inherit the parent session's taint level and classification
constraints. They cannot escalate beyond the parent's ceiling.

## When to Use Each

| Tool       | Use When                                                |
| ---------- | ------------------------------------------------------- |
| `subagent` | Multi-step task requiring tool use and iteration        |
| `llm_task` | Single-shot reasoning, summarization, or classification |
| `explore`  | Codebase understanding (uses sub-agents internally)     |

::: tip The `explore` tool is built on top of `subagent` -- it spawns 2-6
parallel sub-agents depending on the depth level. If you need structured
codebase exploration, use `explore` directly rather than manually spawning
sub-agents. :::

## Sub-Agents vs Agent Teams

Sub-agents are fire-and-forget: the parent waits for a single result.
[Agent Teams](./agent-teams) are persistent groups of collaborating agents with
distinct roles, a lead coordinator, and inter-member communication. Use
sub-agents for focused single-step delegation. Use teams when the task benefits
from multiple specialized perspectives iterating on each other's work.
