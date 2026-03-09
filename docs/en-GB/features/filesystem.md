# Filesystem and Shell Tools

Triggerfish provides the agent with general-purpose filesystem and shell tools
for reading, writing, searching, and executing commands. These are the
foundational tools that other capabilities (exec environment, explore, skills)
build on.

## Tools

### `read_file`

Read the contents of a file at an absolute path.

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| `path`    | string | yes      | Absolute file path to read |

Returns the full text content of the file.

### `write_file`

Write content to a file at a workspace-relative path.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `path`    | string | yes      | Relative path in the workspace |
| `content` | string | yes      | File content to write          |

Writes are scoped to the agent's workspace directory. The agent cannot write to
arbitrary locations on the filesystem.

### `edit_file`

Replace a unique string in a file. The `old_text` must appear exactly once in
the file.

| Parameter  | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| `path`     | string | yes      | Absolute file path to edit                  |
| `old_text` | string | yes      | Exact text to find (must be unique in file) |
| `new_text` | string | yes      | Replacement text                            |

This is a surgical edit tool -- it finds one exact match and replaces it. If the
text appears more than once or not at all, the operation fails with an error.

### `list_directory`

List files and directories at a given absolute path.

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `path`    | string | yes      | Absolute directory path to list |

Returns entries with `/` suffix for directories.

### `search_files`

Search for files matching a glob pattern, or search file contents with grep.

| Parameter        | Type    | Required | Description                                                       |
| ---------------- | ------- | -------- | ----------------------------------------------------------------- |
| `path`           | string  | yes      | Directory to search in                                            |
| `pattern`        | string  | yes      | Glob pattern for file names, or text/regex to search within files |
| `content_search` | boolean | no       | If `true`, search file contents instead of file names             |

### `run_command`

Run a shell command in the agent workspace directory.

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `command` | string | yes      | Shell command to execute |

Returns stdout, stderr, and exit code. Commands are executed in the agent's
workspace directory. The `PRE_TOOL_CALL` hook checks commands against a denylist
before execution.

## Relationship to Other Tools

These filesystem tools overlap with the
[Exec Environment](../integrations/exec-environment) tools (`exec.write`,
`exec.read`, `exec.run`, `exec.ls`). The distinction:

- **Filesystem tools** operate on absolute paths and the agent's default
  workspace. They are always available.
- **Exec tools** operate within a structured workspace with explicit isolation,
  test runners, and package installation. They are part of the exec environment
  integration.

The agent uses filesystem tools for general file operations and exec tools when
working in a development workflow (write/run/fix loop).

## Security

- `write_file` is scoped to the agent's workspace directory
- `run_command` passes through the `PRE_TOOL_CALL` hook with the command as
  context
- A command denylist blocks dangerous operations (`rm -rf /`, `sudo`, etc.)
- All tool responses pass through `POST_TOOL_RESPONSE` for classification and
  taint tracking
- In plan mode, `write_file` is blocked until the plan is approved
