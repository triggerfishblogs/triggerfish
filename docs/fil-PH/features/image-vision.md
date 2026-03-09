# Image Analysis at Vision

Sinusuportahan ng Triggerfish ang image input sa lahat ng interfaces. Maaari kang mag-paste ng images mula sa iyong clipboard sa CLI o browser, at maaaring mag-analyze ng image files sa disk ang agent. Kapag hindi sumusuporta ng vision ang primary model mo, maaaring awtomatikong mag-describe ng images ang isang hiwalay na vision model bago sila makarating sa primary model.

## Image Input

### CLI: Clipboard Paste (Ctrl+V)

Pindutin ang **Ctrl+V** sa CLI chat para mag-paste ng image mula sa system clipboard mo. Binabasa ang image mula sa OS clipboard, bine-base64-encode, at ipinapadala sa agent bilang multimodal content block kasama ng text message mo.

Sinusuportahan ng clipboard reading ang:

- **Linux** -- `xclip` o `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard access

### Tidepool: Browser Paste

Sa Tidepool web interface, mag-paste ng images direkta sa chat input gamit ang native paste functionality ng browser mo (Ctrl+V / Cmd+V). Binabasa ang image bilang data URL at ipinapadala bilang base64-encoded content block.

### `image_analyze` Tool

Maaaring mag-analyze ng image files sa disk ang agent gamit ang `image_analyze` tool.

| Parameter | Type   | Required | Paglalarawan                                                                        |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------- |
| `path`    | string | yes      | Absolute path sa image file                                                         |
| `prompt`  | string | no       | Tanong o prompt tungkol sa image (default: "Describe this image in detail")         |

**Mga supported format:** PNG, JPEG, GIF, WebP, BMP, SVG

Binabasa ng tool ang file, bine-base64-encode ito, at ipinapadala sa vision-capable LLM provider para sa analysis.

## Vision Model Fallback

Kapag hindi sumusuporta ng vision ang primary model mo (hal., Z.AI `glm-5`), maaari kang mag-configure ng hiwalay na vision model para awtomatikong mag-describe ng images bago sila makarating sa primary model.

### Paano Gumagana

1. Nagpe-paste ka ng image (Ctrl+V) o nagpapadala ng multimodal content
2. Dine-detect ng orchestrator ang image content blocks sa message
3. Dine-describe ng vision model ang bawat image (makikita mo ang "Analyzing image..." spinner)
4. Pinapalitan ang image blocks ng text descriptions:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Tumatanggap ang primary model ng text-only message na may mga descriptions
6. Sinasabihan ng system prompt hint ang primary model na i-treat ang descriptions na parang nakikita nito ang images

Completely transparent ito -- nagpe-paste ka ng image at nakakakuha ng response, hindi alintana kung sumusuporta ng vision ang primary model.

### Configuration

Magdagdag ng `vision` field sa models config mo:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Non-vision primary model
  vision: glm-4.5v # Vision model para sa image description
  providers:
    zai:
      model: glm-5
```

Ginagamit muli ng `vision` model ang credentials mula sa keychain entry ng primary provider. Sa halimbawang ito, `zai` ang primary provider, kaya ang `glm-4.5v` ay gumagamit ng parehong API key na naka-store sa OS keychain para sa `zai` provider.

| Key             | Type   | Paglalarawan                                                        |
| --------------- | ------ | ------------------------------------------------------------------- |
| `models.vision` | string | Optional na vision model name para sa automatic image description   |

### Kailan Nag-a-activate ang Vision Fallback

- Kapag naka-configure lang ang `models.vision`
- Kapag may image content blocks lang ang message
- Ang string-only messages at text-only content blocks ay lulaktawan ang fallback entirely
- Kung mabigo ang vision provider, gracefully na hina-handle ang error at nagpapatuloy ang agent

### Mga Event

Nag-e-emit ang orchestrator ng dalawang events sa panahon ng vision processing:

| Event             | Paglalarawan                                         |
| ----------------- | ---------------------------------------------------- |
| `vision_start`    | Nagsisimula ang image description (kasama ang `imageCount`) |
| `vision_complete` | Na-describe na ang lahat ng images                   |

Ang mga events na ito ang nagda-drive ng "Analyzing image..." spinner sa CLI at Tidepool interfaces.

::: tip Kung sumusuporta na ng vision ang primary model mo (hal., Anthropic Claude, OpenAI GPT-4o, Google Gemini), hindi mo kailangang i-configure ang `models.vision`. Direktang ipapadala ang images sa primary model bilang multimodal content. :::
