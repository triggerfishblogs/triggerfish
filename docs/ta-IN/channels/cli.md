# CLI சேனல்

Command-line interface என்பது Triggerfish இல் default சேனல். இது எப்போதும் கிடைக்கும், வெளிப்புற setup தேவையில்லை, மற்றும் development மற்றும் local பயன்பாட்டின் போது உங்கள் agent உடன் நீங்கள் interact செய்யும் முதன்மை வழி.

## Classification

CLI சேனல் `INTERNAL` classification க்கு default ஆகும். Terminal பயனர் **எப்போதும்** owner என்று கருதப்படுகிறார் -- pairing அல்லது authentication flow இல்லை ஏனெனில் நீங்கள் நேரடியாக உங்கள் machine இல் process இயக்குகிறீர்கள்.

::: info ஏன் INTERNAL? CLI ஒரு நேரடி, local interface. உங்கள் terminal ஐ அணுகக்கூடியவர் மட்டுமே அதை பயன்படுத்த முடியும். இதனால் `INTERNAL` என்பது பொருத்தமான default -- உங்கள் agent இந்த context இல் internal data ஐ சுதந்திரமாக share செய்யலாம். :::

## Features

### Raw Terminal Input

CLI raw terminal mode உடன் முழு ANSI escape sequence parsing உடன் இயங்குகிறது. இது உங்கள் terminal இல் நேரடியாக ஒரு rich editing experience தருகிறது:

- **Line editing** -- Arrow keys, Home/End உடன் navigate செய்யவும், Ctrl+W உடன் words நீக்கவும்
- **Input history** -- முந்தைய inputs மூலம் cycle செய்ய Up/Down அழுத்தவும்
- **Suggestions** -- பொதுவான commands க்கு Tab completion
- **Multi-line input** -- இயற்கையாக நீண்ட prompts உள்ளிடவும்

### Compact Tool Display

Agent tools அழைக்கும்போது, CLI default ஆக ஒரு compact one-line summary காட்டுகிறது:

```
tool_name arg  result
```

**Ctrl+O** உடன் compact மற்றும் expanded tool output இடையே மாற்றவும்.

### Running Operations ஐ Interrupt செய்யவும்

தற்போதைய operation ஐ interrupt செய்ய **ESC** அழுத்தவும். இது orchestrator மூலம் LLM provider க்கு ஒரு abort signal அனுப்புகிறது, generation உடனடியாக நிறுத்துகிறது. நீண்ட response முடிவதை காத்திருக்க தேவையில்லை.

### Taint Display

CLI channel configuration இல் `showTaint` enable செய்வதன் மூலம் output இல் தற்போதைய session taint நிலையை விரும்பினால் காட்டலாம். இது ஒவ்வொரு response க்கும் classification நிலையை முன்னிலையில் சேர்க்கிறது:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Context Length Progress Bar

CLI terminal அடியில் separator line இல் real-time context window usage bar காட்டுகிறது:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Context tokens consume ஆகும்போது bar நிரம்புகிறது
- 70% threshold இல் ஒரு blue marker தோன்றுகிறது (automatic compaction trigger ஆகும் இடத்தில்)
- வரம்பை நெருங்கும்போது bar சிவப்பாக மாறுகிறது
- Compaction பிறகு (`/compact` அல்லது automatic), bar reset ஆகிறது

### MCP Server Status

Separator MCP server connection status ஐயும் காட்டுகிறது:

| Display            | பொருள்                                 |
| ------------------ | ---------------------------------------- |
| `MCP 3/3` (green)  | அனைத்து கட்டமைக்கப்பட்ட servers இணைக்கப்பட்டன |
| `MCP 2/3` (yellow) | சில servers இன்னும் இணைகின்றன அல்லது தோல்வியடைந்தன |
| `MCP 0/3` (red)    | எந்த servers உம் இணைக்கப்படவில்லை       |

MCP servers startup க்கு பிறகு background இல் lazily இணைகின்றன. Servers online வரும்போது status real time இல் புதுப்பிக்கிறது.

## Input History

உங்கள் input history sessions முழுவதும் persist ஆகிறது:

```
~/.triggerfish/data/input_history.json
```

History startup போது load ஆகிறது மற்றும் ஒவ்வொரு input க்கும் பிறகு சேமிக்கப்படுகிறது. கோப்பை நீக்குவதன் மூலம் அதை clear செய்யலாம்.

## Non-TTY / Piped Input

stdin ஒரு TTY ஆக இல்லாதபோது (உதாரணமாக, மற்றொரு process இலிருந்து input piping செய்யும்போது), CLI தானாக **line-buffered mode** க்கு fallback ஆகிறது. இந்த mode இல்:

- Raw terminal features (arrow keys, history navigation) முடக்கப்படுகின்றன
- Input stdin இலிருந்து line by line படிக்கப்படுகிறது
- Output ANSI formatting இல்லாமல் stdout க்கு எழுதப்படுகிறது

இது உங்கள் agent உடன் interactions ஐ script செய்ய அனுமதிக்கிறது:

```bash
echo "What is the weather today?" | triggerfish run
```

## கட்டமைப்பு

CLI சேனலுக்கு குறைந்தபட்ச கட்டமைப்பு தேவை. `triggerfish run` இயக்கும்போது அல்லது interactive REPL பயன்படுத்தும்போது தானாக உருவாக்கப்படுகிறது.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | Default | விளக்கம்                                  |
| ------------- | ------- | ------- | ------------------------------------------ |
| `interactive` | boolean | `true`  | Interactive REPL mode enable செய்யவும்     |
| `showTaint`   | boolean | `false` | Output இல் session taint நிலை காட்டவும்   |

::: tip Setup தேவையில்லை CLI சேனல் out of the box வேலை செய்கிறது. உங்கள் terminal இலிருந்து Triggerfish பயன்படுத்த தொடங்க எதுவும் கட்டமைக்க தேவையில்லை. :::

## Keyboard Shortcuts

| Shortcut   | செயல்                                                       |
| ---------- | ------------------------------------------------------------ |
| Enter      | செய்தி அனுப்பவும்                                          |
| Up / Down  | Input history மூலம் navigate செய்யவும்                    |
| Ctrl+V     | Clipboard இலிருந்து image paste செய்யவும் (multimodal content ஆக அனுப்பப்படுகிறது) |
| Ctrl+O     | Compact/expanded tool display இடையே மாற்றவும்              |
| ESC        | தற்போதைய operation ஐ interrupt செய்யவும்                   |
| Ctrl+C     | CLI வெளியேறவும்                                             |
| Ctrl+W     | முந்தைய word நீக்கவும்                                     |
| Home / End | Line இன் தொடக்கம்/முடிவுக்கு jump செய்யவும்               |
