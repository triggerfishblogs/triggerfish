# Codebase Exploration

The `explore` tool gives the agent fast, structured understanding of codebases
and directories. Instead of manually calling `read_file`, `list_directory`, and
`search_files` in sequence, the agent calls `explore` once and gets back a
comprehensive analysis produced by parallel sub-agents.

## Tool

### `explore`

Explore a directory or codebase to understand structure, patterns, and
conventions. Read-only.

| Parameter | Type   | Required | Description                                               |
| --------- | ------ | -------- | --------------------------------------------------------- |
| `path`    | string | yes      | Directory or file to explore                              |
| `focus`   | string | no       | What to look for (e.g. "auth patterns", "test structure") |
| `depth`   | string | no       | How thorough: `shallow`, `standard` (default), or `deep`  |

## Depth Levels

| Depth      | Agents Spawned | What's Analyzed                                         |
| ---------- | -------------- | ------------------------------------------------------- |
| `shallow`  | 2              | Directory tree + dependency manifests                   |
| `standard` | 3-4            | Tree + manifests + code patterns + focus (if specified) |
| `deep`     | 5-6            | Everything above + import graph tracing + git history   |

## How It Works

The explore tool spawns parallel sub-agents, each focused on a different facet:

1. **Tree agent** -- Maps directory structure (3 levels deep), identifies key
   files by convention (`mod.ts`, `main.ts`, `deno.json`, `README.md`, etc.)
2. **Manifest agent** -- Reads dependency files (`deno.json`, `package.json`,
   `tsconfig.json`), lists dependencies, scripts, and entry points
3. **Pattern agent** -- Samples source files to detect coding patterns: module
   structure, error handling, type conventions, import style, naming, testing
4. **Focus agent** -- Searches for files and patterns related to the focus query
5. **Import agent** (deep only) -- Traces import graphs from entry points,
   detects circular dependencies
6. **Git agent** (deep only) -- Analyzes recent commits, current branch,
   uncommitted changes

All agents run concurrently. Results are assembled into a structured
`ExploreResult`:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## When the Agent Uses It

The agent is instructed to use `explore` in these situations:

- Before modifying unfamiliar code
- When asked "what does this do" or "how is this structured"
- At the start of any non-trivial task involving existing code
- When it needs to find the right file or pattern to follow

After exploring, the agent references the patterns and conventions it found when
writing new code, ensuring consistency with the existing codebase.

## Examples

```
# Quick overview of a directory
explore({ path: "src/auth" })

# Focused search for specific patterns
explore({ path: "src/auth", focus: "how tokens are validated" })

# Deep analysis including git history and import graphs
explore({ path: "src/core", depth: "deep" })

# Understand test conventions before writing tests
explore({ path: "tests/", focus: "test patterns and assertions" })
```
