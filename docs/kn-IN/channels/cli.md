# CLI Channel

Command-line interface Triggerfish ನ default channel. ಇದು ಯಾವಾಗಲೂ ಲಭ್ಯ, ಯಾವ ಬಾಹ್ಯ
setup ಅಗತ್ಯವಿಲ್ಲ, ಮತ್ತು development ಮತ್ತು local ಬಳಕೆ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ agent ನೊಂದಿಗೆ
ಸಂವಾದಿಸುವ ಪ್ರಾಥಮಿಕ ಮಾರ್ಗ.

## Classification

CLI channel `INTERNAL` classification ಗೆ default ಆಗುತ್ತದೆ. Terminal user **ಯಾವಾಗಲೂ**
owner ಎಂದು ಪರಿಗಣಿಸಲ್ಪಡುತ್ತಾರೆ -- pairing ಅಥವಾ authentication flow ಇಲ್ಲ ಏಕೆಂದರೆ ನೀವು
ನಿಮ್ಮ machine ನಲ್ಲಿ process ನೇರವಾಗಿ ಚಲಿಸುತ್ತಿದ್ದೀರಿ.

::: info INTERNAL ಏಕೆ? CLI direct, local interface. ನಿಮ್ಮ terminal ಗೆ ಪ್ರವೇಶ ಇರುವ ವ್ಯಕ್ತಿ
ಮಾತ್ರ ಇದನ್ನು ಬಳಸಬಹುದು. ಇದು `INTERNAL` ಅನ್ನು ಸರಿಯಾದ default ಮಾಡುತ್ತದೆ -- ನಿಮ್ಮ agent ಈ
context ನಲ್ಲಿ internal ಡೇಟಾ ಮುಕ್ತವಾಗಿ ಹಂಚಿಕೊಳ್ಳಬಹುದು. :::

## ವೈಶಿಷ್ಟ್ಯಗಳು

### Raw Terminal Input

CLI raw terminal mode ನಲ್ಲಿ ಸಂಪೂರ್ಣ ANSI escape sequence parsing ನೊಂದಿಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ.
ಇದು ನಿಮ್ಮ terminal ನಲ್ಲಿ ನೇರವಾಗಿ ಸಮೃದ್ಧ editing experience ನೀಡುತ್ತದೆ:

- **Line editing** -- Arrow keys, Home/End ನೊಂದಿಗೆ navigate ಮಾಡಿ, Ctrl+W ನೊಂದಿಗೆ words
  delete ಮಾಡಿ
- **Input history** -- ಹಿಂದಿನ inputs cycle ಮಾಡಲು Up/Down ಒತ್ತಿ
- **Suggestions** -- Common commands ಗಾಗಿ Tab completion
- **Multi-line input** -- ಉದ್ದ prompts ಸ್ವಾಭಾವಿಕವಾಗಿ ನಮೂದಿಸಿ

### Compact Tool Display

Agent tools ಕರೆದಾಗ, CLI default ಆಗಿ compact one-line summary ತೋರಿಸುತ್ತದೆ:

```
tool_name arg  result
```

**Ctrl+O** ನೊಂದಿಗೆ compact ಮತ್ತು expanded tool output ನಡುವೆ toggle ಮಾಡಿ.

### ಚಾಲಿತ Operations ಅಡ್ಡಿ ಮಾಡಿ

ಪ್ರಸ್ತುತ operation ಅಡ್ಡಿ ಮಾಡಲು **ESC** ಒತ್ತಿ. ಇದು orchestrator ಮೂಲಕ LLM provider ಗೆ abort
signal ಕಳುಹಿಸುತ್ತದೆ, generation ತಕ್ಷಣ ನಿಲ್ಲಿಸುತ್ತದೆ. ಉದ್ದ response ಮುಗಿಯಲು ಕಾಯಬೇಕಾಗಿಲ್ಲ.

### Taint Display

CLI channel configuration ನಲ್ಲಿ `showTaint` enable ಮಾಡುವ ಮೂಲಕ output ನಲ್ಲಿ ಪ್ರಸ್ತುತ session
taint level ಐಚ್ಛಿಕವಾಗಿ ತೋರಿಸಬಹುದು. ಇದು ಪ್ರತಿ response ಮೊದಲು classification level ಸೇರಿಸುತ್ತದೆ:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Context Length Progress Bar

CLI terminal ತಳಭಾಗದ separator line ನಲ್ಲಿ real-time context window usage bar ತೋರಿಸುತ್ತದೆ:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Context tokens consume ಆದಂತೆ bar ತುಂಬುತ್ತದೆ
- 70% threshold ನಲ್ಲಿ blue marker ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ (ಸ್ವಯಂಚಾಲಿತ compaction trigger ಆಗುವಲ್ಲಿ)
- Limit ಹತ್ತಿರ ಬಂದಾಗ bar red ಆಗುತ್ತದೆ
- Compaction ನಂತರ (`/compact` ಅಥವಾ ಸ್ವಯಂಚಾಲಿತ), bar reset ಆಗುತ್ತದೆ

### MCP Server Status

Separator MCP server connection status ಕೂಡ ತೋರಿಸುತ್ತದೆ:

| Display            | ಅರ್ಥ                                        |
| ------------------ | ------------------------------------------- |
| `MCP 3/3` (green)  | ಎಲ್ಲ configured servers ಸಂಪರ್ಕಿತ              |
| `MCP 2/3` (yellow) | ಕೆಲವು servers ಇನ್ನೂ connecting ಅಥವಾ failed  |
| `MCP 0/3` (red)    | ಯಾವ servers ಸಂಪರ್ಕಿತ ಇಲ್ಲ                    |

MCP servers startup ನಂತರ background ನಲ್ಲಿ lazily ಸಂಪರ್ಕಿಸುತ್ತವೆ. Servers online ಆದಂತೆ
status real time ನಲ್ಲಿ update ಆಗುತ್ತದೆ.

## Input History

ನಿಮ್ಮ input history sessions ಅಡ್ಡಲಾಗಿ ಇಲ್ಲಿ persist ಆಗುತ್ತದೆ:

```
~/.triggerfish/data/input_history.json
```

History startup ನಲ್ಲಿ load ಮತ್ತು ಪ್ರತಿ input ನಂತರ save ಆಗುತ್ತದೆ. ಫೈಲ್ ಅಳಿಸಿ clear ಮಾಡಬಹುದು.

## Non-TTY / Piped Input

stdin TTY ಆಗಿಲ್ಲದಿದ್ದರೆ (ಉದಾಹರಣೆಗೆ, ಮತ್ತೊಂದು process ನಿಂದ input piping ಮಾಡುವಾಗ), CLI
ಸ್ವಯಂಚಾಲಿತವಾಗಿ **line-buffered mode** ಗೆ fall back ಮಾಡುತ್ತದೆ. ಈ mode ನಲ್ಲಿ:

- Raw terminal features (arrow keys, history navigation) disabled
- stdin ನಿಂದ line by line input ಓದಲ್ಪಡುತ್ತದೆ
- ANSI formatting ಇಲ್ಲದೆ stdout ಗೆ output ಬರೆಯಲ್ಪಡುತ್ತದೆ

ಇದು ನಿಮ್ಮ agent ನೊಂದಿಗೆ interactions script ಮಾಡಲು ಅನುಮತಿಸುತ್ತದೆ:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuration

CLI channel ಕನಿಷ್ಟ configuration ಅಗತ್ಯ. `triggerfish run` ಚಲಿಸಿದಾಗ ಅಥವಾ interactive REPL
ಬಳಸಿದಾಗ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರಚಿಸಲ್ಪಡುತ್ತದೆ.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | Default | ವಿವರಣೆ                              |
| ------------- | ------- | ------- | ------------------------------------- |
| `interactive` | boolean | `true`  | Interactive REPL mode enable ಮಾಡಿ    |
| `showTaint`   | boolean | `false` | Output ನಲ್ಲಿ session taint level ತೋರಿಸಿ |

::: tip Setup ಅಗತ್ಯವಿಲ್ಲ CLI channel out of the box ಕೆಲಸ ಮಾಡುತ್ತದೆ. ನಿಮ್ಮ terminal
ನಿಂದ Triggerfish ಬಳಸಲು ಪ್ರಾರಂಭಿಸಲು ಏನೂ configure ಮಾಡಬೇಕಾಗಿಲ್ಲ. :::

## Keyboard Shortcuts

| Shortcut   | ಕ್ರಿಯೆ                                                       |
| ---------- | ------------------------------------------------------------ |
| Enter      | Message ಕಳುಹಿಸಿ                                              |
| Up / Down  | Input history navigate ಮಾಡಿ                                   |
| Ctrl+V     | Clipboard ನಿಂದ image paste ಮಾಡಿ (multimodal content ಆಗಿ ಕಳುಹಿಸಿ) |
| Ctrl+O     | Compact/expanded tool display toggle ಮಾಡಿ                     |
| ESC        | ಪ್ರಸ್ತುತ operation ಅಡ್ಡಿ ಮಾಡಿ                                 |
| Ctrl+C     | CLI ನಿಂದ ಹೊರಗೆ ಹೋಗಿ                                           |
| Ctrl+W     | ಹಿಂದಿನ word ಅಳಿಸಿ                                             |
| Home / End | Line ಪ್ರಾರಂಭ/ಅಂತ್ಯಕ್ಕೆ jump ಮಾಡಿ                              |
