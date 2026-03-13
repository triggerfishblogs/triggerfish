# Image Analysis اور Vision

Triggerfish تمام interfaces میں image input support کرتا ہے۔ آپ CLI یا browser
میں clipboard سے images paste کر سکتے ہیں، اور ایجنٹ disk پر image files analyze
کر سکتا ہے۔ جب آپ کا primary model vision support نہ کرے، ایک الگ vision model
images automatically describe کر سکتا ہے primary model تک پہنچنے سے پہلے۔

## Image Input

### CLI: Clipboard Paste (Ctrl+V)

CLI chat میں **Ctrl+V** press کریں اپنے system clipboard سے image paste کرنے کے
لیے۔ Image OS clipboard سے پڑھی جاتی ہے، base64-encode ہوتی ہے، اور آپ کے text
message کے ساتھ multimodal content block کے طور پر ایجنٹ کو بھیجی جاتی ہے۔

Clipboard reading support کرتا ہے:

- **Linux** -- `xclip` یا `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard access

### Tidepool: Browser Paste

Tidepool web interface میں، browser کی native paste functionality (Ctrl+V / Cmd+V)
استعمال کر کے chat input میں directly images paste کریں۔ Image data URL کے طور
پر پڑھی جاتی ہے اور base64-encoded content block کے طور پر بھیجی جاتی ہے۔

### `image_analyze` Tool

ایجنٹ `image_analyze` tool استعمال کر کے disk پر image files analyze کر سکتا ہے۔

| Parameter | Type   | ضروری | تفصیل                                                                      |
| --------- | ------ | :---: | --------------------------------------------------------------------------- |
| `path`    | string | ہاں   | Image file کا absolute path                                                |
| `prompt`  | string | نہیں  | Image کے بارے میں سوال یا prompt (ڈیفالٹ: "Describe this image in detail") |

**Support کردہ formats:** PNG، JPEG، GIF، WebP، BMP، SVG

Tool file پڑھتا ہے، base64-encode کرتا ہے، اور analysis کے لیے vision-capable LLM
provider کو بھیجتا ہے۔

## Vision Model Fallback

جب آپ کا primary model vision support نہ کرے (مثلاً، Z.AI `glm-5`)، آپ ایک الگ
vision model configure کر سکتے ہیں جو primary model تک پہنچنے سے پہلے automatically
images describe کرے۔

### یہ کیسے کام کرتا ہے

1. آپ image paste کرتے ہیں (Ctrl+V) یا multimodal content بھیجتے ہیں
2. Orchestrator message میں image content blocks detect کرتا ہے
3. Vision model ہر image describe کرتا ہے (آپ "Analyzing image..." spinner دیکھتے ہیں)
4. Image blocks text descriptions سے replace ہوتے ہیں:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Primary model ایک text-only message descriptions کے ساتھ receive کرتا ہے
6. ایک system prompt hint primary model کو بتاتا ہے کہ descriptions کو ایسے treat
   کریں جیسے وہ images دیکھ سکتا ہو

یہ completely transparent ہے — آپ image paste کریں اور response ملے، چاہے primary
model vision support کرے یا نہیں۔

### Configuration

اپنے models config میں `vision` field شامل کریں:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Non-vision primary model
  vision: glm-4.5v # Image description کے لیے vision model
  providers:
    zai:
      model: glm-5
```

`vision` model primary provider کی keychain entry سے credentials reuse کرتا ہے۔
اس مثال میں، primary provider `zai` ہے، اس لیے `glm-4.5v` `zai` provider کے لیے
OS keychain میں stored وہی API key استعمال کرتا ہے۔

| Key             | Type   | تفصیل                                                       |
| --------------- | ------ | ------------------------------------------------------------ |
| `models.vision` | string | Automatic image description کے لیے optional vision model name |

### Vision Fallback کب Activate ہوتا ہے

- صرف جب `models.vision` configure ہو
- صرف جب message میں image content blocks ہوں
- String-only messages اور text-only content blocks fallback بالکل skip کرتے ہیں
- اگر vision provider fail ہو، error gracefully handle ہو جاتی ہے اور ایجنٹ
  جاری رہتا ہے

### Events

Vision processing کے دوران orchestrator دو events emit کرتا ہے:

| Event             | تفصیل                                                |
| ----------------- | ----------------------------------------------------- |
| `vision_start`    | Image description شروع ہوتی ہے (`imageCount` شامل)  |
| `vision_complete` | تمام images describe ہو گئیں                         |

یہ events CLI اور Tidepool interfaces میں "Analyzing image..." spinner drive کرتے
ہیں۔

::: tip اگر آپ کا primary model پہلے سے vision support کرتا ہو (مثلاً، Anthropic
Claude، OpenAI GPT-4o، Google Gemini)، آپ کو `models.vision` configure کرنے کی
ضرورت نہیں۔ Images directly primary model کو multimodal content کے طور پر بھیجی
جائیں گی۔ :::
