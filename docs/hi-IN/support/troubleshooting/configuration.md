# समस्या निवारण: कॉन्फ़िगरेशन

## YAML Parse Errors

### "Configuration parse failed"

YAML फ़ाइल में syntax error है। सामान्य कारण:

- **Indentation mismatch।** YAML whitespace-sensitive है। Spaces का उपयोग करें, tabs का नहीं। प्रत्येक nesting level ठीक 2 spaces होनी चाहिए।
- **Unquoted special characters।** `:`, `#`, `{`, `}`, `[`, `]`, या `&` वाले values को quoted होना चाहिए।
- **Key के बाद colon गायब।** हर key को `: ` (colon के बाद space) चाहिए।

अपना YAML validate करें:

```bash
triggerfish config validate
```

या सटीक line खोजने के लिए online YAML validator का उपयोग करें।

### "Configuration file did not parse to an object"

YAML फ़ाइल सफलतापूर्वक parse हुई लेकिन परिणाम YAML mapping (object) नहीं है। ऐसा तब होता है जब आपकी फ़ाइल में केवल एक scalar value, एक list, या खाली है।

आपकी `triggerfish.yaml` में top-level mapping होनी चाहिए। न्यूनतम:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish इन paths पर config ढूँढता है, क्रम में:

1. `$TRIGGERFISH_CONFIG` environment variable (यदि सेट है)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (यदि `TRIGGERFISH_DATA_DIR` सेट है)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (डिफ़ॉल्ट)

एक बनाने के लिए setup wizard चलाएँ:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

इसका अर्थ है कि YAML parse हुई लेकिन structural validation में विफल रही। विशिष्ट संदेश:

**"models is required"** या **"models.primary is required"**

`models` section अनिवार्य है। आपको कम से कम एक primary provider और model चाहिए:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** या **"primary.model must be non-empty"**

`primary` field में `provider` और `model` दोनों non-empty strings पर सेट होने चाहिए।

**`classification_models` में "Invalid classification level"**

वैध levels हैं: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`। ये case-sensitive हैं। अपनी `classification_models` keys जाँचें।

---

## Secret Reference Errors

### Startup पर Secret resolve नहीं हुआ

यदि आपके config में `secret:some-key` है और वह key keychain में मौजूद नहीं है, तो daemon इस प्रकार की error के साथ बाहर निकलता है:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**समाधान:**

```bash
# देखें कि कौन से secrets मौजूद हैं
triggerfish config get-secret --list

# गायब secret संग्रहीत करें
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret backend उपलब्ध नहीं

Linux पर, secret store `secret-tool` (libsecret / GNOME Keyring) का उपयोग करता है। यदि Secret Service D-Bus interface उपलब्ध नहीं है (headless servers, minimal containers), तो आपको secrets संग्रहीत या प्राप्त करते समय errors दिखेंगे।

**Headless Linux के लिए workaround:**

1. `gnome-keyring` और `libsecret` स्थापित करें:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Keyring daemon शुरू करें:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. या encrypted file fallback का उपयोग करें:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   नोट: memory fallback का अर्थ है कि restart पर secrets खो जाते हैं। यह केवल testing के लिए उपयुक्त है।

---

## Config Value समस्याएँ

### Boolean coercion

`triggerfish config set` का उपयोग करते समय, string values `"true"` और `"false"` स्वचालित रूप से YAML booleans में बदल जाते हैं। यदि आपको वास्तव में literal string `"true"` चाहिए, तो YAML फ़ाइल को सीधे संपादित करें।

इसी प्रकार, integers जैसी दिखने वाली strings (`"8080"`) numbers में बदल जाती हैं।

### Dotted path syntax

`config set` और `config get` commands nested YAML में navigate करने के लिए dotted paths का उपयोग करते हैं:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

यदि किसी path segment में dot है, तो कोई escape syntax नहीं है। YAML फ़ाइल को सीधे संपादित करें।

### `config get` में Secret masking

जब आप "key", "secret", या "token" वाली key पर `triggerfish config get` चलाते हैं, तो output masked होता है: `****...****` केवल पहले और अंतिम 4 characters दिखाई देते हैं। यह जानबूझकर है। वास्तविक मान प्राप्त करने के लिए `triggerfish config get-secret <key>` का उपयोग करें।

---

## Config Backups

Triggerfish प्रत्येक `config set`, `config add-channel`, या `config add-plugin` operation से पहले `~/.triggerfish/backups/` में timestamped backup बनाता है। अधिकतम 10 backups रखे जाते हैं।

Backup restore करने के लिए:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

Setup wizard API keys की पुष्टि प्रत्येक provider के model-listing endpoint को call करके करता है (जो tokens consume नहीं करता)। Verification endpoints हैं:

| Provider | Endpoint |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

यदि verification विफल होता है, तो दोबारा जाँचें:
- API key सही है और expired नहीं है
- Endpoint आपके network से पहुँच योग्य है
- Local providers (Ollama, LM Studio) के लिए, server वास्तव में चल रहा है

### Model नहीं मिला

यदि verification सफल होता है लेकिन model नहीं मिलता, तो wizard आपको चेतावनी देता है। इसका आमतौर पर अर्थ है:

- **Model name में typo।** सटीक model IDs के लिए provider के docs जाँचें।
- **Ollama model pull नहीं हुआ।** पहले `ollama pull <model>` चलाएँ।
- **Provider model को list नहीं करता।** कुछ providers (Fireworks) अलग naming formats का उपयोग करते हैं। Wizard सामान्य patterns को normalize करता है, लेकिन असामान्य model IDs मेल नहीं खा सकते।
