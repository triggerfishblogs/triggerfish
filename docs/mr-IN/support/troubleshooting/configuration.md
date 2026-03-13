# Troubleshooting: Configuration

## YAML Parse Errors

### "Configuration parse failed"

YAML file मध्ये syntax error आहे. Common causes:

- **Indentation mismatch.** YAML whitespace-sensitive आहे. Spaces वापरा, tabs नाही. प्रत्येक nesting level exactly 2 spaces असायला हवे.
- **Unquoted special characters.** `:`, `#`, `{`, `}`, `[`, `]`, किंवा `&` असलेल्या values quoted असणे आवश्यक आहे.
- **Key नंतर colon missing.** प्रत्येक key ला `: ` (colon followed by a space) आवश्यक आहे.

YAML validate करा:

```bash
triggerfish config validate
```

किंवा exact line सापडण्यासाठी online YAML validator वापरा.

### "Configuration file did not parse to an object"

YAML file successfully parsed झाली पण result YAML mapping (object) नाही. तुमची file फक्त scalar value, list, किंवा empty असल्यास असे होते.

तुमच्या `triggerfish.yaml` ला top-level mapping असणे आवश्यक आहे. किमान:

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

Triggerfish या paths वर, या order मध्ये config शोधतो:

1. `$TRIGGERFISH_CONFIG` environment variable (set असल्यास)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (`TRIGGERFISH_DATA_DIR` set असल्यास)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (default)

एक create करण्यासाठी setup wizard run करा:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

याचा अर्थ YAML parsed पण structural validation fail झाली. Specific messages:

**"models is required"** किंवा **"models.primary is required"**

`models` section mandatory आहे. तुम्हाला कमीत कमी एक primary provider आणि model आवश्यक आहे:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** किंवा **"primary.model must be non-empty"**

`primary` field ला `provider` आणि `model` दोन्ही non-empty strings ला set असणे आवश्यक आहे.

**"Invalid classification level"** `classification_models` मध्ये

Valid levels: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. हे case-sensitive आहेत. तुमच्या `classification_models` keys check करा.

---

## Secret Reference Errors

### Startup वर Secret resolve नाही झाले

तुमच्या config मध्ये `secret:some-key` असल्यास आणि ते key keychain मध्ये exist करत नसल्यास, daemon अशा error सह exit होतो:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Fix:**

```bash
# कोणते secrets exist आहेत ते list करा
triggerfish config get-secret --list

# Missing secret store करा
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret backend available नाही

Linux वर, secret store `secret-tool` (libsecret / GNOME Keyring) वापरतो. Secret Service D-Bus interface available नसल्यास (headless servers, minimal containers), secrets store किंवा retrieve करताना errors दिसतील.

**Headless Linux साठी Workaround:**

1. `gnome-keyring` आणि `libsecret` install करा:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Keyring daemon start करा:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. किंवा encrypted file fallback वापरा:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Note: memory fallback म्हणजे restart वर secrets lost होतात. फक्त testing साठी suitable आहे.

---

## Config Value Issues

### Boolean coercion

`triggerfish config set` वापरताना, string values `"true"` आणि `"false"` automatically YAML booleans मध्ये converted होतात. Literal string `"true"` खरोखर आवश्यक असल्यास, YAML file directly edit करा.

त्याचप्रमाणे, integers सारखे दिसणारे strings (`"8080"`) numbers ला coerce होतात.

### Dotted path syntax

`config set` आणि `config get` commands nested YAML navigate करण्यासाठी dotted paths वापरतात:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Path segment मध्ये dot असल्यास, escape syntax नाही. YAML file directly edit करा.

### `config get` मध्ये Secret masking

"key", "secret", किंवा "token" असलेल्या key वर `triggerfish config get` run केल्यास, output masked होतो: `****...****` फक्त पहिल्या आणि शेवटच्या 4 characters सह. हे intentional आहे. Actual value retrieve करण्यासाठी `triggerfish config get-secret <key>` वापरा.

---

## Config Backups

Triggerfish प्रत्येक `config set`, `config add-channel`, किंवा `config add-plugin` operation पूर्वी `~/.triggerfish/backups/` मध्ये timestamped backup create करतो. 10 backups पर्यंत retained आहेत.

Backup restore करण्यासाठी:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

Setup wizard प्रत्येक provider चे API keys model-listing endpoint call करून verify करतो (जे tokens consume करत नाही). Verification endpoints:

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

Verification fail झाल्यास, double-check करा:
- API key correct आहे आणि expired नाही
- Endpoint तुमच्या network मधून reachable आहे
- Local providers (Ollama, LM Studio) साठी, server actually running आहे

### Model not found

Verification succeed होते पण model सापडत नाही, wizard तुम्हाला warn करतो. याचा सहसा अर्थ:

- **Model name मध्ये typo.** Exact model IDs साठी provider चे docs check करा.
- **Ollama model pulled नाही.** आधी `ollama pull <model>` run करा.
- **Provider model list करत नाही.** काही providers (Fireworks) different naming formats वापरतात. Wizard common patterns normalize करतो, पण unusual model IDs match होणार नाहीत.
