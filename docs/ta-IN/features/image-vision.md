# Image Analysis மற்றும் Vision

Triggerfish அனைத்து interfaces இலும் image input ஐ support செய்கிறது. CLI அல்லது browser இல் clipboard இலிருந்து images paste செய்யலாம், மற்றும் agent disk இல் உள்ள image files ஐ analyze செய்யலாம். உங்கள் primary model vision support செய்யாதபோது, primary model ஐ அடைவதற்கு முன்பு ஒரு separate vision model தானாக images விவரிக்கலாம்.

## Image Input

### CLI: Clipboard Paste (Ctrl+V)

CLI chat இல் உங்கள் system clipboard இலிருந்து ஒரு image paste செய்ய **Ctrl+V** அழுத்தவும். Image OS clipboard இலிருந்து படிக்கப்படுகிறது, base64-encoded ஆகிறது, மற்றும் உங்கள் text செய்தியுடன் ஒரு multimodal content block ஆக agent க்கு அனுப்பப்படுகிறது.

Clipboard reading support செய்கிறது:

- **Linux** -- `xclip` அல்லது `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard access

### Tidepool: Browser Paste

Tidepool web interface இல், உங்கள் browser இன் native paste functionality (Ctrl+V / Cmd+V) பயன்படுத்தி chat input இல் நேரடியாக images paste செய்யவும். Image ஒரு data URL ஆக படிக்கப்படுகிறது மற்றும் base64-encoded content block ஆக அனுப்பப்படுகிறது.

### `image_analyze` Tool

Agent `image_analyze` tool பயன்படுத்தி disk இல் உள்ள image files ஐ analyze செய்யலாம்.

| Parameter | Type   | Required | விளக்கம்                                                                        |
| --------- | ------ | -------- | --------------------------------------------------------------------------------- |
| `path`    | string | ஆம்      | Image file க்கான Absolute path                                                   |
| `prompt`  | string | இல்லை   | Image பற்றிய Question அல்லது prompt (default: "Describe this image in detail")  |

**ஆதரிக்கப்படும் formats:** PNG, JPEG, GIF, WebP, BMP, SVG

Tool file படிக்கிறது, base64-encode செய்கிறது, மற்றும் analysis க்கு ஒரு vision-capable LLM provider க்கு அனுப்புகிறது.

## Vision Model Fallback

உங்கள் primary model vision support செய்யாதபோது (உதா., Z.AI `glm-5`), primary model ஐ அடைவதற்கு முன்பு தானாக images விவரிக்க ஒரு separate vision model கட்டமைக்கலாம்.

### எவ்வாறு செயல்படுகிறது

1. நீங்கள் ஒரு image paste செய்கிறீர்கள் (Ctrl+V) அல்லது multimodal content அனுப்புகிறீர்கள்
2. Orchestrator செய்தியில் image content blocks கண்டறிகிறது
3. Vision model ஒவ்வொரு image ஐயும் விவரிக்கிறது (நீங்கள் ஒரு "Analyzing image..." spinner பாருகிறீர்கள்)
4. Image blocks text descriptions உடன் மாற்றப்படுகின்றன:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Primary model descriptions உடன் ஒரு text-only செய்தி பெறுகிறது
6. ஒரு system prompt hint primary model க்கு descriptions ஐ images பார்ப்பது போல் கருத சொல்கிறது

இது முழுமையாக transparent -- primary model vision support செய்தாலும் செய்யாவிட்டாலும், நீங்கள் ஒரு image paste செய்து ஒரு response பெறுகிறீர்கள்.

### கட்டமைப்பு

உங்கள் models config க்கு ஒரு `vision` field சேர்க்கவும்:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Non-vision primary model
  vision: glm-4.5v # Image description க்கான Vision model
  providers:
    zai:
      model: glm-5
```

`vision` model primary provider இன் keychain entry இலிருந்து credentials reuse செய்கிறது. இந்த எடுத்துக்காட்டில், primary provider `zai`, எனவே `glm-4.5v` OS keychain இல் `zai` provider க்காக சேமிக்கப்பட்ட அதே API key பயன்படுத்துகிறது.

| Key             | Type   | விளக்கம்                                                       |
| --------------- | ------ | --------------------------------------------------------------- |
| `models.vision` | string | Automatic image description க்கான optional vision model name  |

### Vision Fallback எப்போது Activate ஆகிறது

- `models.vision` கட்டமைக்கப்பட்டிருந்தால் மட்டும்
- செய்தியில் image content blocks இருந்தால் மட்டும்
- String-only செய்திகள் மற்றும் text-only content blocks fallback ஐ முழுமையாக skip செய்கின்றன
- Vision provider தோல்வியடைந்தால், error gracefully கையாளப்படுகிறது மற்றும் agent தொடர்கிறது

### Events

Orchestrator vision processing போது இரண்டு events emit செய்கிறது:

| Event             | விளக்கம்                                      |
| ----------------- | ---------------------------------------------- |
| `vision_start`    | Image description தொடங்குகிறது (`imageCount` சேர்க்கிறது) |
| `vision_complete` | அனைத்து images விவரிக்கப்பட்டன               |

இந்த events CLI மற்றும் Tidepool interfaces இல் "Analyzing image..." spinner drive செய்கின்றன.

::: tip உங்கள் primary model ஏற்கனவே vision support செய்தால் (உதா., Anthropic Claude, OpenAI GPT-4o, Google Gemini), `models.vision` கட்டமைக்க தேவையில்லை. Images நேரடியாக primary model க்கு multimodal content ஆக அனுப்பப்படும். :::
