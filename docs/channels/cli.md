# CLI Channel

The command-line interface is the default channel in Triggerfish. It is always
available, requires no external setup, and is the primary way you interact with
your agent during development and local use.

## Classification

The CLI channel defaults to `INTERNAL` classification. The terminal user is
**always** treated as the owner -- there is no pairing or authentication flow
because you are running the process directly on your machine.

::: info Why INTERNAL? The CLI is a direct, local interface. Only someone with
access to your terminal can use it. This makes `INTERNAL` the appropriate
default -- your agent can share internal data freely in this context. :::

## Features

### Raw Terminal Input

The CLI uses raw terminal mode with full ANSI escape sequence parsing. This
gives you a rich editing experience directly in your terminal:

- **Line editing** -- Navigate with arrow keys, Home/End, delete words with
  Ctrl+W
- **Input history** -- Press Up/Down to cycle through previous inputs
- **Suggestions** -- Tab completion for common commands
- **Multi-line input** -- Enter longer prompts naturally

### Compact Tool Display

When the agent calls tools, the CLI shows a compact one-line summary by default:

```
tool_name arg  result
```

Toggle between compact and expanded tool output with **Ctrl+O**.

### Interrupt Running Operations

Press **ESC** to interrupt the current operation. This sends an abort signal
through the orchestrator to the LLM provider, stopping generation immediately.
You do not need to wait for a long response to finish.

### Taint Display

You can optionally display the current session taint level in the output by
enabling `showTaint` in the CLI channel configuration. This prepends the
classification level to each response:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Context Length Progress Bar

The CLI displays a real-time context window usage bar in the separator line at
the bottom of the terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- The bar fills as context tokens are consumed
- A blue marker appears at the 70% threshold (where automatic compaction
  triggers)
- The bar turns red when approaching the limit
- After compaction (`/compact` or automatic), the bar resets

### MCP Server Status

The separator also shows MCP server connection status:

| Display            | Meaning                                 |
| ------------------ | --------------------------------------- |
| `MCP 3/3` (green)  | All configured servers connected        |
| `MCP 2/3` (yellow) | Some servers still connecting or failed |
| `MCP 0/3` (red)    | No servers connected                    |

MCP servers connect lazily in the background after startup. The status updates
in real time as servers come online.

## Input History

Your input history is persisted across sessions at:

```
~/.triggerfish/data/input_history.json
```

History is loaded on startup and saved after each input. You can clear it by
deleting the file.

## Non-TTY / Piped Input

When stdin is not a TTY (for example, when piping input from another process),
the CLI automatically falls back to **line-buffered mode**. In this mode:

- Raw terminal features (arrow keys, history navigation) are disabled
- Input is read line by line from stdin
- Output is written to stdout without ANSI formatting

This allows you to script interactions with your agent:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuration

The CLI channel requires minimal configuration. It is created automatically when
you run `triggerfish run` or use the interactive REPL.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | Default | Description                        |
| ------------- | ------- | ------- | ---------------------------------- |
| `interactive` | boolean | `true`  | Enable interactive REPL mode       |
| `showTaint`   | boolean | `false` | Show session taint level in output |

::: tip No Setup Required The CLI channel works out of the box. You do not need
to configure anything to start using Triggerfish from your terminal. :::

## Keyboard Shortcuts

| Shortcut   | Action                                                  |
| ---------- | ------------------------------------------------------- |
| Enter      | Send message                                            |
| Up / Down  | Navigate input history                                  |
| Ctrl+V     | Paste image from clipboard (sent as multimodal content) |
| Ctrl+O     | Toggle compact/expanded tool display                    |
| ESC        | Interrupt current operation                             |
| Ctrl+C     | Exit the CLI                                            |
| Ctrl+W     | Delete previous word                                    |
| Home / End | Jump to start/end of line                               |
