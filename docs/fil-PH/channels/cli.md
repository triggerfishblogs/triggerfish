# CLI Channel

Ang command-line interface ang default channel sa Triggerfish. Palagi itong
available, walang external setup na kailangan, at ito ang primary na paraan ng
pakikipag-interact sa iyong agent habang nagde-develop at lokal na paggamit.

## Classification

Ang CLI channel ay naka-default sa `INTERNAL` classification. Ang terminal user
ay **palaging** tinatrato bilang owner -- walang pairing o authentication flow
dahil ikaw mismo ang nagru-run ng process sa iyong machine.

::: info Bakit INTERNAL? Ang CLI ay isang direct, lokal na interface. Tanging
ang may access sa iyong terminal lang ang makakagamit nito. Kaya naman
`INTERNAL` ang tamang default -- freely na maka-share ang agent ng internal data
sa context na ito. :::

## Mga Feature

### Raw Terminal Input

Gumagamit ang CLI ng raw terminal mode na may full ANSI escape sequence parsing.
Nagbibigay ito ng rich editing experience direkta sa iyong terminal:

- **Line editing** -- Mag-navigate gamit ang arrow keys, Home/End, mag-delete ng
  words gamit ang Ctrl+W
- **Input history** -- Pindutin ang Up/Down para mag-cycle sa mga nakaraang inputs
- **Suggestions** -- Tab completion para sa common commands
- **Multi-line input** -- Mag-enter ng mas mahabang prompts nang natural

### Compact Tool Display

Kapag tumatawag ng tools ang agent, nagpapakita ang CLI ng compact one-line
summary bilang default:

```
tool_name arg  result
```

Mag-toggle sa pagitan ng compact at expanded tool output gamit ang **Ctrl+O**.

### Mag-interrupt ng Running Operations

Pindutin ang **ESC** para i-interrupt ang kasalukuyang operation. Nagpapadala
ito ng abort signal sa orchestrator papunta sa LLM provider, para ihinto agad
ang generation. Hindi mo na kailangang maghintay na matapos ang mahabang
response.

### Taint Display

Pwede mong optional na ipakita ang kasalukuyang session taint level sa output
sa pamamagitan ng pag-enable ng `showTaint` sa CLI channel configuration. Ito
ay naglalagay ng classification level sa harap ng bawat response:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Context Length Progress Bar

Nagdi-display ang CLI ng real-time context window usage bar sa separator line sa
ibaba ng terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Napupuno ang bar habang nako-consume ang context tokens
- May lumalabas na blue marker sa 70% threshold (kung saan nag-trigger ang
  automatic compaction)
- Nagiging red ang bar kapag malapit na sa limit
- Pagkatapos ng compaction (`/compact` o automatic), nire-reset ang bar

### MCP Server Status

Ipinapakita rin ng separator ang MCP server connection status:

| Display            | Ibig Sabihin                                    |
| ------------------ | ----------------------------------------------- |
| `MCP 3/3` (green)  | Lahat ng configured servers ay connected        |
| `MCP 2/3` (yellow) | May mga servers pa na nagkokonekta o nag-fail   |
| `MCP 0/3` (red)    | Walang servers na connected                     |

Ang mga MCP servers ay nagkokonekta nang lazily sa background pagkatapos ng
startup. Nag-uupdate ang status sa real time habang nago-online ang mga servers.

## Input History

Ang iyong input history ay naka-persist sa mga sessions sa:

```
~/.triggerfish/data/input_history.json
```

Nilo-load ang history sa startup at sine-save pagkatapos ng bawat input. Pwede
mo itong i-clear sa pamamagitan ng pag-delete ng file.

## Non-TTY / Piped Input

Kapag ang stdin ay hindi TTY (halimbawa, kapag nag-pipe ng input mula sa ibang
process), automatic na nagfa-fall back ang CLI sa **line-buffered mode**. Sa
mode na ito:

- Naka-disable ang raw terminal features (arrow keys, history navigation)
- Binabasa ang input nang line by line mula sa stdin
- Isinusulat ang output sa stdout nang walang ANSI formatting

Pwede kang mag-script ng interactions sa iyong agent:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuration

Kaunting configuration lang ang kailangan ng CLI channel. Automatic itong
ginagawa kapag nag-run ka ng `triggerfish run` o ginamit ang interactive REPL.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | Default | Description                                  |
| ------------- | ------- | ------- | -------------------------------------------- |
| `interactive` | boolean | `true`  | I-enable ang interactive REPL mode           |
| `showTaint`   | boolean | `false` | Ipakita ang session taint level sa output    |

::: tip Walang Setup na Kailangan Gumagana ang CLI channel out of the box. Hindi
mo kailangang mag-configure ng kahit ano para magsimulang gamitin ang
Triggerfish mula sa iyong terminal. :::

## Keyboard Shortcuts

| Shortcut   | Action                                                       |
| ---------- | ------------------------------------------------------------ |
| Enter      | Magpadala ng message                                         |
| Up / Down  | Mag-navigate sa input history                                |
| Ctrl+V     | Mag-paste ng image mula sa clipboard (ipinapadala bilang multimodal content) |
| Ctrl+O     | Mag-toggle ng compact/expanded tool display                  |
| ESC        | I-interrupt ang kasalukuyang operation                        |
| Ctrl+C     | Lumabas sa CLI                                               |
| Ctrl+W     | I-delete ang nakaraang word                                  |
| Home / End | Tumalon sa simula/dulo ng linya                              |
