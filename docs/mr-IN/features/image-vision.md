# Image Analysis आणि Vision

Triggerfish सर्व interfaces वर image input support करतो. तुम्ही CLI किंवा browser
मध्ये clipboard वरून images paste करू शकता, आणि एजंट disk वरील image files
analyze करू शकतो. तुमचा primary model vision support करत नसताना, एक स्वतंत्र
vision model primary model ला images पोहोचण्यापूर्वी आपोआप त्यांचे describe करू
शकतो.

## Image Input

### CLI: Clipboard Paste (Ctrl+V)

CLI chat मध्ये तुमच्या system clipboard वरून image paste करण्यासाठी **Ctrl+V**
दाबा. Image OS clipboard वरून read केला जातो, base64-encoded, आणि तुमच्या text
message सोबत multimodal content block म्हणून एजंटला पाठवला जातो.

Clipboard reading support करतो:

- **Linux** -- `xclip` किंवा `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard access

### Tidepool: Browser Paste

Tidepool web interface मध्ये, तुमच्या browser च्या native paste functionality
(Ctrl+V / Cmd+V) वापरून chat input मध्ये थेट images paste करा. Image data URL
म्हणून read केला जातो आणि base64-encoded content block म्हणून पाठवला जातो.

### `image_analyze` Tool

एजंट `image_analyze` tool वापरून disk वरील image files analyze करू शकतो.

| Parameter | Type   | Required | वर्णन                                                                              |
| --------- | ------ | -------- | ---------------------------------------------------------------------------------- |
| `path`    | string | हो       | Image file चा absolute path                                                        |
| `prompt`  | string | नाही     | Image बद्दल question किंवा prompt (default: "Describe this image in detail")      |

**Supported formats:** PNG, JPEG, GIF, WebP, BMP, SVG

Tool file read करतो, base64-encode करतो, आणि analysis साठी vision-capable LLM
provider ला पाठवतो.

## Vision Model Fallback

तुमचा primary model vision support करत नसताना (उदा., Z.AI `glm-5`), तुम्ही
primary model ला images पोहोचण्यापूर्वी images automatically describe करण्यासाठी
स्वतंत्र vision model configure करू शकता.

### हे कसे काम करते

1. तुम्ही image paste करता (Ctrl+V) किंवा multimodal content पाठवता
2. Orchestrator message मध्ये image content blocks detect करतो
3. Vision model प्रत्येक image describe करतो (तुम्हाला "Analyzing image..." spinner
   दिसतो)
4. Image blocks text descriptions ने replace केले जातात:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Primary model descriptions सह text-only message receive करतो
6. System prompt hint primary model ला descriptions ला जणू ते images पाहू शकतो
   असे treat करण्यास सांगतो

हे पूर्णपणे transparent आहे -- तुम्ही image paste करता आणि response मिळवता,
primary model vision support करतो की नाही याची पर्वा न करता.

### Configuration

तुमच्या models config मध्ये `vision` field जोडा:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Non-vision primary model
  vision: glm-4.5v # Vision model for image description
  providers:
    zai:
      model: glm-5
```

`vision` model primary provider च्या keychain entry मधील credentials reuse
करतो. या example मध्ये, primary provider `zai` आहे, त्यामुळे `glm-4.5v` OS
keychain मध्ये `zai` provider साठी stored त्याच API key वापरतो.

| Key             | Type   | वर्णन                                                         |
| --------------- | ------ | ------------------------------------------------------------- |
| `models.vision` | string | Automatic image description साठी optional vision model name  |

### Vision Fallback केव्हा Activate होतो

- फक्त जेव्हा `models.vision` configured आहे
- फक्त जेव्हा message मध्ये image content blocks असतात
- String-only messages आणि text-only content blocks fallback पूर्णपणे skip करतात
- Vision provider fail झाल्यास, error gracefully handled होतो आणि एजंट continue
  करतो

### Events

Vision processing दरम्यान orchestrator दोन events emit करतो:

| Event             | वर्णन                                              |
| ----------------- | -------------------------------------------------- |
| `vision_start`    | Image description सुरू होतो (`imageCount` समाविष्ट) |
| `vision_complete` | सर्व images described                              |

हे events CLI आणि Tidepool interfaces मध्ये "Analyzing image..." spinner drive
करतात.

::: tip जर तुमचा primary model आधीच vision support करत असेल (उदा., Anthropic
Claude, OpenAI GPT-4o, Google Gemini), तुम्हाला `models.vision` configure करण्याची
आवश्यकता नाही. Images primary model ला multimodal content म्हणून थेट पाठवल्या
जातील. :::
