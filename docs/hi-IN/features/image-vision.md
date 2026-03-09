# छवि विश्लेषण और Vision

Triggerfish सभी interfaces में छवि इनपुट का समर्थन करता है। आप CLI या ब्राउज़र
में अपने clipboard से छवियाँ पेस्ट कर सकते हैं, और agent डिस्क पर छवि फ़ाइलों
का विश्लेषण कर सकता है। जब आपका प्राथमिक model vision का समर्थन नहीं करता, तो
एक अलग vision model स्वचालित रूप से छवियों का वर्णन कर सकता है इससे पहले कि वे
प्राथमिक model तक पहुँचें।

## छवि इनपुट

### CLI: Clipboard पेस्ट (Ctrl+V)

CLI chat में **Ctrl+V** दबाएँ ताकि आपके system clipboard से एक छवि पेस्ट हो।
छवि OS clipboard से पढ़ी जाती है, base64-encoded की जाती है, और आपके text संदेश
के साथ एक multimodal content block के रूप में agent को भेजी जाती है।

Clipboard पठन समर्थन करता है:

- **Linux** -- `xclip` या `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell clipboard एक्सेस

### Tidepool: ब्राउज़र पेस्ट

Tidepool web interface में, अपने ब्राउज़र की native paste कार्यक्षमता (Ctrl+V /
Cmd+V) का उपयोग करके chat इनपुट में सीधे छवियाँ पेस्ट करें। छवि data URL के रूप
में पढ़ी जाती है और base64-encoded content block के रूप में भेजी जाती है।

### `image_analyze` Tool

Agent `image_analyze` tool का उपयोग करके डिस्क पर छवि फ़ाइलों का विश्लेषण कर
सकता है।

| Parameter | Type   | आवश्यक | विवरण                                                                       |
| --------- | ------ | ------ | --------------------------------------------------------------------------- |
| `path`    | string | हाँ    | छवि फ़ाइल का absolute path                                                   |
| `prompt`  | string | नहीं   | छवि के बारे में प्रश्न या prompt (डिफ़ॉल्ट: "Describe this image in detail") |

**समर्थित formats:** PNG, JPEG, GIF, WebP, BMP, SVG

Tool फ़ाइल पढ़ता है, base64-encode करता है, और विश्लेषण के लिए एक
vision-सक्षम LLM provider को भेजता है।

## Vision Model Fallback

जब आपका प्राथमिक model vision का समर्थन नहीं करता (जैसे Z.AI `glm-5`), तो आप
एक अलग vision model कॉन्फ़िगर कर सकते हैं जो छवियों का स्वचालित रूप से वर्णन
करता है इससे पहले कि वे प्राथमिक model तक पहुँचें।

### यह कैसे काम करता है

1. आप एक छवि पेस्ट करते हैं (Ctrl+V) या multimodal content भेजते हैं
2. Orchestrator संदेश में छवि content blocks का पता लगाता है
3. Vision model प्रत्येक छवि का वर्णन करता है (आपको "Analyzing image..." spinner
   दिखाई देता है)
4. छवि blocks को text विवरणों से बदला जाता है:
   `[The user shared an image. A vision model described it as follows: ...]`
5. प्राथमिक model विवरणों के साथ एक text-only संदेश प्राप्त करता है
6. एक system prompt संकेत प्राथमिक model को बताता है कि विवरणों को ऐसे माने जैसे
   वह छवियाँ देख सकता है

यह पूरी तरह पारदर्शी है -- आप एक छवि पेस्ट करते हैं और प्रतिक्रिया प्राप्त
करते हैं, इसकी परवाह किए बिना कि प्राथमिक model vision का समर्थन करता है या नहीं।

### कॉन्फ़िगरेशन

अपने models config में `vision` फ़ील्ड जोड़ें:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # गैर-vision प्राथमिक model
  vision: glm-4.5v # छवि विवरण के लिए Vision model
  providers:
    zai:
      model: glm-5
```

`vision` model प्राथमिक provider के keychain entry से credentials पुनः उपयोग
करता है। इस उदाहरण में, प्राथमिक provider `zai` है, इसलिए `glm-4.5v` `zai`
provider के लिए OS keychain में संग्रहीत वही API key उपयोग करता है।

| Key             | Type   | विवरण                                                      |
| --------------- | ------ | ---------------------------------------------------------- |
| `models.vision` | string | स्वचालित छवि विवरण के लिए वैकल्पिक vision model नाम         |

### Vision Fallback कब सक्रिय होता है

- केवल जब `models.vision` कॉन्फ़िगर किया गया हो
- केवल जब संदेश में छवि content blocks हों
- String-only संदेश और text-only content blocks fallback को छोड़ देते हैं
- यदि vision provider विफल होता है, error को gracefully संभाला जाता है और agent
  जारी रहता है

### Events

Orchestrator vision प्रोसेसिंग के दौरान दो events उत्सर्जित करता है:

| Event             | विवरण                                     |
| ----------------- | ----------------------------------------- |
| `vision_start`    | छवि विवरण शुरू होता है (`imageCount` सहित) |
| `vision_complete` | सभी छवियों का वर्णन हो गया                  |

ये events CLI और Tidepool interfaces में "Analyzing image..." spinner चलाते हैं।

::: tip यदि आपका प्राथमिक model पहले से vision का समर्थन करता है (जैसे Anthropic
Claude, OpenAI GPT-4o, Google Gemini), तो आपको `models.vision` कॉन्फ़िगर करने
की आवश्यकता नहीं है। छवियाँ सीधे प्राथमिक model को multimodal content के रूप
में भेजी जाएँगी। :::
