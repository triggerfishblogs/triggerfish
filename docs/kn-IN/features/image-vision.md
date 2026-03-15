# ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು Vision

Triggerfish ಎಲ್ಲ interfaces ನಾದ್ಯಂತ image input ಬೆಂಬಲಿಸುತ್ತದೆ. CLI ಅಥವಾ
browser ನಲ್ಲಿ clipboard ನಿಂದ images paste ಮಾಡಬಹುದು, ಮತ್ತು agent disk ನಲ್ಲಿ
image files ವಿಶ್ಲೇಷಿಸಬಹುದು. ನಿಮ್ಮ primary model vision ಬೆಂಬಲಿಸದಿದ್ದರೆ, primary
model ತಲುಪುವ ಮೊದಲು images ಸ್ವಯಂಚಾಲಿತವಾಗಿ ವಿವರಿಸಲು ಪ್ರತ್ಯೇಕ vision model
configure ಮಾಡಬಹುದು.

## Image Input

### CLI: Clipboard Paste (Ctrl+V)

CLI chat ನಲ್ಲಿ **Ctrl+V** ಒತ್ತಿ system clipboard ನಿಂದ image paste ಮಾಡಿ.
Image OS clipboard ನಿಂದ ಓದಲ್ಪಡುತ್ತದೆ, base64-encode ಮಾಡಲ್ಪಡುತ್ತದೆ, ಮತ್ತು
ನಿಮ್ಮ text message ಜೊತೆ multimodal content block ಆಗಿ agent ಗೆ ಕಳುಹಿಸಲ್ಪಡುತ್ತದೆ.

Clipboard reading ಬೆಂಬಲಿಸುತ್ತದೆ:

- **Linux** -- `xclip` ಅಥವಾ `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard access

### Tidepool: Browser Paste

Tidepool ವೆಬ್ interface ನಲ್ಲಿ ನಿಮ್ಮ browser ನ native paste functionality
(Ctrl+V / Cmd+V) ಬಳಸಿ chat input ಗೆ ನೇರವಾಗಿ images paste ಮಾಡಿ. Image data URL
ಆಗಿ ಓದಿ base64-encoded content block ಆಗಿ ಕಳುಹಿಸಲ್ಪಡುತ್ತದೆ.

### `image_analyze` Tool

Agent `image_analyze` tool ಬಳಸಿ disk ನಲ್ಲಿ image files ವಿಶ್ಲೇಷಿಸಬಹುದು.

| Parameter | Type   | Required | Description                                                                   |
| --------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `path`    | string | yes      | Image file ಗೆ absolute path                                                   |
| `prompt`  | string | no       | Image ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಅಥವಾ prompt (ಡಿಫಾಲ್ಟ್: "Describe this image in detail") |

**ಬೆಂಬಲಿಸಿದ formats:** PNG, JPEG, GIF, WebP, BMP, SVG

Tool ಫೈಲ್ ಓದಿ, base64-encode ಮಾಡಿ, ವಿಶ್ಲೇಷಣೆಗಾಗಿ vision-capable LLM provider ಗೆ
ಕಳುಹಿಸುತ್ತದೆ.

## Vision Model Fallback

ನಿಮ್ಮ primary model vision ಬೆಂಬಲಿಸದಿದ್ದರೆ (ಉದಾ., Z.AI `glm-5`), primary model
ತಲುಪುವ ಮೊದಲು images ಸ್ವಯಂಚಾಲಿತವಾಗಿ ವಿವರಿಸಲು ಪ್ರತ್ಯೇಕ vision model configure
ಮಾಡಬಹುದು.

### ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

1. ನೀವು image paste ಮಾಡುತ್ತೀರಿ (Ctrl+V) ಅಥವಾ multimodal ವಿಷಯ ಕಳುಹಿಸುತ್ತೀರಿ
2. Orchestrator message ನಲ್ಲಿ image content blocks ಪತ್ತೆ ಮಾಡುತ್ತದೆ
3. Vision model ಪ್ರತಿ image ವಿವರಿಸುತ್ತದೆ (ನೀವು "Analyzing image..." spinner ನೋಡುತ್ತೀರಿ)
4. Image blocks text descriptions ನಿಂದ ಬದಲಾಯಿಸಲ್ಪಡುತ್ತವೆ:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Primary model descriptions ಜೊತೆ text-only message ಸ್ವೀಕರಿಸುತ್ತದೆ
6. System prompt hint primary model ಗೆ descriptions ನೋಡಬಹುದಾದಂತೆ ಪರಿಗಣಿಸಲು
   ಹೇಳುತ್ತದೆ

ಇದು ಸಂಪೂರ್ಣ ಪಾರದರ್ಶಕ -- ನೀವು image paste ಮಾಡಿ response ಪಡೆಯುತ್ತೀರಿ, primary
model vision ಬೆಂಬಲಿಸುತ್ತದೆಯೇ ಎಂಬುದನ್ನು ಲೆಕ್ಕಿಸದೆ.

### ಸಂರಚನೆ

Models config ಗೆ `vision` field ಸೇರಿಸಿ:

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

`vision` model primary provider ನ keychain entry ನಿಂದ credentials reuse ಮಾಡುತ್ತದೆ.
ಈ ಉದಾಹರಣೆಯಲ್ಲಿ, primary provider `zai`, ಆದ್ದರಿಂದ `glm-4.5v` OS keychain ನಲ್ಲಿ
`zai` provider ಗಾಗಿ ಉಳಿಸಿದ ಅದೇ API key ಬಳಸುತ್ತದೆ.

| Key             | Type   | Description                                                |
| --------------- | ------ | ---------------------------------------------------------- |
| `models.vision` | string | ಸ್ವಯಂಚಾಲಿತ image description ಗಾಗಿ ಐಚ್ಛಿಕ vision model ಹೆಸರು |

### Vision Fallback ಯಾವಾಗ Activate ಆಗುತ್ತದೆ

- `models.vision` configure ಮಾಡಿದಾಗ ಮಾತ್ರ
- Message ನಲ್ಲಿ image content blocks ಇದ್ದಾಗ ಮಾತ್ರ
- String-only messages ಮತ್ತು text-only content blocks fallback ಸಂಪೂರ್ಣ skip ಮಾಡುತ್ತವೆ
- Vision provider ವಿಫಲವಾದರೆ, error gracefully handle ಮಾಡಲ್ಪಡುತ್ತದೆ ಮತ್ತು agent
  ಮುಂದುವರೆಯುತ್ತದೆ

### Events

Vision processing ಸಮಯದಲ್ಲಿ orchestrator ಎರಡು events emit ಮಾಡುತ್ತದೆ:

| Event             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `vision_start`    | Image description ಪ್ರಾರಂಭವಾಗುತ್ತದೆ (`imageCount` ಒಳಗೊಂಡಿದೆ) |
| `vision_complete` | ಎಲ್ಲ images ವಿವರಿಸಲ್ಪಟ್ಟವೆ                      |

ಈ events CLI ಮತ್ತು Tidepool interfaces ನಲ್ಲಿ "Analyzing image..." spinner drive
ಮಾಡುತ್ತವೆ.

::: tip ನಿಮ್ಮ primary model ಈಗಾಗಲೇ vision ಬೆಂಬಲಿಸಿದ್ದರೆ (ಉದಾ., Anthropic Claude,
OpenAI GPT-4o, Google Gemini), `models.vision` configure ಮಾಡಬೇಕಿಲ್ಲ. Images
ನೇರವಾಗಿ primary model ಗೆ multimodal ವಿಷಯವಾಗಿ ಕಳುಹಿಸಲ್ಪಡುತ್ತವೆ. :::
