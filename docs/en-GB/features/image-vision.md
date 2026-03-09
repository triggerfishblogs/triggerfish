# Image Analysis and Vision

Triggerfish supports image input across all interfaces. You can paste images
from your clipboard in the CLI or browser, and the agent can analyse image files
on disk. When your primary model does not support vision, a separate vision
model can automatically describe images before they reach the primary model.

## Image Input

### CLI: Clipboard Paste (Ctrl+V)

Press **Ctrl+V** in the CLI chat to paste an image from your system clipboard.
The image is read from the OS clipboard, base64-encoded, and sent to the agent
as a multimodal content block alongside your text message.

Clipboard reading supports:

- **Linux** -- `xclip` or `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard access

### Tidepool: Browser Paste

In the Tidepool web interface, paste images directly into the chat input using
your browser's native paste functionality (Ctrl+V / Cmd+V). The image is read as
a data URL and sent as a base64-encoded content block.

### `image_analyze` Tool

The agent can analyse image files on disk using the `image_analyze` tool.

| Parameter | Type   | Required | Description                                                                   |
| --------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `path`    | string | yes      | Absolute path to the image file                                               |
| `prompt`  | string | no       | Question or prompt about the image (default: "Describe this image in detail") |

**Supported formats:** PNG, JPEG, GIF, WebP, BMP, SVG

The tool reads the file, base64-encodes it, and sends it to a vision-capable LLM
provider for analysis.

## Vision Model Fallback

When your primary model does not support vision (e.g., Z.AI `glm-5`), you can
configure a separate vision model to automatically describe images before they
reach the primary model.

### How It Works

1. You paste an image (Ctrl+V) or send multimodal content
2. The orchestrator detects image content blocks in the message
3. The vision model describes each image (you see an "Analysing image..."
   spinner)
4. Image blocks are replaced with text descriptions:
   `[The user shared an image. A vision model described it as follows: ...]`
5. The primary model receives a text-only message with the descriptions
6. A system prompt hint tells the primary model to treat the descriptions as if
   it can see the images

This is completely transparent -- you paste an image and get a response,
regardless of whether the primary model supports vision.

### Configuration

Add a `vision` field to your models config:

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

The `vision` model reuses credentials from the primary provider's keychain
entry. In this example, the primary provider is `zai`, so `glm-4.5v` uses the
same API key stored in the OS keychain for the `zai` provider.

| Key             | Type   | Description                                                |
| --------------- | ------ | ---------------------------------------------------------- |
| `models.vision` | string | Optional vision model name for automatic image description |

### When Vision Fallback Activates

- Only when `models.vision` is configured
- Only when the message contains image content blocks
- String-only messages and text-only content blocks skip the fallback entirely
- If the vision provider fails, the error is handled gracefully and the agent
  continues

### Events

The orchestrator emits two events during vision processing:

| Event             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `vision_start`    | Image description begins (includes `imageCount`) |
| `vision_complete` | All images described                             |

These events drive the "Analysing image..." spinner in the CLI and Tidepool
interfaces.

::: tip If your primary model already supports vision (e.g., Anthropic Claude,
OpenAI GPT-4o, Google Gemini), you do not need to configure `models.vision`.
Images will be sent directly to the primary model as multimodal content. :::
