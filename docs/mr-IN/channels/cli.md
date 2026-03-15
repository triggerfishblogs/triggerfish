# CLI Channel

Command-line interface हे Triggerfish मधील default channel आहे. हे नेहमी
उपलब्ध आहे, कोणत्याही बाह्य सेटअपची आवश्यकता नाही आणि development आणि स्थानिक
वापरादरम्यान तुमच्या एजंटशी संवाद साधण्याचा प्राथमिक मार्ग आहे.

## वर्गीकरण

CLI channel default वर `INTERNAL` वर्गीकरण आहे. Terminal वापरकर्ता **नेहमी**
owner म्हणून treated आहे -- कोणतेही pairing किंवा authentication flow नाही
कारण तुम्ही प्रक्रिया थेट तुमच्या मशीनवर चालवत आहात.

::: info INTERNAL का? CLI एक direct, local interface आहे. फक्त तुमच्या
terminal ला प्रवेश असलेली व्यक्ती ते वापरू शकते. यामुळे `INTERNAL` हा
योग्य default आहे -- तुमचा एजंट या context मध्ये internal data मुक्तपणे
सामायिक करू शकतो. :::

## Features

### Raw Terminal Input

CLI raw terminal mode सह ANSI escape sequence parsing वापरतो:

- **Line editing** -- arrow keys, Home/End सह Navigate करा, Ctrl+W ने words delete करा
- **Input history** -- मागील inputs cycle करण्यासाठी Up/Down दाबा
- **Suggestions** -- सामान्य commands साठी Tab completion
- **Multi-line input** -- नैसर्गिकरित्या longer prompts प्रविष्ट करा

### Compact Tool Display

जेव्हा एजंट tools call करतो, CLI default वर compact one-line summary दाखवतो:

```
tool_name arg  result
```

**Ctrl+O** सह compact आणि expanded tool output मध्ये toggle करा.

### Operations Interrupt करणे

वर्तमान operation interrupt करण्यासाठी **ESC** दाबा. हे orchestrator ते LLM
provider पर्यंत abort signal पाठवते, generation लगेच थांबवते.

### Taint Display

CLI channel configuration मध्ये `showTaint` सक्षम करून तुम्ही output मध्ये
वर्तमान session taint level ऐच्छिकपणे दाखवू शकता:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Context Length Progress Bar

CLI terminal च्या तळाशी separator line मध्ये real-time context window usage
bar दाखवतो:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Context tokens consumed झाल्यावर bar भरतो
- 70% threshold वर blue marker दिसतो (जिथे automatic compaction trigger होतो)
- Limit जवळ येताना bar लाल होतो

### MCP Server Status

Separator MCP server connection status देखील दाखवतो:

| Display            | अर्थ                                        |
| ------------------ | ------------------------------------------- |
| `MCP 3/3` (हिरवा)  | सर्व configured servers connected           |
| `MCP 2/3` (पिवळा)  | काही servers connecting किंवा failed आहेत   |
| `MCP 0/3` (लाल)    | कोणते servers connected नाहीत              |

## Input History

तुमचा input history sessions मध्ये येथे persisted आहे:

```
~/.triggerfish/data/input_history.json
```

## Non-TTY / Piped Input

जेव्हा stdin TTY नाही (उदाहरणार्थ, दुसऱ्या process मधून input piping करताना),
CLI स्वयंचलितपणे **line-buffered mode** ला fall back करतो. हे तुम्हाला
तुमच्या एजंटशी script interactions करण्याची परवानगी देते:

```bash
echo "What is the weather today?" | triggerfish run
```

## कॉन्फिगरेशन

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | Default | वर्णन                            |
| ------------- | ------- | ------- | --------------------------------- |
| `interactive` | boolean | `true`  | Interactive REPL mode सक्षम करा   |
| `showTaint`   | boolean | `false` | Output मध्ये session taint दाखवा  |

## Keyboard Shortcuts

| Shortcut   | क्रिया                                                    |
| ---------- | --------------------------------------------------------- |
| Enter      | Message पाठवा                                            |
| Up / Down  | Input history navigate करा                               |
| Ctrl+V     | Clipboard मधून image paste करा (multimodal content)      |
| Ctrl+O     | Compact/expanded tool display toggle करा                 |
| ESC        | वर्तमान operation interrupt करा                          |
| Ctrl+C     | CLI बाहेर पडा                                            |
| Ctrl+W     | मागील word delete करा                                    |
| Home / End | Line च्या सुरुवातीला/शेवटी उडी मारा                      |
