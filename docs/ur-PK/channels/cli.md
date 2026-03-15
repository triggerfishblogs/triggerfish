# CLI Channel

Command-line interface Triggerfish میں ڈیفالٹ channel ہے۔ یہ ہمیشہ دستیاب ہے، کوئی
بیرونی setup درکار نہیں، اور development اور مقامی استعمال کے دوران آپ کے ایجنٹ کے
ساتھ interact کرنے کا بنیادی طریقہ ہے۔

## Classification

CLI channel ڈیفالٹ `INTERNAL` classification پر ہوتا ہے۔ Terminal user کو **ہمیشہ**
owner سمجھا جاتا ہے — کوئی pairing یا authentication flow نہیں ہے کیونکہ آپ براہ راست
اپنی مشین پر process چلا رہے ہیں۔

::: info INTERNAL کیوں؟ CLI ایک direct، local interface ہے۔ صرف آپ کے terminal تک
رسائی رکھنے والا شخص اسے استعمال کر سکتا ہے۔ یہ `INTERNAL` کو مناسب ڈیفالٹ بناتا
ہے — آپ کا ایجنٹ اس context میں internal ڈیٹا آزادی سے share کر سکتا ہے۔ :::

## خصوصیات

### Raw Terminal Input

CLI raw terminal mode استعمال کرتا ہے مکمل ANSI escape sequence parsing کے ساتھ۔ یہ
آپ کو آپ کے terminal میں ایک بھرپور editing experience دیتا ہے:

- **Line editing** — Arrow keys، Home/End سے navigate کریں، Ctrl+W سے پچھلے word کو
  delete کریں
- **Input history** — پچھلی inputs کے ذریعے cycle کرنے کے لیے Up/Down دبائیں
- **Suggestions** — عام commands کے لیے Tab completion
- **Multi-line input** — قدرتی طور پر لمبے prompts درج کریں

### Compact Tool Display

جب ایجنٹ tools call کرتا ہے، CLI ڈیفالٹ طور پر ایک compact ایک سطری خلاصہ دکھاتا ہے:

```
tool_name arg  result
```

**Ctrl+O** سے compact اور expanded tool output کے درمیان toggle کریں۔

### چلتی Operations روکیں

موجودہ operation روکنے کے لیے **ESC** دبائیں۔ یہ orchestrator کے ذریعے LLM provider
کو abort signal بھیجتا ہے، فوری طور پر generation روک دیتا ہے۔ آپ کو لمبی response
ختم ہونے کا انتظار نہیں کرنا۔

### Taint Display

CLI channel configuration میں `showTaint` فعال کر کے آپ output میں موجودہ session
taint level optionally display کر سکتے ہیں۔ یہ ہر response سے پہلے classification
level لگاتا ہے:

```
[CONFIDENTIAL] Here are your Q4 pipeline numbers...
```

### Context Length Progress Bar

CLI terminal کے نچلے حصے میں separator line میں real-time context window usage bar
دکھاتا ہے:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Context tokens استعمال ہونے کے ساتھ bar بھرتا ہے
- 70% threshold پر ایک نیلا marker ظاہر ہوتا ہے (جہاں automatic compaction trigger ہوتی ہے)
- Limit کے قریب آنے پر bar سرخ ہو جاتا ہے
- Compaction کے بعد (`/compact` یا automatic)، bar reset ہو جاتا ہے

### MCP Server Status

Separator MCP server connection status بھی دکھاتا ہے:

| Display            | مطلب                                            |
| ------------------ | ----------------------------------------------- |
| `MCP 3/3` (سبز)    | تمام configured servers connected               |
| `MCP 2/3` (پیلا)   | کچھ servers ابھی connecting یا ناکام ہیں        |
| `MCP 0/3` (سرخ)    | کوئی server connected نہیں                      |

MCP servers startup کے بعد background میں lazily connect ہوتے ہیں۔ Status real time میں
اپ ڈیٹ ہوتا ہے جیسے جیسے servers online آتے ہیں۔

## Input History

آپ کی input history sessions میں persist ہوتی ہے:

```
~/.triggerfish/data/input_history.json
```

History startup پر load ہوتی ہے اور ہر input کے بعد save ہوتی ہے۔ آپ فائل delete
کر کے اسے صاف کر سکتے ہیں۔

## Non-TTY / Piped Input

جب stdin TTY نہ ہو (مثلاً، دوسرے process سے input pipe کرتے وقت)، CLI خود بخود
**line-buffered mode** پر واپس چلا جاتا ہے۔ اس mode میں:

- Raw terminal features (arrow keys، history navigation) غیر فعال ہوتے ہیں
- Input stdin سے لائن بہ لائن پڑھی جاتی ہے
- Output ANSI formatting کے بغیر stdout میں لکھا جاتا ہے

یہ آپ کو اپنے ایجنٹ کے ساتھ interactions script کرنے کی اجازت دیتا ہے:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuration

CLI channel کو کم سے کم configuration درکار ہے۔ یہ خود بخود بنایا جاتا ہے جب آپ
`triggerfish run` چلاتے ہیں یا interactive REPL استعمال کرتے ہیں۔

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | ڈیفالٹ | تفصیل                                    |
| ------------- | ------- | ------- | ---------------------------------------- |
| `interactive` | boolean | `true`  | Interactive REPL mode فعال کریں          |
| `showTaint`   | boolean | `false` | Output میں session taint level دکھائیں   |

::: tip کوئی Setup ضروری نہیں CLI channel out of the box کام کرتا ہے۔ آپ کو اپنے
terminal سے Triggerfish شروع کرنے کے لیے کچھ بھی configure کرنے کی ضرورت نہیں۔ :::

## Keyboard Shortcuts

| Shortcut   | عمل                                                     |
| ---------- | ------------------------------------------------------- |
| Enter      | پیغام بھیجیں                                            |
| Up / Down  | Input history navigate کریں                             |
| Ctrl+V     | Clipboard سے image paste کریں (multimodal content کے طور پر بھیجا) |
| Ctrl+O     | Compact/expanded tool display toggle کریں               |
| ESC        | موجودہ operation روکیں                                  |
| Ctrl+C     | CLI سے باہر نکلیں                                       |
| Ctrl+W     | پچھلا word delete کریں                                  |
| Home / End | Line کے آغاز/آخر تک جائیں                              |
